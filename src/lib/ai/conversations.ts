import type {
  AiConversation,
  AiConversationStatus,
  AiFeatureKey,
  AiMessage,
  AiMessageRole,
  LocaleCode,
  Prisma,
} from "@prisma/client";
import type { AiActor } from "@/actions/ai/_actor";
import { canAccessAiFeature, isDoctorFeature } from "@/domain/ai/access";
import { scanRedFlags, type RedFlagCategory } from "@/domain/ai/red-flags";
import type { EmrActor } from "@/domain/emr/access";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import type { AiMessage as PortAiMessage } from "@/ports/ai-assistant";
import { prisma } from "@/lib/prisma";
import { aiAudit } from "./audit";
import { checkBudget } from "./budgets";
import type { AssembledEvidence } from "./context";
import { recordGuardrailEventAsync } from "./guardrail-events";
import { recordUsage } from "./metering";
import { generate, streamGenerate } from "./orchestration";
import { checkAiRateLimit } from "./rate-limit";

export const MESSAGE_WINDOW_SIZE = 12;

export type MessageEvidenceDto = {
  chartCategories: string[];
  kbSources: string[];
  mode: "PERSONALIZED" | "GENERAL";
};

export type MessageDto = {
  id: string;
  role: AiMessageRole;
  content: string;
  redFlagged: boolean;
  disclaimerShown: boolean;
  evidence?: MessageEvidenceDto | null;
  createdAt: string;
};

export type ConversationSummary = {
  id: string;
  title: string | null;
  feature: AiFeatureKey;
  locale: LocaleCode;
  status: AiConversationStatus;
  updatedAt: string;
  createdAt: string;
};

export type ChatFeature = Extract<
  AiFeatureKey,
  "PATIENT_ASSISTANT" | "DOCTOR_SOAP" | "DOCTOR_SUMMARY"
>;

function toEmrActor(actor: AiActor): EmrActor {
  return {
    userId: actor.userId,
    role: actor.role,
    doctorId: actor.doctorId ?? null,
  };
}

function toLocaleCode(locale: "en" | "ar" | LocaleCode): LocaleCode {
  if (locale === "en" || locale === "EN") return "EN";
  return "AR";
}

export function toMessageEvidence(raw: AssembledEvidence): MessageEvidenceDto {
  return {
    chartCategories: raw.chartCategories,
    kbSources: raw.kbSources.map((s) => s.title),
    mode: raw.mode,
  };
}

function parseMessageEvidence(value: unknown): MessageEvidenceDto | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (o.mode !== "PERSONALIZED" && o.mode !== "GENERAL") return null;
  const chartCategories = Array.isArray(o.chartCategories)
    ? o.chartCategories.filter((c): c is string => typeof c === "string")
    : [];
  const kbSources = Array.isArray(o.kbSources)
    ? o.kbSources.filter((s): s is string => typeof s === "string")
    : [];
  return { chartCategories, kbSources, mode: o.mode };
}

function toMessageDto(m: AiMessage): MessageDto {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    redFlagged: m.redFlagged,
    disclaimerShown: m.disclaimerShown,
    evidence: parseMessageEvidence(m.evidence),
    createdAt: m.createdAt.toISOString(),
  };
}

function toSummary(c: AiConversation): ConversationSummary {
  return {
    id: c.id,
    title: c.title,
    feature: c.feature,
    locale: c.locale,
    status: c.status,
    updatedAt: c.updatedAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
  };
}

/** Bilingual emergency notice text for SYSTEM_NOTICE + SSE notice events. */
export function redFlagNoticeText(
  locale: "en" | "ar",
  category?: RedFlagCategory,
): string {
  const detail =
    category === "chest_pain"
      ? locale === "ar"
        ? " (ألم في الصدر)"
        : " (chest pain)"
      : category === "breathing"
        ? locale === "ar"
          ? " (صعوبة في التنفس)"
          : " (breathing difficulty)"
        : "";
  return locale === "ar"
    ? `قد تكون هذه حالة طبية طارئة${detail}. يُرجى طلب الرعاية الطارئة فوراً أو الاتصال برقم الطوارئ المحلي.`
    : `This may be a medical emergency${detail}. Please seek emergency care immediately or call your local emergency number.`;
}

/**
 * Build the provider conversation window: optional rolling summary as a
 * system-ish user preface + last N user/assistant turns (SYSTEM_NOTICE excluded).
 */
export function assembleMessageWindow(
  messages: Array<{ role: AiMessageRole; content: string }>,
  rollingSummary: string | null | undefined,
  windowSize = MESSAGE_WINDOW_SIZE,
): PortAiMessage[] {
  const dialog = messages
    .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
    .map((m) => ({
      role: (m.role === "USER" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    }));

  const windowed = dialog.slice(-windowSize);
  if (rollingSummary?.trim()) {
    return [
      {
        role: "assistant",
        content: `[Conversation summary so far]\n${rollingSummary.trim()}`,
      },
      ...windowed,
    ];
  }
  return windowed;
}

/** Compact rolling summary from messages that fell out of the window. */
export function buildRollingSummaryUpdate(
  previous: string | null | undefined,
  overflowMessages: Array<{ role: AiMessageRole; content: string }>,
): string {
  const parts: string[] = [];
  if (previous?.trim()) parts.push(previous.trim());
  for (const m of overflowMessages) {
    if (m.role !== "USER" && m.role !== "ASSISTANT") continue;
    const label = m.role === "USER" ? "User" : "Assistant";
    const snippet = m.content.replace(/\s+/g, " ").trim().slice(0, 160);
    if (snippet) parts.push(`${label}: ${snippet}`);
  }
  const joined = parts.join(" | ");
  return joined.length > 2000 ? `${joined.slice(0, 1997)}...` : joined;
}

/**
 * Ownership gate for conversation CRUD.
 * Only the owning patient may access; others get FORBIDDEN (or NOT_FOUND when
 * the row is missing to avoid enumeration).
 */
export function assertConversationOwner(
  actor: AiActor,
  conversation: { patientUserId: string } | null,
): PlatformResult<{ allowed: true }> {
  if (!conversation) return platformFail("NOT_FOUND", "Conversation not found");
  if (actor.role !== "PATIENT" || actor.userId !== conversation.patientUserId) {
    return platformFail("FORBIDDEN", "Conversation access denied");
  }
  return platformOk({ allowed: true });
}

async function resolveFeatureAccess(
  actor: AiActor,
  feature: AiFeatureKey,
  patientUserId: string,
): Promise<PlatformResult<{ allowed: true }>> {
  let hasCare = false;
  if (actor.role === "DOCTOR" && isDoctorFeature(feature)) {
    if (!actor.doctorId) {
      return platformFail("FORBIDDEN", "Doctor profile required");
    }
    hasCare = await hasCareRelationship(actor.doctorId, patientUserId);
    if (!hasCare) {
      return platformFail("NOT_FOUND", "Patient not found");
    }
  }

  const access = canAccessAiFeature(actor.role, feature, {
    hasCareRelationship: hasCare,
  });
  if (!access) {
    void aiAudit(
      "access.denied",
      { userId: actor.userId },
      { userId: patientUserId },
      "DENIED",
      { feature, role: actor.role },
    );
    return platformFail("FORBIDDEN", "AI feature not allowed for role");
  }
  return platformOk({ allowed: true });
}

export async function startConversation(
  actor: AiActor,
  input: { feature: ChatFeature; locale: "en" | "ar" },
): Promise<PlatformResult<{ conversationId: string }>> {
  if (input.feature !== "PATIENT_ASSISTANT") {
    return platformFail("FORBIDDEN", "Only patients may start assistant conversations here");
  }
  const access = await resolveFeatureAccess(actor, input.feature, actor.userId);
  if (!access.ok) return access;
  if (actor.role !== "PATIENT") {
    return platformFail("FORBIDDEN", "Only patients may start conversations");
  }

  const conversation = await prisma.aiConversation.create({
    data: {
      patientUserId: actor.userId,
      feature: input.feature,
      locale: toLocaleCode(input.locale),
      status: "ACTIVE",
    },
  });

  await aiAudit(
    "conversation.create",
    { userId: actor.userId },
    { userId: actor.userId },
    "SUCCESS",
    { conversationId: conversation.id, feature: input.feature },
  );

  return platformOk({ conversationId: conversation.id });
}

export async function listConversations(
  actor: AiActor,
  input: { page?: number } = {},
): Promise<PlatformResult<{ items: ConversationSummary[]; total: number }>> {
  if (actor.role !== "PATIENT") {
    return platformFail("FORBIDDEN", "Conversation list is patient-only");
  }

  const page = Math.max(1, input.page ?? 1);
  const pageSize = 20;
  const where = {
    patientUserId: actor.userId,
    status: "ACTIVE" as const,
    feature: "PATIENT_ASSISTANT" as const,
  };

  const [total, rows] = await Promise.all([
    prisma.aiConversation.count({ where }),
    prisma.aiConversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return platformOk({ items: rows.map(toSummary), total });
}

export async function getConversation(
  actor: AiActor,
  input: { conversationId: string; page?: number },
): Promise<
  PlatformResult<{
    conversation: ConversationSummary;
    messages: MessageDto[];
  }>
> {
  const conversation = await prisma.aiConversation.findUnique({
    where: { id: input.conversationId },
  });
  const ownership = assertConversationOwner(actor, conversation);
  if (!ownership.ok) return ownership;
  if (!conversation) return platformFail("NOT_FOUND", "Conversation not found");

  const page = Math.max(1, input.page ?? 1);
  const pageSize = 50;
  const messages = await prisma.aiMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return platformOk({
    conversation: toSummary(conversation),
    messages: messages.map(toMessageDto),
  });
}

export async function renameConversation(
  actor: AiActor,
  input: { conversationId: string; title: string },
): Promise<PlatformResult<{ id: string }>> {
  const title = input.title.trim();
  if (!title || title.length > 120) {
    return platformFail("VALIDATION_ERROR", "Title must be 1–120 characters");
  }

  const conversation = await prisma.aiConversation.findUnique({
    where: { id: input.conversationId },
  });
  const ownership = assertConversationOwner(actor, conversation);
  if (!ownership.ok) return ownership;

  await prisma.aiConversation.update({
    where: { id: input.conversationId },
    data: { title },
  });
  return platformOk({ id: input.conversationId });
}

export async function hideConversation(
  actor: AiActor,
  input: { conversationId: string },
): Promise<PlatformResult<{ id: string }>> {
  const conversation = await prisma.aiConversation.findUnique({
    where: { id: input.conversationId },
  });
  const ownership = assertConversationOwner(actor, conversation);
  if (!ownership.ok) return ownership;

  await prisma.aiConversation.update({
    where: { id: input.conversationId },
    data: { status: "HIDDEN" },
  });

  await aiAudit(
    "conversation.hide",
    { userId: actor.userId },
    { userId: actor.userId },
    "SUCCESS",
    { conversationId: input.conversationId },
  );

  return platformOk({ id: input.conversationId });
}

async function ensureConversationForChat(
  actor: AiActor,
  input: {
    conversationId?: string;
    feature: ChatFeature;
    locale: "en" | "ar";
    patientUserId?: string;
  },
): Promise<PlatformResult<AiConversation>> {
  const patientUserId =
    input.feature === "PATIENT_ASSISTANT"
      ? actor.userId
      : (input.patientUserId ?? "");

  if (!patientUserId) {
    return platformFail("VALIDATION_ERROR", "patientUserId required for doctor features");
  }

  const access = await resolveFeatureAccess(actor, input.feature, patientUserId);
  if (!access.ok) return access;

  if (input.feature === "PATIENT_ASSISTANT" && actor.role !== "PATIENT") {
    return platformFail("FORBIDDEN", "Patient assistant requires patient role");
  }

  if (input.conversationId) {
    const existing = await prisma.aiConversation.findUnique({
      where: { id: input.conversationId },
    });
    if (!existing || existing.status !== "ACTIVE") {
      return platformFail("NOT_FOUND", "Conversation not found");
    }
    if (input.feature === "PATIENT_ASSISTANT") {
      const ownership = assertConversationOwner(actor, existing);
      if (!ownership.ok) return ownership;
    } else if (existing.patientUserId !== patientUserId) {
      return platformFail("FORBIDDEN", "Conversation patient mismatch");
    }
    return platformOk(existing);
  }

  const created = await prisma.aiConversation.create({
    data: {
      patientUserId,
      feature: input.feature,
      locale: toLocaleCode(input.locale),
      status: "ACTIVE",
    },
  });

  await aiAudit(
    "conversation.create",
    { userId: actor.userId },
    { userId: patientUserId },
    "SUCCESS",
    { conversationId: created.id, feature: input.feature },
  );

  return platformOk(created);
}

async function refreshRollingSummary(conversationId: string): Promise<string | null> {
  const all = await prisma.aiMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });
  const dialog = all.filter((m) => m.role === "USER" || m.role === "ASSISTANT");
  if (dialog.length <= MESSAGE_WINDOW_SIZE) return null;
  const overflow = dialog.slice(0, dialog.length - MESSAGE_WINDOW_SIZE);
  const conversation = await prisma.aiConversation.findUnique({
    where: { id: conversationId },
    select: { rollingSummary: true },
  });
  const next = buildRollingSummaryUpdate(conversation?.rollingSummary, overflow);
  await prisma.aiConversation.update({
    where: { id: conversationId },
    data: { rollingSummary: next },
  });
  return next;
}

export type ChatTurnMeta = {
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
};

export type ChatStreamEvent =
  | { event: "meta"; data: { conversationId: string; messageId: string } }
  | { event: "token"; data: { t: string } }
  | {
      event: "notice";
      data: { kind: "RED_FLAG" | "CONSENT_GENERAL_MODE"; text: string };
    }
  | {
      event: "done";
      data: {
        messageId: string;
        disclaimerShown: true;
        evidence?: MessageEvidenceDto;
      };
    }
  | { event: "error"; data: { code: string } };

/**
 * Non-streaming chat turn (tests / fallback). Persists user + assistant/system
 * messages, applies red-flag short-circuit, windowing, metering, audit.
 */
export async function runChatTurn(
  actor: AiActor,
  input: {
    conversationId?: string;
    feature: ChatFeature;
    message: string;
    locale: "en" | "ar";
    patientUserId?: string;
  },
): Promise<
  PlatformResult<{
    conversationId: string;
    userMessageId: string;
    assistantMessageId: string;
    content: string;
    redFlagged: boolean;
    disclaimerShown: boolean;
    promptVersionId: string | null;
    modelConfigId: string | null;
  }>
> {
  const message = input.message.trim();
  if (!message || message.length > 4000) {
    return platformFail("VALIDATION_ERROR", "Message must be 1–4000 characters");
  }

  const rate = checkAiRateLimit(actor.userId, input.feature);
  if (!rate.ok) return rate;

  const budget = await checkBudget(input.feature);
  if (!budget.ok) return budget;

  const convResult = await ensureConversationForChat(actor, input);
  if (!convResult.ok) return convResult;
  const conversation = convResult.data;
  const patientUserId = conversation.patientUserId;
  const started = Date.now();

  const userMsg = await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: "USER",
      content: message,
    },
  });

  const red = scanRedFlags(message);
  if (red.triggered) {
    const notice = redFlagNoticeText(input.locale, red.category);
    const systemMsg = await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "SYSTEM_NOTICE",
        content: notice,
        redFlagged: true,
        disclaimerShown: true,
      },
    });
    recordGuardrailEventAsync({
      trigger: "RED_FLAG",
      feature: input.feature,
      role: actor.role,
      category: red.category ?? "red_flag",
      actorUserId: actor.userId,
    });
    recordUsage({
      feature: input.feature,
      role: actor.role,
      locale: input.locale,
      userId: actor.userId,
      latencyMs: Date.now() - started,
      outcome: "RED_FLAG",
    });
    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
    return platformOk({
      conversationId: conversation.id,
      userMessageId: userMsg.id,
      assistantMessageId: systemMsg.id,
      content: notice,
      redFlagged: true,
      disclaimerShown: true,
      promptVersionId: null,
      modelConfigId: null,
    });
  }

  const history = await prisma.aiMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });
  const rolling = await refreshRollingSummary(conversation.id);
  const window = assembleMessageWindow(
    history.map((m) => ({ role: m.role, content: m.content })),
    rolling ?? conversation.rollingSummary,
  );

  const gen = await generate({
    actor: toEmrActor(actor),
    patientUserId,
    feature: input.feature,
    locale: input.locale,
    conversationId: conversation.id,
    messages: window,
    queryText: message,
  });

  if (!gen.ok) {
    recordUsage({
      feature: input.feature,
      role: actor.role,
      locale: input.locale,
      userId: actor.userId,
      latencyMs: Date.now() - started,
      outcome: "ERROR",
    });
    return gen;
  }

  const evidence = toMessageEvidence(gen.data.evidence);
  const assistantMsg = await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: gen.data.content,
      disclaimerShown: true,
      evidence: evidence as unknown as Prisma.InputJsonValue,
      promptVersionId: gen.data.promptVersionId,
      modelConfigId: gen.data.modelConfigId,
    },
  });

  if (!conversation.title) {
    const title = message.slice(0, 80);
    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { title, updatedAt: new Date() },
    });
  } else {
    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
  }

  recordUsage({
    feature: input.feature,
    role: actor.role,
    locale: input.locale,
    userId: actor.userId,
    modelConfigId: gen.data.modelConfigId,
    promptVersionId: gen.data.promptVersionId,
    promptTokens: gen.data.usage?.promptTokens,
    completionTokens: gen.data.usage?.completionTokens,
    latencyMs: Date.now() - started,
    outcome: gen.data.refused ? "REFUSED" : "SUCCESS",
    modelName: gen.data.modelName,
  });

  return platformOk({
    conversationId: conversation.id,
    userMessageId: userMsg.id,
    assistantMessageId: assistantMsg.id,
    content: gen.data.content,
    redFlagged: false,
    disclaimerShown: true,
    promptVersionId: gen.data.promptVersionId,
    modelConfigId: gen.data.modelConfigId,
  });
}

/**
 * Streaming chat turn for SSE. Yields contract events; persists on completion.
 */
export async function* streamChatTurn(
  actor: AiActor,
  input: {
    conversationId?: string;
    feature: ChatFeature;
    message: string;
    locale: "en" | "ar";
    patientUserId?: string;
  },
): AsyncGenerator<ChatStreamEvent> {
  const message = input.message.trim();
  if (!message || message.length > 4000) {
    yield { event: "error", data: { code: "VALIDATION_ERROR" } };
    return;
  }

  const rate = checkAiRateLimit(actor.userId, input.feature);
  if (!rate.ok) {
    yield { event: "error", data: { code: rate.code } };
    return;
  }

  const budget = await checkBudget(input.feature);
  if (!budget.ok) {
    yield { event: "error", data: { code: budget.code } };
    return;
  }

  const convResult = await ensureConversationForChat(actor, input);
  if (!convResult.ok) {
    yield { event: "error", data: { code: convResult.code } };
    return;
  }
  const conversation = convResult.data;
  const patientUserId = conversation.patientUserId;
  const started = Date.now();

  const userMsg = await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: "USER",
      content: message,
    },
  });

  const red = scanRedFlags(message);
  if (red.triggered) {
    const notice = redFlagNoticeText(input.locale, red.category);
    const systemMsg = await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "SYSTEM_NOTICE",
        content: notice,
        redFlagged: true,
        disclaimerShown: true,
      },
    });
    recordGuardrailEventAsync({
      trigger: "RED_FLAG",
      feature: input.feature,
      role: actor.role,
      category: red.category ?? "red_flag",
      actorUserId: actor.userId,
    });
    recordUsage({
      feature: input.feature,
      role: actor.role,
      locale: input.locale,
      userId: actor.userId,
      latencyMs: Date.now() - started,
      outcome: "RED_FLAG",
    });
    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    yield {
      event: "meta",
      data: { conversationId: conversation.id, messageId: systemMsg.id },
    };
    yield { event: "notice", data: { kind: "RED_FLAG", text: notice } };
    yield {
      event: "done",
      data: { messageId: systemMsg.id, disclaimerShown: true },
    };
    return;
  }

  // Pre-allocate assistant message id for meta (content filled after stream)
  const assistantPlaceholder = await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: "",
      disclaimerShown: true,
    },
  });

  yield {
    event: "meta",
    data: { conversationId: conversation.id, messageId: assistantPlaceholder.id },
  };

  const history = await prisma.aiMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });
  // Exclude empty placeholder from window
  const historyForWindow = history.filter((m) => m.id !== assistantPlaceholder.id);
  const rolling = await refreshRollingSummary(conversation.id);
  const window = assembleMessageWindow(
    historyForWindow.map((m) => ({ role: m.role, content: m.content })),
    rolling ?? conversation.rollingSummary,
  );

  const streamResult = await streamGenerate({
    actor: toEmrActor(actor),
    patientUserId,
    feature: input.feature,
    locale: input.locale,
    conversationId: conversation.id,
    messages: window,
    queryText: message,
  });

  if (!streamResult.ok) {
    await prisma.aiMessage.delete({ where: { id: assistantPlaceholder.id } }).catch(() => undefined);
    recordUsage({
      feature: input.feature,
      role: actor.role,
      locale: input.locale,
      userId: actor.userId,
      latencyMs: Date.now() - started,
      outcome: "ERROR",
    });
    yield { event: "error", data: { code: streamResult.code } };
    return;
  }

  let full = "";
  try {
    for await (const token of streamResult.data.stream) {
      full += token;
      yield { event: "token", data: { t: token } };
    }
  } catch {
    await prisma.aiMessage.delete({ where: { id: assistantPlaceholder.id } }).catch(() => undefined);
    recordUsage({
      feature: input.feature,
      role: actor.role,
      locale: input.locale,
      userId: actor.userId,
      latencyMs: Date.now() - started,
      outcome: "ERROR",
    });
    yield { event: "error", data: { code: "DEPENDENCY_UNAVAILABLE" } };
    return;
  }

  if (streamResult.data.evidence.mode === "GENERAL") {
    const consentText =
      input.locale === "ar"
        ? "أنت في وضع الإرشاد العام — لا تُستخدم بياناتك السريرية حتى تمنح موافقة مشاركة البيانات."
        : "You are in general guidance mode — your chart is not used until you grant data-sharing consent.";
    yield {
      event: "notice",
      data: { kind: "CONSENT_GENERAL_MODE", text: consentText },
    };
  }

  const finalized = streamResult.data.finalizePatientContent(full);
  const evidence = toMessageEvidence(streamResult.data.evidence);
  await prisma.aiMessage.update({
    where: { id: assistantPlaceholder.id },
    data: {
      content: finalized.content,
      disclaimerShown: true,
      evidence: evidence as unknown as Prisma.InputJsonValue,
      promptVersionId: streamResult.data.promptVersionId,
      modelConfigId: streamResult.data.modelConfigId,
    },
  });

  if (!conversation.title) {
    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { title: message.slice(0, 80), updatedAt: new Date() },
    });
  } else {
    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
  }

  recordUsage({
    feature: input.feature,
    role: actor.role,
    locale: input.locale,
    userId: actor.userId,
    modelConfigId: streamResult.data.modelConfigId,
    promptVersionId: streamResult.data.promptVersionId,
    completionTokens: Math.ceil(finalized.content.length / 4),
    latencyMs: Date.now() - started,
    outcome: finalized.refused ? "REFUSED" : "SUCCESS",
    modelName: streamResult.data.modelName,
  });

  // If policy rewrote content, clients that only saw tokens may need the notice —
  // still emit done with the persisted message id.
  yield {
    event: "done",
    data: {
      messageId: assistantPlaceholder.id,
      disclaimerShown: true,
      evidence,
    },
  };

  void userMsg;
}

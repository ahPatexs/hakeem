import type { AiAssistantPort, AiChatInput, AiChatResult } from "@/ports/ai-assistant";
import type { AiEmbeddingsPort } from "@/ports/ai-embeddings";

const EMBEDDING_DIM = 1536;
const STUB_EMBEDDING_MODEL = "stub-hash-embedding-1536";

const DISCLAIMER_EN =
  "This assistant provides general health information only and is not a substitute for professional medical advice, diagnosis, or treatment.";
const DISCLAIMER_AR =
  "يقدّم هذا المساعد معلومات صحية عامة فقط وليس بديلاً عن الاستشارة الطبية المهنية أو التشخيص أو العلاج.";

const REFUSAL_EN =
  "I can't diagnose conditions or prescribe medications. Please consult a licensed clinician for diagnosis or treatment. I can share general health education if that helps.";
const REFUSAL_AR =
  "لا يمكنني تشخيص الحالات أو وصف الأدوية. يُرجى استشارة طبيب مرخّص للتشخيص أو العلاج. يمكنني مشاركة معلومات صحية عامة إذا رغبت.";

const HELP_EN =
  "I can share general wellness and self-care information. For personal medical advice, please speak with a healthcare professional.";
const HELP_AR =
  "يمكنني مشاركة معلومات عامة عن العافية والرعاية الذاتية. للحصول على استشارة طبية شخصية، يُرجى التحدث مع أخصائي رعاية صحية.";

function assertStubOk(): void {
  if (process.env.AI_STUB_MODE === "fail") {
    throw new Error("AI_STUB_MODE_FAIL");
  }
}

function chartFacts(input: AiChatInput): string {
  const system = input.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const facts: string[] = [];
  const allergy = system.match(/allergies:\s*(.+)/i);
  if (allergy?.[1] && allergy[1].trim() !== "none") facts.push(`Allergies on file: ${allergy[1].trim()}`);
  const meds = system.match(/medications:\s*(.+)/i);
  if (meds?.[1] && meds[1].trim() !== "none") facts.push(`Medicines on file: ${meds[1].trim()}`);
  const conditions = system.match(/conditions:\s*(.+)/i);
  if (conditions?.[1] && conditions[1].trim() !== "none") facts.push(`Conditions on file: ${conditions[1].trim()}`);
  const visits = system.match(/upcomingVisits:\s*(.+)/i);
  if (visits?.[1]) facts.push(`Upcoming visits: ${visits[1].trim()}`);
  return facts.join(" ");
}

function helpfulReply(input: AiChatInput): string {
  const userText = lastUserContent(input);
  const lower = userText.toLowerCase();
  const facts = chartFacts(input);
  const ar = input.locale === "ar";

  if (/\bfev|temperature|حرارة|سخون/.test(lower) || /mild fever/.test(lower)) {
    return ar
      ? `للحرارة الخفيفة: خذ راحة واشرب سوائل. راقب إن وصلت الحرارة إلى 38.5 أو ظهرت صعوبة تنفس أو تيبس رقبة أو ارتباك — حينها اطلب رعاية عاجلة. ${facts}`.trim()
      : `For a mild fever: rest, drink fluids, and dress lightly. Recheck if it stays at 38.5C or higher, or if you get trouble breathing, a stiff neck, a rash, or confusion — those need urgent care. ${facts}`.trim();
  }
  if (/medicat|medicine|pill|دواء|أدوية|dose/.test(lower)) {
    return ar
      ? `لسلامة الدواء: خذ الجرعة المكتوبة، لا تشارك الدواء، وأخبر الطبيب بأي حساسية. لا توقف دواءً مزمناً دون استشارة. ${facts}`.trim()
      : `Medication safety: take the labeled dose, do not share medicines, and tell your clinician about allergies. Do not stop a long-term medicine without advice. ${facts}`.trim();
  }
  if (/appoint|visit|موعد|حجز/.test(lower)) {
    return ar
      ? `من بوابة المريض يمكنك حجز موعد أو إلغاؤه أو الانضمام لزيارة مرئية في وقتها. ${facts}`.trim()
      : `In this portal you can book, cancel, or join a video visit at the scheduled time. ${facts}`.trim();
  }
  if (/record|lab|نتيج|سجل|تحليل/.test(lower)) {
    return ar
      ? `ملاحظات الزيارة ونتائج المختبر تظهر هنا بعد أن يشاركها الطبيب أو يعتمدها. ${facts}`.trim()
      : `Visit notes and lab results show here after your doctor shares or releases them. ${facts}`.trim();
  }
  if (facts) {
    return ar
      ? `${HELP_AR}\n\n${facts}`
      : `${HELP_EN}\n\n${facts}`;
  }
  return ar ? HELP_AR : HELP_EN;
}

function lastUserContent(input: AiChatInput): string {
  const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
  return lastUser?.content?.trim() || "";
}

function isPrescribeOrDiagnoseAsk(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\b(prescrib\w*|prescription|diagnos\w*|diagnosis|medication\s+for\s+me|what\s+drug)\b/i.test(
      lower,
    ) || /وصف\s*(لي)?\s*(دواء|علاج)|تشخيص|شخصني|وصفة\s*طبية/.test(text)
  );
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function isSoapDraftAsk(text: string): boolean {
  return /"subjective"/i.test(text) || /structured SOAP/i.test(text);
}

function isSummaryDraftAsk(text: string): boolean {
  return /"body"/i.test(text) && /consultation summary/i.test(text);
}

function buildReply(input: AiChatInput): AiChatResult {
  const disclaimer = input.locale === "ar" ? DISCLAIMER_AR : DISCLAIMER_EN;
  const userText = lastUserContent(input);

  let body: string;
  if (isSoapDraftAsk(userText)) {
    body = JSON.stringify({
      subjective: "Patient-reported history from this visit (draft — clinician review required).",
      objective: "Exam findings and vitals were not fully captured in this draft.",
      assessment: "Working assessment pending clinician confirmation.",
      plan: "Plan pending clinician review. This is an AI-assisted draft, not a signed note.",
    });
  } else if (isSummaryDraftAsk(userText)) {
    body = JSON.stringify({
      body:
        input.locale === "ar"
          ? "ملخص استشارة مسودة للمراجعة السريرية. لم يُعتمد بعد وليس بديلاً عن ملاحظات الطبيب."
          : "Draft consultation summary for clinician review. Not finalized and not a substitute for the clinician's note.",
    });
  } else if (isPrescribeOrDiagnoseAsk(userText)) {
    body = input.locale === "ar" ? REFUSAL_AR : REFUSAL_EN;
  } else {
    body = helpfulReply(input);
  }

  const content = isSoapDraftAsk(userText) || isSummaryDraftAsk(userText) ? body : `${disclaimer}\n\n${body}`;
  const promptBlob = input.messages.map((m) => m.content).join("\n");
  return {
    content,
    disclaimer,
    usage: {
      promptTokens: estimateTokens(promptBlob),
      completionTokens: estimateTokens(content),
    },
  };
}

/** Deterministic FNV-ish hash embedding; L2-normalized; dim 1536. */
export function stubHashEmbedding(text: string, dim = EMBEDDING_DIM): number[] {
  const vec = new Array<number>(dim).fill(0);
  let h = 2166136261;
  const normalized = text.normalize("NFC");
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
    const idx = (h >>> 0) % dim;
    vec[idx] += ((h >>> 0) % 2000) / 1000 - 1;
  }
  // Mix length so empty vs short strings differ
  h = Math.imul(h ^ normalized.length, 16777619);
  vec[(h >>> 0) % dim] += 0.1;

  let sumSq = 0;
  for (const v of vec) sumSq += v * v;
  const norm = Math.sqrt(sumSq) || 1;
  return vec.map((v) => v / norm);
}

export class StubAiAssistantAdapter implements AiAssistantPort {
  async chat(input: AiChatInput): Promise<AiChatResult> {
    assertStubOk();
    return buildReply(input);
  }

  async *streamChat(input: AiChatInput): AsyncIterable<string> {
    assertStubOk();
    const result = buildReply(input);
    // Deterministic word-sized chunks (preserve whitespace tokens)
    const parts = result.content.split(/(\s+)/);
    for (const part of parts) {
      if (part.length > 0) yield part;
    }
  }
}

export class StubEmbeddingsAdapter implements AiEmbeddingsPort {
  readonly model = STUB_EMBEDDING_MODEL;

  async embed(texts: string[]): Promise<number[][]> {
    assertStubOk();
    return texts.map((t) => stubHashEmbedding(t));
  }
}

export const stubAiAssistantAdapter = new StubAiAssistantAdapter();
export const stubEmbeddingsAdapter = new StubEmbeddingsAdapter();

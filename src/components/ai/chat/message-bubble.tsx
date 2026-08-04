"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { MessageDto } from "@/lib/ai/conversations";
import { ResponseFeedback } from "@/components/ai/feedback/response-feedback";

function ExplainabilityLine({
  evidence,
}: {
  evidence: NonNullable<MessageDto["evidence"]>;
}) {
  const t = useTranslations("ai.chat");

  if (evidence.mode === "GENERAL") {
    return (
      <p className="px-1 text-xs text-on-surface-variant" data-ai-evidence="general">
        {t("generalMode")}
      </p>
    );
  }

  const hasCategories = evidence.chartCategories.length > 0;
  const hasSources = evidence.kbSources.length > 0;
  if (!hasCategories && !hasSources) return null;

  const detail = [
    hasCategories ? evidence.chartCategories.join(", ") : null,
    hasSources ? evidence.kbSources.slice(0, 3).join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <p className="px-1 text-xs text-on-surface-variant" data-ai-evidence="personalized">
      {t("basedOn", { detail })}
    </p>
  );
}

export function MessageBubble({
  message,
  className,
}: {
  message: Pick<MessageDto, "id" | "role" | "content" | "redFlagged" | "evidence"> | {
    id?: string;
    role: MessageDto["role"];
    content: string;
    redFlagged?: boolean;
    evidence?: MessageDto["evidence"];
  };
  className?: string;
}) {
  const isUser = message.role === "USER";
  const isNotice = message.role === "SYSTEM_NOTICE" || Boolean(message.redFlagged);
  const showFeedback =
    !isUser && message.role === "ASSISTANT" && message.id && !message.id.startsWith("tmp-");
  const evidence =
    !isUser && message.role === "ASSISTANT" && message.evidence ? message.evidence : null;

  return (
    <div
      className={cn(
        "flex max-w-[85%] flex-col gap-0.5",
        isUser && "ms-auto",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-xl px-4 py-2 text-sm",
          isUser && "bg-primary text-on-primary",
          isNotice && !isUser && "border border-error/30 bg-error-container text-error",
          !isUser && !isNotice && "bg-surface-container-high text-on-surface",
        )}
        data-ai-role={message.role}
        aria-live={isNotice ? "assertive" : undefined}
      >
        {message.content}
      </div>
      {evidence ? <ExplainabilityLine evidence={evidence} /> : null}
      {showFeedback ? <ResponseFeedback messageId={message.id} /> : null}
    </div>
  );
}

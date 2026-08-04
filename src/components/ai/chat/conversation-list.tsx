"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/lib/ai/conversations";

export function ConversationList({
  items,
  activeId,
  onSelect,
  onRename,
  onHide,
  onNew,
  className,
}: {
  items: ConversationSummary[];
  activeId?: string | null;
  onSelect: (id: string) => void;
  onRename?: (id: string, title: string) => void | Promise<void>;
  onHide?: (id: string) => void | Promise<void>;
  onNew?: () => void | Promise<void>;
  className?: string;
}) {
  const t = useTranslations("ai.conversations");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");

  return (
    <aside
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-low p-3 md:w-64",
        className,
      )}
      aria-label={t("listLabel")}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-headline text-sm text-primary">{t("title")}</h2>
        {onNew ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void onNew()}>
            {t("new")}
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-on-surface-variant">{t("empty")}</p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto md:max-h-[calc(100vh-16rem)]">
          {items.map((item) => {
            const selected = item.id === activeId;
            const isRenaming = renamingId === item.id;
            return (
              <li key={item.id}>
                {isRenaming ? (
                  <form
                    className="flex gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void onRename?.(item.id, titleDraft.trim() || item.title || t("untitled"));
                      setRenamingId(null);
                    }}
                  >
                    <Input
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      maxLength={120}
                      aria-label={t("rename")}
                      autoFocus
                    />
                    <Button type="submit" size="sm" variant="soft">
                      {t("save")}
                    </Button>
                  </form>
                ) : (
                  <div
                    className={cn(
                      "group flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm",
                      selected
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-surface-container-high text-on-surface",
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => onSelect(item.id)}
                    >
                      {item.title?.trim() || t("untitled")}
                    </button>
                    {onRename ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="opacity-70 group-hover:opacity-100"
                        onClick={() => {
                          setRenamingId(item.id);
                          setTitleDraft(item.title ?? "");
                        }}
                      >
                        {t("rename")}
                      </Button>
                    ) : null}
                    {onHide ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="opacity-70 group-hover:opacity-100"
                        onClick={() => void onHide(item.id)}
                      >
                        {t("hide")}
                      </Button>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

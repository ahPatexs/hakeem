"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PlatformSettingValueType } from "@prisma/client";
import { updatePlatformSetting } from "@/actions/admin/settings";

export function SettingsForm({
  settings,
}: {
  settings: Array<{ key: string; value: string; valueType: string }>;
}) {
  const t = useTranslations("admin.settings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form className="space-y-4">
      {settings.map((s) => (
        <div key={s.key} className="rounded-xl border border-outline-variant/20 p-4">
          <label className="block text-sm font-medium text-primary">{s.key}</label>
          {s.valueType === "BOOLEAN" ? (
            <button
              type="button"
              disabled={pending}
              className="mt-2 rounded-lg bg-primary px-3 py-1 text-xs text-on-primary"
              onClick={() =>
                startTransition(async () => {
                  await updatePlatformSetting({
                    key: s.key as never,
                    value: s.value === "true" ? "false" : "true",
                    valueType: PlatformSettingValueType.BOOLEAN,
                  });
                  router.refresh();
                })
              }
            >
              {s.value === "true" ? t("turnOff") : t("turnOn")} ({s.value})
            </button>
          ) : (
            <input
              defaultValue={s.value}
              className="mt-2 w-full rounded-lg border border-outline-variant/30 px-3 py-2 text-sm"
              onBlur={(e) =>
                startTransition(async () => {
                  await updatePlatformSetting({
                    key: s.key as never,
                    value: e.target.value,
                    valueType: s.valueType as PlatformSettingValueType,
                  });
                  router.refresh();
                })
              }
            />
          )}
        </div>
      ))}
    </form>
  );
}

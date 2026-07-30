"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { refreshSystemHealth } from "@/actions/admin/health";

export function HealthRefreshButton() {
  const t = useTranslations("admin.health");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await refreshSystemHealth();
          router.refresh();
        })
      }
    >
      {t("refresh")}
    </Button>
  );
}

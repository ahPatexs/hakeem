export { resolveLocale, formatSar, ASIA_RIYADH, type AppLocale } from "@/domain/platform/localization";

import { prisma } from "@/lib/prisma";
import { resolveLocale as domainResolveLocale, type AppLocale } from "@/domain/platform/localization";

/** Resolve locale for an authenticated user (portal preference wins). */
export async function resolveLocaleForUser(
  userId: string,
  acceptLanguage?: string | null,
): Promise<AppLocale> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      localePreference: true,
      portalSettings: { select: { locale: true } },
    },
  });
  const pref =
    user?.localePreference === "EN"
      ? "en"
      : user?.localePreference === "AR"
        ? "ar"
        : user?.portalSettings?.locale === "EN"
          ? "en"
          : user?.portalSettings?.locale === "AR"
            ? "ar"
            : null;
  return domainResolveLocale(acceptLanguage, pref);
}

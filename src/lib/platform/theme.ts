export const THEME_COOKIE = "hakeem-theme";

export type ThemePreference = "system" | "light" | "dark";

export function isThemePreference(value: string | undefined | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function themeCookieHeader(theme: ThemePreference) {
  return `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function shouldUseDarkClass(theme: string | undefined, prefersDark: boolean) {
  if (theme === "light") return false;
  if (theme === "dark") return true;
  return prefersDark;
}

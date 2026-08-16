import { THEME_COOKIE } from "@/lib/platform/theme";

/** Runs before paint so the saved theme applies on every portal. */
export function ThemeScript() {
  const js = `(() => {
    try {
      const match = document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]+)/);
      const theme = match ? decodeURIComponent(match[1]) : "system";
      const dark = theme === "dark" || (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    } catch (_) {}
  })();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

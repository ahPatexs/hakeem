"use client";

import { usePathname } from "@/i18n/routing";
import { hidesMarketingChrome } from "@/lib/auth-routes";

export function ChromeGate({
  nav,
  footer,
  children,
}: {
  nav: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideChrome = hidesMarketingChrome(pathname);

  return (
    <>
      {hideChrome ? null : nav}
      <main id="main-content">{children}</main>
      {hideChrome ? null : footer}
    </>
  );
}

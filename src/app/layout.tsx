import type { Metadata } from "next";
import "@/styles/globals.css";
import { resolveSiteOrigin } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(resolveSiteOrigin()),
  title: {
    default: "Hakeem",
    template: "%s | Hakeem",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import { describe, expect, it } from "vitest";
import { buildMetadata, resolveSiteOrigin } from "@/lib/seo";
import { buildAppCtaUrl } from "@/lib/cta";

describe("resolveSiteOrigin", () => {
  it("falls back when env is a placeholder", () => {
    const prev = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "[SENSITIVE]";
    expect(resolveSiteOrigin()).toBe("http://localhost:3000");
    process.env.NEXT_PUBLIC_SITE_URL = prev;
  });
});

describe("buildAppCtaUrl", () => {
  it("returns relative in-app book path", () => {
    expect(buildAppCtaUrl("book", { locale: "en", page: "home-hero" })).toBe(
      "/en/register?utm_source=website&utm_content=home-hero",
    );
  });
});

describe("buildMetadata home", () => {
  it("emits unique title, canonical, hreflang, OG and Twitter for EN home", () => {
    const meta = buildMetadata({
      locale: "en",
      path: "/",
      title: "Hakeem — AI-Powered Smart Healthcare",
      description: "Hakeem automates documentation in real-time.",
    });

    expect(meta.title).toContain("Hakeem");
    expect(meta.description).toBeTruthy();
    expect(meta.alternates?.canonical).toContain("/en");
    expect(meta.alternates?.languages?.ar).toContain("/ar");
    expect(meta.alternates?.languages?.["x-default"]).toContain("/ar");
    expect(meta.openGraph?.title).toBeTruthy();
    expect((meta.twitter as { card?: string } | undefined)?.card).toBe("summary_large_image");
  });
});

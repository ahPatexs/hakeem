import { describe, expect, it } from "vitest";
import { buildMetadata } from "@/lib/seo";

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
    expect(meta.twitter?.card).toBe("summary_large_image");
  });
});

import { describe, expect, it } from "vitest";
import { scanRedFlags } from "@/domain/ai/red-flags";

describe("scanRedFlags", () => {
  it("triggers on English chest pain", () => {
    const r = scanRedFlags("I have severe chest pain right now");
    expect(r.triggered).toBe(true);
    expect(r.category).toBe("chest_pain");
  });

  it("triggers on Arabic chest pain", () => {
    const r = scanRedFlags("أشعر بألم في الصدر منذ ساعة");
    expect(r.triggered).toBe(true);
    expect(r.category).toBe("chest_pain");
  });

  it("triggers on can't breathe (EN)", () => {
    const r = scanRedFlags("I can't breathe properly");
    expect(r.triggered).toBe(true);
    expect(r.category).toBe("breathing");
  });

  it("triggers on Arabic breathing distress", () => {
    const r = scanRedFlags("لا أستطيع أن أتنفس");
    expect(r.triggered).toBe(true);
    expect(r.category).toBe("breathing");
  });

  it("triggers on suicidal ideation (EN+AR)", () => {
    expect(scanRedFlags("I want to die tonight").category).toBe("suicidal");
    expect(scanRedFlags("أفكر في الانتحار").category).toBe("suicidal");
  });

  it("triggers on stroke symptoms (EN+AR)", () => {
    expect(scanRedFlags("sudden face drooping and slurred speech").category).toBe("stroke");
    expect(scanRedFlags("أعتقد أنها سكتة دماغية").category).toBe("stroke");
  });

  it("does not trigger on benign wellness questions", () => {
    expect(scanRedFlags("How much water should I drink daily?").triggered).toBe(false);
    expect(scanRedFlags("نصائح للنوم الجيد").triggered).toBe(false);
    expect(scanRedFlags("").triggered).toBe(false);
  });
});

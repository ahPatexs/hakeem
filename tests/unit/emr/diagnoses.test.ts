import { describe, expect, it } from "vitest";
import { isValidIcd10Format } from "@/domain/emr/diagnosis";

describe("isValidIcd10Format (FR-046, ICD-10 optional)", () => {
  it("accepts common loose ICD-10 / ICD-10-CM formats", () => {
    expect(isValidIcd10Format("J45")).toBe(true);
    expect(isValidIcd10Format("E11.9")).toBe(true);
    expect(isValidIcd10Format("I10")).toBe(true);
    expect(isValidIcd10Format("s72.001a")).toBe(true);
  });

  it("rejects malformed codes", () => {
    expect(isValidIcd10Format("12345")).toBe(false);
    expect(isValidIcd10Format("ABC")).toBe(false);
    expect(isValidIcd10Format("J4")).toBe(false);
    expect(isValidIcd10Format("")).toBe(false);
    expect(isValidIcd10Format("J45.")).toBe(false);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(isValidIcd10Format("  J45  ")).toBe(true);
  });
});

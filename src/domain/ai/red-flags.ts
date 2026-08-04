export type RedFlagCategory =
  | "chest_pain"
  | "breathing"
  | "suicidal"
  | "stroke"
  | "severe_bleeding"
  | "anaphylaxis"
  | "altered_consciousness";

export type RedFlagResult = {
  triggered: boolean;
  category?: RedFlagCategory;
};

type LexiconEntry = {
  category: RedFlagCategory;
  patterns: RegExp[];
};

/**
 * Bilingual (EN+AR) emergency lexicon. Deterministic — used pre-provider
 * so SC-003 can be guaranteed in tests.
 */
const LEXICON: ReadonlyArray<LexiconEntry> = [
  {
    category: "chest_pain",
    patterns: [
      /\bchest\s+pain\b/i,
      /\bpain\s+in\s+(my\s+)?chest\b/i,
      /\bheart\s+attack\b/i,
      /ألم\s*(في\s*)?(الصدر|قلبي)/,
      /ذبحة|جلطة\s*قلبية|نوبة\s*قلبية/,
    ],
  },
  {
    category: "breathing",
    patterns: [
      /\bcan'?t\s+breathe\b/i,
      /\bcannot\s+breathe\b/i,
      /\bshort(ness)?\s+of\s+breath\b/i,
      /\bdifficulty\s+breathing\b/i,
      /لا\s*أ(ستطيع|قدر)\s*(أن\s*)?أتنفس/,
      /ضيق\s*(في\s*)?التنفس/,
      /صعوبة\s*(في\s*)?التنفس/,
    ],
  },
  {
    category: "suicidal",
    patterns: [
      /\bsuicid(e|al)\b/i,
      /\bkill\s+myself\b/i,
      /\bwant\s+to\s+die\b/i,
      /\bend\s+my\s+life\b/i,
      /انتحار|أنتحر/,
      /أريد\s*(أن\s*)?أموت/,
      /أقتل\s*نفسي/,
    ],
  },
  {
    category: "stroke",
    patterns: [
      /\bstroke\b/i,
      /\bface\s+droop(ing)?\b/i,
      /\bslurred\s+speech\b/i,
      /\bsudden\s+(weakness|numbness)\b/i,
      /\barm\s+weakness\b/i,
      /سكتة\s*(دماغية)?/,
      /تدلي\s*(في\s*)?الوجه|انحراف\s*الفم/,
      /كلام\s*غير\s*واضح|ثقل\s*(في\s*)?الكلام/,
      /ضعف\s*مفاجئ/,
    ],
  },
  {
    category: "severe_bleeding",
    patterns: [
      /\bsevere\s+bleed(ing)?\b/i,
      /\buncontrollable\s+bleed(ing)?\b/i,
      /\bbleeding\s+won'?t\s+stop\b/i,
      /نزيف\s*(شديد|لا\s*يتوقف)/,
      /ينزف\s*كثيرا/,
    ],
  },
  {
    category: "anaphylaxis",
    patterns: [
      /\banaphylax(is|tic)\b/i,
      /\bthroat\s+(is\s+)?(closing|swelling)\b/i,
      /\bsevere\s+allergic\s+reaction\b/i,
      /صدمة\s*تحسسية|تفاعل\s*تحسسي\s*شديد/,
      /الحلق\s*(ينغلق|يتورم|منغلق)/,
    ],
  },
  {
    category: "altered_consciousness",
    patterns: [
      /\bpass(ed|ing)?\s+out\b/i,
      /\bunconscious\b/i,
      /\bseizure\b/i,
      /\bconvulsion(s)?\b/i,
      /فقدان\s*الوعي|أغمي\s*علي[هه]?/,
      /تشنج(ات)?|نوبة\s*صرع/,
    ],
  },
];

/**
 * Scan free text for emergency red-flag patterns (EN + AR).
 * Returns the first matching category; empty / benign text → not triggered.
 */
export function scanRedFlags(text: string): RedFlagResult {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) return { triggered: false };

  for (const entry of LEXICON) {
    for (const pattern of entry.patterns) {
      if (pattern.test(trimmed)) {
        return { triggered: true, category: entry.category };
      }
    }
  }
  return { triggered: false };
}

/** Alias used by lib/ai facades. */
export const detectRedFlags = scanRedFlags;

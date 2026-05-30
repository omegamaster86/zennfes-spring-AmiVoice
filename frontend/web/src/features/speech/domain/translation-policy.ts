import type { DetectedLanguage, LanguageOverride } from "./types";

const JA_CHAR_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
const LATIN_CHAR_RE = /[A-Za-z]/;

export function detectLanguage(text: string): DetectedLanguage {
  const trimmed = text.trim();
  if (!trimmed) {
    return "unknown";
  }

  const chars = [...trimmed];
  const jaCount = chars.filter((c) => JA_CHAR_RE.test(c)).length;
  const latinCount = chars.filter((c) => LATIN_CHAR_RE.test(c)).length;
  const jaRatio = jaCount / chars.length;
  const latinRatio = latinCount / chars.length;

  if (jaRatio >= 0.15) {
    return "ja";
  }
  if (latinRatio >= 0.25) {
    return "en";
  }
  return "unknown";
}

export function resolveTranslationPolicy(
  detected: DetectedLanguage,
  languageOverride?: LanguageOverride | null,
): {
  policy: "translated" | "passthrough" | "needs_manual_language";
  shouldTranslate: boolean;
  needsManualLanguage: boolean;
} {
  const effective = languageOverride ?? detected;

  if (effective === "ja") {
    return {
      policy: "passthrough",
      shouldTranslate: false,
      needsManualLanguage: false,
    };
  }

  if (effective === "en") {
    return {
      policy: "translated",
      shouldTranslate: true,
      needsManualLanguage: false,
    };
  }

  return {
    policy: "needs_manual_language",
    shouldTranslate: false,
    needsManualLanguage: true,
  };
}

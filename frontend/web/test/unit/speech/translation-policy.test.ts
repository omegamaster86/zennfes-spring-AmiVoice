import { describe, expect, it } from "vitest";
import {
  detectLanguage,
  resolveTranslationPolicy,
} from "@/features/speech/domain/translation-policy";

describe("detectLanguage", () => {
  it("日本語テキストを ja と判定する", () => {
    expect(detectLanguage("音声認識はAmiVoiceです")).toBe("ja");
  });

  it("英語テキストを en と判定する", () => {
    expect(detectLanguage("Hello world, this is a test.")).toBe("en");
  });

  it("空文字は unknown と判定する", () => {
    expect(detectLanguage("   ")).toBe("unknown");
  });
});

describe("resolveTranslationPolicy", () => {
  it("英語判定時は翻訳対象とする", () => {
    const result = resolveTranslationPolicy("en");
    expect(result.policy).toBe("translated");
    expect(result.shouldTranslate).toBe(true);
    expect(result.needsManualLanguage).toBe(false);
  });

  it("日本語判定時はパススルーとする", () => {
    const result = resolveTranslationPolicy("ja");
    expect(result.policy).toBe("passthrough");
    expect(result.shouldTranslate).toBe(false);
  });

  it("不明時は手動言語選択を促す", () => {
    const result = resolveTranslationPolicy("unknown");
    expect(result.policy).toBe("needs_manual_language");
    expect(result.needsManualLanguage).toBe(true);
  });

  it("手動で ja を指定した場合はパススルーとする", () => {
    const result = resolveTranslationPolicy("unknown", "ja");
    expect(result.policy).toBe("passthrough");
  });
});

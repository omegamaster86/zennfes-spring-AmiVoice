import { recognizeWithAmiVoice } from "../adapters/amivoice-client";
import { translateEnglishToJapanese } from "../adapters/llm-translator";
import { insertTranscriptionRecord } from "../adapters/transcription-repository";
import type {
  CreateTranscriptionInput,
  InputSource,
  LanguageOverride,
  TranscriptionRecordRow,
} from "./types";
import { detectLanguage, resolveTranslationPolicy } from "./translation-policy";

export type TranscribeSuccess = {
  kind: "saved";
  record: TranscriptionRecordRow;
  recognizedText: string;
  finalText: string;
  translationApplied: boolean;
};

export type TranscribeNeedsLanguage = {
  kind: "needs_manual_language";
  recognizedText: string;
  detectedLanguage: string;
  utteranceId: string | null;
  confidence: number | null;
  inputSource: InputSource;
};

export type TranscribeResult = TranscribeSuccess | TranscribeNeedsLanguage;

export async function runTranscriptionPipeline(params: {
  audio: Buffer;
  mimeType: string;
  inputSource: InputSource;
  languageOverride?: LanguageOverride | null;
}): Promise<TranscribeResult> {
  const recognition = await recognizeWithAmiVoice(params.audio, params.mimeType);
  const detected = detectLanguage(recognition.recognizedText);
  const policyResult = resolveTranslationPolicy(
    detected,
    params.languageOverride,
  );

  if (policyResult.needsManualLanguage) {
    return {
      kind: "needs_manual_language",
      recognizedText: recognition.recognizedText,
      detectedLanguage: detected,
      utteranceId: recognition.utteranceId,
      confidence: recognition.confidence,
      inputSource: params.inputSource,
    };
  }

  let finalText = recognition.recognizedText;
  if (policyResult.shouldTranslate) {
    finalText = await translateEnglishToJapanese(recognition.recognizedText);
  }

  const record = await insertTranscriptionRecord({
    recognizedText: recognition.recognizedText,
    finalText,
    translationPolicy: policyResult.policy,
    inputSource: params.inputSource,
    detectedLanguage: detected,
    languageOverride: params.languageOverride ?? null,
    amivoiceUtteranceId: recognition.utteranceId,
    confidence: recognition.confidence,
  });

  return {
    kind: "saved",
    record,
    recognizedText: recognition.recognizedText,
    finalText,
    translationApplied: policyResult.shouldTranslate,
  };
}

export async function confirmLanguageAndSave(params: {
  recognizedText: string;
  language: LanguageOverride;
  inputSource: InputSource;
  amivoiceUtteranceId?: string | null;
  confidence?: number | null;
}): Promise<TranscriptionRecordRow> {
  const detected = detectLanguage(params.recognizedText);
  const policyResult = resolveTranslationPolicy(detected, params.language);

  let finalText = params.recognizedText;
  if (policyResult.shouldTranslate) {
    finalText = await translateEnglishToJapanese(params.recognizedText);
  }

  const input: CreateTranscriptionInput = {
    recognizedText: params.recognizedText,
    finalText,
    translationPolicy: policyResult.shouldTranslate ? "manual" : "passthrough",
    inputSource: params.inputSource,
    detectedLanguage: detected,
    languageOverride: params.language,
    amivoiceUtteranceId: params.amivoiceUtteranceId ?? null,
    confidence: params.confidence ?? null,
  };

  return insertTranscriptionRecord(input);
}

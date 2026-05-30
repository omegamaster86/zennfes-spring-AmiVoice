export type InputSource = "mic" | "file";

export type TranslationPolicy =
  | "translated"
  | "passthrough"
  | "manual"
  | "needs_manual_language";

export type DetectedLanguage = "en" | "ja" | "unknown";

export type LanguageOverride = "en" | "ja";

export type TranscriptionRecordRow = {
  id: string;
  recognized_text: string;
  final_text: string;
  translation_policy: TranslationPolicy;
  input_source: InputSource;
  detected_language: string | null;
  language_override: string | null;
  amivoice_utterance_id: string | null;
  confidence: number | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

export type CreateTranscriptionInput = {
  recognizedText: string;
  finalText: string;
  translationPolicy: TranslationPolicy;
  inputSource: InputSource;
  detectedLanguage: DetectedLanguage | null;
  languageOverride: LanguageOverride | null;
  amivoiceUtteranceId: string | null;
  confidence: number | null;
  metadataJson?: Record<string, unknown> | null;
};

export type AmiVoiceRecognitionResult = {
  recognizedText: string;
  utteranceId: string | null;
  confidence: number | null;
};

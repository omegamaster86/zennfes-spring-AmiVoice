import type { TranscriptionRecordRow } from "../domain/types";

export function toRecordDto(row: TranscriptionRecordRow) {
  return {
    id: row.id,
    recognizedText: row.recognized_text,
    finalText: row.final_text,
    translationPolicy: row.translation_policy,
    inputSource: row.input_source,
    detectedLanguage: row.detected_language,
    languageOverride: row.language_override,
    amivoiceUtteranceId: row.amivoice_utterance_id,
    confidence: row.confidence,
    metadataJson: row.metadata_json,
    createdAt: row.created_at,
  };
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

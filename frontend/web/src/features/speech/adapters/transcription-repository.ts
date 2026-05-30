import { createAdminClient } from "@/services/supabase/admin";
import type { Json } from "@/types/database.types";
import type {
  CreateTranscriptionInput,
  TranscriptionRecordRow,
} from "../domain/types";

const PROGRAM = "speech";

function mapRow(row: Record<string, unknown>): TranscriptionRecordRow {
  return {
    id: String(row.id),
    recognized_text: String(row.recognized_text),
    final_text: String(row.final_text),
    translation_policy: String(
      row.translation_policy,
    ) as TranscriptionRecordRow["translation_policy"],
    input_source: String(row.input_source) as TranscriptionRecordRow["input_source"],
    detected_language:
      row.detected_language != null ? String(row.detected_language) : null,
    language_override:
      row.language_override != null ? String(row.language_override) : null,
    amivoice_utterance_id:
      row.amivoice_utterance_id != null
        ? String(row.amivoice_utterance_id)
        : null,
    confidence:
      row.confidence != null ? Number(row.confidence) : null,
    metadata_json:
      row.metadata_json != null &&
      typeof row.metadata_json === "object" &&
      !Array.isArray(row.metadata_json)
        ? (row.metadata_json as Record<string, unknown>)
        : null,
    created_at: String(row.created_at),
  };
}

export async function insertTranscriptionRecord(
  input: CreateTranscriptionInput,
): Promise<TranscriptionRecordRow> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("t_transcription_record")
    .insert({
      recognized_text: input.recognizedText,
      final_text: input.finalText,
      translation_policy: input.translationPolicy,
      input_source: input.inputSource,
      detected_language: input.detectedLanguage,
      language_override: input.languageOverride,
      amivoice_utterance_id: input.amivoiceUtteranceId,
      confidence: input.confidence,
      metadata_json: (input.metadataJson ?? null) as Json | null,
      created_program: PROGRAM,
      updated_program: PROGRAM,
    })
    .select(
      "id, recognized_text, final_text, translation_policy, input_source, detected_language, language_override, amivoice_utterance_id, confidence, metadata_json, created_at",
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "変換レコードの保存に失敗しました");
  }

  return mapRow(data as Record<string, unknown>);
}

export async function listTranscriptionRecords(options?: {
  limit?: number;
  offset?: number;
}): Promise<TranscriptionRecordRow[]> {
  const supabase = createAdminClient();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const { data, error } = await supabase
    .from("t_transcription_record")
    .select(
      "id, recognized_text, final_text, translation_policy, input_source, detected_language, language_override, amivoice_utterance_id, confidence, metadata_json, created_at",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapRow(row as Record<string, unknown>),
  );
}

export async function getTranscriptionRecordById(
  id: string,
): Promise<TranscriptionRecordRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("t_transcription_record")
    .select(
      "id, recognized_text, final_text, translation_policy, input_source, detected_language, language_override, amivoice_utterance_id, confidence, metadata_json, created_at",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapRow(data as Record<string, unknown>);
}

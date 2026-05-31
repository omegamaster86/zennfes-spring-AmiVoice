/**
 * 型定義のエクスポート
 */

import type { Tables, TablesInsert, TablesUpdate } from "./database.types";

export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./database.types";

export type TranscriptionRecord = Tables<"t_transcription_record">;
export type TranscriptionRecordInsert = TablesInsert<"t_transcription_record">;
export type TranscriptionRecordUpdate = TablesUpdate<"t_transcription_record">;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      t_transcription_record: {
        Row: {
          amivoice_utterance_id: string | null;
          confidence: number | null;
          created_at: string;
          created_program: string;
          deleted_at: string | null;
          detected_language: string | null;
          final_text: string;
          id: string;
          input_source: string;
          language_override: string | null;
          lock_no: number;
          metadata_json: Json | null;
          recognized_text: string;
          translation_policy: string;
          updated_at: string;
          updated_program: string;
        };
        Insert: {
          amivoice_utterance_id?: string | null;
          confidence?: number | null;
          created_at?: string;
          created_program: string;
          deleted_at?: string | null;
          detected_language?: string | null;
          final_text: string;
          id?: string;
          input_source: string;
          language_override?: string | null;
          lock_no?: number;
          metadata_json?: Json | null;
          recognized_text: string;
          translation_policy: string;
          updated_at?: string;
          updated_program: string;
        };
        Update: {
          amivoice_utterance_id?: string | null;
          confidence?: number | null;
          created_at?: string;
          created_program?: string;
          deleted_at?: string | null;
          detected_language?: string | null;
          final_text?: string;
          id?: string;
          input_source?: string;
          language_override?: string | null;
          lock_no?: number;
          metadata_json?: Json | null;
          recognized_text?: string;
          translation_policy?: string;
          updated_at?: string;
          updated_program?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_uuid_v7: { Args: never; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

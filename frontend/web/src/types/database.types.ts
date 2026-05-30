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

      t_file_upload: {
        Row: {
          bucket: string;
          created_at: string;
          created_by: string | null;
          created_program: string;
          deleted_at: string | null;
          file_name: string;
          id: string;
          lock_no: number;
          mime_type: string | null;
          original_name: string;
          patched_at: string | null;
          patched_by: string | null;
          size_bytes: number;
          storage_path: string;
          updated_at: string;
          updated_by: string | null;
          updated_program: string;
          url: string;
          user_id: string;
        };
        Insert: {
          bucket: string;
          created_at?: string;
          created_by?: string | null;
          created_program: string;
          deleted_at?: string | null;
          file_name?: string;
          id?: string;
          lock_no?: number;
          mime_type?: string | null;
          original_name: string;
          patched_at?: string | null;
          patched_by?: string | null;
          size_bytes: number;
          storage_path: string;
          updated_at?: string;
          updated_by?: string | null;
          updated_program: string;
          url: string;
          user_id: string;
        };
        Update: {
          bucket?: string;
          created_at?: string;
          created_by?: string | null;
          created_program?: string;
          deleted_at?: string | null;
          file_name?: string;
          id?: string;
          lock_no?: number;
          mime_type?: string | null;
          original_name?: string;
          patched_at?: string | null;
          patched_by?: string | null;
          size_bytes?: number;
          storage_path?: string;
          updated_at?: string;
          updated_by?: string | null;
          updated_program?: string;
          url?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "t_file_upload_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "m_user";
            referencedColumns: ["id"];
          },
        ];
      };

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


      is_admin: { Args: never; Returns: boolean };
      mark_stripe_webhook_event_processed: {
        Args: { p_error_message?: string; p_stripe_event_id: string };
        Returns: undefined;
      };
      pgroonga_command:
        | { Args: { groongacommand: string }; Returns: string }
        | {
            Args: { arguments: string[]; groongacommand: string };
            Returns: string;
          };
      pgroonga_command_escape_value: {
        Args: { value: string };
        Returns: string;
      };
      pgroonga_condition: {
        Args: {
          column_name?: string;
          fuzzy_max_distance_ratio?: number;
          index_name?: string;
          query?: string;
          schema_name?: string;
          scorers?: string[];
          weights?: number[];
        };
        Returns: Database["public"]["CompositeTypes"]["pgroonga_condition"];
        SetofOptions: {
          from: "*";
          to: "pgroonga_condition";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      pgroonga_equal_query_text_array: {
        Args: { query: string; targets: string[] };
        Returns: boolean;
      };
      pgroonga_equal_query_text_array_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"];
              targets: string[];
            };
            Returns: boolean;
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"];
              targets: string[];
            };
            Returns: boolean;
          };
      pgroonga_equal_query_varchar_array: {
        Args: { query: string; targets: string[] };
        Returns: boolean;
      };
      pgroonga_equal_query_varchar_array_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"];
              targets: string[];
            };
            Returns: boolean;
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"];
              targets: string[];
            };
            Returns: boolean;
          };
      pgroonga_equal_text: {
        Args: { other: string; target: string };
        Returns: boolean;
      };
      pgroonga_equal_text_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"];
              target: string;
            };
            Returns: boolean;
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"];
              target: string;
            };
            Returns: boolean;
          };
      pgroonga_equal_varchar: {
        Args: { other: string; target: string };
        Returns: boolean;
      };
      pgroonga_equal_varchar_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"];
              target: string;
            };
            Returns: boolean;
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"];
              target: string;
            };
            Returns: boolean;
          };
      pgroonga_escape:
        | {
            Args: { value: number };
            Returns: {
              error: true;
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved";
          }
        | {
            Args: { value: boolean };
            Returns: {
              error: true;
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved";
          }
        | {
            Args: { value: number };
            Returns: {
              error: true;
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved";
          }
        | {
            Args: { value: number };
            Returns: {
              error: true;
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved";
          }
        | {
            Args: { value: number };
            Returns: {
              error: true;
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved";
          }
        | {
            Args: { value: number };
            Returns: {
              error: true;
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved";
          }
        | {
            Args: { value: string };
            Returns: {
              error: true;
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved";
          }
        | {
            Args: { special_characters: string; value: string };
            Returns: string;
          }
        | {
            Args: { value: string };
            Returns: {
              error: true;
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved";
          }
        | {
            Args: { value: string };
            Returns: {
              error: true;
            } & "Could not choose the best candidate function between: public.pgroonga_escape(value => bool), public.pgroonga_escape(value => int8), public.pgroonga_escape(value => int2), public.pgroonga_escape(value => int4), public.pgroonga_escape(value => text), public.pgroonga_escape(value => float4), public.pgroonga_escape(value => float8), public.pgroonga_escape(value => timestamp), public.pgroonga_escape(value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved";
          };
      pgroonga_flush: { Args: { indexname: unknown }; Returns: boolean };
      pgroonga_highlight_html:
        | { Args: { keywords: string[]; target: string }; Returns: string }
        | {
            Args: { indexname: unknown; keywords: string[]; target: string };
            Returns: string;
          }
        | { Args: { keywords: string[]; targets: string[] }; Returns: string[] }
        | {
            Args: { indexname: unknown; keywords: string[]; targets: string[] };
            Returns: string[];
          };
      pgroonga_index_column_name:
        | { Args: { columnindex: number; indexname: unknown }; Returns: string }
        | { Args: { columnname: string; indexname: unknown }; Returns: string };
      pgroonga_is_writable: { Args: never; Returns: boolean };
      pgroonga_list_broken_indexes: { Args: never; Returns: string[] };
      pgroonga_list_lagged_indexes: { Args: never; Returns: string[] };
      pgroonga_match_positions_byte:
        | { Args: { keywords: string[]; target: string }; Returns: number[] }
        | {
            Args: { indexname: unknown; keywords: string[]; target: string };
            Returns: number[];
          };
      pgroonga_match_positions_character:
        | { Args: { keywords: string[]; target: string }; Returns: number[] }
        | {
            Args: { indexname: unknown; keywords: string[]; target: string };
            Returns: number[];
          };
      pgroonga_match_term:
        | { Args: { target: string; term: string }; Returns: boolean }
        | { Args: { target: string[]; term: string }; Returns: boolean }
        | { Args: { target: string; term: string }; Returns: boolean }
        | { Args: { target: string[]; term: string }; Returns: boolean };
      pgroonga_match_text_array_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"];
              target: string[];
            };
            Returns: boolean;
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"];
              target: string[];
            };
            Returns: boolean;
          };
      pgroonga_match_text_array_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"];
          target: string[];
        };
        Returns: boolean;
      };
      pgroonga_match_text_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"];
              target: string;
            };
            Returns: boolean;
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"];
              target: string;
            };
            Returns: boolean;
          };
      pgroonga_match_text_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"];
          target: string;
        };
        Returns: boolean;
      };
      pgroonga_match_varchar_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"];
              target: string;
            };
            Returns: boolean;
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"];
              target: string;
            };
            Returns: boolean;
          };
      pgroonga_match_varchar_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"];
          target: string;
        };
        Returns: boolean;
      };
      pgroonga_normalize:
        | { Args: { target: string }; Returns: string }
        | { Args: { normalizername: string; target: string }; Returns: string };
      pgroonga_prefix_varchar_condition:
        | {
            Args: {
              conditoin: Database["public"]["CompositeTypes"]["pgroonga_condition"];
              target: string;
            };
            Returns: boolean;
          }
        | {
            Args: {
              conditoin: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"];
              target: string;
            };
            Returns: boolean;
          };
      pgroonga_query_escape: { Args: { query: string }; Returns: string };
      pgroonga_query_expand: {
        Args: {
          query: string;
          synonymscolumnname: string;
          tablename: unknown;
          termcolumnname: string;
        };
        Returns: string;
      };
      pgroonga_query_extract_keywords: {
        Args: { index_name?: string; query: string };
        Returns: string[];
      };
      pgroonga_query_text_array_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"];
              targets: string[];
            };
            Returns: boolean;
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"];
              targets: string[];
            };
            Returns: boolean;
          };
      pgroonga_query_text_array_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"];
          targets: string[];
        };
        Returns: boolean;
      };
      pgroonga_query_text_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"];
              target: string;
            };
            Returns: boolean;
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"];
              target: string;
            };
            Returns: boolean;
          };
      pgroonga_query_text_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"];
          target: string;
        };
        Returns: boolean;
      };
      pgroonga_query_varchar_condition:
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_condition"];
              target: string;
            };
            Returns: boolean;
          }
        | {
            Args: {
              condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition"];
              target: string;
            };
            Returns: boolean;
          };
      pgroonga_query_varchar_condition_with_scorers: {
        Args: {
          condition: Database["public"]["CompositeTypes"]["pgroonga_full_text_search_condition_with_scorers"];
          target: string;
        };
        Returns: boolean;
      };
      pgroonga_regexp_text_array: {
        Args: { pattern: string; targets: string[] };
        Returns: boolean;
      };
      pgroonga_regexp_text_array_condition: {
        Args: {
          pattern: Database["public"]["CompositeTypes"]["pgroonga_condition"];
          targets: string[];
        };
        Returns: boolean;
      };
      pgroonga_result_to_jsonb_objects: {
        Args: { result: Json };
        Returns: Json;
      };
      pgroonga_result_to_recordset: {
        Args: { result: Json };
        Returns: Record<string, unknown>[];
      };
      pgroonga_score:
        | { Args: { row: Record<string, unknown> }; Returns: number }
        | { Args: { ctid: unknown; tableoid: unknown }; Returns: number };
      pgroonga_set_writable: {
        Args: { newwritable: boolean };
        Returns: boolean;
      };
      pgroonga_snippet_html: {
        Args: { keywords: string[]; target: string; width?: number };
        Returns: string[];
      };
      pgroonga_table_name: { Args: { indexname: unknown }; Returns: string };
      pgroonga_tokenize: {
        Args: { options: string[]; target: string };
        Returns: Json[];
      };
      pgroonga_vacuum: { Args: never; Returns: boolean };
      pgroonga_wal_apply:
        | { Args: never; Returns: number }
        | { Args: { indexname: unknown }; Returns: number };
      pgroonga_wal_set_applied_position:
        | { Args: never; Returns: boolean }
        | { Args: { block: number; offset: number }; Returns: boolean }
        | { Args: { indexname: unknown }; Returns: boolean }
        | {
            Args: { block: number; indexname: unknown; offset: number };
            Returns: boolean;
          };
      pgroonga_wal_status: {
        Args: never;
        Returns: {
          current_block: number;
          current_offset: number;
          current_size: number;
          last_block: number;
          last_offset: number;
          last_size: number;
          name: string;
          oid: unknown;
        }[];
      };
      pgroonga_wal_truncate:
        | { Args: never; Returns: number }
        | { Args: { indexname: unknown }; Returns: number };
      sel_current_subscription_by_user: {
        Args: { p_auth_user_id: string };
        Returns: {
          amount: number;
          billing_interval: Database["public"]["Enums"]["billing_interval"];
          cancel_at_period_end: boolean;
          canceled_at: string;
          currency: string;
          current_period_end: string;
          current_period_start: string;
          id: string;
          latest_invoice_status: string;
          plan_id: string;
          plan_name: string;
          started_at: string;
          status: Database["public"]["Enums"]["subscription_status"];
          stripe_price_id: string;
          stripe_subscription_id: string;
        }[];
      };
      sel_purchase_item_for_charge: {
        Args: { p_purchase_item_id: string };
        Returns: {
          amount: number;
          currency: string;
          id: string;
          name: string;
        }[];
      };
      sel_purchase_items: {
        Args: never;
        Returns: {
          amount: number;
          currency: string;
          description: string;
          display_order: number;
          id: string;
          name: string;
        }[];
      };
      sel_purchases_by_user: {
        Args: { p_auth_user_id: string; p_limit?: number };
        Returns: {
          amount: number;
          created_at: string;
          currency: string;
          failure_reason: string;
          id: string;
          item_name: string;
          status: Database["public"]["Enums"]["purchase_status"];
          succeeded_at: string;
        }[];
      };
      sel_stripe_payment_methods: {
        Args: { p_auth_user_id: string };
        Returns: {
          card_brand: string;
          card_exp_month: string;
          card_exp_year: string;
          card_holder_name: string;
          card_last4: string;
          id: string;
          is_default: boolean;
          stripe_payment_method_id: string;
          type: Database["public"]["Enums"]["payment_method_type"];
        }[];
      };
      sel_subscription_plan_for_charge: {
        Args: { p_plan_id: string };
        Returns: {
          amount: number;
          billing_interval: Database["public"]["Enums"]["billing_interval"];
          currency: string;
          id: string;
          name: string;
          stripe_price_id: string;
        }[];
      };
      sel_subscription_plans: {
        Args: never;
        Returns: {
          amount: number;
          billing_interval: Database["public"]["Enums"]["billing_interval"];
          currency: string;
          description: string;
          display_order: number;
          id: string;
          name: string;
          stripe_price_id: string;
        }[];
      };
      sel_todos_by_user: {
        Args: { target_auth_user_id: string };
        Returns: {
          description: string;
          id: string;
          priority: Database["public"]["Enums"]["todo_priority"];
          status: Database["public"]["Enums"]["todo_status"];
          title: string;
        }[];
      };
      sel_todos_search:
        | {
            Args: {
              p_keyword_list?: string[];
              p_limit?: number;
              p_offset?: number;
              p_search_query?: string;
            };
            Returns: {
              description: string;
              id: string;
              priority: Database["public"]["Enums"]["todo_priority"];
              relevance_score: number;
              status: Database["public"]["Enums"]["todo_status"];
              title: string;
            }[];
          }
        | {
            Args: {
              p_keyword?: string;
              p_limit?: number;
              p_offset?: number;
              target_auth_user_id: string;
            };
            Returns: {
              description: string;
              id: string;
              priority: Database["public"]["Enums"]["todo_priority"];
              status: Database["public"]["Enums"]["todo_status"];
              title: string;
            }[];
          };
      upd_m_user_stripe_customer_id: {
        Args: {
          p_auth_user_id: string;
          p_stripe_customer_id: string;
          p_updated_program?: string;
        };
        Returns: {
          email: string;
          id: string;
          stripe_customer_id: string;
        }[];
      };
      upd_stripe_payment_method: {
        Args: {
          p_auth_user_id: string;
          p_card_holder_name: string;
          p_set_default: boolean;
          p_stripe_payment_method_id: string;
          p_updated_program?: string;
        };
        Returns: {
          card_holder_name: string;
          id: string;
          is_default: boolean;
          stripe_payment_method_id: string;
        }[];
      };
      upd_t_purchase_result: {
        Args: {
          p_failure_reason?: string;
          p_purchase_id: string;
          p_status: string;
          p_stripe_payment_intent_id?: string;
          p_updated_program?: string;
        };
        Returns: {
          out_failure_reason: string;
          out_id: string;
          out_status: Database["public"]["Enums"]["purchase_status"];
          out_stripe_payment_intent_id: string;
          out_succeeded_at: string;
        }[];
      };
      upd_t_subscription_from_stripe: {
        Args: {
          p_cancel_at_period_end?: boolean;
          p_canceled_at?: string;
          p_current_period_end?: string;
          p_current_period_start?: string;
          p_ended_at?: string;
          p_latest_invoice_id?: string;
          p_latest_invoice_status?: string;
          p_started_at?: string;
          p_status?: string;
          p_stripe_subscription_id?: string;
          p_subscription_id?: string;
          p_updated_program?: string;
        };
        Returns: {
          out_cancel_at_period_end: boolean;
          out_current_period_end: string;
          out_id: string;
          out_status: Database["public"]["Enums"]["subscription_status"];
          out_stripe_subscription_id: string;
        }[];
      };
      upd_todo_status: {
        Args: {
          p_status: Database["public"]["Enums"]["todo_status"];
          p_todo_id: string;
          p_updated_program?: string;
        };
        Returns: {
          description: string;
          id: string;
          priority: Database["public"]["Enums"]["todo_priority"];
          status: Database["public"]["Enums"]["todo_status"];
          title: string;
        }[];
      };
    };
    Enums: {
      billing_interval: "month" | "year";
      fcm_platform: "android" | "ios";
      payment_method_type: "card";
      purchase_status: "pending" | "succeeded" | "failed" | "requires_action";
      subscription_status:
        | "incomplete"
        | "incomplete_expired"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "trialing"
        | "paused";
      todo_priority: "low" | "medium" | "high";
      todo_status: "pending" | "in_progress" | "completed" | "cancelled";
      user_role: "admin" | "user" | "guest";
    };
    CompositeTypes: {
      pgroonga_condition: {
        query: string | null;
        weigths: number[] | null;
        scorers: string[] | null;
        schema_name: string | null;
        index_name: string | null;
        column_name: string | null;
        fuzzy_max_distance_ratio: number | null;
      };
      pgroonga_full_text_search_condition: {
        query: string | null;
        weigths: number[] | null;
        indexname: string | null;
      };
      pgroonga_full_text_search_condition_with_scorers: {
        query: string | null;
        weigths: number[] | null;
        scorers: string[] | null;
        indexname: string | null;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      billing_interval: ["month", "year"],
      fcm_platform: ["android", "ios"],
      payment_method_type: ["card"],
      purchase_status: ["pending", "succeeded", "failed", "requires_action"],
      subscription_status: [
        "incomplete",
        "incomplete_expired",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "trialing",
        "paused",
      ],
      todo_priority: ["low", "medium", "high"],
      todo_status: ["pending", "in_progress", "completed", "cancelled"],
      user_role: ["admin", "user", "guest"],
    },
  },
} as const;

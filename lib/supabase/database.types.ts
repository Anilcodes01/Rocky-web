export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      rocky_conversation_summaries: {
        Row: {
          conversation_id: string;
          covered_until_message_id: string | null;
          created_at: string;
          created_by: string;
          id: string;
          kind: string;
          summary_text: string;
          summary_version: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          covered_until_message_id?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          kind?: string;
          summary_text: string;
          summary_version?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          covered_until_message_id?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          kind?: string;
          summary_text?: string;
          summary_version?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rocky_conversation_summaries_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "rocky_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rocky_conversation_summaries_covered_until_message_id_fkey";
            columns: ["covered_until_message_id"];
            isOneToOne: false;
            referencedRelation: "rocky_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      rocky_conversations: {
        Row: {
          archived_at: string | null;
          created_at: string;
          device_id: string | null;
          id: string;
          last_message_at: string;
          started_at: string;
          status: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          device_id?: string | null;
          id?: string;
          last_message_at?: string;
          started_at?: string;
          status?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          device_id?: string | null;
          id?: string;
          last_message_at?: string;
          started_at?: string;
          status?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rocky_conversations_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "rocky_devices";
            referencedColumns: ["id"];
          },
        ];
      };
      rocky_devices: {
        Row: {
          app_version: string | null;
          created_at: string;
          device_name: string | null;
          device_public_id: string;
          id: string;
          last_seen_at: string | null;
          platform: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          app_version?: string | null;
          created_at?: string;
          device_name?: string | null;
          device_public_id: string;
          id?: string;
          last_seen_at?: string | null;
          platform?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          app_version?: string | null;
          created_at?: string;
          device_name?: string | null;
          device_public_id?: string;
          id?: string;
          last_seen_at?: string | null;
          platform?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      rocky_memory_audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_type: string;
          after_value: Json | null;
          before_value: Json | null;
          created_at: string;
          id: string;
          memory_item_id: string | null;
          reason: string | null;
          user_id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_type: string;
          after_value?: Json | null;
          before_value?: Json | null;
          created_at?: string;
          id?: string;
          memory_item_id?: string | null;
          reason?: string | null;
          user_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_type?: string;
          after_value?: Json | null;
          before_value?: Json | null;
          created_at?: string;
          id?: string;
          memory_item_id?: string | null;
          reason?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rocky_memory_audit_logs_memory_item_id_fkey";
            columns: ["memory_item_id"];
            isOneToOne: false;
            referencedRelation: "rocky_memory_items";
            referencedColumns: ["id"];
          },
        ];
      };
      rocky_memory_embeddings: {
        Row: {
          created_at: string;
          embedding: string | null;
          embedding_model: string;
          memory_item_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          embedding?: string | null;
          embedding_model: string;
          memory_item_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          embedding?: string | null;
          embedding_model?: string;
          memory_item_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rocky_memory_embeddings_memory_item_id_fkey";
            columns: ["memory_item_id"];
            isOneToOne: true;
            referencedRelation: "rocky_memory_items";
            referencedColumns: ["id"];
          },
        ];
      };
      rocky_memory_items: {
        Row: {
          confidence: number;
          content: string;
          conversation_id: string | null;
          created_at: string;
          id: string;
          json_value: Json | null;
          last_confirmed_at: string | null;
          normalized_content: string | null;
          scope: string;
          source_message_id: string | null;
          status: string;
          superseded_by: string | null;
          type: string;
          updated_at: string;
          user_id: string;
          valid_from: string | null;
          valid_until: string | null;
        };
        Insert: {
          confidence?: number;
          content: string;
          conversation_id?: string | null;
          created_at?: string;
          id?: string;
          json_value?: Json | null;
          last_confirmed_at?: string | null;
          normalized_content?: string | null;
          scope?: string;
          source_message_id?: string | null;
          status?: string;
          superseded_by?: string | null;
          type: string;
          updated_at?: string;
          user_id: string;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Update: {
          confidence?: number;
          content?: string;
          conversation_id?: string | null;
          created_at?: string;
          id?: string;
          json_value?: Json | null;
          last_confirmed_at?: string | null;
          normalized_content?: string | null;
          scope?: string;
          source_message_id?: string | null;
          status?: string;
          superseded_by?: string | null;
          type?: string;
          updated_at?: string;
          user_id?: string;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rocky_memory_items_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "rocky_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rocky_memory_items_source_message_id_fkey";
            columns: ["source_message_id"];
            isOneToOne: false;
            referencedRelation: "rocky_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rocky_memory_items_superseded_by_fkey";
            columns: ["superseded_by"];
            isOneToOne: false;
            referencedRelation: "rocky_memory_items";
            referencedColumns: ["id"];
          },
        ];
      };
      rocky_memory_settings: {
        Row: {
          auto_extract_enabled: boolean;
          created_at: string;
          memory_enabled: boolean;
          preference_memory_enabled: boolean;
          profile_memory_enabled: boolean;
          project_memory_enabled: boolean;
          retention_days: number | null;
          sensitive_memory_enabled: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          auto_extract_enabled?: boolean;
          created_at?: string;
          memory_enabled?: boolean;
          preference_memory_enabled?: boolean;
          profile_memory_enabled?: boolean;
          project_memory_enabled?: boolean;
          retention_days?: number | null;
          sensitive_memory_enabled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          auto_extract_enabled?: boolean;
          created_at?: string;
          memory_enabled?: boolean;
          preference_memory_enabled?: boolean;
          profile_memory_enabled?: boolean;
          project_memory_enabled?: boolean;
          retention_days?: number | null;
          sensitive_memory_enabled?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      rocky_messages: {
        Row: {
          client_message_id: string | null;
          content: string;
          content_json: Json | null;
          conversation_id: string;
          created_at: string;
          id: string;
          role: string;
          source: string;
          token_count: number | null;
          user_id: string;
        };
        Insert: {
          client_message_id?: string | null;
          content: string;
          content_json?: Json | null;
          conversation_id: string;
          created_at?: string;
          id?: string;
          role: string;
          source?: string;
          token_count?: number | null;
          user_id: string;
        };
        Update: {
          client_message_id?: string | null;
          content?: string;
          content_json?: Json | null;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
          source?: string;
          token_count?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rocky_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "rocky_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      rocky_scheduled_items: {
        Row: {
          created_at: string;
          delivered_count: number;
          device_id: string;
          id: string;
          interval_minutes: number | null;
          kind: string;
          last_delivered_at: string | null;
          notes: string | null;
          repeat_rule: string;
          scheduled_for: string;
          snoozed_until: string | null;
          status: string;
          timezone: string;
          title: string;
          updated_at: string;
          window_end_time: string | null;
          window_start_time: string | null;
        };
        Insert: {
          created_at?: string;
          delivered_count?: number;
          device_id: string;
          id?: string;
          interval_minutes?: number | null;
          kind: string;
          last_delivered_at?: string | null;
          notes?: string | null;
          repeat_rule?: string;
          scheduled_for: string;
          snoozed_until?: string | null;
          status?: string;
          timezone?: string;
          title: string;
          updated_at?: string;
          window_end_time?: string | null;
          window_start_time?: string | null;
        };
        Update: {
          created_at?: string;
          delivered_count?: number;
          device_id?: string;
          id?: string;
          interval_minutes?: number | null;
          kind?: string;
          last_delivered_at?: string | null;
          notes?: string | null;
          repeat_rule?: string;
          scheduled_for?: string;
          snoozed_until?: string | null;
          status?: string;
          timezone?: string;
          title?: string;
          updated_at?: string;
          window_end_time?: string | null;
          window_start_time?: string | null;
        };
        Relationships: [];
      };
      user_provider_connections: {
        Row: {
          account_label: string | null;
          composio_user_id: string;
          connected_account_id: string | null;
          connected_at: string;
          failure_code: string | null;
          failure_message: string | null;
          id: string;
          last_used_at: string | null;
          last_verified_at: string | null;
          metadata: Json;
          provider: string;
          status: string;
          user_id: string;
        };
        Insert: {
          account_label?: string | null;
          composio_user_id: string;
          connected_account_id?: string | null;
          connected_at?: string;
          failure_code?: string | null;
          failure_message?: string | null;
          id?: string;
          last_used_at?: string | null;
          last_verified_at?: string | null;
          metadata?: Json;
          provider: string;
          status?: string;
          user_id: string;
        };
        Update: {
          account_label?: string | null;
          composio_user_id?: string;
          connected_account_id?: string | null;
          connected_at?: string;
          failure_code?: string | null;
          failure_message?: string | null;
          id?: string;
          last_used_at?: string | null;
          last_verified_at?: string | null;
          metadata?: Json;
          provider?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

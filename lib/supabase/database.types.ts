export type Json = boolean | number | string | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      user_provider_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          composio_user_id: string;
          connected_account_id: string | null;
          status: string;
          account_label: string | null;
          metadata: Json;
          connected_at: string;
          last_used_at: string | null;
          last_verified_at: string | null;
          failure_code: string | null;
          failure_message: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          composio_user_id: string;
          connected_account_id?: string | null;
          status?: string;
          account_label?: string | null;
          metadata?: Json;
          connected_at?: string;
          last_used_at?: string | null;
          last_verified_at?: string | null;
          failure_code?: string | null;
          failure_message?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          composio_user_id?: string;
          connected_account_id?: string | null;
          status?: string;
          account_label?: string | null;
          metadata?: Json;
          connected_at?: string;
          last_used_at?: string | null;
          last_verified_at?: string | null;
          failure_code?: string | null;
          failure_message?: string | null;
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

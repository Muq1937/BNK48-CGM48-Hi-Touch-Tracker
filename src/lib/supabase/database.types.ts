// Hand-written to match supabase/migrations until a project exists.
// Replace with generated types: `npm run db:types` (see README).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; role: "user" | "admin"; created_at: string };
        Insert: { id: string; display_name?: string | null; role?: "user" | "admin"; created_at?: string };
        Update: { id?: string; display_name?: string | null; role?: "user" | "admin"; created_at?: string };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          slug: string;
          nickname: string;
          full_name_th: string | null;
          group_code: "BNK48" | "CGM48";
          photo_url: string | null;
          photo_credit: string | null;
          profile_url: string | null;
          status: "active" | "graduated";
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          nickname: string;
          full_name_th?: string | null;
          group_code: "BNK48" | "CGM48";
          photo_url?: string | null;
          photo_credit?: string | null;
          profile_url?: string | null;
          status?: "active" | "graduated";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          name: string;
          event_date: string;
          venue: string | null;
          city: string | null;
          scope: "BNK48" | "CGM48" | "JOINT";
          status: "draft" | "published";
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          event_date: string;
          venue?: string | null;
          city?: string | null;
          scope: "BNK48" | "CGM48" | "JOINT";
          status?: "draft" | "published";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      rounds: {
        Row: { id: string; event_id: string; position: number; label: string | null };
        Insert: { id?: string; event_id: string; position: number; label?: string | null };
        Update: { id?: string; event_id?: string; position?: number; label?: string | null };
        Relationships: [
          {
            foreignKeyName: "rounds_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      round_members: {
        Row: { round_id: string; member_id: string };
        Insert: { round_id: string; member_id: string };
        Update: { round_id?: string; member_id?: string };
        Relationships: [
          {
            foreignKeyName: "round_members_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "round_members_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      log_entries: {
        Row: {
          id: string;
          user_id: string;
          round_id: string;
          tickets: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          round_id: string;
          tickets: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["log_entries"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "log_entries_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      event_notes: {
        Row: { user_id: string; event_id: string; note: string };
        Insert: { user_id: string; event_id: string; note: string };
        Update: { user_id?: string; event_id?: string; note?: string };
        Relationships: [
          {
            foreignKeyName: "event_notes_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      user_oshi: {
        Row: { user_id: string; member_id: string };
        Insert: { user_id: string; member_id: string };
        Update: { user_id?: string; member_id?: string };
        Relationships: [
          {
            foreignKeyName: "user_oshi_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      lineup_suggestions: {
        Row: {
          id: string;
          user_id: string;
          round_id: string | null;
          event_id: string | null;
          proposed_member_ids: string[] | null;
          comment: string | null;
          status: "open" | "accepted" | "rejected";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          round_id?: string | null;
          event_id?: string | null;
          proposed_member_ids?: string[] | null;
          comment?: string | null;
          status?: "open" | "accepted" | "rejected";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lineup_suggestions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      member_counts: {
        Row: { user_id: string | null; member_id: string | null; times_met: number | null };
        Relationships: [];
      };
    };
    Functions: {
      log_event: {
        Args: { p_event_id: string; p_rounds: Json; p_note?: string | null };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

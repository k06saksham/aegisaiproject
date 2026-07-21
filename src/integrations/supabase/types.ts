export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          hash: string
          id: string
          payload: Json
          prev_hash: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          hash: string
          id?: string
          payload: Json
          prev_hash?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          hash?: string
          id?: string
          payload?: Json
          prev_hash?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      edges: {
        Row: {
          base_risk: number
          current_risk: number
          disabled: boolean
          distance_km: number
          from_node: string
          id: string
          metadata: Json
          mode: string
          to_node: string
          transit_days: number
        }
        Insert: {
          base_risk?: number
          current_risk?: number
          disabled?: boolean
          distance_km: number
          from_node: string
          id: string
          metadata?: Json
          mode: string
          to_node: string
          transit_days?: number
        }
        Update: {
          base_risk?: number
          current_risk?: number
          disabled?: boolean
          distance_km?: number
          from_node?: string
          id?: string
          metadata?: Json
          mode?: string
          to_node?: string
          transit_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "edges_from_node_fkey"
            columns: ["from_node"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edges_to_node_fkey"
            columns: ["to_node"]
            isOneToOne: false
            referencedRelation: "nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      nodes: {
        Row: {
          capacity_bpd: number | null
          country: string | null
          created_at: string
          id: string
          lat: number
          lng: number
          metadata: Json
          name: string
          node_type: string
          region: string | null
        }
        Insert: {
          capacity_bpd?: number | null
          country?: string | null
          created_at?: string
          id: string
          lat: number
          lng: number
          metadata?: Json
          name: string
          node_type: string
          region?: string | null
        }
        Update: {
          capacity_bpd?: number | null
          country?: string | null
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          metadata?: Json
          name?: string
          node_type?: string
          region?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          agent: string
          created_at: string
          id: string
          latency_ms: number | null
          payload: Json
          scenario_id: string | null
          signal_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          agent: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          payload: Json
          scenario_id?: string | null
          signal_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          agent?: string
          created_at?: string
          id?: string
          latency_ms?: number | null
          payload?: Json
          scenario_id?: string | null
          signal_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          impact: Json | null
          name: string
          params: Json
          scenario_key: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          impact?: Json | null
          name: string
          params?: Json
          scenario_key: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          impact?: Json | null
          name?: string
          params?: Json
          scenario_key?: string
          user_id?: string | null
        }
        Relationships: []
      }
      signals: {
        Row: {
          analysis: Json | null
          analyzed_at: string | null
          category: string
          created_at: string
          id: string
          raw_text: string | null
          region: string | null
          severity: number
          source: string | null
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          analysis?: Json | null
          analyzed_at?: string | null
          category: string
          created_at?: string
          id?: string
          raw_text?: string | null
          region?: string | null
          severity?: number
          source?: string | null
          status?: string
          title: string
          user_id?: string | null
        }
        Update: {
          analysis?: Json | null
          analyzed_at?: string | null
          category?: string
          created_at?: string
          id?: string
          raw_text?: string | null
          region?: string | null
          severity?: number
          source?: string | null
          status?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

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
      strategies: {
        Row: {
          common_mistakes: string[] | null
          confirmation_rules: string | null
          created_at: string
          description: string | null
          entry_rules: string | null
          exit_rule: string | null
          id: string
          instrument: Database["public"]["Enums"]["trade_instrument"] | null
          market_condition: string | null
          max_risk: number | null
          name: string
          sizing_rule: string | null
          stop_loss_rule: string | null
          target_rule: string | null
          timeframe: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          common_mistakes?: string[] | null
          confirmation_rules?: string | null
          created_at?: string
          description?: string | null
          entry_rules?: string | null
          exit_rule?: string | null
          id?: string
          instrument?: Database["public"]["Enums"]["trade_instrument"] | null
          market_condition?: string | null
          max_risk?: number | null
          name: string
          sizing_rule?: string | null
          stop_loss_rule?: string | null
          target_rule?: string | null
          timeframe?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          common_mistakes?: string[] | null
          confirmation_rules?: string | null
          created_at?: string
          description?: string | null
          entry_rules?: string | null
          exit_rule?: string | null
          id?: string
          instrument?: Database["public"]["Enums"]["trade_instrument"] | null
          market_condition?: string | null
          max_risk?: number | null
          name?: string
          sizing_rule?: string | null
          stop_loss_rule?: string | null
          target_rule?: string | null
          timeframe?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_attachments: {
        Row: {
          created_at: string
          filename: string | null
          id: string
          kind: string
          trade_id: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filename?: string | null
          id?: string
          kind?: string
          trade_id: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          filename?: string | null
          id?: string
          kind?: string
          trade_id?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_attachments_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_reviews: {
        Row: {
          ai_review: string | null
          created_at: string
          entry_notes: string | null
          exit_notes: string | null
          grade: Database["public"]["Enums"]["trade_grade"] | null
          id: string
          psychology_notes: string | null
          risk_notes: string | null
          thesis: string | null
          trade_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_review?: string | null
          created_at?: string
          entry_notes?: string | null
          exit_notes?: string | null
          grade?: Database["public"]["Enums"]["trade_grade"] | null
          id?: string
          psychology_notes?: string | null
          risk_notes?: string | null
          thesis?: string | null
          trade_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_review?: string | null
          created_at?: string
          entry_notes?: string | null
          exit_notes?: string | null
          grade?: Database["public"]["Enums"]["trade_grade"] | null
          id?: string
          psychology_notes?: string | null
          risk_notes?: string | null
          thesis?: string | null
          trade_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_reviews_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          charges: number | null
          confidence_before: number | null
          created_at: string
          direction: Database["public"]["Enums"]["trade_direction"]
          duration: Database["public"]["Enums"]["trade_duration"]
          emotion_after: string | null
          emotion_before: string | null
          energy_before: number | null
          entry_price: number
          entry_quality: number | null
          entry_time: string
          event_context: string | null
          execution_quality: number | null
          exit_price: number | null
          exit_quality: number | null
          exit_time: string | null
          focus_before: number | null
          followed_plan: boolean | null
          fomo: boolean | null
          id: string
          instrument: Database["public"]["Enums"]["trade_instrument"]
          lessons: string | null
          market_alignment: string | null
          market_trend: string | null
          mistakes: string[] | null
          option_strategy: string | null
          planned_r: number | null
          planned_reward: number | null
          playbook_id: string | null
          pnl_realized: number | null
          quantity: number
          rationale: string | null
          revenge: boolean | null
          risk_amount: number | null
          risk_mgmt_quality: number | null
          sector: string | null
          setup: string | null
          source: string | null
          status: Database["public"]["Enums"]["trade_status"]
          stop_loss: number | null
          strategy: string | null
          stress_before: number | null
          symbol: string
          tags: string[] | null
          target_2: number | null
          target_3: number | null
          target_price: number | null
          timeframe: string | null
          trade_type: string | null
          updated_at: string
          user_id: string
          what_went_well: string | null
          what_went_wrong: string | null
        }
        Insert: {
          charges?: number | null
          confidence_before?: number | null
          created_at?: string
          direction?: Database["public"]["Enums"]["trade_direction"]
          duration?: Database["public"]["Enums"]["trade_duration"]
          emotion_after?: string | null
          emotion_before?: string | null
          energy_before?: number | null
          entry_price?: number
          entry_quality?: number | null
          entry_time?: string
          event_context?: string | null
          execution_quality?: number | null
          exit_price?: number | null
          exit_quality?: number | null
          exit_time?: string | null
          focus_before?: number | null
          followed_plan?: boolean | null
          fomo?: boolean | null
          id?: string
          instrument?: Database["public"]["Enums"]["trade_instrument"]
          lessons?: string | null
          market_alignment?: string | null
          market_trend?: string | null
          mistakes?: string[] | null
          option_strategy?: string | null
          planned_r?: number | null
          planned_reward?: number | null
          playbook_id?: string | null
          pnl_realized?: number | null
          quantity?: number
          rationale?: string | null
          revenge?: boolean | null
          risk_amount?: number | null
          risk_mgmt_quality?: number | null
          sector?: string | null
          setup?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["trade_status"]
          stop_loss?: number | null
          strategy?: string | null
          stress_before?: number | null
          symbol: string
          tags?: string[] | null
          target_2?: number | null
          target_3?: number | null
          target_price?: number | null
          timeframe?: string | null
          trade_type?: string | null
          updated_at?: string
          user_id: string
          what_went_well?: string | null
          what_went_wrong?: string | null
        }
        Update: {
          charges?: number | null
          confidence_before?: number | null
          created_at?: string
          direction?: Database["public"]["Enums"]["trade_direction"]
          duration?: Database["public"]["Enums"]["trade_duration"]
          emotion_after?: string | null
          emotion_before?: string | null
          energy_before?: number | null
          entry_price?: number
          entry_quality?: number | null
          entry_time?: string
          event_context?: string | null
          execution_quality?: number | null
          exit_price?: number | null
          exit_quality?: number | null
          exit_time?: string | null
          focus_before?: number | null
          followed_plan?: boolean | null
          fomo?: boolean | null
          id?: string
          instrument?: Database["public"]["Enums"]["trade_instrument"]
          lessons?: string | null
          market_alignment?: string | null
          market_trend?: string | null
          mistakes?: string[] | null
          option_strategy?: string | null
          planned_r?: number | null
          planned_reward?: number | null
          playbook_id?: string | null
          pnl_realized?: number | null
          quantity?: number
          rationale?: string | null
          revenge?: boolean | null
          risk_amount?: number | null
          risk_mgmt_quality?: number | null
          sector?: string | null
          setup?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["trade_status"]
          stop_loss?: number | null
          strategy?: string | null
          stress_before?: number | null
          symbol?: string
          tags?: string[] | null
          target_2?: number | null
          target_3?: number | null
          target_price?: number | null
          timeframe?: string | null
          trade_type?: string | null
          updated_at?: string
          user_id?: string
          what_went_well?: string | null
          what_went_wrong?: string | null
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
      trade_direction: "long" | "short" | "non_directional"
      trade_duration:
        | "intraday"
        | "swing"
        | "positional_weekly"
        | "positional_monthly"
      trade_grade: "A+" | "A" | "B" | "C" | "D" | "F"
      trade_instrument: "equity" | "equity_mtf" | "futures" | "options"
      trade_status: "open" | "closed" | "cancelled"
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
    Enums: {
      trade_direction: ["long", "short", "non_directional"],
      trade_duration: [
        "intraday",
        "swing",
        "positional_weekly",
        "positional_monthly",
      ],
      trade_grade: ["A+", "A", "B", "C", "D", "F"],
      trade_instrument: ["equity", "equity_mtf", "futures", "options"],
      trade_status: ["open", "closed", "cancelled"],
    },
  },
} as const

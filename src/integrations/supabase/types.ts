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
      exercises: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      logged_sets: {
        Row: {
          completed_at: string
          exercise_id: string
          id: string
          reps: number
          rest_taken_sec: number | null
          session_id: string
          set_number: number
          weight_kg: number
        }
        Insert: {
          completed_at?: string
          exercise_id: string
          id?: string
          reps?: number
          rest_taken_sec?: number | null
          session_id: string
          set_number: number
          weight_kg?: number
        }
        Update: {
          completed_at?: string
          exercise_id?: string
          id?: string
          reps?: number
          rest_taken_sec?: number | null
          session_id?: string
          set_number?: number
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "logged_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logged_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_log: {
        Row: {
          created_at: string
          date: string
          distance_m: number
          id: string
          source: Database["public"]["Enums"]["performance_source"]
          source_id: string
          time_sec: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          distance_m: number
          id?: string
          source: Database["public"]["Enums"]["performance_source"]
          source_id: string
          time_sec: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          distance_m?: number
          id?: string
          source?: Database["public"]["Enums"]["performance_source"]
          source_id?: string
          time_sec?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level:
            | Database["public"]["Enums"]["activity_level_enum"]
            | null
          created_at: string
          date_of_birth: string | null
          height_cm: number | null
          sex: Database["public"]["Enums"]["sex_enum"] | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          activity_level?:
            | Database["public"]["Enums"]["activity_level_enum"]
            | null
          created_at?: string
          date_of_birth?: string | null
          height_cm?: number | null
          sex?: Database["public"]["Enums"]["sex_enum"] | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          activity_level?:
            | Database["public"]["Enums"]["activity_level_enum"]
            | null
          created_at?: string
          date_of_birth?: string | null
          height_cm?: number | null
          sex?: Database["public"]["Enums"]["sex_enum"] | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      races: {
        Row: {
          avg_hr: number | null
          calories_burned: number | null
          category: string | null
          created_at: string
          date: string
          distance_m: number
          id: string
          location: string | null
          name: string
          notes: string | null
          placement: number | null
          time_sec: number
          user_id: string
        }
        Insert: {
          avg_hr?: number | null
          calories_burned?: number | null
          category?: string | null
          created_at?: string
          date: string
          distance_m: number
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          placement?: number | null
          time_sec: number
          user_id: string
        }
        Update: {
          avg_hr?: number | null
          calories_burned?: number | null
          category?: string | null
          created_at?: string
          date?: string
          distance_m?: number
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          placement?: number | null
          time_sec?: number
          user_id?: string
        }
        Relationships: []
      }
      template_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          order_index: number
          rest_seconds: number
          target_reps: number
          target_sets: number
          target_weight_kg: number | null
          template_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          order_index?: number
          rest_seconds?: number
          target_reps?: number
          target_sets?: number
          target_weight_kg?: number | null
          template_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          order_index?: number
          rest_seconds?: number
          target_reps?: number
          target_sets?: number
          target_weight_kg?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      test_types: {
        Row: {
          created_at: string
          distance_m: number | null
          duration_sec: number | null
          id: string
          is_custom: boolean
          name: string
          result_type: Database["public"]["Enums"]["test_result_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          distance_m?: number | null
          duration_sec?: number | null
          id?: string
          is_custom?: boolean
          name: string
          result_type: Database["public"]["Enums"]["test_result_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          distance_m?: number | null
          duration_sec?: number | null
          id?: string
          is_custom?: boolean
          name?: string
          result_type?: Database["public"]["Enums"]["test_result_type"]
          user_id?: string | null
        }
        Relationships: []
      }
      tests: {
        Row: {
          avg_hr: number | null
          calories_burned: number | null
          created_at: string
          date: string
          distance_covered_m: number | null
          id: string
          notes: string | null
          observations: string | null
          test_type_id: string
          time_sec: number | null
          user_id: string
          weather: string | null
        }
        Insert: {
          avg_hr?: number | null
          calories_burned?: number | null
          created_at?: string
          date?: string
          distance_covered_m?: number | null
          id?: string
          notes?: string | null
          observations?: string | null
          test_type_id: string
          time_sec?: number | null
          user_id: string
          weather?: string | null
        }
        Update: {
          avg_hr?: number | null
          calories_burned?: number | null
          created_at?: string
          date?: string
          distance_covered_m?: number | null
          id?: string
          notes?: string | null
          observations?: string | null
          test_type_id?: string
          time_sec?: number | null
          user_id?: string
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_test_type_id_fkey"
            columns: ["test_type_id"]
            isOneToOne: false
            referencedRelation: "test_types"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_logs: {
        Row: {
          id: string
          logged_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          id?: string
          logged_at?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          id?: string
          logged_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          avg_hr: number | null
          calories_burned: number | null
          ended_at: string | null
          id: string
          rpe: number | null
          started_at: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          avg_hr?: number | null
          calories_burned?: number | null
          ended_at?: string | null
          id?: string
          rpe?: number | null
          started_at?: string
          template_id?: string | null
          user_id: string
        }
        Update: {
          avg_hr?: number | null
          calories_burned?: number | null
          ended_at?: string | null
          id?: string
          rpe?: number | null
          started_at?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
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
      activity_level_enum:
        | "sedentary"
        | "light"
        | "moderate"
        | "high"
        | "athlete"
      performance_source: "TRAINING_REP" | "TEST" | "RACE"
      sex_enum: "M" | "F" | "O"
      test_result_type: "TIME" | "DISTANCE"
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
      activity_level_enum: [
        "sedentary",
        "light",
        "moderate",
        "high",
        "athlete",
      ],
      performance_source: ["TRAINING_REP", "TEST", "RACE"],
      sex_enum: ["M", "F", "O"],
      test_result_type: ["TIME", "DISTANCE"],
    },
  },
} as const

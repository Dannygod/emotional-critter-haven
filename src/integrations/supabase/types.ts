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
      accessories: {
        Row: {
          created_at: string
          equipped: boolean
          id: string
          monster_id: string
          name: string
          slot: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          equipped?: boolean
          id?: string
          monster_id: string
          name: string
          slot: string
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          equipped?: boolean
          id?: string
          monster_id?: string
          name?: string
          slot?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accessories_monster_id_fkey"
            columns: ["monster_id"]
            isOneToOne: false
            referencedRelation: "monsters"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          anonymous_name: string
          caption: string | null
          comment_count: number
          created_at: string
          edited_at: string | null
          emotion_summary: string | null
          id: string
          image_url: string | null
          like_count: number
          monster_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anonymous_name: string
          caption?: string | null
          comment_count?: number
          created_at?: string
          edited_at?: string | null
          emotion_summary?: string | null
          id?: string
          image_url?: string | null
          like_count?: number
          monster_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anonymous_name?: string
          caption?: string | null
          comment_count?: number
          created_at?: string
          edited_at?: string | null
          emotion_summary?: string | null
          id?: string
          image_url?: string | null
          like_count?: number
          monster_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_monster_id_fkey"
            columns: ["monster_id"]
            isOneToOne: false
            referencedRelation: "monsters"
            referencedColumns: ["id"]
          },
        ]
      }
      diaries: {
        Row: {
          created_at: string
          emotion_summary: Json
          end_date: string
          final_image_url: string | null
          id: string
          monster_id: string
          monster_snapshot: Json | null
          start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emotion_summary?: Json
          end_date: string
          final_image_url?: string | null
          id?: string
          monster_id: string
          monster_snapshot?: Json | null
          start_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          emotion_summary?: Json
          end_date?: string
          final_image_url?: string | null
          id?: string
          monster_id?: string
          monster_snapshot?: Json | null
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diaries_monster_id_fkey"
            columns: ["monster_id"]
            isOneToOne: false
            referencedRelation: "monsters"
            referencedColumns: ["id"]
          },
        ]
      }
      emotion_entries: {
        Row: {
          analysis: Json | null
          created_at: string
          emotion_intensity: number | null
          id: string
          is_comforting: boolean | null
          llm_reply: string | null
          monster_id: string
          primary_emotion: string | null
          raw_text: string
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          created_at?: string
          emotion_intensity?: number | null
          id?: string
          is_comforting?: boolean | null
          llm_reply?: string | null
          monster_id: string
          primary_emotion?: string | null
          raw_text: string
          user_id: string
        }
        Update: {
          analysis?: Json | null
          created_at?: string
          emotion_intensity?: number | null
          id?: string
          is_comforting?: boolean | null
          llm_reply?: string | null
          monster_id?: string
          primary_emotion?: string | null
          raw_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emotion_entries_monster_id_fkey"
            columns: ["monster_id"]
            isOneToOne: false
            referencedRelation: "monsters"
            referencedColumns: ["id"]
          },
        ]
      }
      healing_tasks: {
        Row: {
          active: boolean
          category: string
          description: string
          difficulty: string
          id: string
          reward_value: number
          title: string
        }
        Insert: {
          active?: boolean
          category?: string
          description: string
          difficulty?: string
          id?: string
          reward_value?: number
          title: string
        }
        Update: {
          active?: boolean
          category?: string
          description?: string
          difficulty?: string
          id?: string
          reward_value?: number
          title?: string
        }
        Relationships: []
      }
      monsters: {
        Row: {
          appearance: Json
          archived_at: string | null
          base_color: string
          id: string
          image_url: string | null
          mood_score: number
          name: string
          negative_energy: number
          positive_energy: number
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appearance?: Json
          archived_at?: string | null
          base_color?: string
          id?: string
          image_url?: string | null
          mood_score?: number
          name?: string
          negative_energy?: number
          positive_energy?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appearance?: Json
          archived_at?: string | null
          base_color?: string
          id?: string
          image_url?: string | null
          mood_score?: number
          name?: string
          negative_energy?: number
          positive_energy?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          anonymous_name: string
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          anonymous_name: string
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          anonymous_name?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anonymous_name: string
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          anonymous_name?: string
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          anonymous_name?: string
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sprite_parts: {
        Row: {
          active: boolean
          asset_path: string
          color_tone: string | null
          created_at: string
          emotion_tags: string[]
          id: string
          key: string
          layer: string
          name: string
          rarity: string
        }
        Insert: {
          active?: boolean
          asset_path: string
          color_tone?: string | null
          created_at?: string
          emotion_tags?: string[]
          id?: string
          key: string
          layer: string
          name: string
          rarity?: string
        }
        Update: {
          active?: boolean
          asset_path?: string
          color_tone?: string | null
          created_at?: string
          emotion_tags?: string[]
          id?: string
          key?: string
          layer?: string
          name?: string
          rarity?: string
        }
        Relationships: []
      }
      user_tasks: {
        Row: {
          assigned_at: string
          completed_at: string | null
          id: string
          monster_id: string
          status: string
          task_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          completed_at?: string | null
          id?: string
          monster_id: string
          status?: string
          task_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          completed_at?: string | null
          id?: string
          monster_id?: string
          status?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tasks_monster_id_fkey"
            columns: ["monster_id"]
            isOneToOne: false
            referencedRelation: "monsters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "healing_tasks"
            referencedColumns: ["id"]
          },
        ]
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

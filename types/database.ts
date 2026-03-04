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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      compliance_checks: {
        Row: {
          id: string
          document_version_id: string
          status: string
          model: string | null
          duration_ms: number | null
          error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_version_id: string
          status?: string
          model?: string | null
          duration_ms?: number | null
          error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_version_id?: string
          status?: string
          model?: string | null
          duration_ms?: number | null
          error?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checks_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_issues: {
        Row: {
          id: string
          compliance_check_id: string
          severity: string
          description: string
          source_reference: string | null
          dismissed_at: string | null
          dismissed_by: string | null
          dismiss_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          compliance_check_id: string
          severity: string
          description: string
          source_reference?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          dismiss_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          compliance_check_id?: string
          severity?: string
          description?: string
          source_reference?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          dismiss_reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_issues_compliance_check_id_fkey"
            columns: ["compliance_check_id"]
            isOneToOne: false
            referencedRelation: "compliance_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          created_by: string
          document_version_id: string
          id: string
          parent_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          document_version_id: string
          id?: string
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          document_version_id?: string
          id?: string
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_document_version_id_fkey"
            columns: ["document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      document_status_history: {
        Row: {
          changed_by: string
          created_at: string
          document_id: string
          from_status: Database["public"]["Enums"]["document_status"] | null
          id: string
          note: string | null
          to_status: Database["public"]["Enums"]["document_status"]
        }
        Insert: {
          changed_by: string
          created_at?: string
          document_id: string
          from_status?: Database["public"]["Enums"]["document_status"] | null
          id?: string
          note?: string | null
          to_status: Database["public"]["Enums"]["document_status"]
        }
        Update: {
          changed_by?: string
          created_at?: string
          document_id?: string
          from_status?: Database["public"]["Enums"]["document_status"] | null
          id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["document_status"]
        }
        Relationships: [
          {
            foreignKeyName: "document_status_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          content_type: Database["public"]["Enums"]["document_content_type"]
          created_at: string
          created_by: string
          document_id: string
          file_name: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          rich_text_json: Json | null
          storage_path: string | null
          version_number: number
        }
        Insert: {
          content_type: Database["public"]["Enums"]["document_content_type"]
          created_at?: string
          created_by: string
          document_id: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          rich_text_json?: Json | null
          storage_path?: string | null
          version_number: number
        }
        Update: {
          content_type?: Database["public"]["Enums"]["document_content_type"]
          created_at?: string
          created_by?: string
          document_id?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          rich_text_json?: Json | null
          storage_path?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          created_by: string
          current_version_id: string | null
          description: string | null
          id: string
          project_id: string
          status: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_version_id?: string | null
          description?: string | null
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_version_id?: string | null
          description?: string | null
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["document_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_sources: {
        Row: {
          chunk_count: number
          created_at: string
          created_by: string
          description: string | null
          file_path: string | null
          id: string
          language: Database["public"]["Enums"]["language_code"]
          source_type: string
          status: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          chunk_count?: number
          created_at?: string
          created_by: string
          description?: string | null
          file_path?: string | null
          id?: string
          language?: Database["public"]["Enums"]["language_code"]
          source_type: string
          status?: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          chunk_count?: number
          created_at?: string
          created_by?: string
          description?: string | null
          file_path?: string | null
          id?: string
          language?: Database["public"]["Enums"]["language_code"]
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      embeddings: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          embedding_model: string
          id: string
          knowledge_source_id: string
          language: Database["public"]["Enums"]["language_code"]
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          embedding_model?: string
          id?: string
          knowledge_source_id: string
          language: Database["public"]["Enums"]["language_code"]
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          embedding_model?: string
          id?: string
          knowledge_source_id?: string
          language?: Database["public"]["Enums"]["language_code"]
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_knowledge_source_id_fkey"
            columns: ["knowledge_source_id"]
            isOneToOne: false
            referencedRelation: "knowledge_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_admin: boolean
          language: Database["public"]["Enums"]["language_code"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_admin?: boolean
          language?: Database["public"]["Enums"]["language_code"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean
          language?: Database["public"]["Enums"]["language_code"]
          updated_at?: string
        }
        Relationships: []
      }
      project_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          location: string | null
          name: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          location?: string | null
          name: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      create_project: {
        Args: {
          p_description: string
          p_location: string
          p_name: string
          p_organization_id: string
        }
        Returns: string
      }
      get_user_project_role: {
        Args: { p_project_id: string }
        Returns: Database["public"]["Enums"]["project_role"]
      }
      is_project_member: { Args: { p_project_id: string }; Returns: boolean }
      is_global_admin: { Args: Record<string, never>; Returns: boolean }
      match_documents: {
        Args: {
          query_embedding: string
          match_count?: number
          filter_language?: string | null
        }
        Returns: {
          id: string
          content: string
          language: string
          similarity: number
          knowledge_source_id: string
          knowledge_source_title: string
        }[]
      }
    }
    Enums: {
      document_content_type: "file" | "rich_text"
      document_status:
        | "draft"
        | "in_review"
        | "approved"
        | "changes_requested"
        | "submitted"
      language_code: "no" | "en"
      project_role: "admin" | "architect" | "civil_engineer" | "carpenter"
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
      document_content_type: ["file", "rich_text"],
      document_status: [
        "draft",
        "in_review",
        "approved",
        "changes_requested",
        "submitted",
      ],
      language_code: ["no", "en"],
      project_role: ["admin", "architect", "civil_engineer", "carpenter"],
    },
  },
} as const

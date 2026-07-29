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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      behavior_visible_to: {
        Row: {
          behavior_id: string
          user_id: string
        }
        Insert: {
          behavior_id: string
          user_id: string
        }
        Update: {
          behavior_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_visible_to_behavior_id_fkey"
            columns: ["behavior_id"]
            isOneToOne: false
            referencedRelation: "behaviors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_visible_to_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      behaviors: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          feedback_gain_animation_id: string | null
          feedback_intensity: string | null
          feedback_loss_animation_id: string | null
          feedback_mode: string | null
          feedback_theme: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          point_value: number
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          feedback_gain_animation_id?: string | null
          feedback_intensity?: string | null
          feedback_loss_animation_id?: string | null
          feedback_mode?: string | null
          feedback_theme?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          point_value?: number
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          feedback_gain_animation_id?: string | null
          feedback_intensity?: string | null
          feedback_loss_animation_id?: string | null
          feedback_mode?: string | null
          feedback_theme?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          point_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "behaviors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behaviors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bxrplus_workspace_config: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "bxrplus_workspace_config_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_goals: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          description: string
          domain: string | null
          id: string
          is_active: boolean
          mastery_criteria: string | null
          source: string
          source_document_id: string | null
          target_text: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          description?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          mastery_criteria?: string | null
          source?: string
          source_document_id?: string | null
          target_text?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          description?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          mastery_criteria?: string | null
          source?: string
          source_document_id?: string | null
          target_text?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_goals_source_document_fk"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "goal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      client_staff: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          relationship: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          relationship: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          relationship?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_staff_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          avatar_url: string | null
          balance: number
          card_sticker: string | null
          card_theme: string | null
          created_at: string | null
          date_of_birth: string | null
          default_cpt_code: string | null
          default_cpt_template_id: string | null
          full_name: string
          id: string
          insurance_id: string | null
          owner_id: string | null
          qr_code: string
          reward_bar_style: string | null
          reward_bar_theme: string | null
          reward_success_animation: string | null
          session_feedback_intensity: string | null
          session_feedback_mode: string | null
          session_feedback_theme: string | null
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          card_sticker?: string | null
          card_theme?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          default_cpt_code?: string | null
          default_cpt_template_id?: string | null
          full_name: string
          id?: string
          insurance_id?: string | null
          owner_id?: string | null
          qr_code?: string
          reward_bar_style?: string | null
          reward_bar_theme?: string | null
          reward_success_animation?: string | null
          session_feedback_intensity?: string | null
          session_feedback_mode?: string | null
          session_feedback_theme?: string | null
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          card_sticker?: string | null
          card_theme?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          default_cpt_code?: string | null
          default_cpt_template_id?: string | null
          full_name?: string
          id?: string
          insurance_id?: string | null
          owner_id?: string | null
          qr_code?: string
          reward_bar_style?: string | null
          reward_bar_theme?: string | null
          reward_success_animation?: string | null
          session_feedback_intensity?: string | null
          session_feedback_mode?: string | null
          session_feedback_theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_default_cpt_template_id_fkey"
            columns: ["default_cpt_template_id"]
            isOneToOne: false
            referencedRelation: "insurance_cpt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_insurance_id_fkey"
            columns: ["insurance_id"]
            isOneToOne: false
            referencedRelation: "insurance_payers"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_goals: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          description: string
          domain: string | null
          id: string
          is_active: boolean
          mastery_criteria: string | null
          source: string
          source_document_id: string | null
          target_text: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          description?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          mastery_criteria?: string | null
          source?: string
          source_document_id?: string | null
          target_text?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          description?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          mastery_criteria?: string | null
          source?: string
          source_document_id?: string | null
          target_text?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_goals_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "goal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_documents: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          extracted_text: string | null
          file_name: string
          id: string
          storage_path: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          extracted_text?: string | null
          file_name: string
          id?: string
          storage_path?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          extracted_text?: string | null
          file_name?: string
          id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_cpt_templates: {
        Row: {
          cpt_code: string
          created_at: string
          created_by: string | null
          default_setting_events: string
          id: string
          insurance_id: string
          is_active: boolean
          prompt_guidance: string
          required_sections: Json
          service_name: string
          template_body: string
          template_title: string
          updated_at: string
        }
        Insert: {
          cpt_code: string
          created_at?: string
          created_by?: string | null
          default_setting_events?: string
          id?: string
          insurance_id: string
          is_active?: boolean
          prompt_guidance?: string
          required_sections?: Json
          service_name: string
          template_body?: string
          template_title: string
          updated_at?: string
        }
        Update: {
          cpt_code?: string
          created_at?: string
          created_by?: string | null
          default_setting_events?: string
          id?: string
          insurance_id?: string
          is_active?: boolean
          prompt_guidance?: string
          required_sections?: Json
          service_name?: string
          template_body?: string
          template_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_cpt_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_cpt_templates_insurance_id_fkey"
            columns: ["insurance_id"]
            isOneToOne: false
            referencedRelation: "insurance_payers"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_payers: {
        Row: {
          compliance_language: string
          created_at: string
          created_by: string | null
          documentation_style: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          compliance_language?: string
          created_at?: string
          created_by?: string | null
          documentation_style?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          compliance_language?: string
          created_at?: string
          created_by?: string | null
          documentation_style?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_payers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: []
      }
      reward_visible_to: {
        Row: {
          reward_id: string
          user_id: string
        }
        Insert: {
          reward_id: string
          user_id: string
        }
        Update: {
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_visible_to_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_visible_to_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          destination_icon: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          journey_preset: string | null
          journey_theme: string | null
          name: string
          point_cost: number
          traveler_icon: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          destination_icon?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          journey_preset?: string | null
          journey_theme?: string | null
          name: string
          point_cost: number
          traveler_icon?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          destination_icon?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          journey_preset?: string | null
          journey_theme?: string | null
          name?: string
          point_cost?: number
          traveler_icon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_note_branches: {
        Row: {
          created_at: string
          created_by: string | null
          head_version_id: string | null
          id: string
          is_default: boolean
          name: string
          note_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          head_version_id?: string | null
          id?: string
          is_default?: boolean
          name?: string
          note_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          head_version_id?: string | null
          id?: string
          is_default?: boolean
          name?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_note_branches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_branches_head_version_fk"
            columns: ["head_version_id"]
            isOneToOne: false
            referencedRelation: "session_note_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_branches_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "session_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      session_note_cards: {
        Row: {
          body: string
          client_id: string
          created_at: string
          created_by: string
          id: string
          note_id: string
          sort_order: number
          updated_at: string
          zone: string
        }
        Insert: {
          body: string
          client_id: string
          created_at?: string
          created_by: string
          id?: string
          note_id: string
          sort_order?: number
          updated_at?: string
          zone?: string
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          note_id?: string
          sort_order?: number
          updated_at?: string
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_note_cards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_cards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_cards_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "session_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      session_note_clinical_goals: {
        Row: {
          clinical_goal_id: string
          created_at: string
          created_by: string
          note_id: string
        }
        Insert: {
          clinical_goal_id: string
          created_at?: string
          created_by: string
          note_id: string
        }
        Update: {
          clinical_goal_id?: string
          created_at?: string
          created_by?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_note_clinical_goals_clinical_goal_id_fkey"
            columns: ["clinical_goal_id"]
            isOneToOne: false
            referencedRelation: "clinical_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_clinical_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_clinical_goals_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "session_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      session_note_folders: {
        Row: {
          client_id: string
          color: string
          created_at: string
          created_by: string
          description: string
          id: string
          name: string
          parent_id: string | null
          path: string
          sort_order: number
          source: string
        }
        Insert: {
          client_id: string
          color?: string
          created_at?: string
          created_by: string
          description?: string
          id?: string
          name: string
          parent_id?: string | null
          path: string
          sort_order?: number
          source?: string
        }
        Update: {
          client_id?: string
          color?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          name?: string
          parent_id?: string | null
          path?: string
          sort_order?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_note_folders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "session_note_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      session_note_goals: {
        Row: {
          created_at: string
          created_by: string
          goal_id: string
          note_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          goal_id: string
          note_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          goal_id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_note_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_goals_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "client_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_goals_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "session_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      session_note_media: {
        Row: {
          caption: string | null
          client_id: string
          created_at: string
          created_by: string
          filename: string
          height: number | null
          id: string
          mime_type: string
          note_id: string | null
          published: boolean
          size: number
          storage_path: string
          type: string
          updated_at: string
          width: number | null
        }
        Insert: {
          caption?: string | null
          client_id: string
          created_at?: string
          created_by: string
          filename: string
          height?: number | null
          id?: string
          mime_type: string
          note_id?: string | null
          published?: boolean
          size?: number
          storage_path: string
          type?: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          caption?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          filename?: string
          height?: number | null
          id?: string
          mime_type?: string
          note_id?: string | null
          published?: boolean
          size?: number
          storage_path?: string
          type?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_note_media_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_media_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "session_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      session_note_shares: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          note_id: string
          owner_id: string
          permission: string
          shared_with_email: string | null
          shared_with_id: string | null
          token: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          note_id: string
          owner_id: string
          permission?: string
          shared_with_email?: string | null
          shared_with_id?: string | null
          token?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          note_id?: string
          owner_id?: string
          permission?: string
          shared_with_email?: string | null
          shared_with_id?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_note_shares_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "session_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_shares_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_shares_shared_with_id_fkey"
            columns: ["shared_with_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_note_suggestions: {
        Row: {
          accepted_at: string | null
          client_id: string
          created_at: string
          created_by: string
          goal_id: string | null
          id: string
          rationale: string
          source_note_id: string | null
          status: string
          suggestion_text: string
          target_note_id: string
        }
        Insert: {
          accepted_at?: string | null
          client_id: string
          created_at?: string
          created_by: string
          goal_id?: string | null
          id?: string
          rationale?: string
          source_note_id?: string | null
          status?: string
          suggestion_text: string
          target_note_id: string
        }
        Update: {
          accepted_at?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          goal_id?: string | null
          id?: string
          rationale?: string
          source_note_id?: string | null
          status?: string
          suggestion_text?: string
          target_note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_note_suggestions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_suggestions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_suggestions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "client_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_suggestions_source_note_id_fkey"
            columns: ["source_note_id"]
            isOneToOne: false
            referencedRelation: "session_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_suggestions_target_note_id_fkey"
            columns: ["target_note_id"]
            isOneToOne: false
            referencedRelation: "session_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      session_note_versions: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          data: string
          id: string
          is_checkpoint: boolean
          note_id: string
          parent_id: string | null
          title: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          is_checkpoint?: boolean
          note_id: string
          parent_id?: string | null
          title?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          id?: string
          is_checkpoint?: boolean
          note_id?: string
          parent_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_note_versions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "session_note_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_versions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "session_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_versions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "session_note_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_note_zones: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          label: string
          note_id: string
          sort_order: number
          source: string
          template_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          label: string
          note_id: string
          sort_order?: number
          source?: string
          template_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          label?: string
          note_id?: string
          sort_order?: number
          source?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_note_zones_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_zones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_zones_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "session_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_note_zones_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "insurance_cpt_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      session_notes: {
        Row: {
          behavior_observations: string
          client_id: string
          client_response: string
          color: string | null
          content: string
          cpt_code: string | null
          cpt_template_id: string | null
          created_at: string
          created_by: string
          current_branch_id: string | null
          deleted_at: string | null
          folder_id: string | null
          id: string
          insurance_id: string | null
          insurance_note: string
          interventions: string
          locked: boolean
          note_kind: string
          plan_next_steps: string
          published: boolean
          published_at: string | null
          quick_notes: string
          service_date: string
          setting_events: string
          source_filename: string | null
          source_mime_type: string | null
          source_path: string | null
          status: string
          sync_mode: string
          title: string
          updated_at: string
          updated_by: string | null
          yjs_state: string | null
        }
        Insert: {
          behavior_observations?: string
          client_id: string
          client_response?: string
          color?: string | null
          content?: string
          cpt_code?: string | null
          cpt_template_id?: string | null
          created_at?: string
          created_by: string
          current_branch_id?: string | null
          deleted_at?: string | null
          folder_id?: string | null
          id?: string
          insurance_id?: string | null
          insurance_note?: string
          interventions?: string
          locked?: boolean
          note_kind?: string
          plan_next_steps?: string
          published?: boolean
          published_at?: string | null
          quick_notes?: string
          service_date?: string
          setting_events?: string
          source_filename?: string | null
          source_mime_type?: string | null
          source_path?: string | null
          status?: string
          sync_mode?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          yjs_state?: string | null
        }
        Update: {
          behavior_observations?: string
          client_id?: string
          client_response?: string
          color?: string | null
          content?: string
          cpt_code?: string | null
          cpt_template_id?: string | null
          created_at?: string
          created_by?: string
          current_branch_id?: string | null
          deleted_at?: string | null
          folder_id?: string | null
          id?: string
          insurance_id?: string | null
          insurance_note?: string
          interventions?: string
          locked?: boolean
          note_kind?: string
          plan_next_steps?: string
          published?: boolean
          published_at?: string | null
          quick_notes?: string
          service_date?: string
          setting_events?: string
          source_filename?: string | null
          source_mime_type?: string | null
          source_path?: string | null
          status?: string
          sync_mode?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          yjs_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_cpt_template_id_fkey"
            columns: ["cpt_template_id"]
            isOneToOne: false
            referencedRelation: "insurance_cpt_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_current_branch_fk"
            columns: ["current_branch_id"]
            isOneToOne: false
            referencedRelation: "session_note_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "session_note_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_insurance_id_fkey"
            columns: ["insurance_id"]
            isOneToOne: false
            referencedRelation: "insurance_payers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          comped_reason: string | null
          comped_until: string | null
          created_at: string
          current_period_end: string | null
          owner_id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          comped_reason?: string | null
          comped_until?: string | null
          created_at?: string
          current_period_end?: string | null
          owner_id: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          comped_reason?: string | null
          comped_until?: string | null
          created_at?: string
          current_period_end?: string | null
          owner_id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          behavior_id: string | null
          client_id: string
          created_at: string | null
          created_by: string
          edited_at: string | null
          id: string
          note: string | null
          original_amount: number | null
          original_note: string | null
          reward_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          balance_after: number
          behavior_id?: string | null
          client_id: string
          created_at?: string | null
          created_by: string
          edited_at?: string | null
          id?: string
          note?: string | null
          original_amount?: number | null
          original_note?: string | null
          reward_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          balance_after?: number
          behavior_id?: string | null
          client_id?: string
          created_at?: string | null
          created_by?: string
          edited_at?: string | null
          id?: string
          note?: string | null
          original_amount?: number | null
          original_note?: string | null
          reward_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_behavior_id_fkey"
            columns: ["behavior_id"]
            isOneToOne: false
            referencedRelation: "behaviors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_points: {
        Args: {
          p_amount: number
          p_behavior_id: string
          p_client_id: string
          p_note?: string
        }
        Returns: {
          amount: number
          balance_after: number
          behavior_id: string | null
          client_id: string
          created_at: string | null
          created_by: string
          edited_at: string | null
          id: string
          note: string | null
          original_amount: number | null
          original_note: string | null
          reward_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_add_client: { Args: { p_owner_id: string }; Returns: boolean }
      delete_transaction_and_rebalance: {
        Args: { p_transaction_id: string }
        Returns: undefined
      }
      get_client_session_by_qr: { Args: { p_qr_code: string }; Returns: Json }
      get_my_bcba_client_ids: { Args: never; Returns: string[] }
      get_my_client_ids: { Args: never; Returns: string[] }
      grant_comp: {
        Args: { p_owner_id: string; p_reason?: string; p_until: string }
        Returns: {
          cancel_at_period_end: boolean
          comped_reason: string | null
          comped_until: string | null
          created_at: string
          current_period_end: string | null
          owner_id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_behavior_visible: {
        Args: { p_behavior_id: string; p_user_id: string }
        Returns: boolean
      }
      is_pro: { Args: { p_owner_id: string }; Returns: boolean }
      is_reward_visible: {
        Args: { p_reward_id: string; p_user_id: string }
        Returns: boolean
      }
      penalty_points: {
        Args: {
          p_amount: number
          p_behavior_id: string
          p_client_id: string
          p_note?: string
        }
        Returns: {
          amount: number
          balance_after: number
          behavior_id: string | null
          client_id: string
          created_at: string | null
          created_by: string
          edited_at: string | null
          id: string
          note: string | null
          original_amount: number | null
          original_note: string | null
          reward_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rebalance_client_transactions: {
        Args: { p_client_id: string }
        Returns: undefined
      }
      redeem_reward: {
        Args: { p_client_id: string; p_note?: string; p_reward_id: string }
        Returns: {
          amount: number
          balance_after: number
          behavior_id: string | null
          client_id: string
          created_at: string | null
          created_by: string
          edited_at: string | null
          id: string
          note: string | null
          original_amount: number | null
          original_note: string | null
          reward_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_behavior_visibility: {
        Args: { p_behavior_id: string; p_user_ids: string[] }
        Returns: undefined
      }
      set_reward_visibility: {
        Args: { p_reward_id: string; p_user_ids: string[] }
        Returns: undefined
      }
      transfer_ownership: {
        Args: { p_client_id: string; p_new_owner_id: string }
        Returns: undefined
      }
      update_transaction_and_rebalance: {
        Args: { p_amount: number; p_note?: string; p_transaction_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "bcba" | "rbt" | "parent"
      transaction_type: "credit" | "debit"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["bcba", "rbt", "parent"],
      transaction_type: ["credit", "debit"],
    },
  },
} as const

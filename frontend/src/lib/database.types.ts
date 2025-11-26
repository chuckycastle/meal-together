// TypeScript types for Supabase database schema
// Generated from migrations - keep in sync with database

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string | null
          first_name: string | null
          last_name: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          auth_user_id: string | null
          sound_enabled: boolean
          theme: 'light' | 'dark'
          auth_provider: 'email' | 'google' | 'github'
          avatar_url: string | null
        }
        Insert: {
          id?: string
          email: string
          password_hash?: string | null
          first_name?: string | null
          last_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          auth_user_id?: string | null
          sound_enabled?: boolean
          theme?: 'light' | 'dark'
          auth_provider?: 'email' | 'google' | 'github'
          avatar_url?: string | null
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string | null
          first_name?: string | null
          last_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          auth_user_id?: string | null
          sound_enabled?: boolean
          theme?: 'light' | 'dark'
          auth_provider?: 'email' | 'google' | 'github'
          avatar_url?: string | null
        }
      }
      families: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      family_members: {
        Row: {
          id: string
          family_id: string
          user_id: string
          role: 'OWNER' | 'ADMIN' | 'MEMBER'
          joined_at: string
        }
        Insert: {
          id?: string
          family_id: string
          user_id: string
          role: 'OWNER' | 'ADMIN' | 'MEMBER'
          joined_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          user_id?: string
          role?: 'OWNER' | 'ADMIN' | 'MEMBER'
          joined_at?: string
        }
      }
      recipes: {
        Row: {
          id: string
          family_id: string
          name: string
          description: string | null
          prep_time: number
          cook_time: number
          total_time: number
          servings: number
          image_url: string | null
          source_url: string | null
          assigned_to: string | null
          target_start_time: string | null
          target_completion_time: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          name: string
          description?: string | null
          prep_time: number
          cook_time: number
          total_time: number
          servings: number
          image_url?: string | null
          source_url?: string | null
          assigned_to?: string | null
          target_start_time?: string | null
          target_completion_time?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          name?: string
          description?: string | null
          prep_time?: number
          cook_time?: number
          total_time?: number
          servings?: number
          image_url?: string | null
          source_url?: string | null
          assigned_to?: string | null
          target_start_time?: string | null
          target_completion_time?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ingredients: {
        Row: {
          id: string
          recipe_id: string
          name: string
          quantity: string | null
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          name: string
          quantity?: string | null
          order: number
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          name?: string
          quantity?: string | null
          order?: number
          created_at?: string
        }
      }
      cooking_steps: {
        Row: {
          id: string
          recipe_id: string
          order: number
          instruction: string
          estimated_time: number | null
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          order: number
          instruction: string
          estimated_time?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          order?: number
          instruction?: string
          estimated_time?: number | null
          created_at?: string
        }
      }
      recipe_timers: {
        Row: {
          id: string
          recipe_id: string
          name: string
          duration: number
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          name: string
          duration: number
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          name?: string
          duration?: number
          created_at?: string
        }
      }
      shopping_lists: {
        Row: {
          id: string
          family_id: string
          name: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          name: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          name?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shopping_list_items: {
        Row: {
          id: string
          shopping_list_id: string
          name: string
          quantity: string | null
          category: string | null
          notes: string | null
          checked: boolean
          added_by: string | null
          checked_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shopping_list_id: string
          name: string
          quantity?: string | null
          category?: string | null
          notes?: string | null
          checked?: boolean
          added_by?: string | null
          checked_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shopping_list_id?: string
          name?: string
          quantity?: string | null
          category?: string | null
          notes?: string | null
          checked?: boolean
          added_by?: string | null
          checked_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cooking_sessions: {
        Row: {
          id: string
          family_id: string
          recipe_id: string
          started_by: string | null
          started_at: string
          completed_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          family_id: string
          recipe_id: string
          started_by?: string | null
          started_at?: string
          completed_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          family_id?: string
          recipe_id?: string
          started_by?: string | null
          started_at?: string
          completed_at?: string | null
          is_active?: boolean
        }
      }
      active_timers: {
        Row: {
          id: string
          cooking_session_id: string
          name: string
          default_seconds: number
          remaining_seconds: number
          status: 'idle' | 'running' | 'paused' | 'finished'
          end_at: string | null
          started_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cooking_session_id: string
          name: string
          default_seconds: number
          remaining_seconds: number
          status: 'idle' | 'running' | 'paused' | 'finished'
          end_at?: string | null
          started_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cooking_session_id?: string
          name?: string
          default_seconds?: number
          remaining_seconds?: number
          status?: 'idle' | 'running' | 'paused' | 'finished'
          end_at?: string | null
          started_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

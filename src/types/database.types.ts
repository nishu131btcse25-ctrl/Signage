// This is a placeholder file. In a real project, you would generate this
// with the Supabase CLI: `npx supabase gen types typescript --project-id <your-project-id> > src/types/database.types.ts`
// For now, we'll use a simplified version.

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
      media: {
        Row: {
          created_at: string
          duration: number | null
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      screens: {
        Row: {
          created_at: string
          id: string
          is_online: boolean
          last_ping_at: string | null
          name: string
          pairing_code: string | null
          playlist: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_online?: boolean
          last_ping_at?: string | null
          name: string
          pairing_code?: string | null
          playlist?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_online?: boolean
          last_ping_at?: string | null
          name?: string
          pairing_code?: string | null
          playlist?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screens_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
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

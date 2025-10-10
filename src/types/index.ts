// These are placeholder types. We will generate the full types from Supabase schema later.

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

export interface Media {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  duration: number | null;
  created_at: string;
  url?: string; // For signed URLs
}

export interface PlaylistItem extends Media {
  // any additional playlist-specific properties can go here
}

export interface Screen {
  id: string;
  user_id: string;
  name: string;
  pairing_code: string | null;
  playlist: PlaylistItem[];
  is_online: boolean;
  last_ping_at: string | null;
  created_at: string;
}

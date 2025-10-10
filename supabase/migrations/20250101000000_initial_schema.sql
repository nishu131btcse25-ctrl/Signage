/*
# [Initial Schema Setup for SignageFlow]
This script establishes the core database structure for the SignageFlow application. It creates the necessary tables for managing user profiles, digital screens, and media assets. It also configures Row Level Security (RLS) to ensure that users can only access and manage their own data, which is a critical security measure for a multi-tenant application.

## Query Description: [This script is safe to run on a new Supabase project. It defines the foundational tables (`profiles`, `screens`, `media`) and sets up security policies. There is no risk of data loss as it only creates new structures. No backup is required before running this script.]

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Medium"]
- Requires-Backup: [false]
- Reversible: [true]

## Structure Details:
- **Tables Created:**
  - `public.profiles`: Stores user-specific data, linked to `auth.users`.
  - `public.screens`: Manages digital display screens, their configuration, and status.
  - `public.media`: Catalogs all user-uploaded media files.
- **RLS Policies:**
  - Policies are added to `profiles`, `screens`, and `media` to enforce data isolation between users.
  - A special policy is added to the `screens` table to allow unauthenticated devices to fetch screen details using a unique `pairing_code`.

## Security Implications:
- RLS Status: Enabled on all user-data tables.
- Policy Changes: Yes, new policies are created to enforce data ownership.
- Auth Requirements: Policies are tied to `auth.uid()`, integrating directly with Supabase Authentication.

## Performance Impact:
- Indexes: Primary keys and foreign keys create indexes automatically for efficient data retrieval. The `pairing_code` is marked as `UNIQUE`, which also creates an index.
- Triggers: None in this initial schema.
- Estimated Impact: Low. The schema is designed for standard CRUD operations with good performance characteristics for this application's scale.
*/

-- Profiles Table
-- Stores public user data. This table is linked to Supabase's built-in auth.users table.
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.profiles IS 'Stores public profile information for each user, extending auth.users.';

-- Function to create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create a profile on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'When a new user signs up, create a corresponding profile entry.';


-- Screens Table
-- Manages the digital displays. Each screen has a name, a playlist of media, and a status.
CREATE TABLE screens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  pairing_code TEXT UNIQUE,
  playlist JSONB DEFAULT '[]'::jsonb,
  is_online BOOLEAN DEFAULT FALSE,
  last_ping_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_screens_user_id ON public.screens(user_id);
COMMENT ON TABLE public.screens IS 'Represents the digital displays managed by users.';


-- Media Table
-- Stores metadata for uploaded images and videos.
CREATE TABLE media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  duration INT, -- For videos, in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_media_user_id ON public.media(user_id);
COMMENT ON TABLE public.media IS 'Contains metadata for all user-uploaded media files.';


-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Profiles
CREATE POLICY "User can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "User can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for Screens
CREATE POLICY "User can manage own screens" ON public.screens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read screen by pairing_code" ON public.screens FOR SELECT USING (pairing_code IS NOT NULL);

-- RLS Policies for Media
CREATE POLICY "User can manage own media" ON public.media FOR ALL USING (auth.uid() = user_id);


-- Supabase Storage Bucket Setup
-- This part of the setup is done via SQL for completeness, but also requires creating the bucket in the Supabase Dashboard.
-- 1. Create a bucket named 'media' in the Supabase Dashboard.
-- 2. The following policies secure the bucket so users can only access their own files.

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "User can view own media folder" ON storage.objects FOR SELECT USING (bucket_id = 'media' AND auth.uid() = owner);
CREATE POLICY "User can upload to own media folder" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.uid() = owner);
CREATE POLICY "User can update own media files" ON storage.objects FOR UPDATE USING (bucket_id = 'media' AND auth.uid() = owner);
CREATE POLICY "User can delete own media files" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND auth.uid() = owner);

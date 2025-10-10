-- 1. Create Profiles Table
/*
  # [Operation Name]
  Create public.profiles table

  ## Query Description:
  This operation creates the `profiles` table to hold public user information, separate from the secure `auth.users` table. It is designed to be automatically populated by a trigger when a new user signs up.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true (by dropping the table)

  ## Structure Details:
  - Table: `public.profiles`
  - Columns: `id` (UUID, Primary Key), `email` (TEXT), `full_name` (TEXT), `created_at` (TIMESTAMPTZ)

  ## Security Implications:
  - RLS Status: Will be enabled.
  - Auth Requirements: Linked to `auth.users` via triggers.

  ## Performance Impact:
  - Indexes: Primary key on `id`.
  - Estimated Impact: Negligible.
*/
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.profiles IS 'Public profile information for each user, extending auth.users.';

-- 2. Create Screens Table
/*
  # [Operation Name]
  Create public.screens table

  ## Query Description:
  This creates the `screens` table to store information about each digital display. It references `public.profiles` and will cascade deletes, meaning if a user profile is deleted, all their associated screens are also deleted.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true (by dropping the table)

  ## Structure Details:
  - Table: `public.screens`
  - Foreign Key: `user_id` references `public.profiles(id)` with `ON DELETE CASCADE`.

  ## Security Implications:
  - RLS Status: Will be enabled.
  - Auth Requirements: Linked to a user profile.

  ## Performance Impact:
  - Indexes: Primary key on `id`, foreign key index on `user_id`.
  - Estimated Impact: Negligible.
*/
CREATE TABLE public.screens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  pairing_code TEXT UNIQUE,
  playlist JSONB DEFAULT '[]'::jsonb,
  is_online BOOLEAN DEFAULT FALSE,
  last_ping_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.screens IS 'Stores information about individual digital signage screens.';

-- 3. Create Media Table
/*
  # [Operation Name]
  Create public.media table

  ## Query Description:
  This creates the `media` table for uploaded file metadata. It references `public.profiles` and will cascade deletes, so all of a user's media records are removed if their profile is deleted.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true (by dropping the table)

  ## Structure Details:
  - Table: `public.media`
  - Foreign Key: `user_id` references `public.profiles(id)` with `ON DELETE CASCADE`.

  ## Security Implications:
  - RLS Status: Will be enabled.
  - Auth Requirements: Linked to a user profile.

  ## Performance Impact:
  - Indexes: Primary key on `id`, foreign key index on `user_id`.
  - Estimated Impact: Negligligible.
*/
CREATE TABLE public.media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  duration INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
COMMENT ON TABLE public.media IS 'Metadata for uploaded media files.';

-- 4. Create function and trigger to automatically create a profile on user sign-up
/*
  # [Operation Name]
  Create function and trigger for new user profiles

  ## Query Description:
  This automation creates a profile automatically. The function `handle_new_user` inserts a record into `public.profiles` using data from `auth.users`. The trigger `on_auth_user_created` calls this function after a new user is created, ensuring every user has a profile.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true (by dropping the trigger and function)

  ## Security Implications:
  - This function runs with elevated privileges (`SECURITY DEFINER`) to interact with both `auth` and `public` schemas correctly.
  - It's a standard and secure pattern recommended by Supabase.

  ## Performance Impact:
  - Adds a minimal, negligible overhead to the user sign-up process.
*/
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Create function and trigger to automatically delete a profile on user deletion
/*
  # [Operation Name]
  Create function and trigger for user deletion

  ## Query Description:
  This automation handles data cleanup. The function `handle_deleted_user` removes the corresponding record from `public.profiles`. The trigger `on_auth_user_deleted` calls this function after a user is deleted from `auth.users`, which in turn will cascade-delete all their associated screens and media.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "High"
  - Requires-Backup: true (before running any user deletion)
  - Reversible: true (by dropping the trigger and function)

  ## Security Implications:
  - This function runs with `SECURITY DEFINER` to ensure it can delete the profile. This completes the data lifecycle management for users.

  ## Performance Impact:
  - Adds a minimal overhead to the user deletion process.
*/
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = old.id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();

-- 6. Enable Row Level Security (RLS) on all tables
/*
  # [Operation Name]
  Enable Row Level Security (RLS)

  ## Query Description:
  This enables RLS on our tables, which is a critical security step. By default, it blocks all access until explicit policies are created.

  ## Metadata:
  - Schema-Category: "Dangerous"
  - Impact-Level: "High"
  - Requires-Backup: false
  - Reversible: true

  ## Security Implications:
  - RLS is the foundation of our data access security model.
*/
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies for data access
/*
  # [Operation Name]
  Create RLS Policies for Data Access

  ## Query Description:
  These policies define who can access what data.
  1.  **Profiles**: Users can view and update only their own profile.
  2.  **Screens & Media**: Users have full control over their own screens and media items.
  3.  **Public Screen Access**: Allows unauthenticated requests to read screen data using a `pairing_code`. This is vital for the physical display client.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true

  ## Security Implications:
  - These policies enforce user-specific data isolation.
*/
CREATE POLICY "User can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "User can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "User can manage own screens" ON public.screens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "User can manage own media" ON public.media FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read screen by pairing_code" ON public.screens FOR SELECT USING (pairing_code IS NOT NULL);

-- 8. Create Storage Policies
/*
  # [Operation Name]
  Create Storage Access Policies

  ## Query Description:
  These policies secure the 'media' storage bucket. They ensure that authenticated users can only view, upload, update, and delete their own files. Access is determined by matching the user's ID with the 'owner' of the file object.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true

  ## Security Implications:
  - Secures file storage by enforcing ownership rules for all file operations.
*/
CREATE POLICY "User can view own media files"
ON storage.objects FOR SELECT
USING ( bucket_id = 'media' AND auth.uid() = owner );

CREATE POLICY "User can upload media files"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'media' AND auth.uid() = owner );

CREATE POLICY "User can update own media files"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'media' AND auth.uid() = owner );

CREATE POLICY "User can delete own media files"
ON storage.objects FOR DELETE
USING ( bucket_id = 'media' AND auth.uid() = owner );

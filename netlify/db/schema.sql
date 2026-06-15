-- Netlify DB Schema for Dunkin' Community Hub
-- Run this in your Netlify DB console to initialize the schema

-- Users table (extends Netlify Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  netlify_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donut submissions table
CREATE TABLE IF NOT EXISTS donut_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  creator_name TEXT NOT NULL,
  creator_email TEXT NOT NULL,
  creator_phone TEXT,
  creator_city TEXT,
  creator_image_url TEXT,
  creator_twitter_handle TEXT,
  creator_instagram_handle TEXT,
  creator_tiktok_handle TEXT,
  design_base_type TEXT NOT NULL,
  design_glaze_type TEXT NOT NULL,
  design_sprinkles_type TEXT NOT NULL,
  design_drizzle_type TEXT DEFAULT 'none',
  design_custom_toppings TEXT[] DEFAULT '{}',
  design_icing_message TEXT,
  video_url TEXT,
  video_storage_key TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Likes table (tracks user likes on submissions)
CREATE TABLE IF NOT EXISTS submission_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES donut_submissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, submission_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_donut_submissions_status ON donut_submissions(status);
CREATE INDEX IF NOT EXISTS idx_donut_submissions_created ON donut_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donut_submissions_email ON donut_submissions(creator_email);
CREATE INDEX IF NOT EXISTS idx_submission_likes_user ON submission_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_submission_likes_submission ON submission_likes(submission_id);

-- RLS Policies (Row Level Security)
ALTER TABLE donut_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read approved submissions
CREATE POLICY "Read approved submissions" ON donut_submissions
  FOR SELECT USING (status = 'approved');

-- Authenticated users can create submissions
CREATE POLICY "Create submissions" ON donut_submissions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own submissions
CREATE POLICY "Update own submissions" ON donut_submissions
  FOR UPDATE USING (user_id = auth.uid());

-- Users can like submissions
CREATE POLICY "Create likes" ON submission_likes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can delete their own likes
CREATE POLICY "Delete own likes" ON submission_likes
  FOR DELETE USING (user_id = auth.uid());

-- Users can read their own profile
CREATE POLICY "Read own profile" ON users
  FOR SELECT USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

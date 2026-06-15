-- =====================================================
-- Dunkin' Donut Creator — Supabase Schema + Storage Setup
-- Run this in your Supabase SQL Editor (new query → run)
-- =====================================================

-- -----------------------------------------------------
-- Table: donut_submissions
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS donut_submissions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  creator_name text NOT NULL,
  creator_email text,
  creator_phone text,
  creator_city text,
  creator_image_url text,
  creator_twitter_handle text,
  creator_instagram_handle text,
  creator_tiktok_handle text,
  design_base_type text NOT NULL,
  design_glaze_type text NOT NULL,
  design_sprinkles_type text NOT NULL,
  design_drizzle_type text DEFAULT 'none',
  design_custom_toppings jsonb DEFAULT '[]'::jsonb,
  design_icing_message text DEFAULT '',
  video_url text,
  video_storage_key text,
  status text DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON donut_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON donut_submissions(created_at DESC);

-- -----------------------------------------------------
-- Function: increment_likes
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION increment_likes(submission_id bigint)
RETURNS SETOF donut_submissions
LANGUAGE sql
AS $$
  UPDATE donut_submissions
  SET likes_count = likes_count + 1
  WHERE id = submission_id
  RETURNING *;
$$;

-- -----------------------------------------------------
-- RLS Policies
-- -----------------------------------------------------
ALTER TABLE donut_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read approved submissions"
  ON donut_submissions
  FOR SELECT
  USING (status = 'approved');

-- -----------------------------------------------------
-- Storage Bucket: donut-videos
-- -----------------------------------------------------
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('donut-videos', 'donut-videos', true, false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public video access"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'donut-videos');

CREATE POLICY "Allow uploads"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'donut-videos');

CREATE POLICY "Allow updates"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'donut-videos');

CREATE POLICY "Allow deletes"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'donut-videos');

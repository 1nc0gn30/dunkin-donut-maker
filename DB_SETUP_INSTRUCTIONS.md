# Database Setup Instructions

## You're seeing "Cannot run modification statements in read-only mode" because:

You're likely viewing the database in **read-only mode**. You need to access the **SQL Editor** or **Console** with write permissions.

---

## How to Access Write Mode

### Option 1: Netlify Dashboard → Database → Console

1. Go to **Netlify Dashboard** (app.netlify.com)
2. Select your site
3. Click **Database** in the left sidebar
4. Click **Console** tab (not "Browse" or "Overview")
5. You should see a SQL editor with a **"Run"** button

### Option 2: Direct SQL Editor URL

Navigate to:
```
https://app.netlify.com/sites/YOUR-SITE-NAME/database/console
```

Replace `YOUR-SITE-NAME` with your actual site name.

---

## Run This SQL Script

Copy and paste the entire block below into the Console:

```sql
-- Drop existing tables (if any)
DROP TABLE IF EXISTS submission_likes;
DROP TABLE IF EXISTS donut_submissions;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  netlify_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donut submissions table
CREATE TABLE donut_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  creator_name TEXT NOT NULL,
  creator_email TEXT NOT NULL,
  creator_phone TEXT,
  creator_image_url TEXT,
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

-- Likes table
CREATE TABLE submission_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES donut_submissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, submission_id)
);

-- Indexes
CREATE INDEX idx_donut_submissions_status ON donut_submissions(status);
CREATE INDEX idx_donut_submissions_created ON donut_submissions(created_at DESC);
CREATE INDEX idx_donut_submissions_email ON donut_submissions(creator_email);
CREATE INDEX idx_submission_likes_user ON submission_likes(user_id);
CREATE INDEX idx_submission_likes_submission ON submission_likes(submission_id);

-- Enable RLS
ALTER TABLE donut_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Read approved submissions" ON donut_submissions
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Create submissions" ON donut_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Update own submissions" ON donut_submissions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Create likes" ON submission_likes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Delete own likes" ON submission_likes
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Read own profile" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Update own profile" ON users
  FOR UPDATE USING (id = auth.uid());
```

---

## Verify It Worked

After running the script, run this to check:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should show: donut_submissions, submission_likes, users

-- Check donut_submissions columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'donut_submissions' 
ORDER BY ordinal_position;

-- Should show all columns including creator_email, creator_phone
```

---

## Still Getting Read-Only Error?

### Possible Causes:

1. **Database not fully provisioned yet**
   - Wait 5-10 minutes after enabling DB
   - Refresh the page

2. **Wrong permissions**
   - Make sure you're the site owner or have admin access
   - Check team permissions in Netlify

3. **Using the wrong interface**
   - "Browse Data" is read-only
   - Use "Console" or "SQL Editor" tab

4. **Database region issues**
   - Try accessing from a different browser
   - Clear cache and refresh

---

## After Setup: Test Submission

1. Redeploy your site:
```bash
netlify deploy --prod
```

2. Open your live site
3. Create a donut and submit
4. Check logs:
```bash
netlify functions:log --watch
```

5. Check database:
```sql
SELECT id, creator_name, creator_email, status, created_at 
FROM donut_submissions 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## If Still Not Working

Share the exact error message from:
1. Browser console (F12 → Console tab)
2. Netlify Functions logs (`netlify functions:log`)
3. Netlify DB Console error

This will help identify the exact issue.

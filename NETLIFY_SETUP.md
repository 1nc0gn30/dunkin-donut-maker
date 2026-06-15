# Netlify Setup Guide for Dunkin' Community Hub

This guide walks you through setting up Netlify DB, Auth, and Blob Storage so the donut submission system works correctly.

---

## Quick Checklist

- [ ] 1. Create Netlify site
- [ ] 2. Enable Netlify DB
- [ ] 3. Run database schema
- [ ] 4. Enable Netlify Auth (optional)
- [ ] 5. Create Blob Storage bucket
- [ ] 6. Deploy the site
- [ ] 7. Test submission flow

---

## Step 1: Create Netlify Site

```bash
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize your site
cd /home/neo/dunkin'-community-hub
netlify init
```

Choose:
- **Create & configure a new site**
- Select your team
- Choose a unique site name

---

## Step 2: Enable Netlify DB

1. Go to your Netlify dashboard → Your Site → **Database**
2. Click **"Enable Database"** or **"Create Database"**
3. Wait for provisioning (takes ~2-3 minutes)
4. Once ready, click **"Console"** or **"SQL Editor"**

---

## Step 3: Run the Database Schema

In the Netlify DB Console, run the SQL from `netlify/db/schema.sql`:

```sql
-- Users table (extends Netlify Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  netlify_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donut submissions table with contact info
CREATE TABLE IF NOT EXISTS donut_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  creator_name TEXT NOT NULL,
  creator_email TEXT,
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
CREATE TABLE IF NOT EXISTS submission_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES donut_submissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, submission_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_donut_submissions_status ON donut_submissions(status);
CREATE INDEX IF NOT EXISTS idx_donut_submissions_created ON donut_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donut_submissions_email ON donut_submissions(creator_email);
CREATE INDEX IF NOT EXISTS idx_submission_likes_user ON submission_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_submission_likes_submission ON submission_likes(submission_id);

-- Enable RLS
ALTER TABLE donut_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Read approved submissions" ON donut_submissions
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Create submissions" ON donut_submissions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

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

**Verify:** Run `SELECT * FROM donut_submissions LIMIT 1;` - should return empty result (no error).

---

## Step 4: Enable Netlify Auth (Optional but Recommended)

For user tracking and authentication:

1. Go to Netlify Dashboard → **Authentication**
2. Click **"Enable Authentication"**
3. Configure providers:
   - **Email/Password** (required for basic signups)
   - **OAuth** (Google, GitHub, etc. - optional)
4. Save configuration

**Note:** The app works without Auth (uses guest submissions), but enabling it allows users to track their submissions.

---

## Step 5: Create Blob Storage Bucket

For storing 3D donut videos:

1. Go to Netlify Dashboard → **Storage** → **Blob Store**
2. Click **"Create Bucket"**
3. Name it: `donut-videos`
4. Set permissions:
   - **Public read** (so videos can be displayed)
   - **Authenticated write** (only logged-in users can upload)

---

## Step 6: Deploy the Site

```bash
# Build and deploy
netlify deploy --prod

# Or use the UI
# Push to GitHub/GitLab and connect in Netlify dashboard
```

**Environment Variables** (set in Netlify Dashboard → Site Settings → Environment Variables):

| Variable | Value | Description |
|----------|-------|-------------|
| `GEMINI_API_KEY` | Your key | For AI scream translation |
| `APP_URL` | `https://yoursite.netlify.app` | Production URL |

---

## Step 7: Test the Submission Flow

1. **Open your deployed site**
2. **Create a donut** in the 3D builder
3. **Fill in the contact form:**
   - Name (required)
   - Email (required, validated)
   - Phone (optional)
4. **Export video** (optional)
5. **Click "Submit to Official Menu"**

**Expected behavior:**
- ✅ Submission success message appears
- ✅ Donut appears in Community Showcase (after approval)
- ✅ Check Netlify DB: `SELECT * FROM donut_submissions ORDER BY created_at DESC LIMIT 1;`

---

## Troubleshooting

### Functions return 500 errors

**Check logs:**
```bash
netlify functions:log
```

**Common issues:**
- Missing `@netlify/db` or `@netlify/blobs` packages
- Database not provisioned yet
- RLS policies too restrictive

### Database connection fails

- Ensure DB is enabled in Netlify dashboard
- Check that schema was run successfully
- Verify table names match (`donut_submissions` not `submissions`)

### Video upload fails

- Ensure `donut-videos` bucket exists
- Check bucket permissions (public read)
- Verify video size < 10MB (Netlify limit)

### Submissions don't appear

- Check submission `status` - should be `approved` to show publicly
- Update manually: `UPDATE donut_submissions SET status = 'approved' WHERE id = 'your-id';`

---

## Admin: Approving Submissions

To approve submissions in Netlify DB Console:

```sql
-- View pending submissions
SELECT id, creator_name, creator_email, design_icing_message, created_at 
FROM donut_submissions 
WHERE status = 'pending' 
ORDER BY created_at DESC;

-- Approve a submission
UPDATE donut_submissions 
SET status = 'approved' 
WHERE id = 'submission-uuid-here';

-- Reject a submission
UPDATE donut_submissions 
SET status = 'rejected' 
WHERE id = 'submission-uuid-here';
```

---

## Contact Data Export

To export all contact info for winner notifications:

```sql
SELECT 
  creator_name,
  creator_email,
  creator_phone,
  design_icing_message,
  likes_count,
  created_at
FROM donut_submissions
WHERE status = 'approved'
ORDER BY likes_count DESC;
```

Export as CSV from Netlify DB Console for your competition management.

---

## Local Development

The app gracefully degrades in local dev:
- Functions log submissions to console instead of DB
- Mock data is used if API calls fail
- No errors shown to users

**To test locally:**
```bash
netlify dev
# Open http://localhost:8888
```

Check the Netlify Dev console for logged submission data.

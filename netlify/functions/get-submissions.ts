import { Handler } from '@netlify/functions';
import { Client } from 'pg';
// Backwards-compat: old submissions stored the raw Netlify Blobs URL, which
// is not publicly playable. Rewrite it to use the get-video proxy.
const normalizeVideoUrl = (url: string | null): string | null => {
  if (!url) return null;
  // Old raw blob URLs are not publicly playable; route through the proxy.
  const blobPrefix = '/.netlify/blobs/donut-videos/';
  if (url.startsWith(blobPrefix)) {
    const key = url.slice(blobPrefix.length);
    return `/.netlify/functions/get-video?key=${encodeURIComponent(key)}`;
  }
  // Local-dev placeholder URLs won't work in production; drop them so the fallback image shows.
  if (url.startsWith('/placeholder/')) {
    return null;
  }
  return url;
};


export const handler: Handler = async (event) => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Get submissions function invoked');
    await client.connect();
    
    console.log('Querying approved submissions...');
    const result = await client.query(
      `SELECT 
        id, creator_name, creator_email, creator_phone, creator_city, creator_image_url,
        design_base_type, design_glaze_type, design_sprinkles_type,
        design_drizzle_type, design_custom_toppings, design_icing_message,
        video_url, status, likes_count, created_at
      FROM donut_submissions
      WHERE status = 'approved'
      ORDER BY created_at DESC`
    );

    console.log(`Found ${result.rows.length} approved submissions`);

    const submissions = result.rows.map((row) => ({
      id: row.id,
      creatorName: row.creator_name,
      creatorEmail: row.creator_email,
      creatorPhone: row.creator_phone,
      creatorCity: row.creator_city,
      creatorImage: row.creator_image_url,
      twitterHandle: row.creator_twitter_handle,
      instagramHandle: row.creator_instagram_handle,
      tiktokHandle: row.creator_tiktok_handle,
      design: {
        baseType: row.design_base_type,
        glazeType: row.design_glaze_type,
        sprinklesType: row.design_sprinkles_type,
        drizzleType: row.design_drizzle_type || 'none',
        customToppings: row.design_custom_toppings || [],
        icingMessage: row.design_icing_message || '',
      },
      videoUrl: normalizeVideoUrl(row.video_url),
      likes: row.likes_count,
      createdAt: row.created_at,
      status: row.status,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(submissions),
    };
  } catch (err) {
    console.error('Handler error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch submissions',
        details: err instanceof Error ? err.message : String(err),
      }),
    };
  } finally {
    await client.end();
  }
};

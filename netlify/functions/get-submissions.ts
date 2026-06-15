import { Handler } from '@netlify/functions';
import { supabase } from './lib/supabase';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';

const normalizeVideoUrl = (url: string | null, storageKey: string | null): string | null => {
  if (!url && !storageKey) return null;

  // Already a Supabase public URL
  if (url?.includes('/storage/v1/object/public/donut-videos/')) {
    return url;
  }

  // Browser blob URLs are temporary and useless after reload
  if (url?.startsWith('blob:')) {
    return storageKey
      ? `${supabaseUrl}/storage/v1/object/public/donut-videos/${storageKey}`
      : null;
  }

  // Old Netlify proxy URLs — extract key and rebuild as Supabase URL
  if (url?.startsWith('/.netlify/functions/get-video')) {
    const key = new URL(url, 'http://localhost').searchParams.get('key');
    if (key) {
      return `${supabaseUrl}/storage/v1/object/public/donut-videos/${key}`;
    }
  }

  // Old raw Netlify blob URLs
  if (url?.startsWith('/.netlify/blobs/donut-videos/')) {
    const key = url.slice('/.netlify/blobs/donut-videos/'.length);
    return `${supabaseUrl}/storage/v1/object/public/donut-videos/${key}`;
  }

  // Local placeholder URLs
  if (url?.startsWith('/placeholder/')) {
    return storageKey
      ? `${supabaseUrl}/storage/v1/object/public/donut-videos/${storageKey}`
      : null;
  }

  // If URL is already usable, keep it
  if (url) {
    return url;
  }

  // Final fallback: construct from storage key
  if (storageKey) {
    return `${supabaseUrl}/storage/v1/object/public/donut-videos/${storageKey}`;
  }

  return null;
};

export const handler: Handler = async () => {
  try {
    const { data: rows, error } = await supabase
      .from('donut_submissions')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch submissions', details: error.message }),
      };
    }

    const submissions = (rows || []).map((row: any) => ({
      id: String(row.id),
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
      videoUrl: normalizeVideoUrl(row.video_url, row.video_storage_key),
      videoStorageKey: row.video_storage_key || null,
      likes: row.likes_count,
      createdAt: row.created_at,
      status: row.status,
    }));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(submissions),
    };
  } catch (err: any) {
    console.error('Handler error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch submissions', details: err.message }),
    };
  }
};

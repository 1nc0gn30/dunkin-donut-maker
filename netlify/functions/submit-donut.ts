import { Handler } from '@netlify/functions';
import { supabase } from './lib/supabase';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const {
      creatorName,
      creatorEmail,
      creatorPhone,
      creatorCity,
      creatorImage,
      twitterHandle,
      instagramHandle,
      tiktokHandle,
      design,
      videoUrl,
      videoStorageKey,
    } = JSON.parse(event.body || '{}');

    if (!creatorName?.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Creator name is required' }) };
    }
    if (!design || !design.baseType || !design.glazeType || !design.sprinklesType) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid donut design data' }) };
    }
    if (creatorEmail && creatorEmail.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(creatorEmail)) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Please provide a valid email address' }) };
      }
    }

    const persistedVideoUrl =
      videoUrl && typeof videoUrl === 'string' && !videoUrl.startsWith('blob:')
        ? videoUrl
        : null;

    const status = process.env.DONUT_SUBMISSION_MODERATION === 'true' ? 'pending' : 'approved';

    const { data: row, error } = await supabase
      .from('donut_submissions')
      .insert({
        creator_name: creatorName.trim(),
        creator_email: creatorEmail?.trim() || null,
        creator_phone: creatorPhone?.trim() || null,
        creator_city: creatorCity?.trim() || null,
        creator_image_url: creatorImage?.trim() || null,
        creator_twitter_handle: twitterHandle?.trim() || null,
        creator_instagram_handle: instagramHandle?.trim() || null,
        creator_tiktok_handle: tiktokHandle?.trim() || null,
        design_base_type: design.baseType,
        design_glaze_type: design.glazeType,
        design_sprinkles_type: design.sprinklesType,
        design_drizzle_type: design.drizzleType || 'none',
        design_custom_toppings: design.customToppings || [],
        design_icing_message: design.icingMessage || '',
        video_url: persistedVideoUrl,
        video_storage_key: videoStorageKey || null,
        status,
        likes_count: 0,
      })
      .select('id, status, created_at')
      .single();

    if (error || !row) {
      console.error('Supabase insert error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal server error', details: error?.message || 'Insert failed' }),
      };
    }

    return {
      statusCode: 201,
      body: JSON.stringify({
        id: String(row.id),
        status: row.status,
        videoUrl: persistedVideoUrl,
        videoStorageKey: videoStorageKey || null,
        message: 'Submission created successfully',
      }),
    };
  } catch (err: any) {
    console.error('Handler error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: err.message }),
    };
  }
};

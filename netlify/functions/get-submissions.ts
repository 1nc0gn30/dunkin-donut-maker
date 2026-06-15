import { Handler } from '@netlify/functions';
import { createClient } from '@netlify/db';

export const handler: Handler = async (event) => {
  try {
    const db = createClient();
    
    // Get approved submissions with user info, ordered by creation date
    const { data, error } = await db
      .from('donut_submissions')
      .select(`
        id,
        creator_name,
        creator_image_url,
        design_base_type,
        design_glaze_type,
        design_sprinkles_type,
        design_drizzle_type,
        design_custom_toppings,
        design_icing_message,
        video_url,
        status,
        likes_count,
        created_at,
        users (
          display_name,
          avatar_url
        )
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch submissions' }),
      };
    }

    // Transform to match frontend expected format
    const submissions = data.map((row: any) => ({
      id: row.id,
      creatorName: row.creator_name,
      creatorImage: row.creator_image_url,
      design: {
        baseType: row.design_base_type,
        glazeType: row.design_glaze_type,
        sprinklesType: row.design_sprinkles_type,
        drizzleType: row.design_drizzle_type || 'none',
        customToppings: row.design_custom_toppings || [],
        icingMessage: row.design_icing_message || '',
      },
      videoUrl: row.video_url,
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
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

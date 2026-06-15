import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      creatorName,
      creatorEmail,
      creatorPhone,
      creatorImage,
      design,
      videoUrl,
      videoStorageKey,
    } = body;

    // Validate required fields
    if (!creatorName || !creatorEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Name and email are required' }),
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(creatorEmail)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Please provide a valid email address' }),
      };
    }

    // Check if Netlify DB is available
    const isLocalDev = process.env.CONTEXT === 'dev' || !process.env.NETLIFY;
    
    if (isLocalDev) {
      console.log('Local dev: Skipping DB insert, returning mock response');
      console.log('Submission data:', { creatorName, creatorEmail, creatorPhone, design });
      return {
        statusCode: 201,
        body: JSON.stringify({
          id: `local-${Date.now()}`,
          status: 'pending',
          message: 'Submission created (local dev mode)',
        }),
      };
    }

    // Production: Insert into Netlify DB
    const { createClient } = await import('@netlify/db');
    const db = createClient();
    const userId = event.headers['x-netlify-user-id'] || null;

    const { data, error } = await db
      .from('donut_submissions')
      .insert({
        user_id: userId,
        creator_name: creatorName,
        creator_email: creatorEmail,
        creator_phone: creatorPhone,
        creator_image_url: creatorImage,
        design_base_type: design.baseType,
        design_glaze_type: design.glazeType,
        design_sprinkles_type: design.sprinklesType,
        design_drizzle_type: design.drizzleType || 'none',
        design_custom_toppings: design.customToppings || [],
        design_icing_message: design.icingMessage,
        video_url: videoUrl,
        video_storage_key: videoStorageKey,
        status: 'pending',
        likes_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create submission', details: error.message }),
      };
    }

    return {
      statusCode: 201,
      body: JSON.stringify({
        id: data.id,
        status: 'pending',
        message: 'Submission created successfully',
      }),
    };
  } catch (err) {
    console.error('Handler error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: err instanceof Error ? err.message : String(err)
      }),
    };
  }
};

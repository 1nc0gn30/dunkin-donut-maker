import { Handler } from '@netlify/functions';
import { Client } from 'pg';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Submit donut function invoked');
    const body = JSON.parse(event.body || '{}');
    console.log('Request body:', body);
    
    const {
      creatorName,
      creatorEmail,
      creatorPhone,
      creatorCity,
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

    // Connect and insert
    console.log('Connecting to database...');
    await client.connect();
    
    console.log('Inserting submission...');
    const result = await client.query(
      `INSERT INTO donut_submissions (
        creator_name, creator_email, creator_phone, creator_city, creator_image_url,
        design_base_type, design_glaze_type, design_sprinkles_type,
        design_drizzle_type, design_custom_toppings, design_icing_message,
        video_url, video_storage_key, status, likes_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, status, created_at`,
      [
        creatorName,
        creatorEmail,
        creatorPhone || null,
        creatorCity || null,
        creatorImage || null,
        design.baseType,
        design.glazeType,
        design.sprinklesType,
        design.drizzleType || 'none',
        design.customToppings || [],
        design.icingMessage || '',
        videoUrl || null,
        videoStorageKey || null,
        'pending',
        0,
      ]
    );

    const row = result.rows[0];
    console.log('Submission created:', row.id);
    
    return {
      statusCode: 201,
      body: JSON.stringify({
        id: row.id,
        status: row.status,
        message: 'Submission created successfully',
      }),
    };
  } catch (err) {
    console.error('Handler error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: err instanceof Error ? err.message : String(err),
      }),
    };
  } finally {
    await client.end();
  }
};

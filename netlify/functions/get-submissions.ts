import { Handler } from '@netlify/functions';
import { Client } from 'pg';

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
      body: JSON.stringify({ 
        error: 'Failed to fetch submissions',
        details: err instanceof Error ? err.message : String(err),
      }),
    };
  } finally {
    await client.end();
  }
};

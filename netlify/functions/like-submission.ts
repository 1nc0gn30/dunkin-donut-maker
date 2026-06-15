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
    const { submissionId } = JSON.parse(event.body || '{}');

    if (!submissionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Submission ID required' }),
      };
    }

    await client.connect();

    // For now, just increment likes (simplified - no user tracking)
    // In production, you'd want to track user likes to prevent duplicate voting
    await client.query(
      `UPDATE donut_submissions 
       SET likes_count = likes_count + 1 
       WHERE id = $1`,
      [submissionId]
    );

    const { rows } = await client.query(
      `SELECT likes_count FROM donut_submissions WHERE id = $1`,
      [submissionId]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        likes: rows[0]?.likes_count || 0,
        liked: true,
      }),
    };
  } catch (err) {
    console.error('Handler error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to toggle like',
        details: err instanceof Error ? err.message : String(err)
      }),
    };
  } finally {
    await client.end();
  }
};

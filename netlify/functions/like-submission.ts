import { Handler } from '@netlify/functions';
import { createClient } from '@netlify/db';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const db = createClient();
    const { submissionId } = JSON.parse(event.body || '{}');
    const userId = event.headers['x-netlify-user-id'];

    if (!submissionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Submission ID required' }),
      };
    }

    // Check if user already liked this submission
    const { data: existingLike } = await db
      .from('submission_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('submission_id', submissionId)
      .single();

    if (existingLike) {
      // Unlike - remove the like
      await db
        .from('submission_likes')
        .delete()
        .eq('id', existingLike.id);

      // Decrement likes count
      await db
        .from('donut_submissions')
        .update({ likes_count: db.raw('likes_count - 1') })
        .eq('id', submissionId);
    } else {
      // Like - add the like
      await db
        .from('submission_likes')
        .insert({
          user_id: userId,
          submission_id: submissionId,
        });

      // Increment likes count
      await db
        .from('donut_submissions')
        .update({ likes_count: db.raw('likes_count + 1') })
        .eq('id', submissionId);
    }

    // Get updated submission
    const { data: updated } = await db
      .from('donut_submissions')
      .select('likes_count')
      .eq('id', submissionId)
      .single();

    return {
      statusCode: 200,
      body: JSON.stringify({
        likes: updated?.likes_count || 0,
        liked: !existingLike,
      }),
    };
  } catch (err) {
    console.error('Handler error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

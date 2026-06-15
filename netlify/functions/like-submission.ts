import { Handler } from '@netlify/functions';
import { supabase } from './lib/supabase';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { submissionId } = JSON.parse(event.body || '{}');
    if (!submissionId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Submission ID required' }) };
    }

    // Increment likes using RPC to avoid race conditions
    const { data: rows, error: rpcError } = await supabase.rpc('increment_likes', {
      submission_id: Number(submissionId),
    });

    if (rpcError) {
      // Fallback: read-update-write
      const { data: current } = await supabase
        .from('donut_submissions')
        .select('likes_count')
        .eq('id', Number(submissionId))
        .single();

      if (!current) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Submission not found' }) };
      }

      const newCount = (current.likes_count || 0) + 1;
      const { error: updError } = await supabase
        .from('donut_submissions')
        .update({ likes_count: newCount })
        .eq('id', Number(submissionId));

      if (updError) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to update likes' }) };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ likes: newCount, liked: true }),
      };
    }

    const newCount = rows?.[0]?.likes_count ?? 0;
    return {
      statusCode: 200,
      body: JSON.stringify({ likes: newCount, liked: true }),
    };
  } catch (err: any) {
    console.error('Handler error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to toggle like', details: err.message }) };
  }
};

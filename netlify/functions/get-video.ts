import { Handler } from '@netlify/functions';
import { supabase } from './lib/supabase';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'OPTIONS') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  const key = event.queryStringParameters?.key;
  if (!key) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing video key' }) };
  }

  try {
    const { data: publicUrlData } = supabase.storage
      .from('donut-videos')
      .getPublicUrl(key);

    if (!publicUrlData?.publicUrl) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Video not found' }) };
    }

    // Redirect to Supabase public URL (supports range requests natively)
    return {
      statusCode: 302,
      headers: {
        ...corsHeaders,
        Location: publicUrlData.publicUrl,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
      body: '',
    };
  } catch (err: any) {
    console.error('Get video error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch video', details: err.message }),
    };
  }
};

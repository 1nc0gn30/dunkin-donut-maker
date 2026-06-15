import { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

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
    const store = getStore({
      name: 'donut-videos',
    });

    const blob = await store.get(key, { type: 'arrayBuffer' });
    if (!blob) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Video not found' }) };
    }

    const buffer = Buffer.from(blob);
    const totalLength = buffer.length;
    const contentType = 'video/webm';
    const rangeHeader = event.headers?.range || event.multiValueHeaders?.range?.[0];

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : totalLength - 1;
        const chunk = buffer.slice(start, end + 1);
        return {
          statusCode: 206,
          headers: {
            ...corsHeaders,
            'Content-Type': contentType,
            'Content-Length': String(chunk.length),
            'Content-Range': `bytes ${start}-${end}/${totalLength}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
          body: chunk.toString('base64'),
          isBase64Encoded: true,
        };
      }
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Length': String(totalLength),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('Get video error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch video',
        details: err instanceof Error ? err.message : String(err),
      }),
    };
  }
};

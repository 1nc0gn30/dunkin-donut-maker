import { Handler } from '@netlify/functions';
import { supabase } from './lib/supabase';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { videoBase64, filename } = body;

    if (!videoBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No video data provided' }),
      };
    }

    const base64Data = videoBase64.includes(',')
      ? videoBase64.split(',')[1]
      : videoBase64;

    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Empty video data' }),
      };
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const originalFilename = filename || 'donut-video.webm';
    const storageKey = `videos/${timestamp}-${randomId}-${originalFilename}`;

    const { error: uploadError } = await supabase.storage
      .from('donut-videos')
      .upload(storageKey, buffer, {
        contentType: 'video/webm',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to upload video', details: uploadError.message }),
      };
    }

    const { data: publicUrlData } = supabase.storage
      .from('donut-videos')
      .getPublicUrl(storageKey);

    const url = publicUrlData.publicUrl;
    console.log('Video uploaded to Supabase:', url, 'size:', buffer.length);

    return {
      statusCode: 200,
      body: JSON.stringify({ url, storageKey }),
    };
  } catch (err: any) {
    console.error('Upload error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to upload video', details: err.message }),
    };
  }
};

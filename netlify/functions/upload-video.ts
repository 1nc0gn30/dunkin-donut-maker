import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // Parse JSON body with base64 video data
    const body = JSON.parse(event.body || '{}');
    const { videoBase64, filename } = body;

    if (!videoBase64) {
      console.error('No video data provided in request');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No video data provided' }),
      };
    }

    // Generate unique key
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const originalFilename = filename || 'donut-video.webm';
    const storageKey = `videos/${timestamp}-${randomId}-${originalFilename}`;

    // In production, this would upload to Netlify Blob Storage
    // For local dev, return a placeholder URL
    const isLocalDev = process.env.CONTEXT === 'dev' || !process.env.NETLIFY;
    
    if (isLocalDev) {
      console.log('Local dev: Skipping blob upload, returning placeholder');
      return {
        statusCode: 200,
        body: JSON.stringify({
          url: `/placeholder/${storageKey}`,
          storageKey,
          local: true,
        }),
      };
    }

    // Production: Upload to Netlify Blob Storage
    const { getStore } = await import('@netlify/blobs');
    const store = getStore({
      name: 'donut-videos',
    });

    // Strip data URL prefix if present (e.g., "data:video/webm;base64,")
    const base64Data = videoBase64.includes(',') 
      ? videoBase64.split(',')[1] 
      : videoBase64;
    
    const buffer = Buffer.from(base64Data, 'base64');
    await store.set(storageKey, buffer, {
      metadata: {
        uploadedAt: new Date().toISOString(),
        originalName: originalFilename,
      },
    });

    const url = `/.netlify/functions/get-video?key=${encodeURIComponent(storageKey)}`;

    console.log('Video uploaded successfully:', url);

    return {
      statusCode: 200,
      body: JSON.stringify({
        url,
        storageKey,
      }),
    };
  } catch (err) {
    console.error('Upload error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to upload video',
        details: err instanceof Error ? err.message : String(err)
      }),
    };
  }
};

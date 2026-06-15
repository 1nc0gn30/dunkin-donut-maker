import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // Handle FormData from frontend
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    let videoData: Buffer | null = null;
    let filename = 'donut-video.webm';
    let mimeType = 'video/webm';

    if (contentType.includes('multipart/form-data')) {
      // Parse FormData (Netlify Functions provides multiValueParts for multipart)
      const parts = event.multiValueParts;
      if (!parts || !parts.video) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'No video data provided' }),
        };
      }
      const videoPart = parts.video[0];
      videoData = Buffer.from(videoPart.data, 'base64');
      filename = videoPart.filename || 'donut-video.webm';
      mimeType = videoPart.contentType || 'video/webm';
    } else {
      // Fallback to JSON body (for backwards compatibility)
      const body = JSON.parse(event.body || '{}');
      const { videoBase64, filename: fname } = body;

      if (!videoBase64) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'No video data provided' }),
        };
      }
      videoData = Buffer.from(videoBase64.split(',')[1], 'base64');
      filename = fname || 'donut-video.webm';
    }

    // Generate unique key
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const storageKey = `videos/${timestamp}-${randomId}-${filename}`;

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
    const { createBlobStore } = await import('@netlify/blobs');
    const store = createBlobStore({
      name: 'donut-videos',
      consistency: 'strong',
    });

    await store.set(storageKey, videoData, {
      contentType: mimeType,
      metadata: {
        uploadedAt: new Date().toISOString(),
        originalName: filename,
      },
    });

    const url = `/.netlify/blobs/donut-videos/${storageKey}`;

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

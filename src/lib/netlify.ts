/**
 * Netlify Integration Utilities
 * Handles API calls to Netlify Functions for submissions and user tracking
 */

const API_BASE = '/.netlify/functions';

export interface DonutSubmission {
  id: string;
  creatorName: string;
  creatorImage?: string | null;
  twitterHandle?: string | null;
  instagramHandle?: string | null;
  tiktokHandle?: string | null;
  design: {
    baseType: string;
    glazeType: string;
    sprinklesType: string;
    drizzleType: string;
    customToppings: string[];
    icingMessage: string;
  };
  videoUrl?: string | null;
  likes: number;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface User {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
}

/**
 * Fetch all approved donut submissions from Netlify DB
 */
export async function fetchSubmissions(): Promise<DonutSubmission[]> {
  try {
    const response = await fetch(`${API_BASE}/get-submissions`);
    if (!response.ok) {
      const error = await response.json();
      console.error('fetchSubmissions server error:', error);
      throw new Error(error.details || error.error || 'Failed to fetch submissions');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }
}

/**
 * Submit a new donut design to Netlify DB
 */
export async function submitDonut(data: {
  creatorName: string;
  creatorEmail?: string | null;
  creatorPhone?: string | null;
  creatorCity?: string | null;
  creatorImage?: string | null;
  twitterHandle?: string | null;
  instagramHandle?: string | null;
  tiktokHandle?: string | null;
  design: DonutSubmission['design'];
  videoUrl?: string | null;
  videoStorageKey?: string;
}): Promise<{ id: string; status: string; videoUrl: string | null; videoStorageKey: string | null }> {
  try {
    const response = await fetch(`${API_BASE}/submit-donut`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('submitDonut server error:', error);
      throw new Error(error.details || error.error || 'Failed to submit donut');
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting donut:', error);
    throw error;
  }
}

/**
 * Like or unlike a submission (requires authentication)
 */
export async function toggleLike(submissionId: string): Promise<{ likes: number; liked: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/like-submission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ submissionId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to toggle like');
    }

    return await response.json();
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
}

/**
 * Get current user from Netlify Auth context
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/user`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Upload video to Netlify Blob Storage
 * Sends as base64 JSON for reliable parsing in Netlify Functions
 */
export async function uploadVideo(videoBlob: Blob, filename: string): Promise<{ url: string; storageKey: string }> {
  try {
    // Convert blob to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
    reader.readAsDataURL(videoBlob);
    const base64 = await base64Promise;

    const response = await fetch(`${API_BASE}/upload-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoBase64: base64,
        filename,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('uploadVideo server error:', error);
      throw new Error(error.details || error.error || 'Failed to upload video');
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
}

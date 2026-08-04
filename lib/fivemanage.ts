const FIVEMANAGE_API_KEY = process.env.FIVEMANAGE_API_KEY || '';

/**
 * Upload an image or video to Fivemanage Object Storage API
 */
export async function uploadToFivemanage(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const isVideo = contentType.startsWith('video/');
  const isImage = contentType.startsWith('image/');

  // Fivemanage API endpoints for image / video
  const endpoint = isVideo
    ? 'https://api.fivemanage.com/api/v2/video'
    : isImage
    ? 'https://api.fivemanage.com/api/v2/image'
    : 'https://api.fivemanage.com/api/v2/file';

  const formData = new FormData();
  const fileBlob = new Blob([fileBuffer], { type: contentType });
  formData.append('file', fileBlob, fileName);
  formData.append('name', fileName);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: FIVEMANAGE_API_KEY,
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.message || data.error || 'Failed to upload file to Fivemanage');
  }

  // Fivemanage API typically returns { url, id } or { url, key }
  const fileUrl = data.url || data.link || data.data?.url;
  const fileKey = data.id || data.key || data.name || fileName;

  if (!fileUrl) {
    throw new Error('Invalid response from Fivemanage API');
  }

  return {
    key: fileKey,
    url: fileUrl,
  };
}

/**
 * Delete a file from Fivemanage API by key/ID or URL
 */
export async function deleteFromFivemanage(keyOrId: string): Promise<boolean> {
  try {
    if (!FIVEMANAGE_API_KEY || !keyOrId) return false;

    const res = await fetch(`https://api.fivemanage.com/api/v2/file/${keyOrId}`, {
      method: 'DELETE',
      headers: {
        Authorization: FIVEMANAGE_API_KEY,
      },
    });

    return res.ok;
  } catch (error) {
    console.error('Failed to delete object from Fivemanage:', error);
    return false;
  }
}

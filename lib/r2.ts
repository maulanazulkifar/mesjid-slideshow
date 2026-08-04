import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID || '';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';

export const r2Bucket = process.env.R2_BUCKET_NAME || 'mesjid-slideshow';
export const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : 'https://placeholder.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Upload a file to Cloudflare R2
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-0.-]/g, '_');
  const key = `slides/${timestamp}_${safeFileName}`;

  const command = new PutObjectCommand({
    Bucket: r2Bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  const baseUrl = r2PublicUrl.endsWith('/') ? r2PublicUrl.slice(0, -1) : r2PublicUrl;
  const publicUrl = baseUrl ? `${baseUrl}/${key}` : `https://${r2Bucket}.${accountId}.r2.cloudflarestorage.com/${key}`;

  return {
    key,
    url: publicUrl,
  };
}

/**
 * Delete a file from Cloudflare R2 by object key
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: r2Bucket,
      Key: key,
    });
    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error('Failed to delete object from Cloudflare R2:', error);
    return false;
  }
}

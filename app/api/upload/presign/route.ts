import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/lib/r2';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName, contentType } = body;

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'fileName and contentType are required' },
        { status: 400 }
      );
    }

    const isVideo = contentType.startsWith('video/');
    const isImage = contentType.startsWith('image/');

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Only image or video files are allowed' },
        { status: 400 }
      );
    }

    // Check configured storage provider
    const hasFivemanage = Boolean(process.env.FIVEMANAGE_API_KEY);
    const hasR2 = Boolean(process.env.R2_ACCESS_KEY_ID && process.env.R2_ACCOUNT_ID);

    // If Fivemanage is configured and R2 is not, inform frontend to fallback to Fivemanage
    if (hasFivemanage && !hasR2) {
      return NextResponse.json({
        provider: 'fivemanage',
      });
    }

    // Default: Cloudflare R2 presigned upload
    const { uploadUrl, key, publicUrl } = await getPresignedUploadUrl(fileName, contentType);

    return NextResponse.json({
      provider: 'r2',
      uploadUrl,
      key,
      publicUrl,
    });
  } catch (error: any) {
    console.error('Presign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
}

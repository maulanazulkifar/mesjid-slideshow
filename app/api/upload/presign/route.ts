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

    const { uploadUrl, key, publicUrl } = await getPresignedUploadUrl(fileName, contentType);

    return NextResponse.json({
      success: true,
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

import { NextRequest, NextResponse } from 'next/server';
import { uploadToFivemanage } from '@/lib/fivemanage';
import { uploadToR2 } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || 'Untitled';
    const durationInput = formData.get('duration') as string;
    const duration = durationInput ? parseInt(durationInput, 10) : 10;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const mimeType = file.type;
    const isVideo = mimeType.startsWith('video/');
    const isImage = mimeType.startsWith('image/');

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Only image or video files are allowed' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Fivemanage (or fallback to R2 if FIVEMANAGE_API_KEY is not set)
    let key: string;
    let url: string;

    if (process.env.FIVEMANAGE_API_KEY) {
      const result = await uploadToFivemanage(buffer, file.name, mimeType);
      key = result.key;
      url = result.url;
    } else {
      const result = await uploadToR2(buffer, file.name, mimeType);
      key = result.key;
      url = result.url;
    }

    // Determine current max sort order
    const supabase = createAdminClient();
    const { data: maxItem } = await supabase
      .from('media_items')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = maxItem ? (maxItem.sort_order || 0) + 1 : 1;

    // Insert into Supabase DB
    const mediaType = isVideo ? 'video' : 'image';
    const { data, error } = await supabase
      .from('media_items')
      .insert([
        {
          title,
          type: mediaType,
          url,
          r2_key: key,
          duration: isNaN(duration) || duration < 1 ? 10 : duration,
          sort_order: nextSortOrder,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase DB Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (error: any) {
    console.error('Upload route error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { deleteFromR2 } from '@/lib/r2';

// PATCH: Update item properties (active state, duration, title, sort_order)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = createAdminClient();

    const updateFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.is_active === 'boolean') updateFields.is_active = body.is_active;
    if (typeof body.title === 'string') updateFields.title = body.title;
    if (typeof body.duration === 'number') updateFields.duration = body.duration;
    if (typeof body.sort_order === 'number') updateFields.sort_order = body.sort_order;

    const { data, error } = await supabase
      .from('media_items')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

// DELETE: Delete item from Supabase and R2 storage
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // 1. Fetch item to get r2_key
    const { data: item, error: fetchError } = await supabase
      .from('media_items')
      .select('r2_key')
      .eq('id', id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // 2. Delete object from Cloudflare R2
    if (item.r2_key) {
      await deleteFromR2(item.r2_key);
    }

    // 3. Delete record from Supabase DB
    const { error: deleteError } = await supabase
      .from('media_items')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

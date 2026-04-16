import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { deletePdf } from '@/utils/bunny-storage';

// ───────── DELETE: Remove a shared material (DB + Bunny) ─────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  // Fetch storage_path before delete (to clean up Bunny)
  const { data: existing } = await sc
    .from('shared_materials')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: '자료를 찾을 수 없습니다' }, { status: 404 });
  }

  // Delete DB record first
  const { error } = await sc
    .from('shared_materials')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort: also remove from Bunny Storage (swallow errors — DB is source of truth)
  try {
    await deletePdf(existing.storage_path);
  } catch (e) {
    console.warn('Bunny delete failed (DB already removed):', e);
  }

  return NextResponse.json({ success: true });
}

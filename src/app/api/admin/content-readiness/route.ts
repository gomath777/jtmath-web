import { NextResponse } from 'next/server';
import { loadDs2Readiness } from '@/lib/admin/ds2-readiness.server';
import { isLocalAdminMode, requireAdmin } from '@/utils/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isLocalAdminMode()) {
    const guard = await requireAdmin();
    if (guard) return guard;
  }

  try {
    return NextResponse.json(await loadDs2Readiness(true));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '콘텐츠 상태 확인에 실패했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

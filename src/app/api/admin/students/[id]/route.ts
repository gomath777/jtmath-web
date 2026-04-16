import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * PATCH /api/admin/students/[id]
 *
 * Partial update for a student profile. Currently supports:
 *   - exam_date_midterm (YYYY-MM-DD or null)
 *   - exam_date_final   (YYYY-MM-DD or null)
 *   - school            (string)
 *
 * The endpoint is intentionally narrow — fields not in the allow-list are
 * silently ignored so accidental payloads can't clobber auth-sensitive data.
 */
const ALLOWED_FIELDS = ['exam_date_midterm', 'exam_date_final', 'school'] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];
type UpdatePayload = Partial<Record<AllowedField, string | null>>;

function isIsoDateOrNull(value: unknown): value is string | null {
  if (value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const update: UpdatePayload = {};
  for (const field of ALLOWED_FIELDS) {
    if (!(field in body)) continue;
    const value = body[field];

    if (field === 'exam_date_midterm' || field === 'exam_date_final') {
      if (!isIsoDateOrNull(value)) {
        return NextResponse.json(
          { error: `${field}는 YYYY-MM-DD 형식 또는 null이어야 합니다` },
          { status: 400 },
        );
      }
      update[field] = value === '' ? null : value;
    } else if (field === 'school') {
      update[field] = typeof value === 'string' ? value : null;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '업데이트할 필드가 없습니다' }, { status: 400 });
  }

  const sc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  const { data, error } = await sc
    .from('profiles')
    .update(update)
    .eq('id', id)
    .select('id, name, school, exam_date_midterm, exam_date_final')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com')
  .split(',').map(e => e.trim()).filter(Boolean);

export function isLocalAdminMode(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.LOCAL_ADMIN_MODE === 'true';
}

/**
 * Guard for admin API routes. Returns NextResponse on failure (401/403),
 * or null on success. Caller should:
 *   const guard = await requireAdmin();
 *   if (guard) return guard;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

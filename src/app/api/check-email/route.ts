import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

// GET /api/check-email?email=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email')?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ exists: false });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserByEmail(email);

  return NextResponse.json({ exists: !!data?.user && !error });
}

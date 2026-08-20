import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createKakaoOpsOverview, parseKakaoOpsTab } from '@/lib/kakao-ops/admin-contract';
import KakaoOpsBoard from './KakaoOpsBoard';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com')
  .split(',')
  .map((email) => email.trim())
  .filter(Boolean);

export const dynamic = 'force-dynamic';

export default async function AdminKakaoOpsPage({
  searchParams,
}: {
  readonly searchParams: { readonly tab?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!ADMIN_EMAILS.includes(user.email || '')) redirect('/dashboard');

  return (
    <KakaoOpsBoard
      activeTab={parseKakaoOpsTab(searchParams.tab)}
      apiPath="/api/admin/kakao-ops"
      overview={createKakaoOpsOverview({
        migrated: false,
        schemaStatus: 'migration_needed',
        warnings: ['schema_not_ready'],
      })}
    />
  );
}

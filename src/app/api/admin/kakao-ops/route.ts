import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/utils/admin-auth';
import { createKakaoOpsOverview } from '@/lib/kakao-ops/admin-contract';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (guard) return guard;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      createKakaoOpsOverview({
        migrated: false,
        schemaStatus: 'env_missing',
        warnings: ['admin_overview_unavailable'],
      }),
      { status: 503 },
    );
  }

  const sc = createServiceClient(supabaseUrl, serviceKey);
  const [
    inboxPending,
    outboxDraft,
    outboxApproved,
    activeMappings,
    helperTokens,
  ] = await Promise.all([
    sc.from('kakao_ops_jobs').select('id', { count: 'exact', head: true })
      .eq('direction', 'inbound_summary')
      .in('status', ['inbound_pending', 'needs_attention']),
    sc.from('kakao_ops_jobs').select('id', { count: 'exact', head: true })
      .eq('direction', 'outbound')
      .in('status', ['draft', 'needs_approval']),
    sc.from('kakao_ops_jobs').select('id', { count: 'exact', head: true })
      .eq('direction', 'outbound')
      .in('status', ['approved', 'dry_run_ok']),
    sc.from('kakao_room_mappings').select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    sc.from('kakao_helper_tokens').select('id', { count: 'exact', head: true })
      .is('revoked_at', null),
  ]);

  const errors = [
    inboxPending.error?.code,
    outboxDraft.error?.code,
    outboxApproved.error?.code,
    activeMappings.error?.code,
    helperTokens.error?.code,
  ].filter((code): code is string => code !== undefined);
  const migrated = errors.length === 0;

  return NextResponse.json(createKakaoOpsOverview({
    migrated,
    schemaStatus: migrated ? 'ready' : 'migration_needed',
    counts: {
      inboxPending: inboxPending.error ? 0 : inboxPending.count ?? 0,
      outboxDraft: outboxDraft.error ? 0 : outboxDraft.count ?? 0,
      outboxApproved: outboxApproved.error ? 0 : outboxApproved.count ?? 0,
      activeMappings: activeMappings.error ? 0 : activeMappings.count ?? 0,
      helperTokens: helperTokens.error ? 0 : helperTokens.count ?? 0,
    },
    warnings: migrated ? [] : ['schema_not_ready'],
  }));
}

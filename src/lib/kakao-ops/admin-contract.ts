import { OPEN_ROOM_DRY_RUN_MIN_SAMPLES } from './mapping';

export const KAKAO_OPS_TABS = ['inbox', 'outbox', 'mappings', 'settings'] as const;

export type KakaoOpsTabKey = (typeof KAKAO_OPS_TABS)[number];

export type KakaoOpsCounts = {
  readonly inboxPending: number;
  readonly outboxDraft: number;
  readonly outboxApproved: number;
  readonly activeMappings: number;
  readonly helperTokens: number;
};

export type KakaoOpsOverview = {
  readonly ok: true;
  readonly migrated: boolean;
  readonly schemaStatus: 'ready' | 'migration_needed' | 'env_missing';
  readonly counts: KakaoOpsCounts;
  readonly safety: {
    readonly approvalRequired: true;
    readonly realSendEnabled: false;
    readonly transport: 'openkakao';
    readonly openRoomMinDryRunSamples: number;
  };
  readonly tabs: readonly KakaoOpsTabKey[];
  readonly warnings: readonly string[];
};

export function parseKakaoOpsTab(value: string | undefined): KakaoOpsTabKey {
  for (const tab of KAKAO_OPS_TABS) {
    if (value === tab) return tab;
  }
  return 'inbox';
}

export function createKakaoOpsOverview(input: {
  readonly counts?: Partial<KakaoOpsCounts>;
  readonly migrated?: boolean;
  readonly schemaStatus?: KakaoOpsOverview['schemaStatus'];
  readonly warnings?: readonly string[];
} = {}): KakaoOpsOverview {
  const migrated = input.migrated ?? false;
  return {
    ok: true,
    migrated,
    schemaStatus: input.schemaStatus ?? (migrated ? 'ready' : 'migration_needed'),
    counts: {
      inboxPending: input.counts?.inboxPending ?? 0,
      outboxDraft: input.counts?.outboxDraft ?? 0,
      outboxApproved: input.counts?.outboxApproved ?? 0,
      activeMappings: input.counts?.activeMappings ?? 0,
      helperTokens: input.counts?.helperTokens ?? 0,
    },
    safety: {
      approvalRequired: true,
      realSendEnabled: false,
      transport: 'openkakao',
      openRoomMinDryRunSamples: OPEN_ROOM_DRY_RUN_MIN_SAMPLES,
    },
    tabs: KAKAO_OPS_TABS,
    warnings: input.warnings ?? [],
  };
}

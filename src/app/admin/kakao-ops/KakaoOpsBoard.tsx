'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Inbox,
  Lock,
  Send,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { KakaoOpsOverview, KakaoOpsTabKey } from '@/lib/kakao-ops/admin-contract';

type KakaoOpsBoardProps = {
  readonly activeTab: KakaoOpsTabKey;
  readonly overview: KakaoOpsOverview;
  readonly apiPath: string;
};

type DraftApprovalState = 'needs_approval' | 'approved';

type DraftOutboundRow = {
  readonly id: string;
  readonly rowNumber: number;
  readonly recipientLabel: string;
  readonly recipientLabelNormalized: string;
  readonly messageBody: string;
  readonly approvalState: DraftApprovalState;
  readonly queued: boolean;
};

type ParseDraftRowsResult =
  | { readonly ok: true; readonly rows: readonly DraftOutboundRow[] }
  | { readonly ok: false; readonly message: string };

const tabItems = [
  { key: 'inbox', label: 'Inbox', title: '수신 요약', icon: Inbox },
  { key: 'outbox', label: 'Outbox', title: '발송 대기', icon: Send },
  { key: 'mappings', label: 'Mappings', title: '방 매핑', icon: Users },
  { key: 'settings', label: 'Settings', title: '설정', icon: Settings },
] as const;

export default function KakaoOpsBoard({ activeTab, overview, apiPath }: KakaoOpsBoardProps) {
  return (
    <main className="min-h-screen bg-parchment px-4 py-6 text-ink md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border-warm pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-stone">Kakao Ops</p>
            <h1 className="mt-2 text-2xl font-semibold text-ink">카카오 운영</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-olive">
              승인 기반 메시지 큐, 수신 요약, 방 매핑을 한 곳에서 점검합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-2 rounded-md border border-border-warm bg-ivory px-3 py-2 text-charcoal">
              <Lock className="h-4 w-4 text-terracotta" />
              실제 전송 잠금
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-border-warm bg-ivory px-3 py-2 text-charcoal">
              <ShieldCheck className="h-4 w-4 text-terracotta" />
              승인 필수
            </span>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <Metric label="수신 대기" value={overview.counts.inboxPending} />
          <Metric label="작성 대기" value={overview.counts.outboxDraft} />
          <Metric label="승인 완료" value={overview.counts.outboxApproved} />
          <Metric label="활성 매핑" value={overview.counts.activeMappings} />
        </section>

        <nav className="grid grid-cols-2 gap-2 border-b border-border-warm pb-2 sm:flex sm:overflow-x-auto" aria-label="Kakao operations tabs">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <Link
                key={item.key}
                href={`/admin/kakao-ops?tab=${item.key}`}
                className={[
                  'inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-colors sm:min-w-32',
                  isActive
                    ? 'border-terracotta bg-terracotta text-ivory'
                    : 'border-border-warm bg-ivory text-charcoal hover:border-ring-deep',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <section className="rounded-lg border border-border-warm bg-ivory">
          <div className="flex flex-col gap-2 border-b border-border-cream px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">
                {tabItems.find((item) => item.key === activeTab)?.title}
              </h2>
              <p className="mt-1 text-sm text-olive">{statusCopy(overview)}</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-md bg-sand px-3 py-1.5 text-xs font-semibold text-charcoal">
              <CheckCircle2 className="h-4 w-4 text-terracotta" />
              Dry-run first
            </span>
          </div>

          {activeTab === 'inbox' && <InboxPanel />}
          {activeTab === 'outbox' && <OutboxPanel />}
          {activeTab === 'mappings' && <MappingsPanel />}
          {activeTab === 'settings' && <SettingsPanel overview={overview} apiPath={apiPath} />}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="rounded-lg border border-border-warm bg-ivory px-4 py-3">
      <p className="text-xs font-semibold text-stone">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function InboxPanel() {
  return (
    <OpsTable
      headers={['학생', '요약', '상태', '수신 시각']}
      emptyText="수집된 수신 요약이 없습니다."
    />
  );
}

function OutboxPanel() {
  const [batchText, setBatchText] = useState('');
  const [rows, setRows] = useState<readonly DraftOutboundRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [queueReceipt, setQueueReceipt] = useState<string | null>(null);

  const approvedCount = useMemo(
    () => rows.filter((row) => row.approvalState === 'approved').length,
    [rows],
  );
  const queuedCount = useMemo(
    () => rows.filter((row) => row.queued).length,
    [rows],
  );

  function createRows(): void {
    const parsed = parseDraftRows(batchText);
    if (!parsed.ok) {
      setError(parsed.message);
      setRows([]);
      setQueueReceipt(null);
      return;
    }
    setRows(parsed.rows);
    setError(null);
    setQueueReceipt(null);
  }

  function toggleApproval(id: string): void {
    setRows((current) => current.map((row) => {
      if (row.id !== id) return row;
      return {
        ...row,
        approvalState: row.approvalState === 'approved' ? 'needs_approval' : 'approved',
        queued: false,
      };
    }));
    setQueueReceipt(null);
  }

  function queueApprovedRows(): void {
    const nextRows = rows.map((row) => ({
      ...row,
      queued: row.approvalState === 'approved',
    }));
    const nextQueuedCount = nextRows.filter((row) => row.queued).length;
    setRows(nextRows);
    setQueueReceipt(nextQueuedCount > 0 ? `${nextQueuedCount}건 준비됨` : null);
    setError(nextQueuedCount > 0 ? null : '승인된 행이 없습니다.');
  }

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <label className="flex min-h-48 flex-col gap-2">
          <span className="text-sm font-semibold text-charcoal">일괄 입력</span>
          <textarea
            value={batchText}
            onChange={(event) => setBatchText(event.target.value)}
            className="min-h-40 resize-y rounded-md border border-border-warm bg-parchment px-3 py-3 text-sm leading-6 text-ink outline-none transition-colors placeholder:text-stone focus:border-ring-deep"
            placeholder={'학생1 - 내용1\n학생2 - 내용2'}
          />
        </label>

        <div className="grid gap-2 rounded-lg border border-border-warm bg-parchment p-3">
          <button
            type="button"
            onClick={createRows}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-charcoal px-3 py-2 text-sm font-semibold text-ivory transition-colors hover:bg-ink"
          >
            <CheckCircle2 className="h-4 w-4" />
            표 만들기
          </button>
          <button
            type="button"
            onClick={queueApprovedRows}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border-warm bg-ivory px-3 py-2 text-sm font-semibold text-charcoal transition-colors hover:border-ring-deep"
          >
            <Send className="h-4 w-4" />
            승인 행 준비
          </button>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs font-semibold text-stone">
            <StatusMetric label="행" value={rows.length} />
            <StatusMetric label="승인" value={approvedCount} />
            <StatusMetric label="준비" value={queuedCount} />
          </div>
          {queueReceipt && (
            <p className="rounded-md bg-sand px-3 py-2 text-xs font-semibold text-charcoal">{queueReceipt}</p>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-terracotta bg-parchment px-3 py-2 text-sm font-semibold text-terracotta">
          {error}
        </p>
      )}

      {rows.length === 0 ? (
        <OpsTable
          headers={['학생', '메시지', '승인', '준비']}
          emptyText="승인 대기 중인 발송 행이 없습니다."
        />
      ) : (
        <DraftRowsTable rows={rows} onToggleApproval={toggleApproval} />
      )}
    </div>
  );
}

function DraftRowsTable({
  rows,
  onToggleApproval,
}: {
  readonly rows: readonly DraftOutboundRow[];
  readonly onToggleApproval: (id: string) => void;
}) {
  return (
    <>
      <div className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-border-warm bg-parchment p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{row.recipientLabel}</p>
                <p className="mt-1 text-sm leading-6 text-charcoal">{row.messageBody}</p>
              </div>
              <ApprovalToggle row={row} onToggleApproval={onToggleApproval} />
            </div>
            <p className="mt-3 text-xs font-semibold text-stone">{row.queued ? '준비됨' : '대기'}</p>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-sand text-xs font-semibold text-charcoal">
            <tr>
              <th className="w-16 px-4 py-3">#</th>
              <th className="w-44 px-4 py-3">학생</th>
              <th className="px-4 py-3">메시지</th>
              <th className="w-32 px-4 py-3">승인</th>
              <th className="w-28 px-4 py-3">준비</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-cream">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-mono text-xs text-stone">{row.rowNumber}</td>
                <td className="px-4 py-3 font-semibold text-ink">{row.recipientLabel}</td>
                <td className="px-4 py-3 leading-6 text-charcoal">{row.messageBody}</td>
                <td className="px-4 py-3">
                  <ApprovalToggle row={row} onToggleApproval={onToggleApproval} />
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-stone">{row.queued ? '준비됨' : '대기'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ApprovalToggle({
  row,
  onToggleApproval,
}: {
  readonly row: DraftOutboundRow;
  readonly onToggleApproval: (id: string) => void;
}) {
  const approved = row.approvalState === 'approved';
  return (
    <label className="inline-flex min-w-24 items-center justify-center gap-2 rounded-md border border-border-warm bg-ivory px-3 py-2 text-xs font-semibold text-charcoal">
      <input
        type="checkbox"
        checked={approved}
        onChange={() => onToggleApproval(row.id)}
        className="h-4 w-4 accent-terracotta"
      />
      {approved ? '승인' : '대기'}
    </label>
  );
}

function StatusMetric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="rounded-md border border-border-cream bg-ivory px-2 py-2">
      <p>{label}</p>
      <p className="mt-1 font-mono text-base text-ink">{value}</p>
    </div>
  );
}

function MappingsPanel() {
  return (
    <OpsTable
      headers={['표시명', '대상', '방 유형', '검증']}
      emptyText="등록된 카카오 방 매핑이 없습니다."
    />
  );
}

function SettingsPanel({ overview, apiPath }: { readonly overview: KakaoOpsOverview; readonly apiPath: string }) {
  const rows = [
    ['Overview API', apiPath],
    ['Transport', overview.safety.transport],
    ['Real send', overview.safety.realSendEnabled ? 'enabled' : 'disabled'],
    ['Approval', overview.safety.approvalRequired ? 'required' : 'not required'],
    ['Open room samples', `${overview.safety.openRoomMinDryRunSamples}+ dry-runs`],
    ['Schema', overview.schemaStatus],
  ] as const;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <tbody className="divide-y divide-border-cream">
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th className="w-40 px-4 py-3 font-semibold text-charcoal md:w-56">{label}</th>
              <td className="break-all px-4 py-3 font-mono text-xs text-olive">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OpsTable({ headers, emptyText }: { readonly headers: readonly string[]; readonly emptyText: string }) {
  return (
    <>
      <div className="px-4 py-4 sm:hidden">
        <div className="flex flex-wrap gap-2" aria-label="표 열">
          {headers.map((header) => (
            <span
              key={header}
              className="rounded-md bg-sand px-3 py-1.5 text-xs font-semibold text-charcoal"
            >
              {header}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-stone">{emptyText}</p>
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-sand text-xs font-semibold text-charcoal">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                className="sticky left-0 bg-ivory px-4 py-8 text-left text-sm text-stone md:text-center"
                colSpan={headers.length}
              >
                {emptyText}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function parseDraftRows(batchText: string): ParseDraftRowsResult {
  const parsedRows: DraftOutboundRow[] = [];
  const seenLabels = new Set<string>();

  for (const [index, rawLine] of batchText.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (line === '') continue;
    const match = /^(.*?)\s+-\s+(.*)$/.exec(line);
    if (match === null) {
      return { ok: false, message: `${index + 1}행 형식을 확인하세요.` };
    }
    const recipientLabel = (match[1] ?? '').trim();
    const messageBody = (match[2] ?? '').trim();
    if (recipientLabel === '') return { ok: false, message: `${index + 1}행 학생명이 비어 있습니다.` };
    if (messageBody === '') return { ok: false, message: `${index + 1}행 메시지가 비어 있습니다.` };

    const recipientLabelNormalized = normalizeDraftLabel(recipientLabel);
    if (seenLabels.has(recipientLabelNormalized)) {
      return { ok: false, message: `${index + 1}행 학생명이 중복됩니다.` };
    }
    seenLabels.add(recipientLabelNormalized);

    parsedRows.push({
      id: `row-${index + 1}-${stableDraftHash(`${recipientLabelNormalized}:${messageBody}`)}`,
      rowNumber: index + 1,
      recipientLabel,
      recipientLabelNormalized,
      messageBody,
      approvalState: 'needs_approval',
      queued: false,
    });
  }

  if (parsedRows.length === 0) return { ok: false, message: '입력된 행이 없습니다.' };
  return { ok: true, rows: parsedRows };
}

function normalizeDraftLabel(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

function stableDraftHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function statusCopy(overview: KakaoOpsOverview): string {
  if (overview.schemaStatus === 'ready') return '운영 스키마가 준비되어 있습니다.';
  if (overview.schemaStatus === 'env_missing') return '환경 설정 확인이 필요합니다.';
  return '운영 스키마 적용 전 상태입니다.';
}

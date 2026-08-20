import { CheckCircle2, ExternalLink, FileText, Video } from 'lucide-react';
import {
  isRowReady,
  type Ds2ReadinessRow,
  type HealthState,
  type ReadinessCategory,
} from '@/lib/admin/ds2-readiness';

const CATEGORY_META: Readonly<Record<ReadinessCategory, { readonly label: string; readonly tone: string }>> = {
  concept: { label: '개념강의', tone: 'bg-violet-50 text-violet-700' },
  gichul: { label: '교육청 기출', tone: 'bg-amber-50 text-amber-800' },
  shimhwa: { label: '심화유형', tone: 'bg-emerald-50 text-emerald-800' },
};

export function hasHealthError(row: Ds2ReadinessRow): boolean {
  return [...row.assets.pdfs, ...row.assets.hintbooks, ...row.assets.videos]
    .some((asset) => asset.health === 'error');
}

function failedAssetNames(row: Ds2ReadinessRow): readonly string[] {
  return [
    ...row.assets.pdfs.filter((asset) => asset.health === 'error').map((asset) => `PDF: ${asset.name}`),
    ...row.assets.hintbooks.filter((asset) => asset.health === 'error').map((asset) => `힌트북: ${asset.name}`),
    ...row.assets.videos.filter((asset) => asset.health === 'error').map((asset) => `Bunny: ${asset.title}`),
  ];
}

function statusLabel(row: Ds2ReadinessRow): { readonly label: string; readonly tone: string } {
  if (hasHealthError(row)) return { label: '링크 오류', tone: 'bg-rose-50 text-rose-700 border-rose-200' };
  if (!isRowReady(row)) return { label: '준비 필요', tone: 'bg-amber-50 text-amber-800 border-amber-200' };
  const checked = [...row.assets.pdfs, ...row.assets.hintbooks, ...row.assets.videos]
    .some((asset) => asset.health === 'ok');
  return checked
    ? { label: '검사 완료', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    : { label: '배정 가능', tone: 'bg-sand text-charcoal border-border-warm' };
}

function healthCount(states: readonly HealthState[]): string {
  const checked = states.filter((state) => state === 'ok' || state === 'error').length;
  if (checked === 0) return '연결됨';
  return `${states.filter((state) => state === 'ok').length}/${states.length} 정상`;
}

function ResourceCount({
  icon: Icon,
  count,
  states,
  emptyLabel,
  label,
}: {
  readonly icon: typeof FileText;
  readonly count: number;
  readonly states: readonly HealthState[];
  readonly emptyLabel: string;
  readonly label: string;
}) {
  const error = states.some((state) => state === 'error');
  return (
    <div className={`flex items-center gap-2 text-[12px] ${error ? 'text-rose-700' : 'text-charcoal'}`}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <span className="font-semibold tabular-nums">{count}</span>
      <span className="text-olive">{count > 0 ? healthCount(states) : emptyLabel}</span>
    </div>
  );
}

function PreviewLink({ row, compact = false }: { readonly row: Ds2ReadinessRow; readonly compact?: boolean }) {
  if (!row.publicSlug) return null;
  return (
    <a
      href={`/lesson/${row.publicSlug}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${row.title} 학생 페이지 미리보기`}
      title="학생 페이지 미리보기"
      className={`inline-flex items-center justify-center rounded-md text-olive transition-colors hover:bg-sand hover:text-terracotta ${
        compact ? 'h-7 w-7' : 'h-8 w-8'
      }`}
    >
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}

export default function ContentReadinessTable({ rows }: { readonly rows: readonly Ds2ReadinessRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border-warm bg-ivory">
      <table className="w-full text-left lg:min-w-[860px]">
        <thead className="border-b border-border-warm bg-sand text-[11px] font-semibold text-olive">
          <tr>
            <th className="px-4 py-3">콘텐츠</th>
            <th className="hidden px-4 py-3 lg:table-cell">PDF</th>
            <th className="hidden px-4 py-3 lg:table-cell">힌트북</th>
            <th className="hidden px-4 py-3 lg:table-cell">Bunny</th>
            <th className="hidden px-4 py-3 lg:table-cell">배정</th>
            <th className="hidden px-4 py-3 lg:table-cell">상태</th>
            <th className="hidden w-12 px-3 py-3 lg:table-cell"><span className="sr-only">미리보기</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-cream">
          {rows.map((row) => {
            const status = statusLabel(row);
            const category = CATEGORY_META[row.category];
            const failedAssets = failedAssetNames(row);
            return (
              <tr key={row.id} className="align-middle hover:bg-parchment/70">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-1 text-[10px] font-semibold ${category.tone}`}>{category.label}</span>
                    <span className="text-[11px] tabular-nums text-olive">{row.sessionNumber ? `${row.sessionNumber}차시` : '-'}</span>
                  </div>
                  <p className="mt-1.5 max-w-[320px] truncate text-[13px] font-semibold text-ink">
                    {row.title}{row.variantLabel ? ` · ${row.variantLabel}` : ''}
                  </p>
                  {failedAssets.length > 0 && (
                    <p className="mt-2 break-words text-[11px] font-medium text-rose-700">오류: {failedAssets.join(', ')}</p>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 lg:hidden">
                    <ResourceCount
                      icon={FileText}
                      count={row.assets.pdfs.length + row.assets.hintbooks.length}
                      states={[...row.assets.pdfs.map((asset) => asset.health), ...row.assets.hintbooks.map((asset) => asset.health)]}
                      emptyLabel="PDF 없음"
                      label="PDF·힌트북"
                    />
                    <ResourceCount
                      icon={Video}
                      count={row.assets.videos.length}
                      states={row.assets.videos.map((asset) => asset.health)}
                      emptyLabel={row.category === 'shimhwa' ? '영상 선택' : '영상 없음'}
                      label="Bunny 영상"
                    />
                    <span className={`inline-flex w-fit items-center gap-1 rounded border px-2 py-1 text-[11px] font-semibold ${status.tone}`}>
                      {status.label === '검사 완료' && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {status.label}
                    </span>
                    <div className="flex items-center justify-end gap-2 text-[11px] font-semibold text-charcoal">
                      <span>배정 {row.assignmentCount}명</span>
                      <PreviewLink row={row} compact />
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <ResourceCount icon={FileText} count={row.assets.pdfs.length} states={row.assets.pdfs.map((asset) => asset.health)} emptyLabel="없음" label="PDF" />
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <ResourceCount icon={FileText} count={row.assets.hintbooks.length} states={row.assets.hintbooks.map((asset) => asset.health)} emptyLabel={row.category === 'shimhwa' ? '확인 필요' : '선택'} label="힌트북" />
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <ResourceCount icon={Video} count={row.assets.videos.length} states={row.assets.videos.map((asset) => asset.health)} emptyLabel={row.category === 'shimhwa' ? '선택' : '없음'} label="Bunny 영상" />
                </td>
                <td className="hidden px-4 py-3 text-[12px] font-semibold tabular-nums text-charcoal lg:table-cell">{row.assignmentCount}명</td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-semibold ${status.tone}`}>
                    {status.label === '검사 완료' && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {status.label}
                  </span>
                </td>
                <td className="hidden px-3 py-3 text-right lg:table-cell"><PreviewLink row={row} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

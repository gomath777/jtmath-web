'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import {
  isRowReady,
  type Ds2ReadinessSnapshot,
  type ReadinessCategory,
} from '@/lib/admin/ds2-readiness';
import ContentReadinessTable, { hasHealthError } from './ContentReadinessTable';

type Filter = 'all' | ReadinessCategory | 'attention';

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSnapshot(value: unknown): value is Ds2ReadinessSnapshot {
  if (!isRecord(value) || !Array.isArray(value.rows)) return false;
  if (value.healthCheckedAt !== null && typeof value.healthCheckedAt !== 'string') return false;
  return value.rows.every((row) => {
    if (!isRecord(row) || !isRecord(row.assets)) return false;
    return typeof row.id === 'string'
      && (row.category === 'concept' || row.category === 'gichul' || row.category === 'shimhwa')
      && typeof row.title === 'string'
      && typeof row.assignmentCount === 'number'
      && typeof row.blockCount === 'number'
      && Array.isArray(row.assets.pdfs)
      && Array.isArray(row.assets.hintbooks)
      && Array.isArray(row.assets.videos);
  });
}

export default function ContentReadinessClient({
  initialSnapshot,
}: {
  readonly initialSnapshot: Ds2ReadinessSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [filter, setFilter] = useState<Filter>('all');
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const hasStartedHealthCheck = useRef(false);

  const refreshHealth = useCallback(async () => {
    setChecking(true);
    setCheckError(null);
    try {
      const response = await fetch('/api/admin/content-readiness', { cache: 'no-store' });
      const body: unknown = await response.json();
      if (!response.ok || !isSnapshot(body)) {
        throw new Error('실제 링크 검사에 실패했습니다');
      }
      setSnapshot(body);
    } catch (error: unknown) {
      setCheckError(error instanceof Error ? error.message : '실제 링크 검사에 실패했습니다');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (hasStartedHealthCheck.current) return;
    hasStartedHealthCheck.current = true;
    void refreshHealth();
  }, [refreshHealth]);

  const filteredRows = useMemo(() => snapshot.rows.filter((row) => {
    if (filter === 'all') return true;
    if (filter === 'attention') return !isRowReady(row) || hasHealthError(row);
    return row.category === filter;
  }), [filter, snapshot.rows]);

  const readyCount = snapshot.rows.filter(isRowReady).length;
  const errorCount = snapshot.rows.filter(hasHealthError).length;
  const totalPdfs = snapshot.rows.reduce(
    (sum, row) => sum + row.assets.pdfs.length + row.assets.hintbooks.length,
    0,
  );
  const totalVideos = snapshot.rows.reduce((sum, row) => sum + row.assets.videos.length, 0);

  const filters: readonly { readonly key: Filter; readonly label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'concept', label: '개념강의' },
    { key: 'gichul', label: '기출' },
    { key: 'shimhwa', label: '심화' },
    { key: 'attention', label: '확인 필요' },
  ];

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-crimson">대수 기준 화면</p>
          <h1 className="mt-1 font-serif text-[26px] text-ink">콘텐츠 준비 현황</h1>
          <p className="mt-1 text-[13px] text-olive">활성 대수 개념·기출·심화 페이지와 연결 자료를 확인합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshHealth()}
          disabled={checking}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-crimson px-4 text-[13px] font-semibold text-ivory transition-colors hover:bg-[#9f2c2c] disabled:cursor-wait disabled:opacity-60"
        >
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {checking ? '실제 링크 검사 중' : '실제 링크 다시 검사'}
        </button>
      </div>

      <section className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border-warm bg-border-warm lg:grid-cols-4">
        {[
          ['학습 페이지', `${snapshot.rows.length}개`],
          ['구성 충족', `${readyCount}개`],
          ['PDF·힌트북', `${totalPdfs}개`],
          ['Bunny 영상', `${totalVideos}개`],
        ].map(([label, value]) => (
          <div key={label} className="bg-ivory px-4 py-4">
            <p className="text-[11px] font-medium text-olive">{label}</p>
            <p className="mt-1 font-serif text-[22px] text-ink">{value}</p>
          </div>
        ))}
      </section>

      {(errorCount > 0 || checkError) && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{checkError || `실제 링크 오류 행이 ${errorCount}개 있습니다. 해당 행을 확인하세요.`}</span>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border-warm bg-ivory p-1" role="group" aria-label="콘텐츠 유형 필터">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              aria-pressed={filter === item.key}
              className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                filter === item.key ? 'bg-ink text-ivory' : 'text-olive hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-olive">
          {snapshot.healthCheckedAt
            ? `최근 검사 ${new Date(snapshot.healthCheckedAt).toLocaleString('ko-KR')}`
            : 'DB 연결 상태 기준'}
        </p>
      </div>

      <ContentReadinessTable rows={filteredRows} />
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles, AlertCircle, CheckCircle2, RotateCcw, Send, X, Search } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminStudentSeasonView, { type SeasonWeek, type SeasonItem } from './AdminStudentSeasonView';
import { todayKst, isoToKstYmd } from '@/lib/concept-assign/date-resolver';

type Mode = 'compose' | 'preview' | 'result';
type Tab = 'command' | 'view';

interface DiffEntry {
  user_id: string;
  user_name: string;
  set_id: string;
  set_label: string;
  set_subject_slug?: string;
  set_chapter_order?: number | null;
  published_at: string;
  publishYmd: string;
  status: 'added' | 'removed' | 'moved' | 'unchanged';
  previous_published_at?: string;
}

interface PlanResponse {
  mode: 'plan';
  plan_id: string | null;
  status: 'ok' | 'ambiguous' | 'unknown_student' | 'unknown_set' | 'parse_error' | 'requires_confirmation';
  summary_ko: string;
  ambiguity_candidates?: string[];
  diff: { added: DiffEntry[]; removed: DiffEntry[]; moved: DiffEntry[]; unchanged: DiffEntry[]; warnings: string[] };
  expires_at?: string;
  notes?: string;
}

interface ExecuteResponse {
  mode: 'execute';
  created: number;
  deleted: number;
  ids: string[];
  undo_token: string | null;
}

interface Student {
  id: string;
  name: string;
  school: string | null;
}

const EXAMPLES = [
  '조승현한테 공수1 8~9차시 다음주 월요일부터',
  '조승현 공수1 8~14차시 다음주부터 4주에 걸쳐 분배',
  '조승현 시즌 일정 보여줘',
];

export default function ConceptAssignClient() {
  const [tab, setTab] = useState<Tab>('command');

  // ---- 자연어 명령 ----
  const [mode, setMode] = useState<Mode>('compose');
  const [command, setCommand] = useState('');
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [execResult, setExecResult] = useState<ExecuteResponse | null>(null);
  const [executing, setExecuting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- 학생 일정 조회 ----
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [viewWeeks, setViewWeeks] = useState<SeasonWeek[] | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const today = todayKst();

  useEffect(() => {
    fetch('/api/admin/students-courses')
      .then(r => r.json())
      .then(d => setStudents(d.students || []));
  }, []);

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(q) || (s.school?.toLowerCase().includes(q) ?? false),
    );
  }, [students, studentSearch]);

  // 자연어 → preview
  const submitPlan = async () => {
    setError(null);
    setPlanning(true);
    setPlan(null);
    setExecResult(null);
    try {
      const r = await fetch('/api/admin/concept-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'plan', command: command.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || '해석 실패');
      setPlan(data);
      setMode('preview');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPlanning(false);
    }
  };

  // 확정 → execute
  const submitExecute = async () => {
    if (!plan?.plan_id) return;
    setExecuting(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/concept-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'execute', plan_id: plan.plan_id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || '실행 실패');
      setExecResult(data);
      setMode('result');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExecuting(false);
    }
  };

  const submitUndo = async () => {
    if (!execResult?.undo_token) return;
    if (!confirm('직전 명령을 되돌릴까요?')) return;
    setUndoing(true);
    try {
      const r = await fetch('/api/admin/concept-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'undo', undo_token: execResult.undo_token }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Undo 실패');
      alert(`되돌리기 완료 (${data.reverted}건 삭제)`);
      reset();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUndoing(false);
    }
  };

  const reset = () => {
    setMode('compose');
    setCommand('');
    setPlan(null);
    setExecResult(null);
    setError(null);
  };

  // 학생 일정 조회
  const loadStudentView = async (studentId: string) => {
    setSelectedStudentId(studentId);
    setViewLoading(true);
    try {
      const r = await fetch('/api/admin/concept-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'student-view', student_id: studentId }),
      });
      const data = await r.json();
      const weeks: SeasonWeek[] = (data.weeks || []).map((w: any) => ({
        publishYmd: w.publishYmd,
        items: (w.items || []).map((it: any): SeasonItem => ({
          setId: it.set_id,
          setLabel: `${it.subject_slug} ${it.chapter_order ?? '?'}차시 — ${it.title}`,
          subjectSlug: it.subject_slug,
          chapterOrder: it.chapter_order,
          status: 'unchanged',
          videos: it.videos,
        })),
      }));
      setViewWeeks(weeks);
    } finally {
      setViewLoading(false);
    }
  };

  return (
    <AdminLayout activeNav="concept-assign">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-red-500" />
          자연어 배정
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          한국어 한 줄로 학생-차시 배정·이동·해제. 모든 변경은 미리보기 후 확정.
        </p>
      </div>

      <div className="flex gap-1 mb-5 border-b border-slate-200">
        <button
          onClick={() => setTab('command')}
          className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px ${
            tab === 'command' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          자연어 명령
        </button>
        <button
          onClick={() => setTab('view')}
          className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px ${
            tab === 'view' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          학생 일정 조회
        </button>
      </div>

      {tab === 'command' && (
        <CommandTab
          mode={mode}
          command={command}
          setCommand={setCommand}
          planning={planning}
          executing={executing}
          undoing={undoing}
          plan={plan}
          execResult={execResult}
          error={error}
          today={today}
          onPlan={submitPlan}
          onExecute={submitExecute}
          onUndo={submitUndo}
          onReset={reset}
          onBack={() => setMode('compose')}
        />
      )}

      {tab === 'view' && (
        <ViewTab
          students={filteredStudents}
          studentSearch={studentSearch}
          setStudentSearch={setStudentSearch}
          selectedStudentId={selectedStudentId}
          weeks={viewWeeks}
          loading={viewLoading}
          today={today}
          onSelect={loadStudentView}
          onJumpToCommand={(name) => {
            setTab('command');
            setMode('compose');
            setCommand(`${name}에게 `);
          }}
        />
      )}
    </AdminLayout>
  );
}

// ============ 자연어 명령 탭 ============
function CommandTab(props: {
  mode: Mode;
  command: string;
  setCommand: (s: string) => void;
  planning: boolean;
  executing: boolean;
  undoing: boolean;
  plan: PlanResponse | null;
  execResult: ExecuteResponse | null;
  error: string | null;
  today: string;
  onPlan: () => void;
  onExecute: () => void;
  onUndo: () => void;
  onReset: () => void;
  onBack: () => void;
}) {
  const { mode, command, setCommand, planning, executing, undoing, plan, execResult, error, today, onPlan, onExecute, onUndo, onReset, onBack } = props;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5">
      {/* 좌측: 입력 */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3">1. 명령 입력</h2>
        <textarea
          value={command}
          onChange={e => setCommand(e.target.value)}
          placeholder="예: 조승현한테 공수1 8~9차시 다음주 월요일부터"
          rows={4}
          disabled={mode !== 'compose' || planning}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-red-400 resize-none disabled:bg-slate-50"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setCommand(ex)}
              disabled={mode !== 'compose' || planning}
              className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={onPlan}
            disabled={!command.trim() || planning || mode !== 'compose'}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 disabled:bg-slate-300"
          >
            {planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            해석하기
          </button>
          {mode !== 'compose' && (
            <button onClick={onReset} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
              새 명령
            </button>
          )}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">오늘(KST): {today}</p>

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
            <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
            {error}
          </div>
        )}
      </div>

      {/* 우측: 미리보기 / 결과 */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        {mode === 'compose' && (
          <div className="text-center py-12 text-sm text-slate-400">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            명령을 입력하면 해석 결과가 여기에 표시됩니다.
          </div>
        )}

        {mode === 'preview' && plan && (
          <PreviewPanel
            plan={plan}
            today={today}
            executing={executing}
            onExecute={onExecute}
            onBack={onBack}
          />
        )}

        {mode === 'result' && execResult && (
          <ResultPanel result={execResult} undoing={undoing} onUndo={onUndo} onReset={onReset} />
        )}
      </div>
    </div>
  );
}

function PreviewPanel({
  plan,
  today,
  executing,
  onExecute,
  onBack,
}: {
  plan: PlanResponse;
  today: string;
  executing: boolean;
  onExecute: () => void;
  onBack: () => void;
}) {
  const canExecute = !!plan.plan_id;
  const statusColor: Record<PlanResponse['status'], string> = {
    ok: 'bg-emerald-100 text-emerald-800',
    requires_confirmation: 'bg-amber-100 text-amber-800',
    ambiguous: 'bg-amber-100 text-amber-800',
    unknown_student: 'bg-rose-100 text-rose-800',
    unknown_set: 'bg-rose-100 text-rose-800',
    parse_error: 'bg-rose-100 text-rose-800',
  };

  // 학생별 그룹핑 + 주차 그룹핑 (시각화)
  const allDiffs: SeasonItem[] = [
    ...plan.diff.added.map(d => toSeasonItem(d)),
    ...plan.diff.moved.map(d => toSeasonItem(d)),
    ...plan.diff.unchanged.map(d => toSeasonItem(d)),
    ...plan.diff.removed.map(d => toSeasonItem(d)),
  ];

  // 학생별 분리
  const byStudent = new Map<string, { name: string; items: SeasonItem[] }>();
  for (const d of [...plan.diff.added, ...plan.diff.moved, ...plan.diff.unchanged, ...plan.diff.removed]) {
    if (!byStudent.has(d.user_id)) byStudent.set(d.user_id, { name: d.user_name, items: [] });
    byStudent.get(d.user_id)!.items.push({
      setId: d.set_id,
      setLabel: d.set_label + (d.set_chapter_order ? '' : ''),
      status: d.status,
      previousPublishYmd: d.previous_published_at ? isoToKstYmd(d.previous_published_at) : undefined,
      chapterOrder: d.set_chapter_order,
    });
  }

  return (
    <>
      <div className="flex items-start justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-700">2. 미리보기</h2>
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${statusColor[plan.status]}`}>
          {plan.status}
        </span>
      </div>

      <p className="text-sm text-slate-700 mb-4 p-3 bg-slate-50 rounded">{plan.summary_ko}</p>

      {plan.notes && (
        <p className="text-xs text-slate-500 mb-3 p-2 bg-amber-50 border border-amber-100 rounded">
          {plan.notes}
        </p>
      )}

      {plan.diff.warnings.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
          <div className="text-xs font-bold text-amber-800 mb-1">⚠️ 경고</div>
          <ul className="text-[11px] text-amber-700 space-y-0.5">
            {plan.diff.warnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-[11px] mb-4">
        <span className="text-emerald-700 font-bold">추가 {plan.diff.added.length}건</span>
        <span className="text-amber-700 font-bold">이동 {plan.diff.moved.length}건</span>
        <span className="text-rose-700 font-bold">삭제 {plan.diff.removed.length}건</span>
        <span className="text-slate-500">변동 없음 {plan.diff.unchanged.length}건</span>
      </div>

      {/* 학생별 시즌 시각화 */}
      <div className="space-y-5 max-h-[480px] overflow-y-auto">
        {Array.from(byStudent.entries()).map(([uid, group]) => {
          const weeks = groupItemsByPublish(group.items, plan);
          return (
            <div key={uid} className="border border-slate-100 rounded-lg p-3">
              <h4 className="text-sm font-bold text-slate-800 mb-2">{group.name}</h4>
              <AdminStudentSeasonView weeks={weeks} todayYmd={today} emptyMsg="변경 사항 없음" />
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex gap-2 justify-end">
        <button onClick={onBack} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
          취소
        </button>
        <button
          onClick={onExecute}
          disabled={!canExecute || executing}
          className="flex items-center gap-1.5 px-5 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 disabled:bg-slate-300"
        >
          {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          확정
        </button>
      </div>
      {plan.expires_at && (
        <p className="mt-2 text-[10px] text-slate-400 text-right">
          미리보기 만료 {new Date(plan.expires_at).toLocaleTimeString('ko-KR')}까지
        </p>
      )}
    </>
  );
}

function ResultPanel({
  result,
  undoing,
  onUndo,
  onReset,
}: {
  result: ExecuteResponse;
  undoing: boolean;
  onUndo: () => void;
  onReset: () => void;
}) {
  return (
    <div className="text-center py-8">
      <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
      <p className="text-lg font-bold text-slate-800">실행 완료</p>
      <p className="text-sm text-slate-500 mt-1">
        추가 {result.created}건 / 삭제 {result.deleted}건
      </p>
      <div className="mt-5 flex gap-2 justify-center">
        <button onClick={onReset} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">
          새 명령
        </button>
        {result.undo_token && (
          <button
            onClick={onUndo}
            disabled={undoing}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 disabled:bg-slate-300"
          >
            {undoing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            되돌리기 (5분 내)
          </button>
        )}
      </div>
      {!result.undo_token && (
        <p className="mt-3 text-[11px] text-slate-400">
          되돌리기는 sql/migration_concept_assign_history.sql 마이그 적용 후 활성화됩니다.
        </p>
      )}
    </div>
  );
}

function toSeasonItem(d: DiffEntry): SeasonItem {
  return {
    setId: d.set_id,
    setLabel: d.set_label,
    status: d.status,
    previousPublishYmd: d.previous_published_at ? isoToKstYmd(d.previous_published_at) : undefined,
  };
}

function groupItemsByPublish(items: SeasonItem[], plan: PlanResponse): SeasonWeek[] {
  // diff 항목별로 publishYmd 가져오기 — 다 학생 식별자 따로라 plan.diff에서 직접 매핑
  // 단순화: setId+status 매칭으로 publishYmd 찾기
  const publishYmdBySetStatus = new Map<string, string>();
  for (const d of [...plan.diff.added, ...plan.diff.moved, ...plan.diff.unchanged, ...plan.diff.removed]) {
    publishYmdBySetStatus.set(`${d.user_id}:${d.set_id}:${d.status}`, d.publishYmd);
  }

  // 단순화 위해 publish별 그룹핑
  const byWeek = new Map<string, SeasonItem[]>();
  for (const it of items) {
    // publishYmd 추출 (status로 매칭)
    let publishYmd = '';
    for (const d of [...plan.diff.added, ...plan.diff.moved, ...plan.diff.unchanged, ...plan.diff.removed]) {
      if (d.set_id === it.setId && d.status === it.status) {
        publishYmd = d.publishYmd;
        break;
      }
    }
    if (!publishYmd) continue;
    if (!byWeek.has(publishYmd)) byWeek.set(publishYmd, []);
    byWeek.get(publishYmd)!.push(it);
  }
  return Array.from(byWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([publishYmd, items]) => ({
      publishYmd,
      items: items.sort((a, b) => (a.chapterOrder ?? 999) - (b.chapterOrder ?? 999)),
    }));
}

// ============ 학생 일정 조회 탭 ============
function ViewTab(props: {
  students: Student[];
  studentSearch: string;
  setStudentSearch: (s: string) => void;
  selectedStudentId: string | null;
  weeks: SeasonWeek[] | null;
  loading: boolean;
  today: string;
  onSelect: (id: string) => void;
  onJumpToCommand: (name: string) => void;
}) {
  const { students, studentSearch, setStudentSearch, selectedStudentId, weeks, loading, today, onSelect, onJumpToCommand } = props;
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-5">
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <div className="relative mb-2">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
          <input
            value={studentSearch}
            onChange={e => setStudentSearch(e.target.value)}
            placeholder="학생 검색"
            className="w-full pl-7 pr-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-red-400"
          />
        </div>
        <div className="max-h-[480px] overflow-y-auto space-y-0.5">
          {students.map(s => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                selectedStudentId === s.id
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <p className="font-medium truncate">{s.name}</p>
              {s.school && <p className="text-[10px] text-slate-500 truncate">{s.school}</p>}
            </button>
          ))}
          {students.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">학생 없음</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        {!selectedStudentId ? (
          <div className="text-center py-12 text-sm text-slate-400">학생을 선택하면 시즌 일정이 표시됩니다.</div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedStudent?.name}</h2>
                {selectedStudent?.school && (
                  <p className="text-xs text-slate-500">{selectedStudent.school}</p>
                )}
              </div>
              <button
                onClick={() => onJumpToCommand(selectedStudent?.name || '')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                <Sparkles className="w-3.5 h-3.5" />
                이 학생에게 명령
              </button>
            </div>
            <AdminStudentSeasonView weeks={weeks || []} todayYmd={today} emptyMsg="배정된 차시가 없습니다." />
          </>
        )}
      </div>
    </div>
  );
}

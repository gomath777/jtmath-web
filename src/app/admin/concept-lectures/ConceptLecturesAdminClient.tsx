'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Loader2, Video, Check, X, Plus, AlertCircle, FileText, PlayCircle, Sparkles, ChevronRight,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

type ChapterStatus =
  | 'complete'
  | 'placeholder'
  | 'missing'
  | 'pdf_only'
  | 'video_only'
  | 'out_of_scope';

interface ChapterCell {
  chapter_order: number;
  set_id: string | null;
  title: string | null;
  db_title: string | null;
  videos_count: number;
  pdfs_count: number;
  total_duration_seconds: number;
  assignment_count: number;
  placeholder: boolean;
  status: ChapterStatus;
}

interface SubjectRow {
  subject_slug: string;
  subject_label: string;
  expected_chapters: number[];
  chapters: ChapterCell[];
  summary: {
    total_chapters: number;
    db_chapters: number;
    total_videos: number;
    total_pdfs: number;
    missing_count: number;
  };
}

interface LearningSet {
  id: string;
  title: string;
  subject_slug: string | null;
  chapter_order: number | null;
  pdfs?: Array<{ url: string; original_name?: string; file_size?: string }>;
  learning_set_videos?: Array<{
    id: string;
    problem_number: number | null;
    title: string;
    bunny_video_id: string;
    order_index: number;
  }>;
}

interface Student {
  id: string;
  name: string;
  school: string | null;
}

interface Assignment {
  id: string;
  set_id: string;
  user_id: string;
  profiles: { id: string; name: string; school: string | null } | null;
}

const STATUS_COLOR: Record<ChapterStatus, string> = {
  complete: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  placeholder: 'bg-stone-300 hover:bg-stone-400 text-stone-700',
  missing: 'bg-rose-500 hover:bg-rose-600 text-white',
  pdf_only: 'bg-amber-400 hover:bg-amber-500 text-stone-900',
  video_only: 'bg-blue-500 hover:bg-blue-600 text-white',
  out_of_scope: 'bg-stone-100 text-stone-300 cursor-default',
};

const STATUS_LABEL: Record<ChapterStatus, string> = {
  complete: '완료',
  placeholder: '총정리',
  missing: '누락',
  pdf_only: 'PDF만',
  video_only: '영상만',
  out_of_scope: '범위 밖',
};

function formatDuration(sec: number): string {
  if (!sec) return '';
  const m = Math.round(sec / 60);
  if (m >= 60) return `${Math.floor(m / 60)}시간 ${m % 60}분`;
  return `${m}분`;
}

export default function ConceptLecturesAdminClient() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [sets, setSets] = useState<LearningSet[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ subject_slug: string; chapter_order: number } | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [overview, setsData, sc] = await Promise.all([
      fetch('/api/admin/concept-overview').then(r => r.json()),
      fetch('/api/admin/learning-sets?kind=concept').then(r => r.json()),
      fetch('/api/admin/students-courses').then(r => r.json()),
    ]);
    setSubjects(overview.subjects || []);
    setSets(Array.isArray(setsData) ? setsData : []);
    setStudents(sc.students || []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const selectedCell = useMemo(() => {
    if (!selected) return null;
    const subj = subjects.find(s => s.subject_slug === selected.subject_slug);
    const cell = subj?.chapters.find(c => c.chapter_order === selected.chapter_order);
    if (!subj || !cell) return null;
    const fullSet = cell.set_id ? sets.find(s => s.id === cell.set_id) : null;
    return { subject: subj, cell, set: fullSet };
  }, [selected, subjects, sets]);

  useEffect(() => {
    if (!selectedCell?.cell.set_id) {
      setAssignments([]);
      return;
    }
    setAssignLoading(true);
    fetch(`/api/admin/assignments?set_id=${selectedCell.cell.set_id}`)
      .then(r => r.json())
      .then(data => {
        setAssignments(Array.isArray(data) ? data : []);
        setAssignLoading(false);
      });
  }, [selectedCell?.cell.set_id]);

  const assignedIds = new Set(assignments.map(a => a.user_id));
  const availableStudents = students.filter(s => !assignedIds.has(s.id));

  const assignStudents = async (studentIds: string[]) => {
    if (!selectedCell?.cell.set_id) return;
    const res = await fetch('/api/admin/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        set_id: selectedCell.cell.set_id,
        user_ids: studentIds,
        publish_now: true,
      }),
    });
    if (!res.ok) {
      alert('배정 실패: ' + (await res.text()));
      return;
    }
    const d = await fetch(`/api/admin/assignments?set_id=${selectedCell.cell.set_id}`).then(r => r.json());
    setAssignments(Array.isArray(d) ? d : []);
    setShowAddModal(false);
    // 매트릭스의 assignment_count 갱신
    fetch('/api/admin/concept-overview').then(r => r.json()).then(o => setSubjects(o.subjects || []));
  };

  const removeAssignment = async (id: string) => {
    if (!confirm('이 학생의 배정을 해제할까요?')) return;
    const res = await fetch('/api/admin/assignments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setAssignments(assignments.filter(a => a.id !== id));
      fetch('/api/admin/concept-overview').then(r => r.json()).then(o => setSubjects(o.subjects || []));
    }
  };

  const totalMissing = subjects.reduce((acc, s) => acc + s.summary.missing_count, 0);

  return (
    <AdminLayout activeNav="concept">
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">개념강의 콘텐츠 현황</h1>
              <p className="text-sm text-slate-500 mt-1">
                4과목 × 16차시 매트릭스. 셀을 클릭하면 영상·PDF·배정 학생을 볼 수 있습니다.
              </p>
            </div>
            <a
              href="/admin/concept-assign"
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              자연어 배정으로
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {totalMissing > 0 && (
            <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-sm text-rose-800">
                <strong>{totalMissing}개 차시</strong>가 노션엔 있지만 DB에 import되지 않았습니다.
                해당 셀을 클릭하면 import 가이드가 표시됩니다.
              </div>
            </div>
          )}

          {/* 요약 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {subjects.map(s => {
              const isEmpty = s.summary.db_chapters === 0;
              return (
                <div
                  key={s.subject_slug}
                  className={`p-4 rounded-xl border ${
                    isEmpty
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-900">{s.subject_label}</h3>
                    {isEmpty && <AlertCircle className="w-4 h-4 text-rose-600" />}
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {s.summary.db_chapters} <span className="text-sm font-normal text-slate-500">/ {s.summary.total_chapters}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                    <div>영상 {s.summary.total_videos}강</div>
                    <div>PDF {s.summary.total_pdfs}개</div>
                    {s.summary.missing_count > 0 && (
                      <div className="text-rose-600 font-bold">누락 {s.summary.missing_count}건</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 매트릭스 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[64px_repeat(16,minmax(0,1fr))] gap-1.5 mb-2 text-[10px] text-slate-400 font-medium">
                <div></div>
                {Array.from({ length: 16 }, (_, i) => (
                  <div key={i} className="text-center">{i + 1}</div>
                ))}
              </div>
              {subjects.map(s => (
                <div key={s.subject_slug} className="grid grid-cols-[64px_repeat(16,minmax(0,1fr))] gap-1.5 mb-1.5">
                  <div className="flex items-center font-bold text-sm text-slate-700 pr-2">
                    {s.subject_label}
                  </div>
                  {s.chapters.map(cell => {
                    const isSelected =
                      selected?.subject_slug === s.subject_slug &&
                      selected.chapter_order === cell.chapter_order;
                    const disabled = cell.status === 'out_of_scope';
                    const tooltip = disabled
                      ? '범위 밖'
                      : `${cell.chapter_order}차시 · ${STATUS_LABEL[cell.status]}\n영상 ${cell.videos_count}개 / PDF ${cell.pdfs_count}개\n학생 ${cell.assignment_count}명 배정${cell.title ? '\n' + cell.title : ''}`;
                    return (
                      <button
                        key={cell.chapter_order}
                        onClick={() => !disabled && setSelected({ subject_slug: s.subject_slug, chapter_order: cell.chapter_order })}
                        disabled={disabled}
                        title={tooltip}
                        className={`aspect-square rounded text-[10px] font-bold flex flex-col items-center justify-center transition-transform ${STATUS_COLOR[cell.status]} ${
                          isSelected ? 'ring-2 ring-slate-900 ring-offset-1 scale-110' : ''
                        }`}
                      >
                        {disabled ? (
                          <span>-</span>
                        ) : (
                          <>
                            <span>{cell.videos_count}/{cell.pdfs_count}</span>
                            {cell.assignment_count > 0 && (
                              <span className="text-[8px] opacity-80">{cell.assignment_count}명</span>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* 범례 */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-3 text-[11px]">
              {(['complete', 'pdf_only', 'video_only', 'placeholder', 'missing', 'out_of_scope'] as ChapterStatus[]).map(st => (
                <div key={st} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded ${STATUS_COLOR[st].split(' ')[0]}`}></span>
                  <span className="text-slate-600">{STATUS_LABEL[st]}</span>
                </div>
              ))}
              <div className="ml-auto text-slate-400">셀 안 숫자: 영상수/PDF수</div>
            </div>
          </div>
        </>
      )}

      {/* 슬라이드 패널 */}
      {selectedCell && (
        <DetailPanel
          subjectLabel={selectedCell.subject.subject_label}
          subjectSlug={selectedCell.subject.subject_slug}
          cell={selectedCell.cell}
          set={selectedCell.set}
          assignments={assignments}
          assignLoading={assignLoading}
          availableCount={availableStudents.length}
          onAddStudent={() => setShowAddModal(true)}
          onRemove={removeAssignment}
          onClose={() => setSelected(null)}
        />
      )}

      {showAddModal && selectedCell?.cell.set_id && (
        <AddStudentsModal
          students={availableStudents}
          onClose={() => setShowAddModal(false)}
          onConfirm={assignStudents}
        />
      )}
    </AdminLayout>
  );
}

function DetailPanel({
  subjectLabel,
  subjectSlug,
  cell,
  set,
  assignments,
  assignLoading,
  availableCount,
  onAddStudent,
  onRemove,
  onClose,
}: {
  subjectLabel: string;
  subjectSlug: string;
  cell: ChapterCell;
  set: LearningSet | null | undefined;
  assignments: Assignment[];
  assignLoading: boolean;
  availableCount: number;
  onAddStudent: () => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-white border-l border-slate-200 shadow-2xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded">
                {subjectLabel}
              </span>
              <span className="text-[11px] text-slate-500">chapter_order = {cell.chapter_order}</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${STATUS_COLOR[cell.status]}`}>
                {STATUS_LABEL[cell.status]}
              </span>
            </div>
            <h2 className="font-bold text-slate-900 truncate">
              {cell.title || cell.db_title || `${cell.chapter_order}차시`}
            </h2>
            {cell.total_duration_seconds > 0 && (
              <p className="text-[11px] text-slate-500 mt-1">
                총 영상 길이 {formatDuration(cell.total_duration_seconds)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {cell.status === 'missing' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800">
              <p className="font-bold mb-1">DB에 import되지 않았습니다.</p>
              <p className="text-xs">
                이 차시는 노션 메타에는 있지만 learning_sets에 row가 없습니다. CLI로 import:
              </p>
              <code className="block mt-2 p-2 bg-white border border-rose-200 rounded text-[11px] text-rose-900">
                npx tsx scripts/admin/import-{subjectSlug}-concept.ts
              </code>
            </div>
          )}

          {cell.status === 'placeholder' && (
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-700">
              총정리(오답 복습 + 모의고사) 슬롯입니다. 별도 학습 자료가 없습니다.
            </div>
          )}

          {/* 영상 */}
          {set && (set.learning_set_videos?.length || 0) > 0 && (
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <PlayCircle className="w-3.5 h-3.5" />
                영상 {set.learning_set_videos!.length}개
              </h3>
              <ul className="space-y-1.5">
                {[...(set.learning_set_videos || [])]
                  .sort((a, b) => a.order_index - b.order_index)
                  .map(v => (
                    <li key={v.id} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-slate-400 text-[11px] mt-0.5 shrink-0">
                        {v.problem_number != null && v.problem_number > 0 ? `${v.problem_number}강` : '추가'}
                      </span>
                      <span className="truncate">{v.title}</span>
                    </li>
                  ))}
              </ul>
            </section>
          )}

          {/* PDF */}
          {set && (set.pdfs?.length || 0) > 0 && (
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                PDF {set.pdfs!.length}개
              </h3>
              <ul className="space-y-1.5">
                {set.pdfs!.map((p, i) => (
                  <li key={i} className="text-sm">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-700 hover:text-red-600 underline-offset-2 hover:underline truncate block"
                    >
                      {p.original_name || `PDF ${i + 1}`}
                      {p.file_size && (
                        <span className="text-[11px] text-slate-400 ml-1">({p.file_size})</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 배정 학생 */}
          {cell.set_id && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  배정 학생 {assignments.length}명
                </h3>
                <button
                  onClick={onAddStudent}
                  disabled={availableCount === 0}
                  className="flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 disabled:bg-slate-300 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  추가
                </button>
              </div>
              {assignLoading ? (
                <div className="py-4 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                </div>
              ) : assignments.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">아직 배정된 학생이 없습니다.</p>
              ) : (
                <ul className="space-y-1">
                  {assignments.map(a => (
                    <li
                      key={a.id}
                      className="flex items-center gap-2 px-2.5 py-2 bg-slate-50 rounded text-sm"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">
                          {a.profiles?.name || '이름 없음'}
                        </p>
                        {a.profiles?.school && (
                          <p className="text-[10px] text-slate-500">{a.profiles.school}</p>
                        )}
                      </div>
                      <button
                        onClick={() => onRemove(a.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-slate-400">
                💡 다중 학생·시즌 일정은 <a href="/admin/concept-assign" className="underline hover:text-slate-700">자연어 배정</a>이 더 편합니다.
              </p>
            </section>
          )}
        </div>
      </aside>
    </>
  );
}

function AddStudentsModal({
  students,
  onClose,
  onConfirm,
}: {
  students: Student[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">학생 선택 ({selected.size}명 선택)</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {students.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">추가할 수 있는 학생이 없습니다</p>
          ) : (
            students.map(s => {
              const isSelected = selected.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left ${
                    isSelected ? 'bg-red-50 border border-red-200' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isSelected ? 'bg-red-600 border-red-600' : 'border-slate-300'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{s.name}</p>
                    {s.school && <p className="text-[11px] text-slate-500">{s.school}</p>}
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={selected.size === 0}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:bg-slate-300"
          >
            {selected.size}명 배정
          </button>
        </div>
      </div>
    </div>
  );
}

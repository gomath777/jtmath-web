'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, BookOpen, Plus, ExternalLink, X, Users, Send } from 'lucide-react';

interface MatchedVideo {
  id: string;
  bunny_video_id: string;
  title: string;
  subject_slug: string;
}

interface ParsedProblem {
  problem_number: number;
  year: number | null;
  month: number | null;
  grade: number | null;
  problem: number | null;
  raw_text: string;
  matched_video: MatchedVideo | null;
}

interface ParseResult {
  total: number;
  matched: number;
  unmatched: number;
  problems: ParsedProblem[];
}

interface LearningSet {
  id: string;
  title: string;
  description: string | null;
  subject_slug: string | null;
  pdf_filename: string | null;
  created_at: string;
  learning_set_videos: { id: string }[];
}

interface Profile {
  id: string;
  name: string;
  school: string;
}

interface Course {
  id: string;
  title: string;
}

const SUBJECT_OPTIONS = [
  { value: 'gs1', label: '공통수학1' },
  { value: 'gs2', label: '공통수학2' },
  { value: 'ds2', label: '대수' },
  { value: 'ms1', label: '미적분1' },
];

export default function ContentLibraryClient({ initialSets }: { initialSets: LearningSet[] }) {
  const [sets, setSets] = useState<LearningSet[]>(initialSets);
  const [mode, setMode] = useState<'list' | 'upload'>('list');

  // 업로드 상태
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [subjectSlug, setSubjectSlug] = useState('gs1');
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // 저장 상태
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // 배정 모달
  const [assignModal, setAssignModal] = useState<LearningSet | null>(null);
  const [students, setStudents] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignMode, setAssignMode] = useState<'students' | 'course'>('students');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [assignLabel, setAssignLabel] = useState('');
  const [weekNumber, setWeekNumber] = useState('');
  const [sessionNumber, setSessionNumber] = useState('');
  const [publishNow, setPublishNow] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // 학생/강의 목록 로드
  useEffect(() => {
    if (assignModal) {
      fetch('/api/admin/students-courses')
        .then(res => res.json())
        .then(data => {
          setStudents(data.students || []);
          setCourses(data.courses || []);
        })
        .catch(() => {});
    }
  }, [assignModal]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setParseResult(null);
      setSavedId(null);
      const name = file.name.replace(/\.pdf$/i, '').replace(/^\d{6}_/, '');
      setTitle(name);
    }
  };

  const handleParse = async () => {
    if (!pdfFile) return;
    setParsing(true);
    setParseResult(null);

    try {
      const form = new FormData();
      form.append('pdf', pdfFile);
      form.append('subject_slug', subjectSlug);

      const res = await fetch('/api/admin/parse-pdf', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setParseResult(data);
    } catch (err) {
      alert('파싱 오류: ' + String(err));
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!parseResult || !title.trim()) return;
    setSaving(true);

    try {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('description', description);
      form.append('subject_slug', subjectSlug);
      form.append('problems', JSON.stringify(parseResult.problems));
      if (pdfFile) form.append('pdf', pdfFile);

      const res = await fetch('/api/admin/learning-sets', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSavedId(data.id);
      const listRes = await fetch('/api/admin/learning-sets');
      const listData = await listRes.json();
      setSets(listData);
    } catch (err) {
      alert('저장 오류: ' + String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!assignModal) return;
    setAssigning(true);

    try {
      const body: Record<string, unknown> = {
        set_id: assignModal.id,
        label: assignLabel || null,
        week_number: weekNumber ? parseInt(weekNumber) : null,
        session_number: sessionNumber ? parseInt(sessionNumber) : null,
        publish_now: publishNow,
      };

      if (assignMode === 'students') {
        body.user_ids = selectedStudents;
      } else {
        body.course_id = selectedCourse;
      }

      const res = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(`${data.created}명에게 배정 완료!`);
      setAssignModal(null);
      resetAssignForm();
    } catch (err) {
      alert('배정 오류: ' + String(err));
    } finally {
      setAssigning(false);
    }
  };

  const resetAssignForm = () => {
    setSelectedStudents([]);
    setSelectedCourse('');
    setAssignLabel('');
    setWeekNumber('');
    setSessionNumber('');
    setPublishNow(true);
    setAssignMode('students');
  };

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  // 업로드 모드
  if (mode === 'upload') {
    return (
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setMode('list'); setPdfFile(null); setParseResult(null); setSavedId(null); }}
            className="text-slate-500 hover:text-slate-700 text-sm">&larr; 목록으로</button>
          <h2 className="text-xl font-bold text-slate-800">새 콘텐츠 만들기</h2>
        </div>

        {/* Step 1 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <h3 className="font-bold text-slate-700 mb-4">&oplus; PDF 업로드</h3>
          <div className="flex gap-3 mb-4">
            <select value={subjectSlug} onChange={e => setSubjectSlug(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium">
              {SUBJECT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2 rounded-xl text-sm transition-colors">
              <Upload className="w-4 h-4" />
              {pdfFile ? pdfFile.name : 'PDF 선택'}
            </button>
            <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
          </div>
          <button onClick={handleParse} disabled={!pdfFile || parsing}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
            {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            {parsing ? '분석 중...' : '영상 자동 매칭'}
          </button>
        </div>

        {/* Step 2 */}
        {parseResult && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
            <div className="flex items-center gap-4 mb-5">
              <h3 className="font-bold text-slate-700">&oplus; 매칭 결과</h3>
              <span className="text-sm bg-green-50 text-green-700 font-bold px-3 py-1 rounded-full">
                &#10003; {parseResult.matched}/{parseResult.total} 매칭
              </span>
              {parseResult.unmatched > 0 && (
                <span className="text-sm bg-orange-50 text-orange-600 font-bold px-3 py-1 rounded-full">
                  &#9888; {parseResult.unmatched}개 미매칭
                </span>
              )}
            </div>
            <div className="space-y-2">
              {parseResult.problems.map((p) => (
                <div key={p.problem_number} className={`flex items-start gap-3 p-3 rounded-xl border ${p.matched_video ? 'border-green-100 bg-green-50/40' : 'border-orange-100 bg-orange-50/40'}`}>
                  <span className="text-xs font-black text-slate-500 w-7 shrink-0 mt-0.5">{String(p.problem_number).padStart(2, '0')}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-500 mb-0.5">{p.raw_text || '출처 미상'}</div>
                    {p.matched_video ? (
                      <div className="text-sm font-medium text-slate-700 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        {p.matched_video.title}
                      </div>
                    ) : (
                      <div className="text-sm font-medium text-orange-600 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        해설강의 없음
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 */}
        {parseResult && !savedId && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
            <h3 className="font-bold text-slate-700 mb-4">&oplus; 저장</h3>
            <div className="space-y-3">
              <input type="text" placeholder="콘텐츠 제목 (예: 복소수 레벨3 8문제)"
                value={title} onChange={e => setTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
              <input type="text" placeholder="설명 (선택)"
                value={description} onChange={e => setDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
              <button onClick={handleSave} disabled={!title.trim() || saving}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? '저장 중...' : '콘텐츠 라이브러리에 저장'}
              </button>
            </div>
          </div>
        )}

        {savedId && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <div className="font-bold text-green-800">저장 완료!</div>
              <div className="text-sm text-green-700">콘텐츠 라이브러리에 추가됐습니다.</div>
            </div>
            <button onClick={() => setMode('list')} className="ml-auto text-sm font-bold text-green-700 hover:text-green-900">
              목록 보기 &rarr;
            </button>
          </div>
        )}
      </div>
    );
  }

  // 목록 뷰
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">콘텐츠 라이브러리</h2>
        <button onClick={() => setMode('upload')}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors">
          <Plus className="w-4 h-4" />
          새 콘텐츠 만들기
        </button>
      </div>

      {sets.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center text-slate-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">아직 콘텐츠가 없습니다</p>
          <p className="text-sm mt-1">PDF를 업로드하면 해설강의를 자동으로 매칭해 드려요</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sets.map((set) => (
            <div key={set.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800">{set.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {set.subject_slug && <span className="bg-slate-100 px-2 py-0.5 rounded-full mr-2">{set.subject_slug}</span>}
                  영상 {set.learning_set_videos?.length || 0}개
                  {set.pdf_filename && <span className="ml-2">&middot; {set.pdf_filename}</span>}
                  <span className="ml-2">&middot; {new Date(set.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
              <button
                onClick={() => { setAssignModal(set); resetAssignForm(); }}
                className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 transition-colors px-3 py-2 rounded-xl hover:bg-red-50"
              >
                배정하기 <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 배정 모달 */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAssignModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800">학습 배정</h3>
                <p className="text-xs text-slate-400 mt-0.5">{assignModal.title}</p>
              </div>
              <button onClick={() => setAssignModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* 배정 대상 선택 */}
              <div>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setAssignMode('students')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${assignMode === 'students' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}
                  >
                    <Users className="w-3 h-3 inline mr-1" />
                    학생 선택
                  </button>
                  <button
                    onClick={() => setAssignMode('course')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${assignMode === 'course' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}
                  >
                    <BookOpen className="w-3 h-3 inline mr-1" />
                    강의 전체
                  </button>
                </div>

                {assignMode === 'students' ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">{selectedStudents.length}명 선택</span>
                      <button onClick={selectAllStudents} className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                        {selectedStudents.length === students.length ? '전체 해제' : '전체 선택'}
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                      {students.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">등록된 학생이 없습니다</div>
                      ) : (
                        students.map(s => (
                          <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(s.id)}
                              onChange={() => toggleStudent(s.id)}
                              className="rounded border-slate-300"
                            />
                            <span className="text-sm font-medium text-slate-700">{s.name}</span>
                            <span className="text-xs text-slate-400">{s.school}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <select
                    value={selectedCourse}
                    onChange={e => setSelectedCourse(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                  >
                    <option value="">강의 선택...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                )}
              </div>

              {/* 레이블/주차 */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500 font-medium mb-1 block">레이블</label>
                  <input
                    type="text"
                    placeholder="예: 보충자료"
                    value={assignLabel}
                    onChange={e => setAssignLabel(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium mb-1 block">주차</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={weekNumber}
                    onChange={e => setWeekNumber(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium mb-1 block">차시</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={sessionNumber}
                    onChange={e => setSessionNumber(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* 즉시 공개 */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishNow}
                  onChange={e => setPublishNow(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700 font-medium">즉시 공개</span>
                <span className="text-xs text-slate-400">(체크 해제 시 임시저장)</span>
              </label>
            </div>

            <div className="p-5 border-t border-slate-100">
              <button
                onClick={handleAssign}
                disabled={assigning || (assignMode === 'students' ? selectedStudents.length === 0 : !selectedCourse)}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl text-sm transition-colors"
              >
                {assigning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {assigning ? '배정 중...' : '배정하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, CreditCard, BookOpen, LayoutDashboard, Calendar,
  Plus, Loader2, CheckCircle, ChevronDown, ChevronUp, Send, X, Trash2, Edit3,
} from 'lucide-react';
import SessionBlockEditor from './SessionBlockEditor';

interface LearningSet {
  id: string;
  title: string;
  pdf_filename: string | null;
}

interface CurriculumItem {
  id: string;
  set_id: string | null;
  week_number: number;
  session_number: number;
  label: string;
  publish_date: string;
  learning_sets: LearningSet | null;
}

interface Curriculum {
  id: string;
  title: string;
  description: string | null;
  subject_slug: string | null;
  schedule_pattern: string;
  start_date: string;
  created_at: string;
  curriculum_items: CurriculumItem[];
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

const SCHEDULE_OPTIONS = [
  { value: 'sun_wed', label: '일요일 / 수요일' },
  { value: 'mon_thu', label: '월요일 / 목요일' },
  { value: 'tue_fri', label: '화요일 / 금요일' },
];

// 시작일 + 패턴으로 날짜 자동 계산
function calculateDates(startDate: string, pattern: string, weekCount: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + 'T00:00:00');

  // 패턴에 따른 요일 쌍
  const dayPairs: Record<string, [number, number]> = {
    sun_wed: [0, 3], // 일=0, 수=3
    mon_thu: [1, 4],
    tue_fri: [2, 5],
  };
  const [day1, day2] = dayPairs[pattern] || [0, 3];

  // 시작일의 주 월요일 찾기
  const startDay = start.getDay();
  const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() + mondayOffset);

  for (let w = 0; w < weekCount; w++) {
    // 첫째 날 (일 or 월 or 화)
    const d1 = new Date(weekStart);
    d1.setDate(weekStart.getDate() + (w * 7) + (day1 === 0 ? -1 : day1 - 1)); // 월요일 기준 offset
    // 날짜 조정: 일요일은 -1, 나머지는 dayN - 1
    const date1 = new Date(weekStart);
    date1.setDate(weekStart.getDate() + (w * 7) + ((day1 + 6) % 7)); // 월요일=0 기준

    const date2 = new Date(weekStart);
    date2.setDate(weekStart.getDate() + (w * 7) + ((day2 + 6) % 7));

    dates.push(date1.toISOString().split('T')[0]);
    dates.push(date2.toISOString().split('T')[0]);
  }
  return dates;
}

// 더 간단한 날짜 계산
function getSessionDates(startDate: string, pattern: string, weekCount: number) {
  const pairs: { week: number; session: number; date: string }[] = [];
  const [dayA, dayB] = {
    sun_wed: [0, 3],
    mon_thu: [1, 4],
    tue_fri: [2, 5],
  }[pattern] || [0, 3];

  const start = new Date(startDate + 'T12:00:00');

  // 첫 번째 dayA 찾기 (시작일 이후)
  while (start.getDay() !== dayA) {
    start.setDate(start.getDate() + 1);
  }

  let sessionNum = 1;
  for (let w = 0; w < weekCount; w++) {
    const d1 = new Date(start);
    d1.setDate(start.getDate() + w * 7);
    pairs.push({ week: w + 1, session: sessionNum++, date: d1.toISOString().split('T')[0] });

    const d2 = new Date(d1);
    const gap = ((dayB - dayA) + 7) % 7;
    d2.setDate(d1.getDate() + gap);
    pairs.push({ week: w + 1, session: sessionNum++, date: d2.toISOString().split('T')[0] });
  }
  return pairs;
}

export default function CurriculumClient() {
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'create' | 'edit-session'>('list');

  // 차시 편집 상태
  const [editingItem, setEditingItem] = useState<{
    id: string; weekNumber: number; sessionNumber: number; label: string; subjectSlug?: string;
  } | null>(null);

  // 생성 폼
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectSlug, setSubjectSlug] = useState('gs1');
  const [schedulePattern, setSchedulePattern] = useState('sun_wed');
  const [startDate, setStartDate] = useState('');
  const [weekCount, setWeekCount] = useState(4);
  const [sessions, setSessions] = useState<Array<{
    week: number; session: number; date: string; label: string; set_id: string;
  }>>([]);
  const [learningSets, setLearningSets] = useState<LearningSet[]>([]);
  const [saving, setSaving] = useState(false);

  // 배정 모달
  const [assignCurriculum, setAssignCurriculum] = useState<Curriculum | null>(null);
  const [students, setStudents] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignMode, setAssignMode] = useState<'students' | 'course'>('students');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [assigning, setAssigning] = useState(false);

  // 펼침 상태
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { fetchCurricula(); }, []);

  const fetchCurricula = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/curricula');
      const data = await res.json();
      setCurricula(Array.isArray(data) ? data : []);
    } catch {} finally { setLoading(false); }
  };

  const fetchLearningSets = async () => {
    const res = await fetch('/api/admin/learning-sets');
    const data = await res.json();
    setLearningSets(Array.isArray(data) ? data.map((s: any) => ({
      id: s.id, title: s.title, pdf_filename: s.pdf_filename,
    })) : []);
  };

  // 시작일/패턴/주차 변경 시 세션 자동 생성
  const generateSessions = () => {
    if (!startDate || weekCount < 1) return;
    const dates = getSessionDates(startDate, schedulePattern, weekCount);
    setSessions(dates.map(d => ({
      ...d,
      label: '',
      set_id: '',
    })));
  };

  useEffect(() => {
    if (startDate && weekCount > 0) generateSessions();
  }, [startDate, schedulePattern, weekCount]);

  const handleCreate = async () => {
    if (!title.trim() || !startDate || sessions.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/curricula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description,
          subject_slug: subjectSlug,
          schedule_pattern: schedulePattern,
          start_date: startDate,
          items: sessions.map(s => ({
            set_id: s.set_id || null,
            week_number: s.week,
            session_number: s.session,
            label: s.label,
            publish_date: s.date,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`커리큘럼 생성 완료! (${data.items_created}차시)`);
      setMode('list');
      resetForm();
      fetchCurricula();
    } catch (err) {
      alert('오류: ' + String(err));
    } finally { setSaving(false); }
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setSubjectSlug('gs1');
    setSchedulePattern('sun_wed'); setStartDate(''); setWeekCount(4);
    setSessions([]);
  };

  // 배정
  const openAssignModal = async (cur: Curriculum) => {
    setAssignCurriculum(cur);
    setSelectedStudents([]); setSelectedCourse(''); setAssignMode('students');
    const res = await fetch('/api/admin/students-courses');
    const data = await res.json();
    setStudents(data.students || []);
    setCourses(data.courses || []);
  };

  const handleAssign = async () => {
    if (!assignCurriculum) return;
    setAssigning(true);
    try {
      const body: Record<string, unknown> = { curriculum_id: assignCurriculum.id };
      if (assignMode === 'students') body.user_ids = selectedStudents;
      else body.course_id = selectedCourse;

      const res = await fetch('/api/admin/curricula/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
      setAssignCurriculum(null);
    } catch (err) {
      alert('배정 오류: ' + String(err));
    } finally { setAssigning(false); }
  };

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
  };

  // 차시 편집 모드
  if (mode === 'edit-session' && editingItem) {
    return (
      <AdminLayout activeNav="curriculum">
        <SessionBlockEditor
          item={editingItem}
          onBack={() => { setMode('list'); setEditingItem(null); }}
        />
      </AdminLayout>
    );
  }

  // 생성 모드
  if (mode === 'create') {
    return (
      <AdminLayout activeNav="curriculum">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setMode('list'); resetForm(); }}
              className="text-slate-500 hover:text-slate-700 text-sm">&larr; 목록으로</button>
            <h2 className="text-xl font-bold text-slate-800">커리큘럼 만들기</h2>
          </div>

          {/* 기본 정보 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
            <h3 className="font-bold text-slate-700 mb-4">기본 정보</h3>
            <div className="space-y-3">
              <input type="text" placeholder='커리큘럼 이름 (예: "[공수1] 중간기말 전반전 델타1")'
                value={title} onChange={e => setTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
              <div className="grid grid-cols-3 gap-3">
                <select value={subjectSlug} onChange={e => setSubjectSlug(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
                  {SUBJECT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={schedulePattern} onChange={e => setSchedulePattern(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
                  {SCHEDULE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <input type="number" min={1} max={12} value={weekCount}
                  onChange={e => setWeekCount(parseInt(e.target.value) || 1)}
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                  placeholder="주차 수" />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium mb-1 block">시작일 (첫 차시 공개일)</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
              </div>
            </div>
          </div>

          {/* 차시 구성 */}
          {sessions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700">차시 구성</h3>
                <span className="text-xs text-slate-400">{sessions.length}차시</span>
              </div>

              <div className="space-y-2">
                {sessions.map((s, idx) => {
                  const isNewWeek = idx === 0 || s.week !== sessions[idx - 1].week;
                  return (
                    <div key={idx}>
                      {isNewWeek && (
                        <div className="flex items-center gap-2 mt-4 mb-2 first:mt-0">
                          <div className={`h-px flex-1 ${s.session % 2 === 1 ? 'bg-green-200' : 'bg-purple-200'}`} />
                          <span className="text-xs font-bold text-slate-500">{s.week}주차</span>
                          <div className={`h-px flex-1 ${s.session % 2 === 1 ? 'bg-green-200' : 'bg-purple-200'}`} />
                        </div>
                      )}
                      <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                        <div className="shrink-0 w-20">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                            s.session % 2 === 1 ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {formatDate(s.date)}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 w-12 shrink-0">{s.session}차시</span>
                        <input type="text" placeholder="레이블 (예: 다항식 나머지정리)"
                          value={s.label} onChange={e => {
                            const next = [...sessions];
                            next[idx].label = e.target.value;
                            setSessions(next);
                          }}
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm" />
                        <select value={s.set_id} onChange={e => {
                          const next = [...sessions];
                          next[idx].set_id = e.target.value;
                          setSessions(next);
                        }}
                          className="w-52 border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                          onClick={() => { if (learningSets.length === 0) fetchLearningSets(); }}>
                          <option value="">콘텐츠 선택...</option>
                          {learningSets.map(ls => (
                            <option key={ls.id} value={ls.id}>{ls.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 저장 버튼 */}
          {sessions.length > 0 && (
            <button onClick={handleCreate} disabled={!title.trim() || saving}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              {saving ? '저장 중...' : '커리큘럼 저장'}
            </button>
          )}
        </div>
      </AdminLayout>
    );
  }

  // 목록
  return (
    <AdminLayout activeNav="curriculum">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">커리큘럼 관리</h2>
          <button onClick={() => setMode('create')}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors">
            <Plus className="w-4 h-4" />
            새 커리큘럼 만들기
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : curricula.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center text-slate-400">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">아직 커리큘럼이 없습니다</p>
            <p className="text-sm mt-1">주차별 학습 계획을 만들어 학생에게 배정하세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {curricula.map(cur => {
              const isExpanded = expandedId === cur.id;
              const items = (cur.curriculum_items || []).sort((a, b) => a.session_number - b.session_number);
              const linkedCount = items.filter(i => i.set_id).length;

              return (
                <div key={cur.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="flex items-center gap-4 p-5">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800">{cur.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {cur.subject_slug && <span className="bg-slate-100 px-2 py-0.5 rounded-full mr-2">{cur.subject_slug}</span>}
                        {items.length}차시 &middot; 콘텐츠 {linkedCount}/{items.length} 연결
                        <span className="ml-2">&middot; 시작 {cur.start_date}</span>
                      </div>
                    </div>
                    <button onClick={() => openAssignModal(cur)}
                      className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 px-3 py-2 rounded-xl hover:bg-red-50">
                      <Send className="w-3 h-3" /> 배정
                    </button>
                    <button onClick={() => setExpandedId(isExpanded ? null : cur.id)}
                      className="text-slate-400 hover:text-slate-600">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 py-3 space-y-1.5">
                      {items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setEditingItem({
                              id: item.id,
                              weekNumber: item.week_number,
                              sessionNumber: item.session_number,
                              label: item.label,
                              subjectSlug: cur.subject_slug || undefined,
                            });
                            setMode('edit-session');
                          }}
                          className="flex items-center gap-3 text-sm w-full text-left p-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors group/item"
                        >
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                            item.session_number % 2 === 1 ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {formatDate(item.publish_date)}
                          </span>
                          <span className="text-xs text-slate-400 w-10">{item.session_number}차시</span>
                          <span className="text-slate-600">{item.label || '-'}</span>
                          <Edit3 className="w-3.5 h-3.5 text-slate-300 ml-auto opacity-0 group-hover/item:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 배정 모달 */}
        {assignCurriculum && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAssignCurriculum(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-800">커리큘럼 배정</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{assignCurriculum.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {assignCurriculum.curriculum_items?.length || 0}차시 &middot; 예약된 날짜에 자동 공개
                  </p>
                </div>
                <button onClick={() => setAssignCurriculum(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setAssignMode('students')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${assignMode === 'students' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Users className="w-3 h-3 inline mr-1" />학생 선택
                  </button>
                  <button onClick={() => setAssignMode('course')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${assignMode === 'course' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <BookOpen className="w-3 h-3 inline mr-1" />강의 전체
                  </button>
                </div>

                {assignMode === 'students' ? (
                  <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                    {students.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">등록된 학생이 없습니다</div>
                    ) : (
                      <>
                        <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer bg-slate-50">
                          <input type="checkbox"
                            checked={selectedStudents.length === students.length}
                            onChange={() => setSelectedStudents(
                              selectedStudents.length === students.length ? [] : students.map(s => s.id)
                            )}
                            className="rounded border-slate-300" />
                          <span className="text-sm font-bold text-slate-600">전체 선택 ({students.length}명)</span>
                        </label>
                        {students.map(s => (
                          <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                            <input type="checkbox"
                              checked={selectedStudents.includes(s.id)}
                              onChange={() => setSelectedStudents(prev =>
                                prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                              )}
                              className="rounded border-slate-300" />
                            <span className="text-sm font-medium text-slate-700">{s.name}</span>
                            <span className="text-xs text-slate-400">{s.school}</span>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                ) : (
                  <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
                    <option value="">강의 선택...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                )}
              </div>

              <div className="p-5 border-t border-slate-100">
                <button onClick={handleAssign}
                  disabled={assigning || (assignMode === 'students' ? selectedStudents.length === 0 : !selectedCourse)}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {assigning ? '배정 중...' : '커리큘럼 배정하기'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// 어드민 레이아웃 (사이드바 포함)
function AdminLayout({ children, activeNav }: { children: React.ReactNode; activeNav: string }) {
  const navItems = [
    { key: 'users', href: '/admin?tab=users', icon: Users, label: '수강생 관리' },
    { key: 'payments', href: '/admin?tab=payments', icon: CreditCard, label: '결제 내역' },
    { key: 'stats', href: '/admin?tab=stats', icon: LayoutDashboard, label: '현황 요약' },
    { key: 'content', href: '/admin/content-library', icon: BookOpen, label: '보충자료' },
    { key: 'curriculum', href: '/admin/curriculum', icon: Calendar, label: '커리큘럼' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-extrabold text-xl tracking-tight text-white hover:text-red-400 transition-colors">
            jtmath <span className="text-red-500 text-base font-bold bg-white/10 px-2 py-0.5 rounded ml-1">ADMIN</span>
          </Link>
          <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors text-xs">대시보드 &rarr;</Link>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl flex gap-8">
        <div className="w-56 shrink-0 hidden md:block">
          <nav className="space-y-1 sticky top-24">
            {navItems.map(item => (
              <Link key={item.key} href={item.href}
                className={`flex items-center gap-3 px-4 py-3 font-bold rounded-xl transition-colors ${
                  activeNav === item.key
                    ? 'bg-white text-red-600 shadow-sm border border-slate-100'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}>
                <item.icon className="w-5 h-5" />{item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </main>
    </div>
  );
}

'use client';

import { useState, useRef } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, BookOpen, Plus, ExternalLink } from 'lucide-react';

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

  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setParseResult(null);
      setSavedId(null);
      // 파일명에서 기본 제목 추출
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
      // 목록 새로고침
      const listRes = await fetch('/api/admin/learning-sets');
      const listData = await listRes.json();
      setSets(listData);
    } catch (err) {
      alert('저장 오류: ' + String(err));
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'upload') {
    return (
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setMode('list'); setPdfFile(null); setParseResult(null); setSavedId(null); }}
            className="text-slate-500 hover:text-slate-700 text-sm">← 목록으로</button>
          <h2 className="text-xl font-bold text-slate-800">새 콘텐츠 만들기</h2>
        </div>

        {/* Step 1: PDF 선택 + 과목 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <h3 className="font-bold text-slate-700 mb-4">① PDF 업로드</h3>

          <div className="flex gap-3 mb-4">
            <select
              value={subjectSlug}
              onChange={e => setSubjectSlug(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium"
            >
              {SUBJECT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2 rounded-xl text-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              {pdfFile ? pdfFile.name : 'PDF 선택'}
            </button>
            <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
          </div>

          <button
            onClick={handleParse}
            disabled={!pdfFile || parsing}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            {parsing ? '분석 중...' : '영상 자동 매칭'}
          </button>
        </div>

        {/* Step 2: 매칭 결과 */}
        {parseResult && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
            <div className="flex items-center gap-4 mb-5">
              <h3 className="font-bold text-slate-700">② 매칭 결과</h3>
              <span className="text-sm bg-green-50 text-green-700 font-bold px-3 py-1 rounded-full">
                ✅ {parseResult.matched}/{parseResult.total} 매칭
              </span>
              {parseResult.unmatched > 0 && (
                <span className="text-sm bg-orange-50 text-orange-600 font-bold px-3 py-1 rounded-full">
                  ⚠️ {parseResult.unmatched}개 미매칭
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

        {/* Step 3: 저장 */}
        {parseResult && !savedId && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
            <h3 className="font-bold text-slate-700 mb-4">③ 저장</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="콘텐츠 제목 (예: 복소수 레벨3 8문제)"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              />
              <input
                type="text"
                placeholder="설명 (선택)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
              />
              <button
                onClick={handleSave}
                disabled={!title.trim() || saving}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
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
              <div className="text-sm text-green-700">콘텐츠 라이브러리에 추가됐습니다. 배정 탭에서 학생에게 배정하세요.</div>
            </div>
            <button onClick={() => setMode('list')} className="ml-auto text-sm font-bold text-green-700 hover:text-green-900">
              목록 보기 →
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
        <button
          onClick={() => setMode('upload')}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
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
                  {set.pdf_filename && <span className="ml-2">· {set.pdf_filename}</span>}
                  <span className="ml-2">· {new Date(set.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
              <button className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors px-3 py-2 rounded-xl hover:bg-red-50">
                배정하기 <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

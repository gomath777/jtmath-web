'use client';

import { getPdfDownloadHref } from '@/lib/pdf-download';
import { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Loader2, Globe, User, BookOpen, ExternalLink } from 'lucide-react';

type Audience = 'all' | 'student' | 'curriculum';

interface StudentOption {
  profileId: string;
  name: string;
}

interface CurriculumOption {
  id: string;
  title: string;
  subject_slug: string;
}

interface MaterialRow {
  id: string;
  title: string;
  description: string | null;
  original_filename: string;
  cdn_url: string;
  file_size_bytes: number | null;
  audience: Audience;
  profile_id: string | null;
  curriculum_id: string | null;
  uploaded_at: string;
  profiles?: { name: string } | null;
  curricula?: { title: string; subject_slug: string } | null;
}

interface Props {
  students: StudentOption[];
  curricula: CurriculumOption[];
}

const AUDIENCE_META: Record<Audience, { label: string; icon: typeof Globe; className: string }> = {
  all: { label: '전체 공개', icon: Globe, className: 'bg-blue-50 text-blue-700 border-blue-200' },
  student: { label: '개별 학생', icon: User, className: 'bg-purple-50 text-purple-700 border-purple-200' },
  curriculum: { label: '커리큘럼', icon: BookOpen, className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export default function MaterialsSection({ students, curricula }: Props) {
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [profileId, setProfileId] = useState('');
  const [curriculumId, setCurriculumId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/materials');
      const d = await res.json();
      setMaterials(d.materials || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setAudience('all');
    setProfileId('');
    setCurriculumId('');
    setUploadError('');
    // Reset file input element
    const input = document.getElementById('material-file-input') as HTMLInputElement | null;
    if (input) input.value = '';
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');

    if (!file) {
      setUploadError('PDF 파일을 선택하세요');
      return;
    }
    if (!title.trim()) {
      setUploadError('제목을 입력하세요');
      return;
    }
    if (audience === 'student' && !profileId) {
      setUploadError('학생을 선택하세요');
      return;
    }
    if (audience === 'curriculum' && !curriculumId) {
      setUploadError('커리큘럼을 선택하세요');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('title', title.trim());
    if (description.trim()) formData.append('description', description.trim());
    formData.append('audience', audience);
    if (audience === 'student') formData.append('profile_id', profileId);
    if (audience === 'curriculum') formData.append('curriculum_id', curriculumId);

    try {
      const res = await fetch('/api/admin/materials', {
        method: 'POST',
        body: formData,
      });
      const d = await res.json();
      if (!res.ok) {
        setUploadError(d.error || '업로드 실패');
      } else {
        resetForm();
        await fetchMaterials();
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 자료를 삭제할까요?\nBunny CDN에서도 함께 제거됩니다.`)) return;

    try {
      const res = await fetch(`/api/admin/materials/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMaterials(prev => prev.filter(m => m.id !== id));
      } else {
        const d = await res.json();
        alert(`삭제 실패: ${d.error || '알 수 없는 오류'}`);
      }
    } catch (err) {
      alert(`삭제 실패: ${err instanceof Error ? err.message : '네트워크 오류'}`);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-200 flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-500" />
        <h2 className="font-bold text-slate-900">기타 자료 (공유 PDF)</h2>
        <span className="text-xs text-slate-400 ml-auto">{materials.length}개</span>
      </div>

      {/* ─── Upload form ─── */}
      <form onSubmit={handleUpload} className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">PDF 파일</label>
            <input
              id="material-file-input"
              type="file"
              accept=".pdf,application/pdf"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-700 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:text-xs file:font-medium hover:file:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">제목</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="예: 중간고사 핵심 정리"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">설명 (선택)</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="학생에게 보이는 한 줄 설명"
            className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">공개 범위</label>
            <select
              value={audience}
              onChange={e => setAudience(e.target.value as Audience)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white"
            >
              <option value="all">전체 공개 (모든 학생)</option>
              <option value="student">개별 학생</option>
              <option value="curriculum">커리큘럼 수강생</option>
            </select>
          </div>

          {audience === 'student' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">학생 선택</label>
              <select
                value={profileId}
                onChange={e => setProfileId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white"
              >
                <option value="">— 선택하세요 —</option>
                {students.map(s => (
                  <option key={s.profileId} value={s.profileId}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {audience === 'curriculum' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">커리큘럼 선택</label>
              <select
                value={curriculumId}
                onChange={e => setCurriculumId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white"
              >
                <option value="">— 선택하세요 —</option>
                {curricula.map(c => (
                  <option key={c.id} value={c.id}>
                    [{c.subject_slug}] {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {uploadError && (
          <p className="text-xs text-red-600">{uploadError}</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={uploading || !file}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            업로드
          </button>
        </div>
      </form>

      {/* ─── Materials list ─── */}
      {loading ? (
        <div className="p-8 text-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
        </div>
      ) : materials.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">
          아직 업로드된 자료가 없습니다
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {materials.map(m => {
            const meta = AUDIENCE_META[m.audience];
            const Icon = meta.icon;
            return (
              <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-1 rounded-md border inline-flex items-center gap-1 shrink-0 ${meta.className}`}>
                  <Icon className="w-3 h-3" />
                  {meta.label}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate">{m.title}</p>
                    {m.audience === 'student' && m.profiles?.name && (
                      <span className="text-xs text-purple-600 shrink-0">→ {m.profiles.name}</span>
                    )}
                    {m.audience === 'curriculum' && m.curricula?.title && (
                      <span className="text-xs text-amber-700 shrink-0">→ {m.curricula.title}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {m.original_filename}
                    {m.file_size_bytes && ` · ${(m.file_size_bytes / 1024 / 1024).toFixed(1)}MB`}
                    {' · '}
                    {new Date(m.uploaded_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>

                <a
                  href={getPdfDownloadHref(m.cdn_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-slate-700"
                  title="열기"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleDelete(m.id, m.title)}
                  className="text-slate-400 hover:text-red-600"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

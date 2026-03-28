'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, Plus, Trash2, ChevronUp, ChevronDown, Loader2,
  Type, FileText, Film, BookOpen, MessageSquare, Upload, Wand2,
} from 'lucide-react';

interface SessionBlock {
  id: string;
  curriculum_item_id: string;
  block_type: 'section_header' | 'pdf' | 'video_group' | 'text' | 'hintbook';
  order_index: number;
  content: Record<string, unknown>;
}

interface CurriculumItemInfo {
  id: string;
  weekNumber: number;
  sessionNumber: number;
  label: string;
  subjectSlug?: string;
}

const BLOCK_TYPES = [
  { type: 'section_header', label: '섹션 헤더', icon: Type, color: 'text-green-500' },
  { type: 'pdf', label: 'PDF 문제지', icon: FileText, color: 'text-red-500' },
  { type: 'hintbook', label: '힌트북 PDF', icon: BookOpen, color: 'text-amber-500' },
  { type: 'video_group', label: '해설 영상', icon: Film, color: 'text-blue-500' },
  { type: 'text', label: '텍스트', icon: MessageSquare, color: 'text-purple-500' },
] as const;

const SECTION_COLORS = [
  { value: 'green', label: '초록', cls: 'bg-green-600' },
  { value: 'blue', label: '파랑', cls: 'bg-blue-600' },
  { value: 'red', label: '빨강', cls: 'bg-red-600' },
  { value: 'purple', label: '보라', cls: 'bg-purple-600' },
  { value: 'orange', label: '주황', cls: 'bg-orange-600' },
  { value: 'dark', label: '진한 회색', cls: 'bg-slate-700' },
];

// 1차시 템플릿 (해설영상 포함)
const TEMPLATE_SESSION_1 = [
  { block_type: 'section_header', content: { title: '심화유형 문제풀이 (앱 제출 후 카톡하기)', color: 'green' } },
  { block_type: 'text', content: { body: '힌트북으로 해결 안되는 경우 질문 카톡 보내주세요! 영상해설 보내드립니다' } },
  { block_type: 'section_header', content: { title: '교육청 기출 레벨4 문제 및 해설강의', color: 'green' } },
  { block_type: 'section_header', content: { title: '유형 올 스캔 (중간 전 범위) 앱 제출 후 카톡하기', color: 'dark' } },
  { block_type: 'section_header', content: { title: '(선택제출) 고난도 추가문제', color: 'red' } },
];

// 2차시 템플릿 (힌트북 포함, 영상 없음)
const TEMPLATE_SESSION_2 = [
  { block_type: 'text', content: { body: '힌트북으로 해결 안되는 경우 질문 카톡 보내주세요! 영상해설 보내드립니다' } },
  { block_type: 'section_header', content: { title: '심화유형 문제 및 힌트북 (앱 제출 후 카톡하기)', color: 'green' } },
  { block_type: 'section_header', content: { title: '교육청 기출 레벨4 문제 및 힌트북 (앱 제출 후 카톡하기)', color: 'green' } },
  { block_type: 'section_header', content: { title: '유형 올 스캔 (중간 전 범위) 앱 제출 후 카톡하기', color: 'dark' } },
  { block_type: 'section_header', content: { title: '(선택제출) 고난도 추가문제', color: 'red' } },
];

export default function SessionBlockEditor({
  item,
  onBack,
}: {
  item: CurriculumItemInfo;
  onBack: () => void;
}) {
  const [blocks, setBlocks] = useState<SessionBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);

  useEffect(() => {
    fetchBlocks();
  }, [item.id]);

  const fetchBlocks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/session-blocks?item_id=${item.id}`);
      const data = await res.json();
      setBlocks(Array.isArray(data) ? data : []);
    } catch {} finally { setLoading(false); }
  };

  // 블록 추가
  const addBlock = async (blockType: string, content: Record<string, unknown> = {}) => {
    try {
      const res = await fetch('/api/admin/session-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curriculum_item_id: item.id,
          block_type: blockType,
          content,
        }),
      });
      const data = await res.json();
      if (data.id) setBlocks(prev => [...prev, data]);
    } catch {}
    setShowAddMenu(false);
  };

  // 블록 수정
  const updateBlock = async (blockId: string, content: Record<string, unknown>) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/session-blocks/${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, content } : b));
    } catch {} finally { setSaving(false); }
  };

  // 블록 삭제
  const deleteBlock = async (blockId: string) => {
    if (!confirm('이 블록을 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/admin/session-blocks/${blockId}`, { method: 'DELETE' });
      setBlocks(prev => prev.filter(b => b.id !== blockId));
    } catch {}
  };

  // 블록 이동 (위/아래) - PDF와 연결된 영상 블록은 함께 이동
  const moveBlock = async (blockId: string, direction: 'up' | 'down') => {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx < 0) return;

    // 이 블록과 연결된 영상 블록 찾기 (PDF 바로 다음에 있는 linked video)
    const currentBlock = blocks[idx];
    const linkedVideoIdx = (currentBlock.block_type === 'pdf' || currentBlock.block_type === 'hintbook')
      ? blocks.findIndex((b, i) => i > idx && b.block_type === 'video_group' && (b.content.linked_pdf_block_id === blockId))
      : -1;

    // 연결된 영상이 있는 블록 그룹의 인덱스들
    const groupIndices = [idx];
    if (linkedVideoIdx >= 0) groupIndices.push(linkedVideoIdx);

    // 이동 가능 여부 체크
    const minIdx = Math.min(...groupIndices);
    const maxIdx = Math.max(...groupIndices);
    if (direction === 'up' && minIdx === 0) return;
    if (direction === 'down' && maxIdx === blocks.length - 1) return;

    const newBlocks = [...blocks];

    if (groupIndices.length === 1) {
      // 단일 블록 이동
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
    } else {
      // 그룹 이동 (PDF + 영상)
      if (direction === 'up') {
        const target = minIdx - 1;
        const removed = newBlocks.splice(minIdx, groupIndices.length);
        newBlocks.splice(target, 0, ...removed);
      } else {
        const target = maxIdx + 1;
        const removed = newBlocks.splice(minIdx, groupIndices.length);
        newBlocks.splice(target - groupIndices.length + 1, 0, ...removed);
      }
    }

    const reordered = newBlocks.map((b, i) => ({ ...b, order_index: i }));
    setBlocks(reordered);

    await fetch('/api/admin/session-blocks/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: reordered.map(b => ({ id: b.id, order_index: b.order_index })),
      }),
    });
  };

  // PDF 업로드 (블록 위치 유지)
  const handlePdfUpload = async (file: File, blockId: string, blockType: 'pdf' | 'hintbook', autoMatch: boolean) => {
    setUploadingBlockId(blockId);
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('curriculum_item_id', item.id);
      formData.append('block_type', blockType);
      formData.append('auto_match', autoMatch ? 'true' : 'false');
      // 기존 블록에 업로드: 그 블록 ID를 전달해서 같은 위치에 업데이트
      formData.append('block_id', blockId);
      if (item.subjectSlug) formData.append('subject_slug', item.subjectSlug);

      const res = await fetch('/api/admin/session-blocks/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.blocks) {
        // 서버에서 위치가 유지된 상태로 반환됨 → 전체 새로고침
        fetchBlocks();
      }
    } catch (err) {
      alert('업로드 실패: ' + String(err));
    } finally {
      setUploadingBlockId(null);
    }
  };

  // 템플릿 적용
  const applyTemplate = async (template: typeof TEMPLATE_SESSION_1) => {
    if (blocks.length > 0 && !confirm('기존 블록이 있습니다. 템플릿을 추가하시겠습니까?')) return;
    for (const t of template) {
      await addBlock(t.block_type, t.content);
    }
    fetchBlocks();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> 목록으로
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-800">
            {item.weekNumber}주차 {item.sessionNumber}차시 편집
          </h2>
          {item.label && <p className="text-sm text-slate-500 mt-0.5">{item.label}</p>}
        </div>
        {saving && <span className="text-xs text-slate-400">저장 중...</span>}
      </div>

      {/* 템플릿 버튼 (블록이 없을 때) */}
      {blocks.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Wand2 className="w-4 h-4" /> 템플릿으로 시작하기
          </h3>
          <div className="flex gap-3">
            <button
              onClick={() => applyTemplate(TEMPLATE_SESSION_1)}
              className="flex-1 p-4 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-left"
            >
              <p className="font-bold text-slate-700 text-sm">1차시 템플릿</p>
              <p className="text-xs text-slate-400 mt-1">해설영상 포함 (홀수 차시)</p>
            </button>
            <button
              onClick={() => applyTemplate(TEMPLATE_SESSION_2)}
              className="flex-1 p-4 rounded-xl border-2 border-dashed border-purple-200 hover:border-purple-400 hover:bg-purple-50/50 transition-colors text-left"
            >
              <p className="font-bold text-slate-700 text-sm">2차시 템플릿</p>
              <p className="text-xs text-slate-400 mt-1">힌트북 포함 (짝수 차시)</p>
            </button>
          </div>
        </div>
      )}

      {/* 블록 목록 */}
      <div className="space-y-2">
        {blocks.map((block, idx) => (
          <BlockEditor
            key={block.id}
            block={block}
            isFirst={idx === 0}
            isLast={idx === blocks.length - 1}
            uploading={uploadingBlockId === block.id}
            onUpdate={(content) => updateBlock(block.id, content)}
            onDelete={() => deleteBlock(block.id)}
            onMoveUp={() => moveBlock(block.id, 'up')}
            onMoveDown={() => moveBlock(block.id, 'down')}
            onPdfUpload={(file, autoMatch) => handlePdfUpload(file, block.id, block.block_type as 'pdf' | 'hintbook', autoMatch)}
          />
        ))}
      </div>

      {/* 블록 추가 버튼 */}
      <div className="mt-4 relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="flex items-center gap-2 w-full p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-400 text-slate-400 hover:text-slate-600 transition-colors text-sm font-bold"
        >
          <Plus className="w-4 h-4" />
          블록 추가
        </button>

        {showAddMenu && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 z-10 p-2">
            {BLOCK_TYPES.map(bt => (
              <button
                key={bt.type}
                onClick={() => addBlock(bt.type, bt.type === 'section_header' ? { title: '', color: 'green' } : bt.type === 'text' ? { body: '' } : {})}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <bt.icon className={`w-4 h-4 ${bt.color}`} />
                <span className="text-sm font-medium text-slate-700">{bt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 개별 블록 편집기
function BlockEditor({
  block,
  isFirst,
  isLast,
  uploading,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onPdfUpload,
}: {
  block: SessionBlock;
  isFirst: boolean;
  isLast: boolean;
  uploading: boolean;
  onUpdate: (content: Record<string, unknown>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onPdfUpload: (file: File, autoMatch: boolean) => void;
}) {
  const blockInfo = BLOCK_TYPES.find(bt => bt.type === block.block_type);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [autoMatch, setAutoMatch] = useState(true);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden group">
      {/* 블록 헤더 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/80 border-b border-slate-100">
        {blockInfo && <blockInfo.icon className={`w-3.5 h-3.5 ${blockInfo.color}`} />}
        <span className="text-xs font-bold text-slate-500">{blockInfo?.label}</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={onMoveUp} disabled={isFirst}
            className="p-1 rounded hover:bg-slate-200 disabled:opacity-20 transition-colors">
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button onClick={onMoveDown} disabled={isLast}
            className="p-1 rounded hover:bg-slate-200 disabled:opacity-20 transition-colors">
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button onClick={onDelete}
            className="p-1 rounded hover:bg-red-100 transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>

      {/* 블록 콘텐츠 편집 */}
      <div className="p-3">
        {block.block_type === 'section_header' && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="섹션 제목"
              value={(block.content.title as string) || ''}
              onChange={e => onUpdate({ ...block.content, title: e.target.value })}
              onBlur={e => onUpdate({ ...block.content, title: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
            />
            <div className="flex gap-1.5">
              {SECTION_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => onUpdate({ ...block.content, color: c.value })}
                  className={`w-6 h-6 rounded-full ${c.cls} transition-all ${
                    block.content.color === c.value ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        )}

        {(block.block_type === 'pdf' || block.block_type === 'hintbook') && (
          <div>
            {block.content.url ? (
              <div className="flex items-center gap-3">
                <FileText className={`w-5 h-5 shrink-0 ${block.block_type === 'hintbook' ? 'text-amber-500' : 'text-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700 truncate">{block.content.original_name as string}</p>
                  {Array.isArray(block.content.parsed_problems) && (
                    <p className="text-xs text-slate-400">
                      {(block.content.parsed_problems as unknown[]).length}문제 파싱됨
                    </p>
                  )}
                </div>
                <a href={block.content.url as string} target="_blank" className="text-xs text-blue-500 hover:text-blue-700 font-bold">
                  보기
                </a>
                <button onClick={() => fileInputRef.current?.click()} className="text-xs text-slate-400 hover:text-slate-600">
                  교체
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) onPdfUpload(file, autoMatch);
                  }}
                />
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">업로드 중...</span>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 w-full py-6 border-2 border-dashed border-slate-200 rounded-lg hover:border-slate-400 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-sm font-bold">PDF 파일 업로드</span>
                    </button>
                    {block.block_type === 'pdf' && (
                      <label className="flex items-center gap-2 mt-2 text-xs text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoMatch}
                          onChange={e => setAutoMatch(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        해설영상 자동매칭 (Claude AI)
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) onPdfUpload(file, autoMatch);
              }}
            />
          </div>
        )}

        {block.block_type === 'video_group' && (
          <VideoGroupEditor
            content={block.content}
            onUpdate={onUpdate}
          />
        )}

        {block.block_type === 'text' && (
          <textarea
            placeholder="텍스트를 입력하세요..."
            value={(block.content.body as string) || ''}
            onChange={e => onUpdate({ ...block.content, body: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[60px] resize-y"
          />
        )}
      </div>
    </div>
  );
}

// 영상 그룹 편집기
function VideoGroupEditor({
  content,
  onUpdate,
}: {
  content: Record<string, unknown>;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  const videos = (content.videos as Array<{
    bunny_video_id: string;
    title: string;
    problem_number: number;
    raw_text?: string;
  }>) || [];

  const addVideo = () => {
    onUpdate({
      ...content,
      videos: [...videos, { bunny_video_id: '', title: '', problem_number: videos.length + 1 }],
    });
  };

  const updateVideo = (idx: number, field: string, value: string | number) => {
    const newVideos = [...videos];
    (newVideos[idx] as Record<string, unknown>)[field] = value;
    onUpdate({ ...content, videos: newVideos });
  };

  const removeVideo = (idx: number) => {
    onUpdate({ ...content, videos: videos.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-2">
      {videos.length > 0 && (
        <div className="space-y-1.5">
          {videos.map((v, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
              <span className="text-xs text-slate-400 w-6 text-center shrink-0">{idx + 1}</span>
              <input
                type="text"
                placeholder="영상 제목"
                value={v.title}
                onChange={e => updateVideo(idx, 'title', e.target.value)}
                className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs"
              />
              <input
                type="text"
                placeholder="Bunny ID"
                value={v.bunny_video_id}
                onChange={e => updateVideo(idx, 'bunny_video_id', e.target.value)}
                className="w-40 border border-slate-200 rounded px-2 py-1 text-xs font-mono"
              />
              <button onClick={() => removeVideo(idx)} className="text-red-400 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button onClick={addVideo}
        className="text-xs text-blue-500 hover:text-blue-700 font-bold flex items-center gap-1">
        <Plus className="w-3 h-3" /> 영상 추가
      </button>
      {videos.length > 0 && (
        <p className="text-[10px] text-slate-400">
          * PDF 업로드 시 자동매칭된 영상은 자동으로 채워집니다
        </p>
      )}
    </div>
  );
}

'use client';

import { Download, FileText } from 'lucide-react';

// Detect PDF level/type from filename for visual differentiation
function detectPdfStyle(name: string): { iconBg: string; iconColor: string; badge?: string; badgeColor?: string; subtitle: string } {
  const lower = name.toLowerCase();

  if (lower.includes('레벨5') || lower.includes('레벨#5') || lower.includes('level5')) {
    return { iconBg: 'bg-red-500/10', iconColor: 'text-red-400', badge: '고난도', badgeColor: 'bg-red-500/20 text-red-400', subtitle: 'PDF 고난도 문제' };
  }
  if (lower.includes('레벨4') || lower.includes('레벨#4') || lower.includes('level4')) {
    return { iconBg: 'bg-orange-500/10', iconColor: 'text-orange-400', subtitle: 'PDF 문제지' };
  }
  if (lower.includes('레벨3') || lower.includes('레벨#3') || lower.includes('level3')) {
    return { iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400', subtitle: 'PDF 문제지' };
  }
  if (lower.includes('올 스캔') || lower.includes('올스캔')) {
    return { iconBg: 'bg-purple-500/10', iconColor: 'text-purple-400', subtitle: '유형 올 스캔' };
  }
  if (lower.includes('3배수') || lower.includes('심화')) {
    return { iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-400', subtitle: '심화유형 문제' };
  }
  return { iconBg: 'bg-red-500/10', iconColor: 'text-red-400', subtitle: 'PDF 문제지' };
}

export default function PdfBlock({ content }: { content: Record<string, unknown> }) {
  const url = (content.url || content.cdn_url) as string;
  const originalName = (content.original_name as string) || 'document.pdf';
  const fileSize = content.file_size as string | undefined;
  const style = detectPdfStyle(originalName);

  return (
    <div className="brand-card p-4">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div className={`w-10 h-10 ${style.iconBg} rounded-lg flex items-center justify-center shrink-0`}>
          <FileText className={`w-5 h-5 ${style.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-white truncate">{originalName}</p>
            {style.badge && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${style.badgeColor}`}>
                {style.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-white/30">
            {style.subtitle}
            {fileSize && ` · ${fileSize}`}
          </p>
        </div>
        <Download className="w-4 h-4 text-white/30 shrink-0" />
      </a>
    </div>
  );
}

export function HintbookBlock({ content }: { content: Record<string, unknown> }) {
  const url = (content.url || content.cdn_url) as string;
  const originalName = (content.original_name as string) || 'hintbook.pdf';

  return (
    <div className="brand-card p-4 border-l-4 border-l-amber-500/50">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-lg">💡</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-amber-400 mb-0.5">힌트북!</p>
          <p className="text-sm font-bold text-white truncate">{originalName}</p>
          <p className="text-xs text-white/30">각 문항 힌트만 보고 재도전 해보세요</p>
        </div>
        <Download className="w-4 h-4 text-white/30 shrink-0" />
      </a>
    </div>
  );
}

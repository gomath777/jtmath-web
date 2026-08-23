import React from 'react';
import { FileText, Lightbulb } from 'lucide-react';

import { PdfResourceActions } from './PdfResourceActions';

function getPdfMeta(name: string): { subtitle: string; badge?: string } {
  const lower = name.toLowerCase();
  if (lower.includes('레벨5') || lower.includes('level5')) return { subtitle: 'PDF · 고난도', badge: '고난도' };
  if (lower.includes('레벨4') || lower.includes('level4')) return { subtitle: 'PDF · 심화' };
  if (lower.includes('레벨3') || lower.includes('level3')) return { subtitle: 'PDF · 실전' };
  if (lower.includes('올 스캔') || lower.includes('올스캔')) return { subtitle: 'PDF · 전범위' };
  if (lower.includes('3배수') || lower.includes('심화')) return { subtitle: 'PDF · 심화유형' };
  return { subtitle: 'PDF' };
}

export default function PdfBlock({ content }: { content: Record<string, unknown> }) {
  const url = readUrl(content);
  const originalName = readString(content['original_name'], 'document.pdf');
  const fileSize = readOptionalString(content['file_size']);
  const { subtitle, badge } = getPdfMeta(originalName);

  return (
    <div
      className="group flex items-center gap-4 bg-ivory border border-border-cream rounded-xl px-5 py-4 hover:bg-white hover:shadow-ring-warm transition-all"
    >
      <div className="w-10 h-10 rounded-lg bg-sand flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-charcoal" />
      </div>
      <div className="min-w-0 flex-1 basis-48">
        <div className="flex items-center gap-2">
          <p className="break-words text-[14px] font-medium tracking-tight text-ink">
            {originalName}
          </p>
          {badge && (
            <span className="text-[10px] tracking-wider uppercase font-medium text-terracotta bg-terracotta/10 px-1.5 py-0.5 rounded-full shrink-0">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[12px] text-stone mt-0.5">
          {subtitle}
          {fileSize && ` · ${fileSize}`}
        </p>
      </div>
      <PdfResourceActions name={originalName} sourceUrl={url} />
    </div>
  );
}

export function HintbookBlock({ content }: { content: Record<string, unknown> }) {
  const url = readUrl(content);
  const originalName = readString(content['original_name'], 'hintbook.pdf');

  return (
    <div
      className="group flex items-center gap-4 bg-ivory border-l-[3px] border-l-terracotta border-y border-r border-border-cream rounded-xl px-5 py-4 hover:bg-white transition-all"
    >
      <div className="w-10 h-10 rounded-lg bg-terracotta/10 flex items-center justify-center shrink-0">
        <Lightbulb className="w-5 h-5 text-terracotta" />
      </div>
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-[11px] tracking-wider uppercase font-medium text-terracotta">
          힌트북
        </p>
        <p className="break-words text-[14px] font-medium tracking-tight text-ink">
          {originalName}
        </p>
        <p className="text-[12px] text-stone mt-0.5">
          각 문항 힌트만 보고 재도전
        </p>
      </div>
      <PdfResourceActions name={originalName} sourceUrl={url} />
    </div>
  );
}

function readUrl(content: Readonly<Record<string, unknown>>): string {
  const url = readOptionalString(content['url']);
  return url ?? readOptionalString(content['cdn_url']) ?? '';
}

function readString(value: unknown, fallback: string): string {
  return readOptionalString(value) ?? fallback;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

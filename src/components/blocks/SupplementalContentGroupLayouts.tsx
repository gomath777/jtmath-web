import { FileText, Lightbulb } from 'lucide-react';
import React from 'react';

import { PdfResourceActions } from './PdfResourceActions';
import type { ContentGroupContent, SideContent } from './ContentGroupBlock.types';
import { getPdfDisplayName, getPdfSourceUrl } from './ContentGroupBlock.utils';

type SidePanelProps = Readonly<{
  readonly side: SideContent;
}>;

function SidePanel({ side }: SidePanelProps) {
  const pdfName = getPdfDisplayName(side.pdf, 'document.pdf');
  const hintbookName = side.hintbook ? getPdfDisplayName(side.hintbook, 'hintbook.pdf') : 'hintbook.pdf';

  return (
    <div className="p-4 space-y-2">
      <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-stone mb-2.5">{side.label}</p>
      <div className="flex flex-col gap-2 rounded-xl border border-border-cream bg-sand px-3 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <FileText className="w-4 h-4 text-charcoal shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-ink truncate">{pdfName}</p>
            {side.pdf.file_size && <p className="text-[10px] text-stone mt-0.5">{side.pdf.file_size}</p>}
          </div>
        </div>
        <PdfResourceActions name={pdfName} sourceUrl={getPdfSourceUrl(side.pdf)} />
      </div>
      {side.hintbook && (
        <div className="flex flex-col gap-2 rounded-xl border border-terracotta/20 bg-terracotta/[0.06] px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Lightbulb className="w-3.5 h-3.5 text-terracotta shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] tracking-wider uppercase font-medium text-terracotta">힌트북</p>
              <p className="text-[11px] font-medium text-olive truncate">{hintbookName}</p>
              <p className="text-[11px] text-olive">힌트만 보고 재도전</p>
            </div>
          </div>
          <PdfResourceActions name={hintbookName} sourceUrl={getPdfSourceUrl(side.hintbook)} />
        </div>
      )}
    </div>
  );
}

type ShimhwaPairLayoutProps = Readonly<{
  readonly content: ContentGroupContent;
  readonly sideA: SideContent;
  readonly sideB: SideContent;
}>;

export function ShimhwaPairContentGroupLayout({ content, sideA, sideB }: ShimhwaPairLayoutProps) {
  const stepString = content.step != null
    ? (typeof content.step === 'number' ? String(content.step).padStart(2, '0') : content.step)
    : null;

  return (
    <div className="bg-ivory border border-border-cream rounded-2xl overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-border-cream">
        <div className="flex items-baseline gap-3">
          {stepString && (
            <span className="font-serif font-medium text-terracotta text-[26px] leading-none tracking-tight shrink-0">{stepString}</span>
          )}
          <div className="flex-1 flex items-baseline gap-2.5 flex-wrap">
            <h3 className="font-serif font-medium text-[19px] text-ink tracking-tight leading-tight">{content.label}</h3>
            {content.is_optional && (
              <span className="text-[10px] tracking-wider uppercase font-medium text-stone bg-sand border border-border-cream px-2 py-0.5 rounded-full">선택</span>
            )}
          </div>
        </div>
        {content.is_optional && <p className="text-[12px] text-stone mt-1.5 leading-snug">어려워서 안 해도 됩니다. 도전하고 싶은 학생만!</p>}
        {content.description && <p className="text-[13px] text-olive mt-2 leading-relaxed">{content.description}</p>}
      </div>

      <div className="grid grid-cols-2 divide-x divide-border-cream">
        <SidePanel side={sideA} />
        <SidePanel side={sideB} />
      </div>
    </div>
  );
}

type BonusLayoutProps = Readonly<{
  readonly data: ContentGroupContent;
}>;

export function BonusContentGroupLayout({ data }: BonusLayoutProps) {
  const pdf = data.pdf!;

  const pdfName = getPdfDisplayName(pdf, 'document.pdf');
  const hintbook = data.hintbook;
  const hintbookName = hintbook ? getPdfDisplayName(hintbook, 'hintbook.pdf') : 'hintbook.pdf';

  return (
    <div className="bg-ivory border border-border-cream rounded-2xl overflow-hidden">
      <div className="px-6 pt-4 pb-3 border-b border-border-cream flex items-center gap-2.5">
        <span className="text-[10px] tracking-[0.1em] uppercase font-semibold text-stone bg-sand border border-border-cream px-2 py-0.5 rounded-full">보충 학습지</span>
        <h3 className="font-serif font-medium text-[17px] text-ink tracking-tight">{data.label}</h3>
      </div>
      <div className="px-4 py-4 space-y-2">
        <div className="flex flex-col gap-3 rounded-xl border border-border-cream bg-sand px-4 py-3.5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <FileText className="w-5 h-5 text-charcoal shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-ink truncate tracking-tight">{pdfName}</p>
              {pdf.file_size && <p className="text-[11px] text-stone mt-0.5">{pdf.file_size}</p>}
            </div>
          </div>
          <PdfResourceActions name={pdfName} sourceUrl={getPdfSourceUrl(pdf)} />
        </div>
        {hintbook && (
          <div className="flex flex-col gap-3 rounded-xl border border-terracotta/20 bg-terracotta/[0.06] px-4 py-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Lightbulb className="w-4 h-4 text-terracotta shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] tracking-wider uppercase font-medium text-terracotta">힌트북</p>
                <p className="text-[12px] font-medium text-olive truncate">{hintbookName}</p>
                <p className="text-[12px] text-olive">각 문항 힌트만 보고 재도전</p>
              </div>
            </div>
            <PdfResourceActions name={hintbookName} sourceUrl={getPdfSourceUrl(hintbook)} />
          </div>
        )}
      </div>
    </div>
  );
}

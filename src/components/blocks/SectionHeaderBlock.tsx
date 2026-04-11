'use client';

import { SECTION_COLORS } from './types';

const STEP_ICONS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

function formatSectionTitle(title: string): string {
  return title
    .replace(/^(공수\d+ 기출) /, '[$1] ')
    .replace(/ 해설강의$/, '');
}

export default function SectionHeaderBlock({ content }: { content: Record<string, unknown> }) {
  const title = (content.title as string) || '';
  const color = (content.color as string) || 'green';
  const description = content.description as string | undefined;
  const stepNumber = content.step_number as number | undefined;
  const bgClass = SECTION_COLORS[color] || SECTION_COLORS.green;

  return (
    <div className="mt-6 first:mt-0">
      <div className={`${bgClass} rounded-xl px-5 py-3 flex items-center gap-2`}>
        {stepNumber && (
          <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0">
            {STEP_ICONS[stepNumber - 1] || stepNumber}
          </span>
        )}
        <h2 className="text-sm font-black text-white tracking-wide">{formatSectionTitle(title)}</h2>
      </div>
      {description && (
        <div className="px-5 py-2 bg-white/[0.03] rounded-b-xl -mt-1 border-x border-b border-white/[0.06]">
          <p className="text-xs text-white/40 leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  );
}

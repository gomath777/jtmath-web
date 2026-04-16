'use client';

const STEP_GLYPHS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

function formatSectionTitle(title: string): string {
  return title
    .replace(/^(공수\d+ 기출) /, '[$1] ')
    .replace(/ 해설강의$/, '');
}

export default function SectionHeaderBlock({ content }: { content: Record<string, unknown> }) {
  const title = (content.title as string) || '';
  const description = content.description as string | undefined;
  const stepNumber = content.step_number as number | undefined;

  return (
    <div className="mt-10 first:mt-0 mb-2">
      <div className="flex items-center gap-3 pb-3 border-b border-border-warm">
        {stepNumber && (
          <span className="text-terracotta text-xl font-serif leading-none shrink-0">
            {STEP_GLYPHS[stepNumber - 1] || stepNumber}
          </span>
        )}
        <h2 className="font-serif font-medium text-[22px] text-ink tracking-tight">
          {formatSectionTitle(title)}
        </h2>
      </div>
      {description && (
        <p className="text-[13px] text-olive leading-relaxed mt-3">
          {description}
        </p>
      )}
    </div>
  );
}

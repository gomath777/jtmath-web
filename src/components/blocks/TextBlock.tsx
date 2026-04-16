'use client';

export default function TextBlock({ content }: { content: Record<string, unknown> }) {
  const body = (content.body as string) || '';

  return (
    <div className="bg-ivory border border-border-cream rounded-xl px-6 py-5">
      <p className="text-[15px] text-charcoal leading-[1.75] whitespace-pre-wrap">
        {body}
      </p>
    </div>
  );
}

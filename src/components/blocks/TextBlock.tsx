'use client';

export default function TextBlock({ content }: { content: Record<string, unknown> }) {
  const body = (content.body as string) || '';

  return (
    <div className="brand-card p-4">
      <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
  );
}

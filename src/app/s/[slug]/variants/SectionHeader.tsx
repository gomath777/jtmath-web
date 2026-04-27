'use client';

interface Props {
  title: string;
  countLabel?: string;
  /** `true`면 점(•) 색을 옅게 — 보조 섹션용 */
  subtle?: boolean;
}

export default function SectionHeader({ title, countLabel, subtle = false }: Props) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 translate-y-[-4px] ${
          subtle ? 'bg-terracotta/60' : 'bg-terracotta'
        }`}
      />
      <h2 className={`font-serif font-medium tracking-tight ${subtle ? 'text-[16px] text-ink' : 'text-[20px] text-ink'}`}>
        {title}
      </h2>
      {countLabel && (
        <span className="text-[11px] tracking-[0.1em] uppercase text-stone ml-auto">
          {countLabel}
        </span>
      )}
    </div>
  );
}

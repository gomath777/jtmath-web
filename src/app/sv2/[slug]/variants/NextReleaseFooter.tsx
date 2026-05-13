'use client';

import { CheckCircle2 } from 'lucide-react';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

function formatNextRelease(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const wd = WEEKDAY[d.getDay()];
  const dday = days === 0 ? '오늘' : days === 1 ? '내일' : `D-${days}`;
  return `${wd}요일 밤 (${dday})`;
}

export default function NextReleaseFooter({ nextReleaseAt }: { nextReleaseAt?: string }) {
  const label = formatNextRelease(nextReleaseAt);
  return (
    <div className="bg-ivory border border-border-cream rounded-2xl px-6 py-10 text-center">
      <CheckCircle2 className="w-9 h-9 mx-auto mb-2.5 text-terracotta/70" />
      <p className="font-serif font-medium text-[16px] text-ink tracking-tight break-keep">
        아직 배포된 과제가 없어요
      </p>
      <p className="text-[12px] text-olive mt-1.5 break-keep">
        {label ? `다음 배포: ${label}` : '새 과제는 일·수요일 밤에 공개돼요'}
      </p>
    </div>
  );
}

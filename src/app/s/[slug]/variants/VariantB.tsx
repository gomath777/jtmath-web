'use client';

import { useState } from 'react';
import VariantA from './VariantA';
import WeeklyStrip from './WeeklyStrip';
import type { TodayTask, VariantProps } from './types';

export type WindowKey = 'mon-tue' | 'thu-fri';
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 오늘 요일에 따른 기본 윈도우 선택.
 * 일(0)·월(1)·화(2)·수(3) → 1차시 윈도우 (월·화 공부)
 * 목(4)·금(5)·토(6) → 2차시 윈도우 (목·금 공부)
 */
function defaultWindow(): WindowKey {
  const kstDow = new Date(Date.now() + KST_OFFSET_MS).getUTCDay();
  return kstDow <= 3 ? 'mon-tue' : 'thu-fri';
}

/**
 * task의 publishDate가 어느 윈도우에 속하는지 판정.
 * - 일·월·화 → mon-tue (1차시)
 * - 수·목·금 → thu-fri (2차시)
 * - publishDate 없는 task는 기본 mon-tue.
 */
function taskWindow(t: TodayTask): WindowKey {
  if (!t.publishDate) return 'mon-tue';
  const dow = new Date(t.publishDate + 'T00:00:00Z').getUTCDay();
  return dow >= 3 && dow <= 5 ? 'thu-fri' : 'mon-tue';
}

/**
 * Variant B — 주간 타임라인 + 윈도우 기반 Hero 선택.
 *
 * 동작:
 * - WeeklyStrip 셀 클릭 → 해당 윈도우(월·화 또는 목·금) 선택
 * - Hero 카드 영역은 선택된 윈도우에 해당하는 세션을 크게 표시
 * - 일·월·화 클릭 → 1차시 / 수·목·금 클릭 → 2차시 / 토는 쉼 (선택 변경 없음)
 */
export default function VariantB(props: VariantProps) {
  const [selectedWindow, setSelectedWindow] = useState<WindowKey>(() => defaultWindow());

  // 선택된 윈도우에 해당하는 task 필터링.
  // session/concept 모두 publishDate 기반 윈도우 분류 (concept는 dashboard route에서
  // 같은 주 내 chapter_order 순으로 월요일/목요일 분배됨).
  const filteredTasks = props.tasks.filter(t => taskWindow(t) === selectedWindow);

  return (
    <>
      <WeeklyStrip
        curricula={props.curricula}
        selectedWindow={selectedWindow}
        onSelectWindow={setSelectedWindow}
      />
      <VariantA
        {...props}
        tasks={filteredTasks}
        sectionTitle={selectedWindow === 'mon-tue' ? '1차시' : '2차시'}
        sectionSubtitle={selectedWindow === 'mon-tue' ? '월·화 공부하는 날' : '목·금 공부하는 날'}
      />
    </>
  );
}

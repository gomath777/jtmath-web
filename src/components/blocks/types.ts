export interface SessionBlock {
  id: string;
  block_type: 'section_header' | 'pdf' | 'video_group' | 'text' | 'hintbook';
  order_index: number;
  content: Record<string, unknown>;
}

export interface VideoProgress {
  watch_percent: number;
  completed: boolean;
}

export type ProgressMap = Record<string, VideoProgress>;

export const SUBJECT_LABELS: Record<string, string> = {
  gs1: '공통수학1',
  gs2: '공통수학2',
  ds2: '대수',
  ms1: '미적분1',
  s2: '수학2',
  ht: '확률과통계',
  gi: '기하',
};

export const SECTION_COLORS: Record<string, string> = {
  green: 'bg-emerald-700',
  blue: 'bg-brand-blue',
  red: 'bg-red-600',
  purple: 'bg-purple-600',
  orange: 'bg-brand-orange',
  dark: 'bg-slate-700',
};

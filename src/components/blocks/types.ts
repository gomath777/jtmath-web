export interface SessionBlock {
  id: string;
  block_type: 'section_header' | 'pdf' | 'video_group' | 'text' | 'hintbook' | 'content_group';
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
  ds: '대수',
  ds2: '대수',
  mj1: '미적분1',
  ms1: '미적분1',     // legacy alias
  mj2: '미적분2',
  s2: '수학2',
  ht: '확률과통계',
  gi: '기하',
};

// Section header colors — remapped to warm palette tones.
// All alternatives collapse to ink-soft + terracotta accents for consistency.
export const SECTION_COLORS: Record<string, string> = {
  green: 'bg-ink',
  blue: 'bg-ink',
  red: 'bg-crimson',
  purple: 'bg-ink-soft',
  orange: 'bg-terracotta',
  dark: 'bg-ink-soft',
};

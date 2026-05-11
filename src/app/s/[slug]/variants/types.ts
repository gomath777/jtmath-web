/**
 * 학생 대시보드 Variant 공통 타입.
 *
 * 주의: 학습 완료(status) / 영상 시청률(videoProgress) 필드는 제거됨.
 * 이유: 영상 시청 ≠ 학습 완료. 학생은 모르는 문제만 해설강의 시청하는 흐름이라
 *       자동 판정이 학습 상태를 잘못 반영함.
 * 학습 완료 추적은 매쓰플랫 앱(외부)에서 개별 관리.
 * 향후 개념강의(여름방학) 도입 시 재도입 가능.
 */

export interface TodayTask {
  kind: 'session' | 'concept';
  id: string;
  title: string;
  subject_slug: string;
  subject_label: string;
  meta: string;
  /**
   * 세션 링크: lessonSlug 있으면 `/lesson/{lessonSlug}`, 없으면 legacy `${basePath}/${slug}/session/${id}` redirect.
   */
  lessonSlug?: string | null;
  concept_set_id?: string;
  isOverdue?: boolean;
  isToday?: boolean;
  publishDate?: string | null;
}

export interface SessionSummary {
  id: string;
  week_number: number;
  session_number: number;
  label: string;
  publishDate?: string | null;
  lessonSlug?: string | null;
}

export interface CurriculumSummary {
  id: string;
  title: string;
  subject_slug: string;
  sessions: SessionSummary[];
}

export interface VariantProps {
  tasks: TodayTask[];
  nextReleaseAt?: string;
  curricula: CurriculumSummary[];
  slug: string;
  /** URL prefix: '/s' (online) or '/c' (offline classroom). 세션 링크 조립에 사용. */
  basePath: string;
  onOpenConcept: (setId: string, subjectSlug: string) => void;
}

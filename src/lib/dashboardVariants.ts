/**
 * 학생 대시보드 레이아웃 식별자.
 *
 * 2026-04-21: A/B/C 테스트 결과 **Variant B (주간 타임라인 + Hero + Mini)**로 확정.
 * 현재는 모든 학생이 B로 일괄 렌더 — `getVariantForSlug()`는 항상 'B' 반환.
 *
 * 이 파일을 남겨두는 이유:
 *   - `/api/public/student/track`이 이벤트에 variant 태그를 달 때 참조
 *   - 향후 새 레이아웃 실험 시 SLUG_VARIANT에 매핑만 추가하면 재사용 가능
 */

export type DashboardVariant = 'A' | 'B' | 'C';

/** A/B 테스트 재개 시 `{ 'jt-xxxx': 'A' }` 형태로 채우면 해당 학생만 분기. */
export const SLUG_VARIANT: Record<string, DashboardVariant> = {};

export const DEFAULT_VARIANT: DashboardVariant = 'B';

export function getVariantForSlug(slug: string): DashboardVariant {
  return SLUG_VARIANT[slug] ?? DEFAULT_VARIANT;
}

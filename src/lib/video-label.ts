/**
 * 학습페이지 영상 라벨 포맷 — 학원 운영 규칙
 *
 * 두 가지 케이스를 자동 분기:
 *
 * 1. 기출/심화 해설강의 (problem_number 있음):
 *    `{학습지 문제 번호}번 {출처}`
 *    예: "1번 25년 3월 고2 18번 해설강의(공통수학1)"
 *
 * 2. 개념강의 (problem_number 없음/0):
 *    `{title}` 그대로
 *    예: "연립이차방정식"
 *
 * 이유: 학생이 학습지 N번 풀다 막혔을 때 해설강의 목록에서 즉시 찾을 수 있어야 함.
 * 출처(년도/월/학년)만 보이면 학습지 문제와 매칭이 안 됨.
 * 단, 개념강의는 학습지 문제 번호 개념이 없으므로 prefix 생략.
 *
 * 새 컴포넌트에서 영상 라벨 만들 때는 무조건 이 함수 사용. 직접 문자열 조립 금지.
 */

export interface VideoForLabel {
  /** 학습지 문제 번호. 개념강의는 없음 (undefined/null/0). */
  problem_number?: number | null;
  title?: string | null;
}

/**
 * 영상 라벨 생성.
 *
 * @example
 *   // 기출/심화 해설강의 — prefix 붙음
 *   formatVideoLabel({ problem_number: 1, title: '25년 3월 고2 18번 해설강의(공통수학1)' })
 *   // → "1번 25년 3월 고2 18번 해설강의(공통수학1)"
 *
 *   // 개념강의 — title만
 *   formatVideoLabel({ title: '연립이차방정식' })
 *   // → "연립이차방정식"
 *
 *   // fallback
 *   formatVideoLabel({ problem_number: 3, title: null })
 *   // → "3번 해설강의"
 *
 *   formatVideoLabel({})
 *   // → "강의"
 */
export function formatVideoLabel(video: VideoForLabel): string {
  const sourceText = video.title?.trim();
  const hasProblemNum =
    typeof video.problem_number === 'number' && video.problem_number > 0;

  if (hasProblemNum && sourceText) return `${video.problem_number}번 ${sourceText}`;
  if (hasProblemNum) return `${video.problem_number}번 해설강의`;
  if (sourceText) return sourceText;
  return '강의';
}

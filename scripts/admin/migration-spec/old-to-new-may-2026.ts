/**
 * 학생 SLA 마이그레이션 spec — 2026-05-04 ~ 2026-05-14 사이클
 *
 * 캘린더 이미지 (사용자 제공) 를 기준으로 학생별 신 시스템 학습 페이지 배정.
 * 기존 구 시스템 (/s/{slug}, student_sessions, block_assignments) 은 건드리지 않음.
 *
 * 실행:
 *   npm run admin:migrate-sla -- --dry-run                 # 전체 dry-run
 *   npm run admin:migrate-sla -- --student 송승원 --dry-run  # 1명 dry-run
 *   npm run admin:migrate-sla -- --student 송승원           # 1명 실제 실행
 *   npm run admin:migrate-sla                              # 전체 실행
 *
 * 멱등성: 같은 (profile_id, curriculum_item_id, scheduled_date) 가 이미 SLA 에 있으면 스킵.
 *
 * skip_reason 종류:
 *   - gs2_shimhwa_not_built : 공수2 심화유형 신 시스템 미빌드 (추후 별도 phase)
 *   - manual_review_needed  : 매핑 결정 보류 (사용자 확정 필요)
 *   - non_standard_label    : 비표준 라벨 (예: "삼각함수 활용", "방정식 v2")
 */

export interface MigrationRow {
  student: string;                   // profile.name
  scheduled_date: string;            // YYYY-MM-DD
  new_slug: string | null;           // curriculum_item.public_slug (null=skip)
  source: string;                    // 캘린더 원문 라벨
  skip_reason?: 'gs2_shimhwa_not_built' | 'manual_review_needed' | 'non_standard_label';
  /** 과거 날짜는 released, 미래는 assigned. 자동 계산하므로 spec 에선 지정 안 함. */
}

export const MIGRATION_SPEC: MigrationRow[] = [
  // ─────────────────────────────────────────────────────────────────────
  // 이한승 (양천고) — 세션 1개
  // ─────────────────────────────────────────────────────────────────────
  { student: '이한승', scheduled_date: '2026-05-11', new_slug: 'ds2-gichul-04-7d4dea',
    source: '대수 - 삼각함수 활용' /* ds2 기출 단원 4 */ },

  // ─────────────────────────────────────────────────────────────────────
  // 김지후 (선린인터넷고) — ds2 8~14차시
  // ─────────────────────────────────────────────────────────────────────
  { student: '김지후', scheduled_date: '2026-05-04', new_slug: 'ds2-concept-08-44797d', source: '대수 8차시 사인법칙과 코사인법칙' },
  { student: '김지후', scheduled_date: '2026-05-04', new_slug: 'ds2-concept-09-e9a7dc', source: '대수 9차시 수열의 뜻, 등차수열' },
  { student: '김지후', scheduled_date: '2026-05-07', new_slug: 'ds2-concept-10-76aef2', source: '대수 10차시 등비수열' },
  { student: '김지후', scheduled_date: '2026-05-07', new_slug: 'ds2-concept-11-f8cf32', source: '대수 11차시 수열의 합 (시그마)' },
  { student: '김지후', scheduled_date: '2026-05-11', new_slug: 'ds2-concept-12-01be83', source: '대수 12차시 여러 가지 수열의 합' },
  { student: '김지후', scheduled_date: '2026-05-11', new_slug: 'ds2-concept-13-b3c88f', source: '대수 13차시 수열의 귀납적 정의' },
  { student: '김지후', scheduled_date: '2026-05-14', new_slug: 'ds2-concept-14-63f825', source: '대수 14차시 수학적 귀납법' },

  // ─────────────────────────────────────────────────────────────────────
  // 김채민 (휘경여자고) — ds2 8~14차시 (김지후와 동일)
  // ─────────────────────────────────────────────────────────────────────
  { student: '김채민', scheduled_date: '2026-05-04', new_slug: 'ds2-concept-08-44797d', source: '대수 8차시 사인법칙과 코사인법칙' },
  { student: '김채민', scheduled_date: '2026-05-04', new_slug: 'ds2-concept-09-e9a7dc', source: '대수 9차시 수열의 뜻, 등차수열' },
  { student: '김채민', scheduled_date: '2026-05-07', new_slug: 'ds2-concept-10-76aef2', source: '대수 10차시 등비수열' },
  { student: '김채민', scheduled_date: '2026-05-07', new_slug: 'ds2-concept-11-f8cf32', source: '대수 11차시 수열의 합 (시그마)' },
  { student: '김채민', scheduled_date: '2026-05-11', new_slug: 'ds2-concept-12-01be83', source: '대수 12차시 여러 가지 수열의 합' },
  { student: '김채민', scheduled_date: '2026-05-11', new_slug: 'ds2-concept-13-b3c88f', source: '대수 13차시 수열의 귀납적 정의' },
  { student: '김채민', scheduled_date: '2026-05-14', new_slug: 'ds2-concept-14-63f825', source: '대수 14차시 수학적 귀납법' },

  // ─────────────────────────────────────────────────────────────────────
  // 조온유 (인천영종고) — ds2 8~14차시 (김지후와 동일)
  // ─────────────────────────────────────────────────────────────────────
  { student: '조온유', scheduled_date: '2026-05-04', new_slug: 'ds2-concept-08-44797d', source: '대수 8차시 사인법칙과 코사인법칙' },
  { student: '조온유', scheduled_date: '2026-05-04', new_slug: 'ds2-concept-09-e9a7dc', source: '대수 9차시 수열의 뜻, 등차수열' },
  { student: '조온유', scheduled_date: '2026-05-07', new_slug: 'ds2-concept-10-76aef2', source: '대수 10차시 등비수열' },
  { student: '조온유', scheduled_date: '2026-05-07', new_slug: 'ds2-concept-11-f8cf32', source: '대수 11차시 수열의 합 (시그마)' },
  { student: '조온유', scheduled_date: '2026-05-11', new_slug: 'ds2-concept-12-01be83', source: '대수 12차시 여러 가지 수열의 합' },
  { student: '조온유', scheduled_date: '2026-05-11', new_slug: 'ds2-concept-13-b3c88f', source: '대수 13차시 수열의 귀납적 정의' },
  { student: '조온유', scheduled_date: '2026-05-14', new_slug: 'ds2-concept-14-63f825', source: '대수 14차시 수학적 귀납법' },

  // ─────────────────────────────────────────────────────────────────────
  // 송은율 (강원외고) — gs1 기출·심화 + gs2 기출·심화 (gs2 는 미빌드 → 보류)
  // ─────────────────────────────────────────────────────────────────────
  { student: '송은율', scheduled_date: '2026-05-04', new_slug: 'gs1-gichul-03-c4e324',
    source: '공통수학1 - 1주 2차시 이차방정식·이차함수' /* gs1 gichul s3 */ },
  { student: '송은율', scheduled_date: '2026-05-04', new_slug: 'gs2-gichul-04-6c7d73',
    source: '공통수학2 - 1주 1차시 명제' /* gs2 기출 s4 명제 */ },
  { student: '송은율', scheduled_date: '2026-05-07', new_slug: 'gs2-shimhwa-04-e5b2be',
    source: '공통수학2 - 명제 심화유형' /* gs2 심화 s4 */ },
  { student: '송은율', scheduled_date: '2026-05-07', new_slug: 'gs1-shimhwa-03-0175ab',
    source: '공통수학1 - 이차방정식·이차함수 심화유형' /* gs1 shimhwa s3 */ },
  { student: '송은율', scheduled_date: '2026-05-11', new_slug: 'gs2-gichul-05-7bc542',
    source: '공통수학2 - 함수' /* gs2 기출 s5 함수 */ },
  { student: '송은율', scheduled_date: '2026-05-11', new_slug: 'gs1-gichul-04-862b3e',
    source: '공통수학1 - 여러가지 방정식과 부등식' /* gs1 gichul s4 v=1 */ },

  // ─────────────────────────────────────────────────────────────────────
  // 이소율 (서인천고) — gs1 8~11차시
  // ─────────────────────────────────────────────────────────────────────
  { student: '이소율', scheduled_date: '2026-05-04', new_slug: 'gs1-concept-08-3d28cd', source: '공통수학1 8차시 2.3 삼차·사차방정식의 풀이' },
  { student: '이소율', scheduled_date: '2026-05-04', new_slug: 'gs1-concept-09-dfbec7', source: '공통수학1 9차시 2.3 연립이차방정식 및 일차부등식' },
  { student: '이소율', scheduled_date: '2026-05-07', new_slug: 'gs1-concept-10-3d7d8f', source: '공통수학1 10차시 절댓값 포함 부등식' },
  { student: '이소율', scheduled_date: '2026-05-07', new_slug: 'gs1-concept-11-9c0185', source: '공통수학1 11차시 이차부등식과 연립이차부등식' },

  // ─────────────────────────────────────────────────────────────────────
  // 임유주 (장기고) — gs1 비표준 라벨 다수
  // ─────────────────────────────────────────────────────────────────────
  { student: '임유주', scheduled_date: '2026-05-04', new_slug: 'gs1-gichul-04-862b3e',
    source: '공통수학1 - 1주 1차시 여러가지 방정식과 부등식' /* gs1 gichul s4 v=1 */ },
  { student: '임유주', scheduled_date: '2026-05-07', new_slug: 'gs1-shimhwa-04-bc1f49',
    source: '공통수학1 - 여러가지 방정식과 부등식 · 심화유형' /* gs1 shimhwa s4 */ },
  { student: '임유주', scheduled_date: '2026-05-11', new_slug: 'gs1-gichul-06-75b4e8',
    source: '공통수학1 - 경우의 수' /* gs1 gichul s6 */ },

  // ─────────────────────────────────────────────────────────────────────
  // 조승연 (전북외고) — gs1 10~14차시 (이미지상 5개 보임)
  // ─────────────────────────────────────────────────────────────────────
  { student: '조승연', scheduled_date: '2026-05-04', new_slug: 'gs1-concept-10-3d7d8f', source: '공통수학1 10차시 절댓값 포함 부등식' },
  { student: '조승연', scheduled_date: '2026-05-04', new_slug: 'gs1-concept-11-9c0185', source: '공통수학1 11차시 이차부등식과 연립이차부등식' },
  { student: '조승연', scheduled_date: '2026-05-07', new_slug: 'gs1-concept-12-214616', source: '공통수학1 12차시 3.1 경우의 수' },
  { student: '조승연', scheduled_date: '2026-05-11', new_slug: 'gs1-concept-13-45f5a0', source: '공통수학1 13차시 3.2 조합 개념과 예제' },
  { student: '조승연', scheduled_date: '2026-05-14', new_slug: 'gs1-concept-14-2509f5', source: '공통수학1 14차시 4.1 행렬의 정의 및 연산' },

  // ─────────────────────────────────────────────────────────────────────
  // 김태은 (수원외고) — gs1 6~11, 14차시
  // ─────────────────────────────────────────────────────────────────────
  { student: '김태은', scheduled_date: '2026-05-04', new_slug: 'gs1-concept-06-f91eed', source: '공통수학1 6차시 2.2 이차방정식과 이차함수의 관계' },
  { student: '김태은', scheduled_date: '2026-05-04', new_slug: 'gs1-concept-07-49db82', source: '공통수학1 7차시 2.2 이차함수의 최대최소' },
  { student: '김태은', scheduled_date: '2026-05-07', new_slug: 'gs1-concept-08-3d28cd', source: '공통수학1 8차시 2.3 삼차·사차방정식의 풀이' },
  { student: '김태은', scheduled_date: '2026-05-07', new_slug: 'gs1-concept-09-dfbec7', source: '공통수학1 9차시 2.3 연립이차방정식 및 일차부등식' },
  { student: '김태은', scheduled_date: '2026-05-11', new_slug: 'gs1-concept-10-3d7d8f', source: '공통수학1 10차시 절댓값 포함 부등식' },
  { student: '김태은', scheduled_date: '2026-05-11', new_slug: 'gs1-concept-11-9c0185', source: '공통수학1 11차시 이차부등식과 연립이차부등식' },
  { student: '김태은', scheduled_date: '2026-05-14', new_slug: 'gs1-concept-14-2509f5', source: '공통수학1 14차시 4.1 행렬의 정의 및 연산' },

  // ─────────────────────────────────────────────────────────────────────
  // 손영한 (하나고) — gs1 비표준 (v2, 후반범위)
  // ─────────────────────────────────────────────────────────────────────
  { student: '손영한', scheduled_date: '2026-05-04', new_slug: 'gs1-gichul-05-9b060d',
    source: '공통수학1 - 1주 1차시 여러가지 방정식 v2' /* gs1 gichul s5 v=2 */ },
  { student: '손영한', scheduled_date: '2026-05-07', new_slug: 'gs1-shimhwa-04-bc1f49',
    source: '공통수학1 - 여러가지 방정식과 부등식 · 심화유형 (후반범위)' /* gs1 shimhwa s4 */ },
  { student: '손영한', scheduled_date: '2026-05-11', new_slug: 'gs1-gichul-06-75b4e8',
    source: '공통수학1 - 경우의 수' /* gs1 gichul s6 */ },

  // ─────────────────────────────────────────────────────────────────────
  // 손예지 (하나고) — gs1 기출·심화 (손영한과 동일 패턴)
  // ─────────────────────────────────────────────────────────────────────
  { student: '손예지', scheduled_date: '2026-05-04', new_slug: 'gs1-gichul-05-9b060d',
    source: '공통수학1 - 1주 1차시 여러가지 방정식 v2' },
  { student: '손예지', scheduled_date: '2026-05-07', new_slug: 'gs1-shimhwa-04-bc1f49',
    source: '공통수학1 - 여러가지 방정식과 부등식 · 심화유형 (후반범위)' },
  { student: '손예지', scheduled_date: '2026-05-11', new_slug: 'gs1-gichul-06-75b4e8',
    source: '공통수학1 - 경우의 수' },

  // ─────────────────────────────────────────────────────────────────────
  // 송승원 (예비고1) — gs1 8~14차시
  // ─────────────────────────────────────────────────────────────────────
  { student: '송승원', scheduled_date: '2026-05-04', new_slug: 'gs1-concept-08-3d28cd', source: '공통수학1 8차시 2.3 삼차·사차방정식의 풀이' },
  { student: '송승원', scheduled_date: '2026-05-04', new_slug: 'gs1-concept-09-dfbec7', source: '공통수학1 9차시 2.3 연립이차방정식 및 일차부등식' },
  { student: '송승원', scheduled_date: '2026-05-07', new_slug: 'gs1-concept-10-3d7d8f', source: '공통수학1 10차시 절댓값 포함 부등식' },
  { student: '송승원', scheduled_date: '2026-05-07', new_slug: 'gs1-concept-11-9c0185', source: '공통수학1 11차시 이차부등식과 연립이차부등식' },
  { student: '송승원', scheduled_date: '2026-05-11', new_slug: 'gs1-concept-12-214616', source: '공통수학1 12차시 3.1 경우의 수' },
  { student: '송승원', scheduled_date: '2026-05-11', new_slug: 'gs1-concept-13-45f5a0', source: '공통수학1 13차시 3.2 조합 개념과 예제' },
  { student: '송승원', scheduled_date: '2026-05-14', new_slug: 'gs1-concept-14-2509f5', source: '공통수학1 14차시 4.1 행렬의 정의 및 연산' },
];

/**
 * KST 날짜·요일 변환 유틸. 학생 dashboard route(`api/public/student/dashboard/route.ts:175-231`)의
 * 분배 룰과 정확히 일치해야 학생 화면이 깨지지 않음.
 *
 * 모든 published_at은 KST 월요일 자정 = UTC 일요일 15:00.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 오늘(KST) 자정 기준 'YYYY-MM-DD' */
export function todayKst(): string {
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 주어진 YMD가 KST 기준 무슨 요일인지 (0=일, 1=월, ..., 6=토) */
export function dowKst(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** 주어진 KST date(YMD)의 그 주 월요일. 그 자체가 월요일이면 그대로. */
export function startOfWeekKstMonday(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const dow = new Date(utc).getUTCDay(); // 0=일 ... 6=토
  const offsetDays = dow === 0 ? -6 : 1 - dow;
  return new Date(utc + offsetDays * 86400000).toISOString().slice(0, 10);
}

/** 다가오는 월요일. 오늘이 월요일이면 7일 후 (=다음 주 월요일). */
export function nextMondayKst(fromYmd: string = todayKst()): string {
  const [y, m, d] = fromYmd.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const dow = new Date(utc).getUTCDay();
  const offset = dow === 1 ? 7 : (8 - dow) % 7;
  return new Date(utc + offset * 86400000).toISOString().slice(0, 10);
}

/**
 * KST 'YYYY-MM-DD' → assignments.published_at에 들어갈 ISO 8601 string.
 * KST 자정 = UTC 전날 15:00.
 * 예: '2026-05-04' → '2026-05-03T15:00:00.000Z'
 */
export function ymdToKstMidnightISO(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, -9, 0, 0)).toISOString();
}

/** ISO published_at → KST YMD. 학생 dashboard route의 ymdKst와 일치. */
export function isoToKstYmd(iso: string): string {
  return new Date(new Date(iso).getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 시작 월요일에서 N주 만큼의 월요일 YMD 생성. */
export function mondaysFrom(startMondayYmd: string, count: number): string[] {
  assertMonday(startMondayYmd);
  const [y, m, d] = startMondayYmd.split('-').map(Number);
  const utc0 = Date.UTC(y, m - 1, d);
  return Array.from({ length: count }, (_, i) =>
    new Date(utc0 + i * 7 * 86400000).toISOString().slice(0, 10),
  );
}

export function assertMonday(ymd: string): void {
  const dow = dowKst(ymd);
  if (dow !== 1) throw new Error(`published_at YMD가 월요일이 아님: ${ymd} (dow=${dow})`);
}

/** 'YYYY-MM-DD'를 한국어 표기 'M/D (요일)'로 */
export function formatYmdKo(ymd: string): string {
  const [, m, d] = ymd.split('-').map(Number);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${m}/${d} (${days[dowKst(ymd)]})`;
}

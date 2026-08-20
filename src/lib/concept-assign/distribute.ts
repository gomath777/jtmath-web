/**
 * N개 차시를 M주에 균등 분배.
 *
 * 룰 (학생 dashboard route 분배 룰과 정합):
 *   - 한 주(같은 published_at)에 최대 2차시. 첫 번째는 월요일, 두 번째는 자동으로 +3일(목).
 *   - 균등 분배: 첫 (N-M) 주는 2차시, 나머지는 1차시.
 *   - N <= M 이면 각 주 1차시.
 *   - N > 2*M 이면 처음 2M개만 분배 + warning (잉여).
 */

export interface ChapterInput {
  setId: string;
  chapterOrder: number;
  // for warning messages
  label?: string;
}

export interface DistributedRow {
  setId: string;
  mondayYmd: string;
  chapterOrder: number;
  weekIdx: number; // 0-based 주차
}

export interface DistributeResult {
  rows: DistributedRow[];
  warnings: string[];
}

export function distribute(
  chapters: ChapterInput[],
  mondays: string[],
): DistributeResult {
  const warnings: string[] = [];
  const N = chapters.length;
  const M = mondays.length;
  if (N === 0 || M === 0) return { rows: [], warnings };

  // chapter_order 정렬
  const sorted = [...chapters].sort((a, b) => a.chapterOrder - b.chapterOrder);

  let usable = sorted;
  if (N > 2 * M) {
    usable = sorted.slice(0, 2 * M);
    warnings.push(
      `${N}차시를 ${M}주에 분배 시도했지만 한 주 최대 2차시 룰로 ${2 * M}차시까지만 배정 (잉여 ${N - 2 * M}차시 미배정)`,
    );
  }

  const rows: DistributedRow[] = [];

  if (usable.length <= M) {
    // 각 주 1차시
    usable.forEach((c, i) => {
      rows.push({
        setId: c.setId,
        mondayYmd: mondays[i],
        chapterOrder: c.chapterOrder,
        weekIdx: i,
      });
    });
    if (usable.length < M) {
      warnings.push(`${M}주를 요청했지만 ${usable.length}차시뿐이라 ${usable.length}주만 사용`);
    }
    return { rows, warnings };
  }

  // 첫 (N-M)주 2차시, 나머지 1차시
  const heavyWeeks = usable.length - M;
  let chapterIdx = 0;
  for (let w = 0; w < M; w++) {
    const count = w < heavyWeeks ? 2 : 1;
    for (let i = 0; i < count && chapterIdx < usable.length; i++) {
      rows.push({
        setId: usable[chapterIdx].setId,
        mondayYmd: mondays[w],
        chapterOrder: usable[chapterIdx].chapterOrder,
        weekIdx: w,
      });
      chapterIdx++;
    }
  }
  return { rows, warnings };
}

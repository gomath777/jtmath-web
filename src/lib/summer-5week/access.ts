import { releaseStateFor, type ReleaseState, type SummerDay } from './schedule';
import type { RosterAccessThrough } from './roster';
import type { SummerSubject } from './subjects';

export type SubjectDayAccess =
  | ReleaseState
  | { readonly kind: 'cutoff'; readonly accessThrough: string };

export type SubjectDayAccessContext = {
  readonly accessThrough: RosterAccessThrough;
  readonly master: boolean;
  readonly now: Date;
};

export function accessStateForDay(
  subject: SummerSubject,
  day: SummerDay,
  context: SubjectDayAccessContext,
): SubjectDayAccess {
  const cutoff = context.master ? undefined : context.accessThrough[subject];
  if (cutoff && day.date > cutoff) return { kind: 'cutoff', accessThrough: cutoff };
  return releaseStateFor(day.date, context.now, context.master, subject);
}

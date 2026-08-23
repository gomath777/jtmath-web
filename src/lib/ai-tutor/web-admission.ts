import 'server-only';

import { createHmac } from 'node:crypto';

const WINDOW_MS = 60_000;
const MAX_ACCEPTED_PER_WINDOW = 3;
const DEFAULT_MAX_ENTRIES = 2_000;

export type WebAdmissionClock = {
  readonly nowMs: () => number;
};

export type WebAdmissionAccepted = {
  readonly accepted: true;
  readonly release: () => void;
};

export type WebAdmissionRejected = {
  readonly accepted: false;
  readonly retryAfterSeconds: number;
  readonly reason: 'concurrent' | 'rate_limited' | 'capacity';
};

export type WebAdmissionResult = WebAdmissionAccepted | WebAdmissionRejected;

export type PreviewWebAdmission = {
  readonly tryAcquire: (hashedProfileKey: string) => WebAdmissionResult;
  readonly debugSize: () => number;
};

export type CreatePreviewWebAdmissionInput = {
  readonly secret: string;
  readonly clock?: WebAdmissionClock;
  readonly maxEntries?: number;
};

type AdmissionEntry = {
  inFlight: boolean;
  acceptedAtMs: number[];
};

export async function hashWebAdmissionProfileKey(input: {
  readonly profileId: string;
  readonly secret: string;
}): Promise<string> {
  return createHmac('sha256', input.secret).update(input.profileId).digest('hex');
}

/**
 * Preview-only admission limiter. This is intentionally in-process and non-distributed;
 * it protects local/preview Tutor material calls but is not a production quota backend.
 */
export function createPreviewWebAdmission(input: CreatePreviewWebAdmissionInput): PreviewWebAdmission {
  const entries = new Map<string, AdmissionEntry>();
  const clock = input.clock ?? { nowMs: () => Date.now() };
  const maxEntries = input.maxEntries ?? DEFAULT_MAX_ENTRIES;

  return {
    tryAcquire: (hashedProfileKey) => {
      const nowMs = clock.nowMs();
      pruneExpiredEntries(entries, nowMs);

      let entry = entries.get(hashedProfileKey);
      if (entry === undefined) {
        if (entries.size >= maxEntries) return { accepted: false, retryAfterSeconds: 60, reason: 'capacity' };
        entry = { inFlight: false, acceptedAtMs: [] };
        entries.set(hashedProfileKey, entry);
      }

      entry.acceptedAtMs = recentAccepted(entry.acceptedAtMs, nowMs);
      if (entry.inFlight) return { accepted: false, retryAfterSeconds: 1, reason: 'concurrent' };
      if (entry.acceptedAtMs.length >= MAX_ACCEPTED_PER_WINDOW) {
        return {
          accepted: false,
          retryAfterSeconds: retryAfterSeconds(entry.acceptedAtMs[0], nowMs),
          reason: 'rate_limited',
        };
      }

      entry.inFlight = true;
      entry.acceptedAtMs.push(nowMs);
      let released = false;
      return {
        accepted: true,
        release: () => {
          if (released) return;
          released = true;
          entry.inFlight = false;
        },
      };
    },
    debugSize: () => entries.size,
  };
}

function pruneExpiredEntries(entries: Map<string, AdmissionEntry>, nowMs: number): void {
  for (const [key, entry] of Array.from(entries.entries())) {
    entry.acceptedAtMs = recentAccepted(entry.acceptedAtMs, nowMs);
    if (!entry.inFlight && entry.acceptedAtMs.length === 0) entries.delete(key);
  }
}

function recentAccepted(acceptedAtMs: readonly number[], nowMs: number): number[] {
  return acceptedAtMs.filter((acceptedMs) => nowMs - acceptedMs < WINDOW_MS);
}

function retryAfterSeconds(firstAcceptedAtMs: number | undefined, nowMs: number): number {
  if (firstAcceptedAtMs === undefined) return 1;
  return Math.max(1, Math.ceil((WINDOW_MS - (nowMs - firstAcceptedAtMs)) / 1_000));
}

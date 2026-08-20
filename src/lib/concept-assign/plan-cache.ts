/**
 * dry-run 결과를 5분 TTL로 메모리에 보관.
 * execute 단계에서 plan_id로 다시 꺼내 실행 → 미리보기와 mismatch 방지.
 *
 * 1인 운영자 환경 가정: 같은 instance에 hit. Vercel multi-instance라 가끔 miss 가능 —
 * 그 경우 410 응답 + UI에서 재해석 안내.
 */

import crypto from 'node:crypto';
import type { PlannerOutput } from './claude-tools';

export interface CachedPlan {
  plan: PlannerOutput;
  inserts: Array<{ set_id: string; user_id: string; published_at: string; label?: string | null }>;
  deletes: string[]; // assignments.id (replace 시 기존 row 삭제)
  command: string;
  expiresAt: number;
  userEmail: string;
}

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CachedPlan>();

function gc() {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (v.expiresAt < now) cache.delete(k);
  }
}

export function storePlan(entry: Omit<CachedPlan, 'expiresAt'>): { id: string; expiresAt: number } {
  if (Math.random() < 0.2) gc();
  const id = crypto.randomUUID();
  const expiresAt = Date.now() + TTL_MS;
  cache.set(id, { ...entry, expiresAt });
  return { id, expiresAt };
}

export function retrievePlan(id: string, userEmail: string): CachedPlan | null {
  const e = cache.get(id);
  if (!e) return null;
  if (e.expiresAt < Date.now()) {
    cache.delete(id);
    return null;
  }
  if (e.userEmail !== userEmail) return null;
  return e;
}

export function deletePlan(id: string): void {
  cache.delete(id);
}

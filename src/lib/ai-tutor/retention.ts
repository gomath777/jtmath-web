import { createHash } from 'node:crypto';
import { AI_TUTOR_PRIVATE_BUCKET } from './private-storage';

export { AI_TUTOR_PRIVATE_BUCKET };

export type AiTutorRetentionDays = {
  readonly rawContent: number;
  readonly image: number;
  readonly metadata: number;
};

export type RetentionCutoffs = {
  readonly rawContentCutoff: string;
  readonly imageCutoff: string;
  readonly metadataCutoff: string;
};

export type ImageRetentionCandidate = {
  readonly attachmentId: string;
  readonly privateStoragePath: string | null;
};

export type RetentionCandidateSet = {
  readonly imageAttachments: readonly ImageRetentionCandidate[];
  readonly rawContentTurnIds: readonly string[];
  readonly metadataTurnIds: readonly string[];
};

export type PrivatePathParseResult =
  | { readonly ok: true; readonly objectPath: string }
  | { readonly ok: false; readonly reason: 'invalid_bucket' | 'missing_object_path' };

type RetentionWriteResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly operation: string };

export interface RetentionCleanupStore {
  deletePrivateObject(input: {
    readonly attachmentId: string;
    readonly objectPath: string;
  }): Promise<RetentionWriteResult>;
  markAttachmentImageDeleted(input: {
    readonly attachmentId: string;
    readonly deletedAt: string;
  }): Promise<RetentionWriteResult>;
  markRawContentDeleted(input: {
    readonly turnId: string;
    readonly deletedAt: string;
  }): Promise<RetentionWriteResult>;
  deleteTurnMetadata(input: {
    readonly turnId: string;
  }): Promise<RetentionWriteResult>;
}

export type RetentionApplyInput = {
  readonly candidates: RetentionCandidateSet;
  readonly confirmScope: string;
  readonly deletedAt: string;
  readonly store: RetentionCleanupStore;
};

export type RetentionApplyResult =
  | { readonly ok: true; readonly appliedCount: number }
  | { readonly ok: false; readonly reason: 'scope_mismatch' | 'invalid_private_path' | 'write_failed'; readonly operation?: string };

const dayMs = 24 * 60 * 60 * 1000;

export function hashStudentReference(profileId: string): string {
  return `student:sha256:${sha256Hex(profileId).slice(0, 16)}`;
}

export function buildRetentionCutoffs(now: Date, days: AiTutorRetentionDays): RetentionCutoffs {
  return {
    rawContentCutoff: daysBefore(now, days.rawContent),
    imageCutoff: daysBefore(now, days.image),
    metadataCutoff: daysBefore(now, days.metadata),
  };
}

export function retentionScopeHash(candidates: RetentionCandidateSet): string {
  return sha256Hex(retentionScopeIds(candidates).join('\n'));
}

export function formatRetentionScopeConfirmation(candidates: RetentionCandidateSet): string {
  return `${retentionScopeIds(candidates).length}:${retentionScopeHash(candidates)}`;
}

export function parsePrivateStoragePath(privateStoragePath: string): PrivatePathParseResult {
  const prefix = `${AI_TUTOR_PRIVATE_BUCKET}/`;
  if (!privateStoragePath.startsWith(prefix)) return { ok: false, reason: 'invalid_bucket' };
  const objectPath = privateStoragePath.slice(prefix.length);
  return objectPath.length === 0
    ? { ok: false, reason: 'missing_object_path' }
    : { ok: true, objectPath };
}

export async function applyRetentionCleanup(input: RetentionApplyInput): Promise<RetentionApplyResult> {
  if (input.confirmScope !== formatRetentionScopeConfirmation(input.candidates)) {
    return { ok: false, reason: 'scope_mismatch' };
  }

  for (const attachment of input.candidates.imageAttachments) {
    if (attachment.privateStoragePath !== null) {
      const parsed = parsePrivateStoragePath(attachment.privateStoragePath);
      if (!parsed.ok) return { ok: false, reason: 'invalid_private_path' };
      const deleted = await input.store.deletePrivateObject({
        attachmentId: attachment.attachmentId,
        objectPath: parsed.objectPath,
      });
      if (!deleted.ok) return { ok: false, reason: 'write_failed', operation: deleted.operation };
    }
    const marked = await input.store.markAttachmentImageDeleted({
      attachmentId: attachment.attachmentId,
      deletedAt: input.deletedAt,
    });
    if (!marked.ok) return { ok: false, reason: 'write_failed', operation: marked.operation };
  }

  for (const turnId of input.candidates.rawContentTurnIds) {
    const marked = await input.store.markRawContentDeleted({
      turnId,
      deletedAt: input.deletedAt,
    });
    if (!marked.ok) return { ok: false, reason: 'write_failed', operation: marked.operation };
  }

  for (const turnId of input.candidates.metadataTurnIds) {
    const deleted = await input.store.deleteTurnMetadata({ turnId });
    if (!deleted.ok) return { ok: false, reason: 'write_failed', operation: deleted.operation };
  }

  return { ok: true, appliedCount: retentionScopeIds(input.candidates).length };
}

function retentionScopeIds(candidates: RetentionCandidateSet): readonly string[] {
  return [
    ...candidates.imageAttachments.map((attachment) => attachment.attachmentId),
    ...candidates.rawContentTurnIds,
    ...candidates.metadataTurnIds,
  ].sort();
}

function daysBefore(now: Date, days: number): string {
  return new Date(now.getTime() - days * dayMs).toISOString();
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

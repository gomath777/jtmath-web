import type {
  WebLessonClientMaterial,
  WebLessonSessionBlock,
} from './web-lesson-context-core';

export type WebLessonContextFailureReason =
  | 'revoked_token'
  | 'expired_token'
  | 'not_found'
  | 'unassigned'
  | 'unreleased'
  | 'wrong_lesson'
  | 'missing_pdf'
  | 'duplicate_pdf'
  | 'source_error';

export type VerifiedWebLessonIdentity = {
  readonly profileId: string;
  readonly slug: string;
  readonly isMaster?: boolean;
};

export type WebLessonCurriculumItem = {
  readonly id: string;
  readonly publicSlug: string;
  readonly title: string | null;
  readonly label: string | null;
  readonly curricula: {
    readonly subjectSlug: string | null;
    readonly title: string | null;
  } | null;
};

export type WebLessonStudentToken = {
  readonly id: string;
  readonly profileId: string;
  readonly slug: string;
  readonly isActive: boolean;
  readonly portalExpiresAt: string | null;
};

export type WebLessonAssignmentStatus = 'pending' | 'assigned' | 'released' | 'completed' | 'cancelled';

export type WebLessonAssignment = {
  readonly id: string;
  readonly curriculumItemId: string;
  readonly profileId: string;
  readonly status: WebLessonAssignmentStatus;
  readonly scheduledDate: string | null;
  readonly releasedAt: string | null;
  readonly variant: string | null;
};

export interface WebLessonContextQueryPort {
  loadCurriculumItemBySlug(slug: string): Promise<WebLessonCurriculumItem | null>;
  loadStudentToken(input: {
    readonly profileId: string;
    readonly slug: string;
  }): Promise<WebLessonStudentToken | null>;
  loadStudentLessonAssignments(input: {
    readonly profileId: string;
    readonly curriculumItemId: string;
  }): Promise<readonly WebLessonAssignment[]>;
  loadSessionBlocks(input: {
    readonly curriculumItemId: string;
    readonly variant: string;
  }): Promise<readonly WebLessonSessionBlock[]>;
}

export type WebLessonContext = {
  readonly contextKey: string;
  readonly lessonSlug: string;
  readonly subjectSlug: 'gs2' | 'mj1' | 'gh' | 'ds2';
  readonly unit: string;
  /** Compatibility metadata for the existing tutor engine; it is replaced by `unit` in the rollout UI. */
  readonly lessonTitle: string;
  readonly variant: string;
  readonly materials: readonly WebLessonClientMaterial[];
};

export type ResolveWebLessonContextInput = {
  readonly port: WebLessonContextQueryPort;
  readonly identity: VerifiedWebLessonIdentity;
  readonly lessonSlug: string;
  readonly now: Date;
};

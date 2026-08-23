import { z } from 'zod';
import type { WebTutorMode } from './web-input';
import {
  TutorGuideV1Schema,
  WorksheetTutorManifestEntryV1Schema,
  type TutorGuideV1,
  type WorksheetTutorManifestEntryV1,
} from './tutor-guide-contract';

export type TutorGuideSelectionFailureCode =
  | 'invalid_guide'
  | 'invalid_manifest'
  | 'unverified_guide'
  | 'unverified_manifest'
  | 'key_mismatch'
  | 'hash_mismatch'
  | 'unverified_alternative';

const TutorGuideContextBaseSchema = z
  .object({
    curriculum: z
      .object({
        grade: z.string().min(1).max(40),
        subject: z.string().min(1).max(80),
        unit: z.string().min(1).max(120),
        allowedConcepts: z.array(z.string().min(1).max(80)).min(1).max(12),
        forbiddenMethods: z.array(z.string().min(1).max(100)).min(1).max(12),
      })
      .strict(),
    officialApproach: z.object({ summary: z.string().min(1).max(500) }).strict(),
    alternatives: z
      .array(
        z
          .object({
            kind: z.literal('synthetic_geometry'),
            summary: z.string().min(1).max(500),
            prerequisites: z.array(z.string().min(1).max(160)).min(1).max(8),
          })
          .strict(),
      )
      .max(4),
  })
  .strict();

export const TutorGuideContextSchema = z.union([
  TutorGuideContextBaseSchema.extend({ hints: z.object({ concept: z.string().min(1).max(500) }).strict() }),
  TutorGuideContextBaseSchema.extend({
    hints: z.object({ concept: z.string().min(1).max(500), start: z.string().min(1).max(500) }).strict(),
  }),
  TutorGuideContextBaseSchema.extend({
    hints: z
      .object({ concept: z.string().min(1).max(500), start: z.string().min(1).max(500), decisive: z.string().min(1).max(500) })
      .strict(),
  }),
  TutorGuideContextBaseSchema.extend({
    hints: z
      .object({ concept: z.string().min(1).max(500), start: z.string().min(1).max(500), decisive: z.string().min(1).max(500) })
      .strict(),
    solution: z.object({ answer: z.string().min(1).max(300), steps: z.array(z.string().min(1).max(700)).min(1).max(12) }).strict(),
  }),
]);

export type TutorGuideContext = Readonly<z.infer<typeof TutorGuideContextSchema>>;
export type TutorGuideSolutionContext = Extract<TutorGuideContext, { readonly solution: { readonly answer: string } }>;

export type TutorGuideSelectionResult =
  | { readonly kind: 'ok'; readonly context: TutorGuideContext | TutorGuideSolutionContext }
  | { readonly kind: 'failure'; readonly code: TutorGuideSelectionFailureCode };

export type TutorGuideSelectionInput = {
  readonly guide: unknown;
  readonly manifestEntry: unknown;
};

export function selectTutorGuideContext(guide: TutorGuideSelectionInput, mode: WebTutorMode): TutorGuideSelectionResult {
  const parsedGuide = TutorGuideV1Schema.safeParse(guide.guide);
  if (!parsedGuide.success) {
    return { kind: 'failure', code: 'invalid_guide' };
  }
  const parsedEntry = WorksheetTutorManifestEntryV1Schema.safeParse(guide.manifestEntry);
  if (!parsedEntry.success) {
    return { kind: 'failure', code: 'invalid_manifest' };
  }
  return selectParsedTutorGuideContext(parsedGuide.data, parsedEntry.data, mode);
}

function selectParsedTutorGuideContext(
  guide: TutorGuideV1,
  manifestEntry: WorksheetTutorManifestEntryV1,
  mode: WebTutorMode,
): TutorGuideSelectionResult {
  if (guide.qa.status !== 'verified') {
    return { kind: 'failure', code: 'unverified_guide' };
  }
  if (manifestEntry.status !== 'verified') {
    return { kind: 'failure', code: 'unverified_manifest' };
  }
  if (guide.manifestKey !== manifestEntry.manifestKey) {
    return { kind: 'failure', code: 'key_mismatch' };
  }
  if (
    guide.provenance.problemSha256 !== manifestEntry.problemAsset.sha256 ||
    guide.provenance.solutionSha256 !== manifestEntry.solutionAsset.sha256
  ) {
    return { kind: 'failure', code: 'hash_mismatch' };
  }
  if (!guide.alternatives.every(hasVerifiedAlternativeProof)) {
    return { kind: 'failure', code: 'unverified_alternative' };
  }

  const context = {
    curriculum: guide.curriculum,
    officialApproach: { summary: guide.officialApproach.summary },
    alternatives: guide.alternatives.map((alternative) => ({
      kind: alternative.kind,
      summary: alternative.summary,
      prerequisites: alternative.prerequisites,
    })),
  };
  switch (mode) {
    case 'hint':
      return { kind: 'ok', context: { ...context, hints: { concept: guide.hints.concept } } };
    case 'start':
      return { kind: 'ok', context: { ...context, hints: { concept: guide.hints.concept, start: guide.hints.start } } };
    case 'decisive_hint':
      return {
        kind: 'ok',
        context: {
          ...context,
          hints: { concept: guide.hints.concept, start: guide.hints.start, decisive: guide.hints.decisive },
        },
      };
    case 'solution':
      return {
        kind: 'ok',
        context: {
          ...context,
          hints: { concept: guide.hints.concept, start: guide.hints.start, decisive: guide.hints.decisive },
          solution: guide.solution,
        },
      };
    default:
      return assertNever(mode);
  }
}

function hasVerifiedAlternativeProof(guide: TutorGuideV1['alternatives'][number]): boolean {
  switch (guide.verification.proofArtifact) {
    case 'coordinate_proof':
    case 'unit_vector_proof':
    case 'independent_verifier':
      return guide.verification.status === 'verified';
    default:
      return false;
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected tutor mode: ${String(value)}`);
}

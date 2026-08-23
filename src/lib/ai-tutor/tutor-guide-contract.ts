import { z } from 'zod';

export const TUTOR_GUIDE_QA_STATUSES = ['draft', 'verified', 'rejected'] as const;
export const TUTOR_GUIDE_MODEL_TIERS = ['gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.6-sol', 'gpt-5.5'] as const;

const SHA256_HEX = /^[a-f0-9]{64}$/;
const NORMALIZED_ID = /^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/;
const SAFE_RELATIVE_KEY = /^(?!\/)(?!.*(?:^|\/)\.\.?\/)[a-z0-9][a-z0-9._/-]*$/;
const DISALLOWED_GUIDE_TEXT_PATTERNS = [
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  /\b(?:https?|ftp):\/\/|\bwww\./i,
  /(?:^|\s)(?:\+82[- ]?)?01[016789][- ]?\d{3,4}[- ]?\d{4}(?:\s|$)/,
  /(?:^|\s)bearer\s+[a-z0-9._-]+/i,
  /\b(?:api[_ -]?key|access[_ -]?token|auth(?:entication)?[_ -]?token|secret(?:[_ -]?(?:key|token|value))?|token)\b/i,
  /\b(?:raw\s+)?(?:transcript|prompt|chain[-\s]?of[-\s]?thought|reasoning)\b/i,
  /(?:시스템\s*프롬프트|원문\s*대화|숨은\s*사고\s*과정)/,
  /<\s*\/?\s*(?:authoritative_teacher_guide|student|system)\b[^>]*>/i,
] as const;

const BoundedTextSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maxLength)
    .refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value), {
      message: 'control_character',
    })
    .refine((value) => !hasDisallowedGuideText(value), { message: 'disallowed_guide_content' });

function hasDisallowedGuideText(value: string): boolean {
  return DISALLOWED_GUIDE_TEXT_PATTERNS.some((pattern) => pattern.test(value));
}

export const WorksheetTutorTargetV1Schema = z
  .object({
    lessonKey: z.string().min(1).max(80).regex(NORMALIZED_ID),
    level: z.number().int().min(1).max(99),
    problemNumber: z.number().int().min(1).max(99),
  })
  .strict();

export type WorksheetTutorTargetV1 = Readonly<z.infer<typeof WorksheetTutorTargetV1Schema>>;

export function buildWorksheetTutorManifestKey(target: WorksheetTutorTargetV1): string {
  return `${target.lessonKey}:${target.level}:${target.problemNumber}`;
}

const CropBoundsSchema = z
  .object({
    page: z.number().int().min(1).max(999),
    left: z.number().finite().min(0),
    top: z.number().finite().min(0),
    right: z.number().finite().positive(),
    bottom: z.number().finite().positive(),
  })
  .strict()
  .superRefine((bounds, context) => {
    if (bounds.right <= bounds.left) {
      context.addIssue({ code: 'custom', path: ['right'], message: 'right_must_exceed_left' });
    }
    if (bounds.bottom <= bounds.top) {
      context.addIssue({ code: 'custom', path: ['bottom'], message: 'bottom_must_exceed_top' });
    }
  });

const WorksheetTutorAssetRefV1Schema = z
  .object({
    assetKey: z.string().min(1).max(180).regex(SAFE_RELATIVE_KEY),
    sourceSha256: z.string().regex(SHA256_HEX),
    sha256: z.string().regex(SHA256_HEX),
    dimensions: z.object({ width: z.number().int().positive().max(10000), height: z.number().int().positive().max(10000) }).strict(),
    crop: CropBoundsSchema,
  })
  .strict();

export const WorksheetTutorManifestEntryV1Schema = z
  .object({
    manifestKey: z.string().min(5).max(180),
    target: WorksheetTutorTargetV1Schema,
    guidePath: z.string().min(1).max(180).regex(SAFE_RELATIVE_KEY),
    status: z.enum(TUTOR_GUIDE_QA_STATUSES),
    problemAsset: WorksheetTutorAssetRefV1Schema,
    solutionAsset: WorksheetTutorAssetRefV1Schema,
  })
  .strict()
  .superRefine((entry, context) => {
    if (entry.manifestKey !== buildWorksheetTutorManifestKey(entry.target)) {
      context.addIssue({ code: 'custom', path: ['manifestKey'], message: 'manifest_key_mismatch' });
    }
  });

export type WorksheetTutorManifestEntryV1 = Readonly<z.infer<typeof WorksheetTutorManifestEntryV1Schema>>;

export const WorksheetTutorManifestV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    entries: z.array(WorksheetTutorManifestEntryV1Schema).min(1).max(99),
  })
  .strict()
  .superRefine((manifest, context) => {
    const seenKeys = new Set<string>();
    manifest.entries.forEach((entry, index) => {
      if (seenKeys.has(entry.manifestKey)) {
        context.addIssue({ code: 'custom', path: ['entries', index, 'manifestKey'], message: 'duplicate_manifest_key' });
      }
      seenKeys.add(entry.manifestKey);
    });
  });

export type WorksheetTutorManifestV1 = Readonly<z.infer<typeof WorksheetTutorManifestV1Schema>>;

const CurriculumSchema = z
  .object({
    grade: BoundedTextSchema(40),
    subject: BoundedTextSchema(80),
    unit: BoundedTextSchema(120),
    allowedConcepts: z.array(BoundedTextSchema(80)).min(1).max(12),
    forbiddenMethods: z.array(BoundedTextSchema(100)).min(1).max(12),
  })
  .strict();

const OfficialApproachSchema = z
  .object({
    summary: BoundedTextSchema(500),
    steps: z.array(BoundedTextSchema(500)).min(1).max(12),
  })
  .strict();

const HintsSchema = z
  .object({
    concept: BoundedTextSchema(500),
    start: BoundedTextSchema(500),
    decisive: BoundedTextSchema(500),
  })
  .strict();

const AlternativeVerificationSchema = z.discriminatedUnion('proofArtifact', [
  z.object({
    status: z.enum(['draft', 'verified']),
    proofArtifact: z.literal('coordinate_proof'),
    proofChecks: z.object({ coordinateDefined: z.literal(true), equationsChecked: z.literal(true), conclusionChecked: z.literal(true) }).strict(),
  }).strict(),
  z.object({
    status: z.enum(['draft', 'verified']),
    proofArtifact: z.literal('unit_vector_proof'),
    proofChecks: z.object({ unitVectorsDefined: z.literal(true), equationsChecked: z.literal(true), conclusionChecked: z.literal(true) }).strict(),
  }).strict(),
  z.object({
    status: z.enum(['draft', 'verified']),
    proofArtifact: z.literal('independent_verifier'),
    verifierModel: z.enum(['gpt-5.6-sol', 'gpt-5.5']),
    approval: z.literal(true),
  }).strict(),
]);

const AlternativeSchema = z.object({
  kind: z.literal('synthetic_geometry'),
  summary: BoundedTextSchema(500),
  prerequisites: z.array(BoundedTextSchema(160)).min(1).max(8),
  steps: z.array(BoundedTextSchema(500)).min(1).max(12),
  verification: AlternativeVerificationSchema,
}).strict();

const ProvenanceSchema = z
  .object({
    // Guide provenance binds to exact crop PNG bytes; source PDF freshness is checked by manifest asset refs.
    problemSha256: z.string().regex(SHA256_HEX),
    solutionSha256: z.string().regex(SHA256_HEX),
    authoringModel: z.enum(TUTOR_GUIDE_MODEL_TIERS),
    verifierModel: z.enum(TUTOR_GUIDE_MODEL_TIERS),
  })
  .strict();

export const TutorGuideV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    manifestKey: z.string().min(5).max(180),
    target: WorksheetTutorTargetV1Schema,
    curriculum: CurriculumSchema,
    officialApproach: OfficialApproachSchema,
    hints: HintsSchema,
    alternatives: z.array(AlternativeSchema).max(4),
    solution: z
      .object({
        answer: BoundedTextSchema(300),
        steps: z.array(BoundedTextSchema(700)).min(1).max(12),
      })
      .strict(),
    provenance: ProvenanceSchema,
    qa: z
      .object({
        status: z.enum(TUTOR_GUIDE_QA_STATUSES),
        checks: z.array(z.enum(['schema_valid', 'official_solution_checked', 'curriculum_checked', 'latex_checked'])).min(1).max(8),
      })
      .strict(),
  })
  .strict()
  .superRefine((guide, context) => {
    if (guide.manifestKey !== buildWorksheetTutorManifestKey(guide.target)) {
      context.addIssue({ code: 'custom', path: ['manifestKey'], message: 'manifest_key_mismatch' });
    }
  });

export type TutorGuideV1 = Readonly<z.infer<typeof TutorGuideV1Schema>>;

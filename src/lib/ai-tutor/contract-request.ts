import { z } from 'zod';
import {
  TutorContextSchema,
  TutorGroundedProblemSchema,
  TutorTextInputSchema,
  type TutorContext,
  type TutorGroundedProblem,
  type TutorTextInput,
} from './contract-context';
import type { TutorProviderResult } from './contract-result';

const maxTutorDocumentBytes = 5 * 1024 * 1024;

export const TutorImageInputSchema = z
  .object({
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    bytes: z.instanceof(Uint8Array),
    sha256Hex: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export type TutorImageInput = Readonly<z.infer<typeof TutorImageInputSchema>>;

export const TutorDocumentInputSchema = z
  .object({
    mimeType: z.literal('application/pdf'),
    bytes: z.instanceof(Uint8Array).refine((bytes) => bytes.byteLength <= maxTutorDocumentBytes, {
      message: 'PDF document exceeds the 5 MiB AI tutor limit.',
    }),
    sha256Hex: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export type TutorDocumentInput = Readonly<z.infer<typeof TutorDocumentInputSchema>>;

export const TutorProviderRequestSchema = z
  .object({
    input: TutorTextInputSchema,
    context: TutorContextSchema,
    image: TutorImageInputSchema.optional(),
    document: TutorDocumentInputSchema.optional(),
    groundedProblem: TutorGroundedProblemSchema.optional(),
  })
  .superRefine((request, context) => {
    if (request.image !== undefined && request.document !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Tutor request accepts either one raster image or one PDF document, not both.',
        path: ['document'],
      });
    }
  })
  .strict();

export type TutorProviderRequest = {
  readonly input: TutorTextInput;
  readonly context: TutorContext;
  readonly image?: TutorImageInput;
  readonly document?: TutorDocumentInput;
  readonly groundedProblem?: TutorGroundedProblem;
};

export interface TutorProvider {
  answer(request: TutorProviderRequest): Promise<TutorProviderResult>;
}

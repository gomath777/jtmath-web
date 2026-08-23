import { z } from 'zod';

export const ConceptTagSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(new RegExp('^[\\p{L}\\p{N}_:-]+$', 'u'))
  .transform((value) => value.toLocaleLowerCase('ko-KR'));

export const SubjectSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9-]+$/);

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TutorContextSchema,
  TutorDocumentInputSchema,
  TutorGroundedProblemSchema,
  TutorImageInputSchema,
  TutorProviderRequestSchema,
  TutorProviderResultSchema,
  TutorTextInputSchema,
  buildReviewResult,
} from './contracts';
import {
  TutorContextSchema as ExtractedTutorContextSchema,
  TutorGroundedProblemSchema as ExtractedTutorGroundedProblemSchema,
  TutorTextInputSchema as ExtractedTutorTextInputSchema,
} from './contract-context';
import {
  TutorDocumentInputSchema as ExtractedTutorDocumentInputSchema,
  TutorImageInputSchema as ExtractedTutorImageInputSchema,
  TutorProviderRequestSchema as ExtractedTutorProviderRequestSchema,
} from './contract-request';
import { TutorProviderResultSchema as ExtractedTutorProviderResultSchema } from './contract-result';
import { buildReviewResult as extractedBuildReviewResult } from './contract-review';

test('contracts barrel re-exports the extracted schema and helper objects without wrapping', () => {
  assert.equal(TutorTextInputSchema, ExtractedTutorTextInputSchema);
  assert.equal(TutorContextSchema, ExtractedTutorContextSchema);
  assert.equal(TutorGroundedProblemSchema, ExtractedTutorGroundedProblemSchema);
  assert.equal(TutorImageInputSchema, ExtractedTutorImageInputSchema);
  assert.equal(TutorDocumentInputSchema, ExtractedTutorDocumentInputSchema);
  assert.equal(TutorProviderRequestSchema, ExtractedTutorProviderRequestSchema);
  assert.equal(TutorProviderResultSchema, ExtractedTutorProviderResultSchema);
  assert.equal(buildReviewResult, extractedBuildReviewResult);
});

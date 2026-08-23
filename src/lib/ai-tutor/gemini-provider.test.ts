import assert from 'node:assert/strict';
import test from 'node:test';
import './gemini-provider-cleanup.cases';
import './gemini-provider-media.cases';
import './gemini-provider-resilience.cases';
import {
  createGeminiTutorProvider,
  type GeminiGenerateContentParameters,
} from './gemini-provider';
import { createProvider, disabledConfig, enabledConfig, fakeClient, request, usage, validGeminiText } from './gemini-provider.test-support';

test('createGeminiTutorProvider validates paid enabled config before constructing the SDK client', async () => {
  // Given
  let constructed = 0;

  // When / Then
  assert.throws(() =>
    createGeminiTutorProvider({
      config: disabledConfig,
      apiKey: 'synthetic-key',
      clientFactory: () => {
        constructed += 1;
        return fakeClient(validGeminiText);
      },
    }),
  );
  assert.equal(constructed, 0);
});

test('Gemini provider uses the exact configured text model with structured JSON config', async () => {
  // Given
  const calls: GeminiGenerateContentParameters[] = [];
  const provider = createProvider({ calls, response: { text: validGeminiText, usageMetadata: usage(11, 17) } });

  // When
  const answer = await provider.answerWithMetadata(request);

  // Then
  assert.equal(answer.result.answerText.includes('다른 인수'), true);
  assert.equal(answer.metadata.modelId, 'gemini-2.5-flash');
  assert.equal(answer.metadata.modelAlias, 'text');
  assert.equal(answer.metadata.tokenCounts.total, 28);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.model, 'gemini-2.5-flash');
  assert.equal(calls[0]?.config?.responseMimeType, 'application/json');
  assert.equal(calls[0]?.config?.candidateCount, 1);
  assert.equal(calls[0]?.config?.maxOutputTokens, 8192);
  assert.deepEqual(calls[0]?.config?.responseJsonSchema.required, [
    'answerText',
    'confidence',
    'subjectSlug',
    'conceptTags',
    'errorType',
    'needsTeacherReview',
    'escalationReason',
  ]);
  assert.equal('visualSpec' in (calls[0]?.config?.responseJsonSchema.properties ?? {}), false);
  assert.equal(calls[0]?.config?.tools, undefined);
  assert.deepEqual(calls[0]?.config?.thinkingConfig, {
    includeThoughts: false,
    thinkingBudget: 0,
  });
  assert.equal(JSON.stringify(calls[0]).includes('users/'), false);
});

test('Gemini provider constrains Gemini 3 tutor requests to low thinking so short JSON answers are not truncated', async () => {
  // Given
  const calls: GeminiGenerateContentParameters[] = [];
  const provider = createProvider({
    config: {
      ...enabledConfig,
      textModel: { id: 'gemini-3.6-flash', alias: 'text' },
      visionModel: { id: 'gemini-3.6-flash', alias: 'vision' },
    },
    calls,
    response: { text: validGeminiText },
  });

  // When
  await provider.answerWithMetadata(request);

  // Then
  assert.equal(calls[0]?.model, 'gemini-3.6-flash');
  assert.deepEqual(calls[0]?.config?.thinkingConfig, {
    includeThoughts: false,
    thinkingLevel: 'LOW',
  });
});

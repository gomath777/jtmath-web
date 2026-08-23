import assert from 'node:assert/strict';
import test from 'node:test';
import { createProvider, request, validGeminiText } from './gemini-provider.test-support';
import type { GeminiGenerateContentParameters } from './gemini-provider';
import type { TutorProviderRequest } from './contracts';

test('Gemini provider switches to the exact configured vision model and sends inline image bytes', async () => {
  // Given
  const calls: GeminiGenerateContentParameters[] = [];
  const provider = createProvider({ calls, response: { text: validGeminiText } });

  // When
  await provider.answerWithMetadata({
    ...request,
    image: { mimeType: 'image/jpeg', bytes: new Uint8Array([1, 2, 3, 4]), sha256Hex: 'a'.repeat(64) },
  });

  // Then
  assert.equal(calls[0]?.model, 'gemini-2.5-pro');
  assert.equal(JSON.stringify(calls[0]).includes('"mimeType":"image/jpeg"'), true);
  assert.equal(JSON.stringify(calls[0]).includes('"data":"AQIDBA=="'), true);
  assert.equal(JSON.stringify(calls[0]).includes('ai-tutor-private'), false);
  assert.equal(JSON.stringify(calls[0]).includes('sha256'), false);
});

test('Given a guide-grounded hint request When Gemini is called Then it receives one problem PNG and no solution-only guide fields', async () => {
  // Given
  const calls: GeminiGenerateContentParameters[] = [];
  const provider = createProvider({ calls, response: { text: validGeminiText } });
  const guidedRequest: TutorProviderRequest = {
    ...request,
    context: {
      ...request.context,
      guideContext: {
        curriculum: {
          grade: '고2',
          subject: '수학 II',
          unit: '삼각함수',
          allowedConcepts: ['사인 법칙'],
          forbiddenMethods: ['미적분'],
        },
        officialApproach: { summary: '공식 풀이의 개요입니다.' },
        alternatives: [],
        hints: { concept: '핵심 개념만 확인하세요.' },
      },
    },
    image: { mimeType: 'image/png', bytes: new Uint8Array([1, 2, 3, 4]), sha256Hex: 'f'.repeat(64) },
  };

  // When
  await provider.answerWithMetadata(guidedRequest);

  // Then
  const parts = calls[0]?.contents[0]?.parts ?? [];
  const mediaParts = parts.filter((part) => 'inlineData' in part);
  const contextPayload = parts[0] !== undefined && 'text' in parts[0] ? parts[0].text : '';
  const textPayload = parts.filter((part) => 'text' in part).map((part) => ('text' in part ? part.text : '')).join('\n');
  assert.equal(mediaParts.length, 1);
  assert.deepEqual(mediaParts[0], { inlineData: { mimeType: 'image/png', data: 'AQIDBA==' } });
  assert.equal(contextPayload.includes('synthetic answer'), false);
  assert.equal(contextPayload.includes('solution'), false);
  assert.match(textPayload, /금지 방법/);
  assert.match(textPayload, /공식 풀이 개요/);
  assert.match(textPayload, /학생 입력/);
  assert.equal(textPayload.indexOf('금지 방법') < textPayload.indexOf('<student_question>'), true);
});

test('Gemini provider sends one authoritative PDF as application/pdf inline data without image payloads', async () => {
  // Given
  const calls: GeminiGenerateContentParameters[] = [];
  const provider = createProvider({ calls, response: { text: validGeminiText } });

  // When
  await provider.answerWithMetadata({
    ...request,
    document: { mimeType: 'application/pdf', bytes: new Uint8Array([37, 80, 68, 70, 45]), sha256Hex: 'd'.repeat(64) },
  });

  // Then
  const payload = JSON.stringify(calls[0]);
  assert.equal(calls[0]?.model, 'gemini-2.5-pro');
  assert.equal(payload.includes('"mimeType":"application/pdf"'), true);
  assert.equal(payload.includes('"data":"JVBERi0="'), true);
  assert.equal(payload.includes('"mimeType":"image/'), false);
  assert.equal(payload.includes('sha256'), false);
});

test('Gemini provider keeps existing image serialization unchanged when no PDF document is present', async () => {
  // Given
  const calls: GeminiGenerateContentParameters[] = [];
  const provider = createProvider({ calls, response: { text: validGeminiText } });

  // When
  await provider.answerWithMetadata({
    ...request,
    image: { mimeType: 'image/png', bytes: new Uint8Array([1, 2, 3, 4]), sha256Hex: 'e'.repeat(64) },
  });

  // Then
  const payload = JSON.stringify(calls[0]);
  assert.equal(calls[0]?.model, 'gemini-2.5-pro');
  assert.equal(payload.includes('"mimeType":"image/png"'), true);
  assert.equal(payload.includes('"data":"AQIDBA=="'), true);
  assert.equal(payload.includes('"mimeType":"application/pdf"'), false);
  assert.deepEqual(
    calls[0]?.contents[0]?.parts.map((part) => ('text' in part ? 'text' : 'inlineData')),
    ['text', 'text', 'text', 'inlineData'],
  );
  assert.equal(payload.includes('authoritative_teacher_guide'), false);
});

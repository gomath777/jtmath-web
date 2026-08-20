import assert from 'node:assert/strict';
import test from 'node:test';
import { createGoogleChatRoutePost } from '../../../lib/google-chat/route-handler';
import { POST } from './route';

test('POST returns service unavailable when Google Chat verification is not configured', async () => {
  // Given
  const previousEndpointUrl = process.env.GOOGLE_CHAT_ENDPOINT_URL;
  const previousServiceAccountEmail = process.env.GOOGLE_CHAT_SERVICE_ACCOUNT_EMAIL;
  delete process.env.GOOGLE_CHAT_ENDPOINT_URL;
  delete process.env.GOOGLE_CHAT_SERVICE_ACCOUNT_EMAIL;
  const request = new Request('https://jtmath.kr/api/google-chat', {
    method: 'POST',
    body: JSON.stringify({ chat: {} }),
  });

  try {
    // When
    const response = await POST(request);

    // Then
    assert.equal(response.status, 503);
  } finally {
    if (previousEndpointUrl) process.env.GOOGLE_CHAT_ENDPOINT_URL = previousEndpointUrl;
    if (previousServiceAccountEmail) {
      process.env.GOOGLE_CHAT_SERVICE_ACCOUNT_EMAIL = previousServiceAccountEmail;
    }
  }
});

test('createGoogleChatRoutePost preserves disabled tutor compatibility for verified Chat requests', async () => {
  // Given
  const post = createGoogleChatRoutePost({
    env: {
      GOOGLE_CHAT_ENDPOINT_URL: 'https://jtmath.kr/api/google-chat',
      GOOGLE_CHAT_SERVICE_ACCOUNT_EMAIL: 'service@example.invalid',
      AI_TUTOR_ENABLED: 'false',
    },
    verifierFactory: () => ({ verify: async () => true }),
  });
  const request = new Request('https://jtmath.kr/api/google-chat', {
    method: 'POST',
    headers: { authorization: 'Bearer test-token' },
    body: JSON.stringify({
      chat: {
        user: { name: 'users/test-chat-user' },
        messagePayload: {
          message: {
            name: 'spaces/test-space/messages/test-message',
            text: '테스트 질문',
            space: { name: 'spaces/test-space', type: 'DM' },
          },
        },
      },
    }),
  });

  // When
  const response = await post(request);

  // Then
  assert.equal(response.status, 200);
  assert.match(await response.text(), /연결 테스트 성공/);
});

test('createGoogleChatRoutePost returns service unavailable when enabled runtime is not safe to construct', async () => {
  // Given
  const post = createGoogleChatRoutePost({
    env: {
      GOOGLE_CHAT_ENDPOINT_URL: 'https://jtmath.kr/api/google-chat',
      GOOGLE_CHAT_SERVICE_ACCOUNT_EMAIL: 'service@example.invalid',
      AI_TUTOR_ENABLED: 'true',
    },
    verifierFactory: () => ({ verify: async () => true }),
  });
  const request = new Request('https://jtmath.kr/api/google-chat', {
    method: 'POST',
    headers: { authorization: 'Bearer test-token' },
    body: JSON.stringify({
      chat: {
        user: { name: 'users/test-chat-user' },
        messagePayload: {
          message: {
            name: 'spaces/test-space/messages/test-message',
            text: '테스트 질문',
            space: { name: 'spaces/test-space', type: 'DM' },
          },
        },
      },
    }),
  });

  // When
  const response = await post(request);

  // Then
  assert.equal(response.status, 503);
});

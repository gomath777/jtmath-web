import assert from 'node:assert/strict';
import test from 'node:test';
import { createGoogleChatPost, type GoogleChatRequestVerifier } from './http';

const validMessagePayload = {
  chat: {
    messagePayload: {
      message: { text: '테스트 질문' },
    },
  },
};

test('createGoogleChatPost returns an add-on response when Google authentication succeeds', async () => {
  // Given
  const verifier: GoogleChatRequestVerifier = {
    verify: async () => true,
  };
  const post = createGoogleChatPost(verifier);
  const request = new Request('https://jtmath.kr/api/google-chat', {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify(validMessagePayload),
  });

  // When
  const response = await post(request);

  // Then
  assert.equal(response.status, 200);
  assert.match(await response.text(), /연결 테스트 성공/);
});

test('createGoogleChatPost rejects requests that do not authenticate as Google', async () => {
  // Given
  const verifier: GoogleChatRequestVerifier = {
    verify: async () => false,
  };
  const post = createGoogleChatPost(verifier);
  const request = new Request('https://jtmath.kr/api/google-chat', {
    method: 'POST',
    body: JSON.stringify(validMessagePayload),
  });

  // When
  const response = await post(request);

  // Then
  assert.equal(response.status, 401);
});

test('createGoogleChatPost returns a bad request for malformed JSON', async () => {
  // Given
  const verifier: GoogleChatRequestVerifier = {
    verify: async () => true,
  };
  const post = createGoogleChatPost(verifier);
  const request = new Request('https://jtmath.kr/api/google-chat', {
    method: 'POST',
    headers: { authorization: 'Bearer test-token' },
    body: '{',
  });

  // When
  const response = await post(request);

  // Then
  assert.equal(response.status, 400);
});

test('createGoogleChatPost returns a bad request for an unsupported event', async () => {
  // Given
  const verifier: GoogleChatRequestVerifier = {
    verify: async () => true,
  };
  const post = createGoogleChatPost(verifier);
  const request = new Request('https://jtmath.kr/api/google-chat', {
    method: 'POST',
    headers: { authorization: 'Bearer test-token' },
    body: JSON.stringify({ chat: {} }),
  });

  // When
  const response = await post(request);

  // Then
  assert.equal(response.status, 400);
});

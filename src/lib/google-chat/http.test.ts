import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createGoogleChatPost,
  GoogleChatHandlerUnavailableError,
  type GoogleChatRequestVerifier,
} from './http';

const validMessagePayload = {
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

test('createGoogleChatPost can route parsed events to an async tutor handler', async () => {
  // Given
  const verifier: GoogleChatRequestVerifier = {
    verify: async () => true,
  };
  const post = createGoogleChatPost(verifier, async (event) => ({
    hostAppDataAction: {
      chatDataAction: {
        createMessageAction: {
          message: { text: event.kind === 'message' ? `AI: ${event.text}` : 'AI' },
        },
      },
    },
  }));
  const request = new Request('https://jtmath.kr/api/google-chat', {
    method: 'POST',
    headers: { authorization: 'Bearer test-token' },
    body: JSON.stringify(validMessagePayload),
  });

  // When
  const response = await post(request);

  // Then
  assert.equal(response.status, 200);
  assert.match(await response.text(), /AI: 테스트 질문/);
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

test('createGoogleChatPost checks authentication before reading malformed JSON', async () => {
  // Given
  const verifier: GoogleChatRequestVerifier = {
    verify: async () => false,
  };
  const post = createGoogleChatPost(verifier);
  const request = new Request('https://jtmath.kr/api/google-chat', {
    method: 'POST',
    body: '{',
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

test('createGoogleChatPost maps unavailable tutor handlers to service unavailable', async () => {
  // Given
  const verifier: GoogleChatRequestVerifier = {
    verify: async () => true,
  };
  const post = createGoogleChatPost(verifier, async () => {
    throw new GoogleChatHandlerUnavailableError();
  });
  const request = new Request('https://jtmath.kr/api/google-chat', {
    method: 'POST',
    headers: { authorization: 'Bearer test-token' },
    body: JSON.stringify(validMessagePayload),
  });

  // When
  const response = await post(request);

  // Then
  assert.equal(response.status, 503);
});

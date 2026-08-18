import assert from 'node:assert/strict';
import test from 'node:test';
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

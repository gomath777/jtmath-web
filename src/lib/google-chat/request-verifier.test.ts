import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GoogleWorkspaceAddOnRequestVerifier,
  type GoogleIdTokenClient,
} from './request-verifier';

const endpointUrl = 'https://jtmath.kr/api/google-chat';
const serviceAccountEmail = 'workspace-addon@example.iam.gserviceaccount.com';

test('GoogleWorkspaceAddOnRequestVerifier accepts a Google token for the configured add-on', async () => {
  // Given
  const client: GoogleIdTokenClient = {
    verifyIdToken: async ({ idToken, audience }) => {
      assert.equal(idToken, 'valid-token');
      assert.equal(audience, endpointUrl);
      return {
        getPayload: () => ({
          email: serviceAccountEmail,
          email_verified: true,
        }),
      };
    },
  };
  const verifier = new GoogleWorkspaceAddOnRequestVerifier(
    endpointUrl,
    serviceAccountEmail,
    client,
  );

  // When
  const verified = await verifier.verify('Bearer valid-token');

  // Then
  assert.equal(verified, true);
});

test('GoogleWorkspaceAddOnRequestVerifier rejects a token from a different service account', async () => {
  // Given
  const client: GoogleIdTokenClient = {
    verifyIdToken: async () => ({
      getPayload: () => ({
        email: 'other@example.iam.gserviceaccount.com',
        email_verified: true,
      }),
    }),
  };
  const verifier = new GoogleWorkspaceAddOnRequestVerifier(
    endpointUrl,
    serviceAccountEmail,
    client,
  );

  // When
  const verified = await verifier.verify('Bearer valid-token');

  // Then
  assert.equal(verified, false);
});

test('GoogleWorkspaceAddOnRequestVerifier rejects a request without a bearer token', async () => {
  // Given
  const client: GoogleIdTokenClient = {
    verifyIdToken: async () => {
      assert.fail('Token verification should not run');
    },
  };
  const verifier = new GoogleWorkspaceAddOnRequestVerifier(
    endpointUrl,
    serviceAccountEmail,
    client,
  );

  // When
  const verified = await verifier.verify(null);

  // Then
  assert.equal(verified, false);
});

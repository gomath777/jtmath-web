import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GoogleWorkspaceAddOnRequestVerifier,
  type GoogleIdTokenClient,
} from './request-verifier';

const endpointUrl = 'https://jtmath.kr/api/google-chat';
const serviceAccountEmail = 'workspace-addon@example.iam.gserviceaccount.com';

function tokenFor(audience: string): string {
  const payload = Buffer.from(JSON.stringify({ aud: audience })).toString('base64url');
  return `header.${payload}.signature`;
}

test('GoogleWorkspaceAddOnRequestVerifier accepts a Google token for the configured add-on', async () => {
  // Given
  const client: GoogleIdTokenClient = {
    verifyIdToken: async ({ idToken, audience }) => {
      assert.equal(idToken, tokenFor(endpointUrl));
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
  const verified = await verifier.verify(`Bearer ${tokenFor(endpointUrl)}`, endpointUrl);

  // Then
  assert.equal(verified, true);
});

test('GoogleWorkspaceAddOnRequestVerifier accepts the documented Google Chat OIDC issuer', async () => {
  const client: GoogleIdTokenClient = {
    verifyIdToken: async () => ({
      getPayload: () => ({
        email: 'chat@system.gserviceaccount.com',
        email_verified: true,
      }),
    }),
  };
  const verifier = new GoogleWorkspaceAddOnRequestVerifier(
    endpointUrl,
    'service-953043722609@gcp-sa-gsuiteaddons.iam.gserviceaccount.com',
    client,
  );

  assert.equal(
    await verifier.verify(`Bearer ${tokenFor(endpointUrl)}`, endpointUrl),
    true,
  );
});

test('GoogleWorkspaceAddOnRequestVerifier verifies the signed audience when Vercel strips its bypass query', async () => {
  const signedAudience = `${endpointUrl}?x-vercel-protection-bypass=test-secret`;
  const client: GoogleIdTokenClient = {
    verifyIdToken: async ({ audience }) => {
      assert.equal(audience, signedAudience);
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

  assert.equal(
    await verifier.verify(`Bearer ${tokenFor(signedAudience)}`, endpointUrl),
    true,
  );
});

test('GoogleWorkspaceAddOnRequestVerifier rejects a signed audience for another endpoint', async () => {
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

  assert.equal(
    await verifier.verify(
      `Bearer ${tokenFor('https://attacker.example/api/google-chat')}`,
      endpointUrl,
    ),
    false,
  );
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
  const verified = await verifier.verify(`Bearer ${tokenFor(endpointUrl)}`, endpointUrl);

  // Then
  assert.equal(verified, false);
});

test('GoogleWorkspaceAddOnRequestVerifier accepts a project-scoped Workspace add-on identity', async () => {
  const projectNumber = '953043722609';
  const configuredEmail =
    `service-${projectNumber}@gcp-sa-gsuiteaddons.iam.gserviceaccount.com`;
  const client: GoogleIdTokenClient = {
    verifyIdToken: async () => ({
      getPayload: () => ({
        email:
          `workspace-addon-${projectNumber}@gcp-sa-gsuiteaddons.iam.gserviceaccount.com`,
        email_verified: true,
      }),
    }),
  };
  const verifier = new GoogleWorkspaceAddOnRequestVerifier(
    endpointUrl,
    configuredEmail,
    client,
  );

  assert.equal(
    await verifier.verify(`Bearer ${tokenFor(endpointUrl)}`, endpointUrl),
    true,
  );
});

test('GoogleWorkspaceAddOnRequestVerifier accepts a Workspace add-on identity without project-number local part', async () => {
  const client: GoogleIdTokenClient = {
    verifyIdToken: async () => ({
      getPayload: () => ({
        email: 'runtime@gcp-sa-gsuiteaddons.iam.gserviceaccount.com',
        email_verified: true,
      }),
    }),
  };
  const verifier = new GoogleWorkspaceAddOnRequestVerifier(
    endpointUrl,
    'service-953043722609@gcp-sa-gsuiteaddons.iam.gserviceaccount.com',
    client,
  );

  assert.equal(
    await verifier.verify(`Bearer ${tokenFor(endpointUrl)}`, endpointUrl),
    true,
  );
});

test('GoogleWorkspaceAddOnRequestVerifier accepts a Project Number JWT from Google Chat', async () => {
  const projectNumber = '953043722609';
  const configuredEmail =
    `service-${projectNumber}@gcp-sa-gsuiteaddons.iam.gserviceaccount.com`;
  const certs = { chatKey: 'public cert placeholder' };
  const client: GoogleIdTokenClient = {
    verifyIdToken: async () => {
      assert.fail('Project Number JWT should not use OIDC ID token verification');
    },
    verifySignedJwtWithCertsAsync: async (jwt, receivedCerts, audience, issuers) => {
      assert.equal(jwt, tokenFor(projectNumber));
      assert.deepEqual(receivedCerts, certs);
      assert.equal(audience, projectNumber);
      assert.deepEqual(issuers, ['chat@system.gserviceaccount.com']);
    },
  };
  const verifier = new GoogleWorkspaceAddOnRequestVerifier(
    endpointUrl,
    configuredEmail,
    client,
    async () => certs,
  );

  assert.equal(
    await verifier.verify(`Bearer ${tokenFor(projectNumber)}`, endpointUrl),
    true,
  );
});

test('GoogleWorkspaceAddOnRequestVerifier rejects a Project Number JWT for another project', async () => {
  const client: GoogleIdTokenClient = {
    verifyIdToken: async () => {
      assert.fail('Project Number JWT should not use OIDC ID token verification');
    },
    verifySignedJwtWithCertsAsync: async () => {
      assert.fail('JWT verification should not run for the wrong project number');
    },
  };
  const verifier = new GoogleWorkspaceAddOnRequestVerifier(
    endpointUrl,
    'service-953043722609@gcp-sa-gsuiteaddons.iam.gserviceaccount.com',
    client,
  );

  assert.equal(
    await verifier.verify(`Bearer ${tokenFor('111111111111')}`, endpointUrl),
    false,
  );
});

test('GoogleWorkspaceAddOnRequestVerifier accepts the configured add-on identity with a non-service prefix', async () => {
  const projectNumber = '953043722609';
  const configuredEmail =
    `workspace-addon-${projectNumber}@gcp-sa-gsuiteaddons.iam.gserviceaccount.com`;
  const client: GoogleIdTokenClient = {
    verifyIdToken: async () => ({
      getPayload: () => ({
        email:
          `chat-app-${projectNumber}@gcp-sa-gsuiteaddons.iam.gserviceaccount.com`,
        email_verified: true,
      }),
    }),
  };
  const verifier = new GoogleWorkspaceAddOnRequestVerifier(
    endpointUrl,
    configuredEmail,
    client,
  );

  assert.equal(
    await verifier.verify(`Bearer ${tokenFor(endpointUrl)}`, endpointUrl),
    true,
  );
});

test('GoogleWorkspaceAddOnRequestVerifier rejects a Workspace add-on identity from another service domain', async () => {
  const client: GoogleIdTokenClient = {
    verifyIdToken: async () => ({
      getPayload: () => ({
        email: 'workspace-addon@example.iam.gserviceaccount.com',
        email_verified: true,
      }),
    }),
  };
  const verifier = new GoogleWorkspaceAddOnRequestVerifier(
    endpointUrl,
    'service-953043722609@gcp-sa-gsuiteaddons.iam.gserviceaccount.com',
    client,
  );

  assert.equal(
    await verifier.verify(`Bearer ${tokenFor(endpointUrl)}`, endpointUrl),
    false,
  );
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
  const verified = await verifier.verify(null, endpointUrl);

  // Then
  assert.equal(verified, false);
});

import { OAuth2Client } from 'google-auth-library';
import type { GoogleChatRequestVerifier } from './http';

export interface GoogleIdTokenClient {
  verifyIdToken(options: {
    readonly idToken: string;
    readonly audience: string;
  }): Promise<{
    getPayload(): {
      readonly email?: string;
      readonly email_verified?: boolean;
    } | undefined;
  }>;
}

function describeUnverifiedToken(
  idToken: string,
  endpointUrl: string,
  serviceAccountEmail: string,
) {
  try {
    const encodedPayload = idToken.split('.')[1];
    if (!encodedPayload) return { hasPayload: false };

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
    const audience = typeof payload.aud === 'string' ? payload.aud : undefined;
    const expectedUrl = new URL(endpointUrl);
    let audienceUrl: URL | undefined;
    try {
      audienceUrl = audience ? new URL(audience) : undefined;
    } catch {
      audienceUrl = undefined;
    }

    return {
      hasPayload: true,
      audienceIsNumeric: /^\d+$/.test(audience ?? ''),
      audienceMatchesEndpoint: audience === endpointUrl,
      audienceHostMatches: audienceUrl?.host === expectedUrl.host,
      audiencePathMatches: audienceUrl?.pathname === expectedUrl.pathname,
      audienceHasQuery: Boolean(audienceUrl?.search),
      emailMatchesExpected: payload.email === serviceAccountEmail,
      emailVerifiedIsTrue: payload.email_verified === true,
    };
  } catch {
    return { hasPayload: false };
  }
}

export class GoogleWorkspaceAddOnRequestVerifier implements GoogleChatRequestVerifier {
  constructor(
    private readonly endpointUrl: string,
    private readonly serviceAccountEmail: string,
    private readonly client: GoogleIdTokenClient = new OAuth2Client(),
  ) {}

  async verify(authorizationHeader: string | null): Promise<boolean> {
    const bearerPrefix = 'Bearer ';
    if (!authorizationHeader?.startsWith(bearerPrefix)) return false;

    const idToken = authorizationHeader.slice(bearerPrefix.length).trim();
    if (idToken.length === 0) return false;

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.endpointUrl,
      });
      const payload = ticket.getPayload();
      return (
        payload?.email_verified === true && payload.email === this.serviceAccountEmail
      );
    } catch (error) {
      if (error instanceof Error) {
        console.warn(
          '[google-chat] request token verification failed',
          describeUnverifiedToken(idToken, this.endpointUrl, this.serviceAccountEmail),
        );
        return false;
      }
      throw error;
    }
  }
}

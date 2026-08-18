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
      if (error instanceof Error) return false;
      throw error;
    }
  }
}

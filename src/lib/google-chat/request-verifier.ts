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

function isExpectedWorkspaceAddOnIdentity(
  actualEmail: string | undefined,
  configuredEmail: string,
): boolean {
  if (actualEmail === configuredEmail) return true;

  const configuredMatch = configuredEmail.match(
    /^service-(\d+)@(gcp-sa-gsuiteaddons\.iam\.gserviceaccount\.com)$/,
  );
  if (!configuredMatch || !actualEmail) return false;

  const [, projectNumber, serviceDomain] = configuredMatch;
  const [actualLocalPart, actualDomain] = actualEmail.split('@');
  return actualDomain === serviceDomain && actualLocalPart.includes(projectNumber);
}

function isAllowedEndpoint(requestUrl: string, configuredEndpointUrl: string): boolean {
  try {
    const request = new URL(requestUrl);
    const configured = new URL(configuredEndpointUrl);
    return request.origin === configured.origin && request.pathname === configured.pathname;
  } catch {
    return false;
  }
}

function readTokenAudience(idToken: string): string | undefined {
  try {
    const encodedPayload = idToken.split('.')[1];
    if (!encodedPayload) return undefined;

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as { readonly aud?: unknown };
    return typeof payload.aud === 'string' ? payload.aud : undefined;
  } catch {
    return undefined;
  }
}

function classifyVerificationError(error: Error): string {
  const message = error.message.toLowerCase();
  if (message.includes('wrong recipient') || message.includes('audience')) {
    return 'audience';
  }
  if (message.includes('signature')) return 'signature';
  if (message.includes('issuer')) return 'issuer';
  if (message.includes('too late') || message.includes('too early')) return 'time';
  if (message.includes('pem') || message.includes('certificate')) return 'certificate';
  return 'other';
}

export class GoogleWorkspaceAddOnRequestVerifier implements GoogleChatRequestVerifier {
  constructor(
    private readonly endpointUrl: string,
    private readonly serviceAccountEmail: string,
    private readonly client: GoogleIdTokenClient = new OAuth2Client(),
  ) {}

  async verify(authorizationHeader: string | null, requestUrl: string): Promise<boolean> {
    const bearerPrefix = 'Bearer ';
    if (!authorizationHeader?.startsWith(bearerPrefix)) {
      console.warn('[google-chat] authentication rejected', { stage: 'bearer' });
      return false;
    }
    if (!isAllowedEndpoint(requestUrl, this.endpointUrl)) {
      console.warn('[google-chat] authentication rejected', { stage: 'request-url' });
      return false;
    }

    const idToken = authorizationHeader.slice(bearerPrefix.length).trim();
    if (idToken.length === 0) return false;

    const tokenAudience = readTokenAudience(idToken);
    if (!tokenAudience || !isAllowedEndpoint(tokenAudience, this.endpointUrl)) {
      console.warn('[google-chat] authentication rejected', { stage: 'token-audience' });
      return false;
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: tokenAudience,
      });
      const payload = ticket.getPayload();
      const accepted =
        payload?.email_verified === true &&
        isExpectedWorkspaceAddOnIdentity(payload.email, this.serviceAccountEmail);
      if (!accepted) {
        console.warn('[google-chat] authentication rejected', { stage: 'identity' });
      }
      return accepted;
    } catch (error) {
      if (error instanceof Error) {
        console.warn('[google-chat] authentication rejected', {
          stage: 'token-verification',
          reason: classifyVerificationError(error),
        });
        return false;
      }
      throw error;
    }
  }
}

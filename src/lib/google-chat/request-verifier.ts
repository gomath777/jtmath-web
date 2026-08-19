import { OAuth2Client } from 'google-auth-library';
import type { GoogleChatRequestVerifier } from './http';

const googleChatIssuer = 'chat@system.gserviceaccount.com';
const googleChatPublicCertsUrl =
  `https://www.googleapis.com/service_accounts/v1/metadata/x509/${googleChatIssuer}`;

type GooglePublicCerts = Readonly<Record<string, string>>;

interface GoogleCertificateTransport {
  request(options: {
    readonly url: string;
    readonly timeout?: number;
  }): Promise<{
    readonly data: unknown;
  }>;
}

export interface GoogleIdTokenClient {
  readonly transporter?: GoogleCertificateTransport;
  verifyIdToken(options: {
    readonly idToken: string;
    readonly audience: string;
  }): Promise<{
    getPayload(): {
      readonly email?: string;
      readonly email_verified?: boolean;
    } | undefined;
  }>;
  verifySignedJwtWithCertsAsync?(
    jwt: string,
    certs: GooglePublicCerts,
    requiredAudience: string | string[],
    issuers?: string[],
  ): Promise<unknown>;
}

type GoogleChatCertsFetcher = (client: GoogleIdTokenClient) => Promise<GooglePublicCerts>;

function isExpectedWorkspaceAddOnIdentity(
  actualEmail: string | undefined,
  configuredEmail: string,
): boolean {
  if (actualEmail === googleChatIssuer) return true;
  if (actualEmail === configuredEmail) return true;

  const configuredMatch = configuredEmail.match(
    /^[^@]*?(\d{6,})[^@]*@(gcp-sa-gsuiteaddons\.iam\.gserviceaccount\.com)$/,
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

function isProjectNumberAudience(audience: string): boolean {
  return /^\d{6,}$/.test(audience);
}

function readConfiguredProjectNumber(serviceAccountEmail: string): string | undefined {
  return serviceAccountEmail.match(/\d{6,}/)?.[0];
}

function isGooglePublicCerts(value: unknown): value is GooglePublicCerts {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((entry) => typeof entry === 'string')
  );
}

async function fetchGoogleChatPublicCerts(
  client: GoogleIdTokenClient,
): Promise<GooglePublicCerts> {
  if (!client.transporter) {
    throw new Error('Google auth client transporter is unavailable');
  }

  const response = await client.transporter.request({
    url: googleChatPublicCertsUrl,
    timeout: 5000,
  });
  if (!isGooglePublicCerts(response.data)) {
    throw new Error('Google Chat public cert response was not a string map');
  }

  return response.data;
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

export class GoogleWorkspaceAddOnRequestVerifier implements GoogleChatRequestVerifier {
  constructor(
    private readonly endpointUrl: string,
    private readonly serviceAccountEmail: string,
    private readonly client: GoogleIdTokenClient = new OAuth2Client(),
    private readonly fetchCerts: GoogleChatCertsFetcher = fetchGoogleChatPublicCerts,
  ) {}

  async verify(authorizationHeader: string | null, requestUrl: string): Promise<boolean> {
    const bearerPrefix = 'Bearer ';
    if (!authorizationHeader?.startsWith(bearerPrefix)) return false;
    if (!isAllowedEndpoint(requestUrl, this.endpointUrl)) return false;

    const idToken = authorizationHeader.slice(bearerPrefix.length).trim();
    if (idToken.length === 0) return false;

    const tokenAudience = readTokenAudience(idToken);
    if (!tokenAudience) {
      return false;
    }

    if (isProjectNumberAudience(tokenAudience)) {
      return this.verifyProjectNumberJwt(idToken, tokenAudience);
    }

    if (!isAllowedEndpoint(tokenAudience, this.endpointUrl)) return false;

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: tokenAudience,
      });
      const payload = ticket.getPayload();
      return (
        payload?.email_verified === true &&
        isExpectedWorkspaceAddOnIdentity(payload.email, this.serviceAccountEmail)
      );
    } catch (error) {
      if (error instanceof Error) return false;
      throw error;
    }
  }

  private async verifyProjectNumberJwt(
    jwt: string,
    tokenAudience: string,
  ): Promise<boolean> {
    const configuredProjectNumber = readConfiguredProjectNumber(this.serviceAccountEmail);
    if (tokenAudience !== configuredProjectNumber) return false;
    if (!this.client.verifySignedJwtWithCertsAsync) return false;

    try {
      const certs = await this.fetchCerts(this.client);
      await this.client.verifySignedJwtWithCertsAsync(
        jwt,
        certs,
        tokenAudience,
        [googleChatIssuer],
      );
      return true;
    } catch (error) {
      if (error instanceof Error) return false;
      throw error;
    }
  }
}

import { createGoogleChatPost } from '../../../lib/google-chat/http';
import { GoogleWorkspaceAddOnRequestVerifier } from '../../../lib/google-chat/request-verifier';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  const endpointUrl = process.env.GOOGLE_CHAT_ENDPOINT_URL;
  const serviceAccountEmail = process.env.GOOGLE_CHAT_SERVICE_ACCOUNT_EMAIL;

  if (!endpointUrl || !serviceAccountEmail) {
    return Response.json({ error: 'Google Chat is not configured' }, { status: 503 });
  }

  const verifier = new GoogleWorkspaceAddOnRequestVerifier(
    endpointUrl,
    serviceAccountEmail,
  );
  return createGoogleChatPost(verifier)(request);
}

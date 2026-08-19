import { createGoogleChatAiTutorRuntime, type GoogleChatAiTutorRuntimeResult } from '../ai-tutor/runtime';
import { createGoogleChatPost, GoogleChatHandlerUnavailableError, type GoogleChatRequestVerifier } from './http';
import { GoogleWorkspaceAddOnRequestVerifier } from './request-verifier';

export type GoogleChatRouteEnvironment = Readonly<Record<string, string | undefined>>;

export type GoogleChatRouteOptions = {
  readonly env: GoogleChatRouteEnvironment;
  readonly verifierFactory?: (endpointUrl: string, serviceAccountEmail: string) => GoogleChatRequestVerifier;
  readonly runtimeFactory?: (env: GoogleChatRouteEnvironment) => GoogleChatAiTutorRuntimeResult;
};

export function createGoogleChatRoutePost(options: GoogleChatRouteOptions): (request: Request) => Promise<Response> {
  return async (request) => {
    const endpointUrl = options.env.GOOGLE_CHAT_ENDPOINT_URL;
    const serviceAccountEmail = options.env.GOOGLE_CHAT_SERVICE_ACCOUNT_EMAIL;

    if (!endpointUrl || !serviceAccountEmail) {
      return Response.json({ error: 'Google Chat is not configured' }, { status: 503 });
    }

    const verifier = (options.verifierFactory ?? defaultVerifierFactory)(endpointUrl, serviceAccountEmail);
    return createGoogleChatPost(verifier, async (event) => {
      const runtimeFactory = options.runtimeFactory ?? ((env: GoogleChatRouteEnvironment) => createGoogleChatAiTutorRuntime({ env }));
      const tutorRuntime = runtimeFactory(options.env);
      if (!tutorRuntime.ok) throw new GoogleChatHandlerUnavailableError();
      return tutorRuntime.handler(event);
    })(request);
  };
}

function defaultVerifierFactory(endpointUrl: string, serviceAccountEmail: string): GoogleChatRequestVerifier {
  return new GoogleWorkspaceAddOnRequestVerifier(endpointUrl, serviceAccountEmail);
}

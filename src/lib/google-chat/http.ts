import {
  handleGoogleChatEvent,
  InvalidGoogleChatEventError,
  parseGoogleChatEvent,
  type GoogleChatEvent,
  type GoogleChatResponse,
} from './add-on';

export interface GoogleChatRequestVerifier {
  verify(authorizationHeader: string | null, requestUrl: string): Promise<boolean>;
}

export type GoogleChatEventHandler = (event: GoogleChatEvent) => GoogleChatResponse | Promise<GoogleChatResponse>;

export class GoogleChatHandlerUnavailableError extends Error {
  readonly name = 'GoogleChatHandlerUnavailableError';

  constructor() {
    super('Google Chat event handler is unavailable.');
  }
}

export function createGoogleChatPost(
  verifier: GoogleChatRequestVerifier,
  handler: GoogleChatEventHandler = handleGoogleChatEvent,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (!(await verifier.verify(request.headers.get('authorization'), request.url))) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let input: unknown;
    try {
      input = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        return Response.json({ error: 'Invalid JSON' }, { status: 400 });
      }
      throw error;
    }

    try {
      const event = parseGoogleChatEvent(input);
      return Response.json(await handler(event));
    } catch (error) {
      if (error instanceof InvalidGoogleChatEventError) {
        return Response.json({ error: 'Unsupported Google Chat event' }, { status: 400 });
      }
      if (error instanceof GoogleChatHandlerUnavailableError) {
        return Response.json({ error: 'Google Chat handler is unavailable' }, { status: 503 });
      }
      throw error;
    }
  };
}

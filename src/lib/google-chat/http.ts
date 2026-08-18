import {
  handleGoogleChatEvent,
  InvalidGoogleChatEventError,
  parseGoogleChatEvent,
} from './add-on';

export interface GoogleChatRequestVerifier {
  verify(authorizationHeader: string | null, requestUrl: string): Promise<boolean>;
}

export function createGoogleChatPost(
  verifier: GoogleChatRequestVerifier,
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
      return Response.json(handleGoogleChatEvent(event));
    } catch (error) {
      if (error instanceof InvalidGoogleChatEventError) {
        return Response.json({ error: 'Unsupported Google Chat event' }, { status: 400 });
      }
      throw error;
    }
  };
}

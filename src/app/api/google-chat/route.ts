import { createGoogleChatRoutePost } from '../../../lib/google-chat/route-handler';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  return createGoogleChatRoutePost({ env: process.env })(request);
}

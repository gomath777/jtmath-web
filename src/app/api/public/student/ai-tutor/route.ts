import { createWebAiTutorRoutePost } from '../../../../../lib/ai-tutor/web-route';

export const runtime = 'nodejs';
export const maxDuration = 60;

const post = createWebAiTutorRoutePost({ env: process.env });

export async function POST(request: Request): Promise<Response> {
  return post(request);
}

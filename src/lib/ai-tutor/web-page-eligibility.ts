import 'server-only';

import { readWebStudentCookie, verifyStrictWebStudentToken } from './web-auth';
import { parseWebAiTutorConfig, type WebAiTutorEnvironment } from './web-config';
import { resolveWebLessonContext, type WebLessonContextQueryPort } from './web-lesson-context';

export type WebTutorPageEligibilityInput = {
  readonly cookieHeader: string;
  readonly lessonSlug: string;
  readonly env: WebAiTutorEnvironment;
  readonly port: WebLessonContextQueryPort;
  readonly now: Date;
};

export async function shouldShowWebTutorFromPort(input: WebTutorPageEligibilityInput): Promise<boolean> {
  const config = parseWebAiTutorConfig(input.env);
  if (!config.ok || config.config.status !== 'enabled') return false;
  const token = readWebStudentCookie(input.cookieHeader);
  if (token === null) return false;
  const secret = input.env.STUDENT_TOKEN_SECRET ?? '';
  const identity = await verifyStrictWebStudentToken({ token, secret });
  if (identity === null) return false;
  const result = await resolveWebLessonContext({
    port: input.port,
    identity: {
      profileId: identity.profileId,
      slug: identity.slug,
      ...(identity.isMaster === true ? { isMaster: true } : {}),
    },
    lessonSlug: input.lessonSlug,
    now: input.now,
  });
  return result.ok;
}

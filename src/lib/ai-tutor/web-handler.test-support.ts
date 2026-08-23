import { createWebAiTutorPost } from './web-handler';
import { signStrictWebStudentToken } from './web-auth';
import {
  activeToken,
  baseIdentity,
  fakePort,
  lesson,
  now,
  releasedAssignment,
} from './web-lesson-context.test-support';
import type { PreviewWebAdmission, WebAdmissionResult } from './web-admission';
import type { TutorProviderRequest, TutorProviderResult } from './contracts';
import type { WebAiTutorEnvironment } from './web-config';
import type { WebLessonAssignment, WebLessonCurriculumItem, WebLessonSessionBlock, WebLessonStudentToken } from './web-lesson-context';
import type { WebProblemImageStore } from './web-problem-image';
import type { WebTutorGuideStore } from './web-tutor-guide-store';
import type { WebTutorRoutedProvider } from './web-provider-routing';
import type { WebTutorServerContinuity } from './web-conversation-continuity';
import type { WebConversationRepository } from './web-conversation-repository';

export const explicitSecret = 'explicit-web-secret';

export const enabledEnv = {
  AI_TUTOR_WEB_ENABLED: 'true',
  AI_TUTOR_PAID_BILLING_CONFIRMED: 'true',
  GEMINI_API_KEY: 'present',
  AI_TUTOR_GEMINI_FAST_MODEL: 'gemini-3.1-flash-lite',
  AI_TUTOR_GEMINI_REASONING_MODEL: 'gemini-3.1-pro',
  AI_TUTOR_GEMINI_FALLBACK_MODEL: 'gemini-3.1-flash',
  STUDENT_TOKEN_SECRET: explicitSecret,
  NEXT_PUBLIC_SUPABASE_URL: 'https://supabase.example.invalid',
  SUPABASE_SERVICE_KEY: 'present',
  VERCEL_ENV: 'preview',
} as const satisfies WebAiTutorEnvironment;

const allowedBlocks: readonly WebLessonSessionBlock[] = [
  {
    id: 'block-handler-trig',
    blockType: 'content_group',
    orderIndex: 1,
    variant: 'honors',
    content: {
      pdfs: [
        { original_name: '삼각함수 레벨1.pdf', cdn_url: 'https://mathgo-pdfs.b-cdn.net/lv1.pdf' },
        { original_name: '삼각함수 레벨2.pdf', cdn_url: 'https://mathgo-pdfs.b-cdn.net/lv2.pdf' },
        { original_name: '삼각함수 레벨3.pdf', cdn_url: 'https://mathgo-pdfs.b-cdn.net/lv3.pdf' },
        { original_name: '삼각함수 레벨4-1.pdf', cdn_url: 'https://mathgo-pdfs.b-cdn.net/lv4-1.pdf' },
        { original_name: '삼각함수 레벨4-2.pdf', cdn_url: 'https://mathgo-pdfs.b-cdn.net/lv4-2.pdf' },
        { original_name: '올스캔 #1 합성 모의.pdf', cdn_url: 'https://mathgo-pdfs.b-cdn.net/allscan.pdf' },
      ],
    },
  },
];

export const answeredResult: TutorProviderResult = {
  answerText: '먼저 각 조건에서 필요한 삼각함수 관계를 찾아보세요. $\\sin^2 x+\\cos^2 x=1$',
  confidence: 0.92,
  subjectSlug: 'ds2',
  conceptTags: ['trigonometry'],
  errorType: null,
  needsTeacherReview: false,
  escalationReason: null,
};

export type WebHandlerFixtureOptions = {
  readonly env?: WebAiTutorEnvironment;
  readonly identity?: { readonly profileId: string; readonly slug: string; readonly isMaster?: boolean };
  readonly tokenRow?: WebLessonStudentToken;
  readonly assignments?: readonly WebLessonAssignment[];
  readonly admissionResult?: WebAdmissionResult;
  readonly providerResult?: TutorProviderResult;
  readonly provider?: WebTutorRoutedProvider;
  readonly pdfBytes?: Uint8Array;
  readonly problemImageStore?: WebProblemImageStore;
  readonly guideStore?: WebTutorGuideStore;
  readonly lesson?: WebLessonCurriculumItem;
  readonly blocks?: readonly WebLessonSessionBlock[];
  readonly conversationRepository?: WebConversationRepository;
  readonly requestIdFactory?: () => string;
  readonly serverContinuity?: WebTutorServerContinuity | ((input: {
    readonly profileId: string;
    readonly lessonSlug: string;
    readonly contextKey: string;
  }) => WebTutorServerContinuity);
};

export function createFixtures(options: WebHandlerFixtureOptions = {}) {
  const lessonPort = fakePort({
    lesson: options.lesson ?? lesson,
    token: options.tokenRow ?? activeToken,
    assignments: options.assignments ?? [releasedAssignment],
    blocksByVariant: { honors: options.blocks ?? allowedBlocks },
  });
  const providerRequests: TutorProviderRequest[] = [];
  let released = false;
  let admissionCalls = 0;
  let fetchCalls = 0;
  const admission: PreviewWebAdmission = {
    tryAcquire: () => {
      admissionCalls += 1;
      return (
        options.admissionResult ?? {
          accepted: true,
          release: () => {
            released = true;
          },
        }
      );
    },
    debugSize: () => 1,
  };
  const handler = createWebAiTutorPost({
    env: { ...enabledEnv, ...options.env },
    studentTokenSecret: explicitSecret,
    lessonPort,
    admission,
    now: () => now,
    provider: options.provider ?? {
      answer: async (request: TutorProviderRequest) => {
        providerRequests.push(request);
        return options.providerResult ?? answeredResult;
      },
    } satisfies WebTutorRoutedProvider,
    fetchPort: {
      fetch: async () => {
        fetchCalls += 1;
        return new Response(new Blob([copyBytes(options.pdfBytes ?? new TextEncoder().encode('%PDF- synthetic'))]), {
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        });
      },
    },
    problemImageStore: options.problemImageStore,
    guideStore: options.guideStore,
    conversationRepository: options.conversationRepository,
    requestIdFactory: options.requestIdFactory,
    serverContinuity: {
      load: async (input) => typeof options.serverContinuity === 'function'
        ? options.serverContinuity(input)
        : options.serverContinuity ?? { recentTurns: [] },
    },
  });
  return {
    lessonPort,
    providerRequests,
    get admissionCalls() {
      return admissionCalls;
    },
    get fetchCalls() {
      return fetchCalls;
    },
    get released() {
      return released;
    },
    post: async (body: unknown, token?: string) => {
      const signed =
        token ??
        (await signStrictWebStudentToken({
          payload: options.identity ?? baseIdentity,
          secret: explicitSecret,
          nowSeconds: nowSeconds(),
        }));
      return handler(new Request('https://jtmath.kr/api/public/student/ai-tutor', {
        method: 'POST',
        headers: { cookie: `student_session=${signed}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }));
    },
  };
}

export function validBody(): unknown {
  return { lessonSlug: 'ds2-trig', selectedMaterialKey: 'm-1-content-pdfs-0', message: '2번 힌트 줘' };
}

export function nowSeconds(): number {
  return Math.floor(now.getTime() / 1000);
}

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

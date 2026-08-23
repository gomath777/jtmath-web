import type { TutorErrorType, TutorProvider, TutorProviderRequest, TutorProviderResult } from './contracts';
import type { AiTutorTokenCounts } from './observability';

export type WebTutorProviderModelAlias = 'fast' | 'reasoning' | 'fallback';

export type WebTutorProviderModel = {
  readonly id: string;
  readonly alias: WebTutorProviderModelAlias;
};

export type WebTutorProviderRouteInput = {
  readonly request: TutorProviderRequest;
  readonly primaryModel: WebTutorProviderModel;
  readonly fallbackModel: WebTutorProviderModel;
};

export type WebTutorProviderRouteMetadata = {
  readonly modelId: string;
  readonly modelAlias: WebTutorProviderModelAlias;
  readonly promptVersion: string;
  readonly latencyMs: number;
  readonly tokenCounts: AiTutorTokenCounts;
  readonly attemptCount: 1 | 2;
  readonly failureCategory: TutorErrorType | null;
};

export type WebTutorProviderRouteAnswer = {
  readonly result: TutorProviderResult;
  readonly metadata: WebTutorProviderRouteMetadata;
};

export type WebTutorRoutedProvider = TutorProvider & {
  readonly answerWithRoute?: (input: WebTutorProviderRouteInput) => Promise<WebTutorProviderRouteAnswer>;
};

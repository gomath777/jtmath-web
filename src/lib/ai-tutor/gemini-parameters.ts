import { ThinkingLevel } from '@google/genai';
import type { TutorProviderRequest } from './contracts';
import { GEMINI_ERROR_TYPE_VALUES, GEMINI_ESCALATION_VALUES } from './gemini-response-parser';
import { buildTutorPrompt } from './prompt';

export type GeminiModelAlias = 'text' | 'vision' | 'fast' | 'reasoning' | 'fallback';
export type GeminiModelSelection = { readonly id: string; readonly alias: GeminiModelAlias };
export type GeminiTextPart = { readonly text: string };
export type GeminiInlineDataPart = { readonly inlineData: { readonly mimeType: string; readonly data: string } };
export type GeminiPart = GeminiTextPart | GeminiInlineDataPart;
export type GeminiContent = { readonly role: 'user'; readonly parts: readonly GeminiPart[] };
export type GeminiGenerateContentConfig = {
  readonly systemInstruction: string;
  readonly temperature: number;
  readonly topP: number;
  readonly topK: number;
  readonly candidateCount: number;
  readonly maxOutputTokens: number;
  readonly responseMimeType: 'application/json';
  readonly responseJsonSchema: GeminiResponseJsonSchema;
  readonly abortSignal?: AbortSignal;
  readonly httpOptions?: { readonly timeout?: number };
  readonly thinkingConfig?: {
    readonly includeThoughts: false;
    readonly thinkingBudget?: 0;
    readonly thinkingLevel?: ThinkingLevel;
  };
  readonly tools?: undefined;
};
export type GeminiGenerateContentParameters = {
  readonly model: string;
  readonly contents: readonly GeminiContent[];
  readonly config: GeminiGenerateContentConfig;
};

export type GeminiResponseJsonSchema = {
  readonly type: 'object';
  readonly additionalProperties: boolean;
  readonly required: readonly string[];
  readonly properties: Readonly<Record<string, unknown>>;
};

const nullableStringEnum = (values: readonly string[]) => ({ anyOf: [{ type: 'string', enum: values }, { type: 'null' }] }) as const;
const tutorResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['answerText', 'confidence', 'subjectSlug', 'conceptTags', 'errorType', 'needsTeacherReview', 'escalationReason'],
  properties: {
    answerText: { type: 'string', minLength: 1, maxLength: 2000 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    subjectSlug: { anyOf: [{ type: 'string', minLength: 1, maxLength: 40 }, { type: 'null' }] },
    conceptTags: { type: 'array', maxItems: 8, items: { type: 'string', minLength: 1, maxLength: 40 } },
    errorType: nullableStringEnum(GEMINI_ERROR_TYPE_VALUES),
    needsTeacherReview: { type: 'boolean' },
    escalationReason: nullableStringEnum(GEMINI_ESCALATION_VALUES),
  },
} as const;

export function buildGeminiParameters(request: TutorProviderRequest, model: GeminiModelSelection): GeminiGenerateContentParameters {
  const prompt = buildTutorPrompt({
    input: request.input,
    context: request.context,
    hasImage: request.image !== undefined,
    hasDocument: request.document !== undefined,
    groundedProblem: request.groundedProblem,
  });
  return {
    model: model.id,
    contents: [{ role: 'user', parts: buildParts(request, prompt.contextBlock, prompt.studentBlock, prompt.responseInstruction) }],
    config: {
      systemInstruction: prompt.system,
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      candidateCount: 1,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      responseJsonSchema: tutorResponseJsonSchema,
      ...thinkingConfigForModel(model.id),
    },
  };
}

function thinkingConfigForModel(modelId: string): Pick<GeminiGenerateContentConfig, 'thinkingConfig'> {
  return isGeminiThreeOrNewer(modelId)
    ? { thinkingConfig: { includeThoughts: false, thinkingLevel: ThinkingLevel.LOW } }
    : { thinkingConfig: { includeThoughts: false, thinkingBudget: 0 } };
}

function isGeminiThreeOrNewer(modelId: string): boolean {
  const match = /^gemini-([0-9]+)/i.exec(modelId);
  return match !== null && Number(match[1]) >= 3;
}

function buildParts(request: TutorProviderRequest, contextBlock: string, studentBlock: string, responseInstruction: string): readonly GeminiPart[] {
  const parts: GeminiPart[] = [{ text: contextBlock }, { text: studentBlock }, { text: responseInstruction }];
  if (request.image !== undefined) {
    return [...parts, { inlineData: { mimeType: request.image.mimeType, data: Buffer.from(request.image.bytes).toString('base64') } }];
  }
  if (request.document !== undefined) {
    return [...parts, { inlineData: { mimeType: request.document.mimeType, data: Buffer.from(request.document.bytes).toString('base64') } }];
  }
  return parts;
}

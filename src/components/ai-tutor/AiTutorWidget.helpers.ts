import type { WebTutorTarget } from '@/lib/ai-tutor/web-input';

export const MAX_TUTOR_TURNS = 6;

type StudentTurn = {
  readonly id: string;
  readonly role: 'student';
  readonly text: string;
};

type TutorReplyTurn = {
  readonly id: string;
  readonly role: 'tutor';
  readonly text: string;
};

export type TutorTurn = StudentTurn | TutorReplyTurn;

type AnsweredWebTutorResponse = {
  readonly status: 'answered' | 'teacher_review';
  readonly message: string;
  readonly resolvedTarget: WebTutorTarget;
};

export type WebTutorResponse =
  | AnsweredWebTutorResponse
  | { readonly status: 'ambiguous_material'; readonly message: string }
  | { readonly status: 'provider_unavailable'; readonly message: string; readonly resolvedTarget?: WebTutorTarget }
  | { readonly status: 'rate_limited' | 'material_unavailable' | 'stale_target' | 'invalid_request' | 'unauthorized' | 'forbidden' | 'disabled'; readonly message: string };

const retryableProviderMessage = '답변 생성이 끊겼어요. 같은 문제로 다시 보내면 이어서 도와줄게요.';

export function appendTutorTurn(history: readonly TutorTurn[], turn: TutorTurn): readonly TutorTurn[] {
  return [...history, turn].slice(-MAX_TUTOR_TURNS);
}

export function isTutorSubmitShortcut(key: string, shiftKey: boolean, isComposing = false): boolean {
  return key === 'Enter' && !shiftKey && !isComposing;
}

export type TutorMaterialReference = {
  readonly materialKey: string;
  readonly label: string;
  readonly sideLabel?: string;
};

export function hasTutorMaterialSource(
  message: string,
  materials: readonly TutorMaterialReference[],
  selectedMaterialKey?: string,
  resolvedTarget?: WebTutorTarget,
): boolean {
  if (selectedMaterialKey !== undefined) return true;
  if (resolvedTarget !== undefined) return true;
  const normalizedMessage = normalizeMaterialReference(message);
  return materials.some((material) => normalizedMessage.includes(normalizeMaterialReference(material.label)));
}

function normalizeMaterialReference(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/[\s\-－–—]/gu, '');
}

export function createTutorTurnId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `turn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function parseTutorResponse(value: unknown): WebTutorResponse {
  if (!isRecord(value) || typeof value['status'] !== 'string' || typeof value['message'] !== 'string') {
    return { status: 'provider_unavailable', message: retryableProviderMessage };
  }
  switch (value['status']) {
    case 'answered':
    case 'teacher_review': {
      return isWebTutorTarget(value['resolvedTarget'])
        ? {
          status: value['status'],
          message: value['message'],
          resolvedTarget: value['resolvedTarget'],
        }
        : { status: 'provider_unavailable', message: retryableProviderMessage };
    }
    case 'ambiguous_material':
      return { status: 'ambiguous_material', message: value['message'] };
    case 'provider_unavailable':
      return {
        status: 'provider_unavailable',
        message: value['message'],
        ...(isWebTutorTarget(value['resolvedTarget']) ? { resolvedTarget: value['resolvedTarget'] } : {}),
      };
    case 'rate_limited':
    case 'material_unavailable':
    case 'stale_target':
    case 'invalid_request':
    case 'unauthorized':
    case 'forbidden':
    case 'disabled':
      return { status: value['status'], message: value['message'] };
    default:
      return { status: 'provider_unavailable', message: retryableProviderMessage };
  }
}

export function handleTutorResponse(
  response: WebTutorResponse,
  setHistory: (updater: (history: readonly TutorTurn[]) => readonly TutorTurn[]) => void,
  setResolvedTarget: (target: WebTutorTarget | undefined) => void,
  setRetryCopy: (copy: string | null) => void,
  nextId: () => string,
): void {
  switch (response.status) {
    case 'answered':
    case 'teacher_review':
      setResolvedTarget(response.resolvedTarget);
      setHistory((history) => appendTutorTurn(history, toTutorReplyTurn(nextId(), response.message)));
      return;
    case 'ambiguous_material':
      setHistory((history) => appendTutorTurn(history, { id: nextId(), role: 'tutor', text: response.message }));
      return;
    case 'rate_limited':
    case 'provider_unavailable':
    case 'material_unavailable':
      if (response.status === 'provider_unavailable' && response.resolvedTarget !== undefined) {
        setResolvedTarget(response.resolvedTarget);
      }
      setRetryCopy('잠시 후 다시 시도해 주세요.');
      setHistory((history) => appendTutorTurn(history, { id: nextId(), role: 'tutor', text: response.message }));
      return;
    case 'stale_target':
    case 'invalid_request':
    case 'unauthorized':
    case 'forbidden':
    case 'disabled':
      setResolvedTarget(undefined);
      setHistory((history) => appendTutorTurn(history, { id: nextId(), role: 'tutor', text: response.message }));
      return;
    default:
      assertNever(response);
  }
}

function isWebTutorTarget(value: unknown): value is WebTutorTarget {
  return isRecord(value)
    && typeof value['contextKey'] === 'string'
    && typeof value['materialKey'] === 'string'
    && isProblemNumber(value['problemNumber']);
}

function isProblemNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 999;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toTutorReplyTurn(id: string, text: string): TutorReplyTurn {
  return { id, role: 'tutor', text };
}

function assertNever(value: never): never {
  throw new Error(`Unexpected AI tutor response: ${String(value)}`);
}

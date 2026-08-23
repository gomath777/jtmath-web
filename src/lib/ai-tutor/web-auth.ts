import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const WEB_STUDENT_COOKIE_NAME = 'student_session';
export const WEB_STUDENT_COOKIE_MAX_AGE_SECONDS = 50 * 24 * 60 * 60;

const payloadSchema = z
  .object({
    profileId: z.string().trim().min(1).max(120),
    slug: z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/),
    exp: z.number().int().positive(),
    isMaster: z.boolean().optional(),
  })
  .strict();

export type StrictWebStudentTokenPayload = Readonly<z.infer<typeof payloadSchema>>;

export type VerifyStrictWebStudentTokenInput = {
  readonly token: string;
  readonly secret: string;
  readonly nowSeconds?: number;
};

export async function signStrictWebStudentToken(input: {
  readonly payload: Omit<StrictWebStudentTokenPayload, 'exp'> & { readonly exp?: number };
  readonly secret: string;
  readonly nowSeconds?: number;
}): Promise<string> {
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const payload = payloadSchema.parse({
    ...input.payload,
    exp: input.payload.exp ?? nowSeconds + WEB_STUDENT_COOKIE_MAX_AGE_SECONDS,
  });
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${payloadB64}.${signature(payloadB64, input.secret)}`;
}

export async function verifyStrictWebStudentToken(
  input: VerifyStrictWebStudentTokenInput,
): Promise<StrictWebStudentTokenPayload | null> {
  const [payloadB64, sigB64, extra] = input.token.split('.');
  if (!payloadB64 || !sigB64 || extra !== undefined) return null;
  const expected = signature(payloadB64, input.secret);
  if (!safeEqual(expected, sigB64)) return null;
  const decoded = decodePayload(payloadB64);
  if (decoded === null) return null;
  const parsed = payloadSchema.safeParse(decoded);
  if (!parsed.success) return null;
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  return parsed.data.exp > nowSeconds ? parsed.data : null;
}

export function readWebStudentCookie(cookieHeader: string | null): string | null {
  if (cookieHeader === null) return null;
  for (const part of cookieHeader.split(';')) {
    const [name, ...valueParts] = part.trim().split('=');
    if (name === WEB_STUDENT_COOKIE_NAME) return valueParts.join('=') || null;
  }
  return null;
}

export function buildRenewedWebStudentCookie(input: {
  readonly token: string;
  readonly secure: boolean;
}): string {
  const secure = input.secure ? '; Secure' : '';
  return `${WEB_STUDENT_COOKIE_NAME}=${input.token}; Max-Age=${WEB_STUDENT_COOKIE_MAX_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function signature(payloadB64: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.byteLength === rightBytes.byteLength && timingSafeEqual(leftBytes, rightBytes);
}

function decodePayload(payloadB64: string): unknown | null {
  try {
    return JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof Error) return null;
    throw error;
  }
}

function base64UrlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

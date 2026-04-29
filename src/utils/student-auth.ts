/**
 * Student authentication via HMAC-SHA256 tokens
 * Separate from Supabase Auth — uses httpOnly cookies
 * 50-day activity-based expiry (renewed on each access)
 */

import { NextRequest, NextResponse } from 'next/server';

const SECRET_KEY = process.env.STUDENT_TOKEN_SECRET || 'dev-fallback-secret-change-me';
const COOKIE_NAME = 'student_session';
const EXPIRY_DAYS = 50;

interface TokenPayload {
  profileId: string;
  slug: string;
  exp: number; // Unix timestamp
  isMaster?: boolean; // true when authenticated via ADMIN_MASTER_PIN — exclude from activity tracking
}

// --- Crypto helpers (Edge Runtime compatible, zero dependencies) ---

async function getKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function base64UrlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  const str = btoa(binary);
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): ArrayBuffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

// --- Token creation & verification ---

export async function signToken(profileId: string, slug: string, isMaster?: boolean): Promise<string> {
  const payload: TokenPayload = {
    profileId,
    slug,
    exp: Math.floor(Date.now() / 1000) + EXPIRY_DAYS * 86400,
    ...(isMaster ? { isMaster: true } : {}),
  };

  const encoder = new TextEncoder();
  const payloadStr = JSON.stringify(payload);
  const payloadBytes = encoder.encode(payloadStr);
  const payloadB64 = base64UrlEncode(payloadBytes);

  const key = await getKey();
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const sigB64 = base64UrlEncode(new Uint8Array(sigBuffer));

  return `${payloadB64}.${sigB64}`;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const [payloadB64, sigB64] = token.split('.');
    if (!payloadB64 || !sigB64) return null;

    const key = await getKey();
    const encoder = new TextEncoder();
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(sigB64),
      encoder.encode(payloadB64),
    );

    if (!isValid) return null;

    const payloadStr = new TextDecoder().decode(new Uint8Array(base64UrlDecode(payloadB64)));
    const payload: TokenPayload = JSON.parse(payloadStr);

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// --- Cookie helpers ---

export function setStudentCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: EXPIRY_DAYS * 86400,
  });
  return res;
}

export function getStudentToken(req: NextRequest): string | undefined {
  return req.cookies.get(COOKIE_NAME)?.value;
}

/**
 * Verify student from request cookies.
 * Returns payload or null if invalid/expired.
 */
export async function getStudentFromRequest(req: NextRequest): Promise<TokenPayload | null> {
  const token = getStudentToken(req);
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Renew the cookie expiry (call on each successful access).
 * Returns a new token with refreshed expiry.
 */
export async function renewToken(payload: TokenPayload): Promise<string> {
  return signToken(payload.profileId, payload.slug, payload.isMaster);
}

/**
 * Generate a random slug: jt- + 5 alphanumeric chars
 */
export function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(5)))
    .map(b => chars[b % chars.length])
    .join('');
  return `jt-${randomPart}`;
}

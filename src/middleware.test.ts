import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { config, middleware } from './middleware';

test('Given absent Supabase configuration When the PDF download route is requested Then it bypasses Supabase session middleware', async () => {
  // Given
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  try {
    // When
    const response = await middleware(
      new NextRequest(
        'https://jtmath.kr/api/public/pdf-download?url=https%3A%2F%2Fmathgo-pdfs.b-cdn.net%2Flesson.pdf',
      ),
    );

    // Then
    assert.equal(response.headers.get('x-middleware-next'), '1');
  } finally {
    if (supabaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    }

    if (supabaseAnonKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey;
    }
  }
});

test('Google Chat webhook bypasses the Supabase session middleware', () => {
  const matcher = config.matcher[0];
  const middlewarePattern = new RegExp(`^${matcher}$`);

  assert.equal(
    middlewarePattern.test('/api/google-chat'),
    false,
    'the webhook must stay reachable when Preview Supabase variables are absent',
  );
});

test('PDF downloads and protected student paths remain in the existing middleware matcher scope', () => {
  // Given
  const matcher = config.matcher[0];
  const middlewarePattern = new RegExp(`^${matcher}$`);

  // When / Then
  assert.equal(middlewarePattern.test('/api/public/pdf-download'), true);
  assert.equal(middlewarePattern.test('/s/example'), true);
});

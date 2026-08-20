import assert from 'node:assert/strict';
import test from 'node:test';
import { config } from './middleware';

test('Google Chat webhook bypasses the Supabase session middleware', () => {
  const matcher = config.matcher[0];
  const middlewarePattern = new RegExp(`^${matcher}$`);

  assert.equal(
    middlewarePattern.test('/api/google-chat'),
    false,
    'the webhook must stay reachable when Preview Supabase variables are absent',
  );
});

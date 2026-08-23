import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRenewedWebStudentCookie,
  readWebStudentCookie,
  signStrictWebStudentToken,
  verifyStrictWebStudentToken,
} from './web-auth';

test('Given explicit secret token When verifying strictly Then only that secret is accepted', async () => {
  const token = await signStrictWebStudentToken({
    payload: { profileId: 'profile-synthetic', slug: 'jt-synth' },
    secret: 'explicit-secret',
    nowSeconds: 10,
  });

  assert.equal((await verifyStrictWebStudentToken({ token, secret: 'explicit-secret', nowSeconds: 11 }))?.profileId, 'profile-synthetic');
  assert.equal(await verifyStrictWebStudentToken({ token, secret: 'dev-fallback-secret-change-me', nowSeconds: 11 }), null);
});

test('Given expired strict token When verifying Then it is rejected', async () => {
  const token = await signStrictWebStudentToken({
    payload: { profileId: 'profile-synthetic', slug: 'jt-synth', exp: 11 },
    secret: 'explicit-secret',
  });

  assert.equal(await verifyStrictWebStudentToken({ token, secret: 'explicit-secret', nowSeconds: 11 }), null);
});

test('Given cookie header When reading and renewing Then portal attributes are preserved', () => {
  assert.equal(readWebStudentCookie('other=x; student_session=abc.def; theme=dark'), 'abc.def');
  assert.equal(
    buildRenewedWebStudentCookie({ token: 'abc.def', secure: true }),
    'student_session=abc.def; Max-Age=4320000; Path=/; HttpOnly; SameSite=Lax; Secure',
  );
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { isMidtermFrontAdminEntry } from './policy';

test('Given an existing administrator passcode match When entering from the student front Then it is recognized before student lookup', () => {
  const result = isMidtermFrontAdminEntry({
    birthPin: '999999',
    verifyAdminPasscode: (value) => value === '999999',
  });

  assert.equal(result, true);
});

test('Given a student birth pin When it does not match the administrator verifier Then it continues as a student entry', () => {
  const result = isMidtermFrontAdminEntry({
    birthPin: '111111',
    verifyAdminPasscode: () => false,
  });

  assert.equal(result, false);
});

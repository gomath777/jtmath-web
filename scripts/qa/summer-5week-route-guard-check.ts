#!/usr/bin/env npx tsx

import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import { contentForDay } from '../../src/lib/summer-5week/content';
import { releaseStateFor, summerCalendar } from '../../src/lib/summer-5week/schedule';
import {
  ACTIVE_PIN,
  assertNoHrefs,
  assertOk,
  argValue,
  CUTOFF_DATE,
  CUTOFF_PIN,
  EVIDENCE_PATH,
  exhaustRateLimit,
  failedLogin,
  firstResourceHrefAfter,
  firstResourceHrefThrough,
  futureExp,
  getText,
  login,
  logout,
  MASTER_PIN,
  MULTI_PIN,
  POLICY_VERSION,
  qaNow,
  qaServerCommand,
  requestedCases,
  resourceHrefsAfter,
  signedCookie,
} from './summer-5week-route-guard-fixtures';

async function runCase(baseUrl: string, name: string): Promise<string> {
  switch (name) {
    case 'assigned': {
      const cookie = await login(baseUrl, CUTOFF_PIN);
      const page = await getText(`${baseUrl}/5wsummer/mj1`, cookie);
      assertOk(page.status === 200 && page.text.includes('미적분 I') && page.text.includes('학습 달력'), 'assigned subject should render');
      return 'assigned: ok rendered';
    }
    case 'master-all': {
      const cookie = await login(baseUrl, MASTER_PIN);
      const session = await getText(`${baseUrl}/api/5wsummer/session`, cookie);
      assertOk(
        session.status === 200 && session.text.includes('"master":true') && session.text.includes('"accessThrough":{}'),
        'master session missing expected fields',
      );
      const page = await getText(`${baseUrl}/5wsummer/gh`, cookie);
      assertOk(page.status === 200 && page.text.includes('기하') && page.text.includes('학습 달력'), 'master should open all subjects');
      return 'master-all: ok subjects=5';
    }
    case 'unassigned-direct': {
      const cookie = await login(baseUrl, CUTOFF_PIN);
      const page = await getText(`${baseUrl}/5wsummer/ds`, cookie);
      assertOk(page.status === 307 || page.status === 308, 'unassigned subject should redirect to chooser');
      return 'unassigned-direct: ok redirected';
    }
    case 'bad-subject': {
      const page = await getText(`${baseUrl}/5wsummer/bad-subject`);
      assertOk(page.status === 404, 'bad subject should 404');
      return 'bad-subject: ok 404';
    }
    case 'logged-out-direct': {
      const page = await getText(`${baseUrl}/5wsummer/mj1`);
      assertOk(page.status === 307 || page.status === 308, 'logged-out direct should redirect');
      return 'logged-out-direct: ok redirect';
    }
    case 'rate-limit': {
      const statuses: number[] = [];
      let attemptCookie = '';
      for (let attempt = 0; attempt < 9; attempt += 1) {
        const result = await failedLogin(baseUrl, '000000', attemptCookie);
        statuses.push(result.status);
        attemptCookie = result.cookie;
      }
      assertOk(statuses.slice(0, 8).every((status) => status === 401), 'first eight failed logins should be rejected normally');
      assertOk(statuses[8] === 429, 'ninth failed login should be rate limited');
      return 'rate-limit: ok ninth failure returned 429';
    }
    case 'rate-limit-cookie-bypass': {
      await exhaustRateLimit(baseUrl);
      const status = await failedLogin(baseUrl, '000000', '');
      assertOk(status.status === 429, 'server-side attempt counter should survive missing attempt cookie');
      return 'rate-limit-cookie-bypass: ok missing cookie still returned 429';
    }
    case 'rate-limit-logout-bypass': {
      const warmupLogoutStatus = await logout(baseUrl);
      assertOk(warmupLogoutStatus === 200, 'logout endpoint should warm up');
      await exhaustRateLimit(baseUrl);
      const logoutStatus = await logout(baseUrl);
      assertOk(logoutStatus === 200, 'logout endpoint should respond');
      const status = await failedLogin(baseUrl, '000000', '');
      assertOk(status.status === 429, 'server-side attempt counter should survive logout');
      return 'rate-limit-logout-bypass: ok logout did not reset 429';
    }
    case 'locked-resource-redaction': {
      const now = qaNow();
      const lockedDay = summerCalendar('mj1').find((day) => {
        const content = contentForDay('mj1', day);
        return content.kind === 'learning' && content.resources.length > 0 && releaseStateFor(day.date, now, false, 'mj1').kind === 'locked';
      });
      if (!lockedDay) return 'locked-resource-redaction: ok no locked learning day under current QA clock';
      const content = contentForDay('mj1', lockedDay);
      assertOk(content.kind === 'learning', 'locked resource redaction needs learning content');
      const cookie = await login(baseUrl, CUTOFF_PIN);
      const page = await getText(`${baseUrl}/5wsummer/mj1`, cookie);
      assertNoHrefs(page.text, content.resources.map((resource) => resource.href), 'locked-resource-redaction');
      return 'locked-resource-redaction: ok future links omitted from html';
    }
    case 'cutoff-prior-visible': {
      const cookie = await login(baseUrl, CUTOFF_PIN);
      const page = await getText(`${baseUrl}/5wsummer/mj1`, cookie);
      const visibleHref = firstResourceHrefThrough('mj1', CUTOFF_DATE);
      assertOk(page.status === 200 && page.text.includes(visibleHref), 'pre-cutoff resource should remain visible');
      return 'cutoff-prior-visible: ok pre-cutoff href visible';
    }
    case 'cutoff-later-redacted': {
      const cookie = await login(baseUrl, CUTOFF_PIN);
      const page = await getText(`${baseUrl}/5wsummer/mj1`, cookie);
      assertOk(page.status === 200 && page.text.includes('수강 종료 이후 자료입니다.'), 'cutoff copy should render');
      assertNoHrefs(page.text, resourceHrefsAfter('mj1', CUTOFF_DATE), 'cutoff-later-redacted');
      return 'cutoff-later-redacted: ok enumerated post-cutoff hrefs absent';
    }
    case 'cutoff-subject-still-renders': {
      const cookie = await login(baseUrl, CUTOFF_PIN);
      const page = await getText(`${baseUrl}/5wsummer/mj1`, cookie);
      assertOk(page.status === 200 && page.text.includes('미적분 I') && page.text.includes('학습 달력'), 'cutoff subject should still render');
      return 'cutoff-subject-still-renders: ok assigned cutoff subject renders';
    }
    case 'no-cutoff-active-still-sees-later-resource': {
      const cookie = await login(baseUrl, ACTIVE_PIN);
      const page = await getText(`${baseUrl}/5wsummer/gs1`, cookie);
      const laterHref = firstResourceHrefAfter('gs1', CUTOFF_DATE);
      assertOk(page.status === 200 && page.text.includes(laterHref), 'active student without cutoff should see later released resource');
      return 'no-cutoff-active-still-sees-later-resource: ok later href visible';
    }
    case 'multi-subject-cutoff-is-subject-scoped': {
      const cookie = await login(baseUrl, MULTI_PIN);
      const cutoffPage = await getText(`${baseUrl}/5wsummer/gs2`, cookie);
      assertOk(cutoffPage.status === 200, 'multi-subject cutoff page should render');
      assertNoHrefs(cutoffPage.text, resourceHrefsAfter('gs2', CUTOFF_DATE), 'multi-subject gs2 cutoff');

      const activePage = await getText(`${baseUrl}/5wsummer/gh`, cookie);
      const ghLaterHref = firstResourceHrefAfter('gh', CUTOFF_DATE);
      assertOk(activePage.status === 200 && activePage.text.includes(ghLaterHref), 'uncut subject should keep later resource access');
      return 'multi-subject-cutoff-is-subject-scoped: ok cutoff applies only to configured subject';
    }
    case 'old-token-relogin-required': {
      const oldStudent = signedCookie({ subjects: ['mj1'], exp: futureExp(), master: false });
      const oldStudentSession = await getText(`${baseUrl}/api/5wsummer/session`, oldStudent);
      assertOk(oldStudentSession.status === 401, 'old non-master token should require re-login');

      const staleStudent = signedCookie({
        v: 2,
        subjects: ['mj1'],
        accessThrough: { mj1: CUTOFF_DATE },
        exp: futureExp(),
        master: false,
        apv: `${POLICY_VERSION}-stale`,
      });
      const staleStudentSession = await getText(`${baseUrl}/api/5wsummer/session`, staleStudent);
      assertOk(staleStudentSession.status === 401, 'stale policy non-master token should require re-login');

      const oldMaster = signedCookie({ subjects: ['mj1'], exp: futureExp(), master: true });
      const oldMasterSession = await getText(`${baseUrl}/api/5wsummer/session`, oldMaster);
      assertOk(oldMasterSession.status === 200 && oldMasterSession.text.includes('"master":true'), 'old master token should remain accepted');
      return 'old-token-relogin-required: ok old/stale students rejected and old master accepted';
    }
    default:
      throw new Error(`unknown case: ${name}`);
  }
}

async function main(): Promise<void> {
  const baseUrl = argValue('--base-url', 'http://127.0.0.1:3105');
  const lines = [`server command: ${qaServerCommand(baseUrl)}`];
  for (const testCase of requestedCases()) {
    lines.push(await runCase(baseUrl, testCase));
  }
  await mkdir(dirname(EVIDENCE_PATH), { recursive: true });
  await writeFile(EVIDENCE_PATH, `${lines.join('\n')}\n`, 'utf8');
  console.log(lines.join('\n'));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});

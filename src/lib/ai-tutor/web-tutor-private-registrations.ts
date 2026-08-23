import 'server-only';

import ds201 from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/runtime-registration/registration-01-ds2-shimhwa-06-d9d616-b150aa4fab8e.json';
import ds202 from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/runtime-registration/registration-02-ds2-shimhwa-06-d9d616-e1d8ffb07aa8.json';
import ds203 from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/runtime-registration/registration-03-ds2-shimhwa-06-d9d616-7193201de86a.json';
import ds204 from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/runtime-registration/registration-04-ds2-shimhwa-01-840561-af3f4826a5ad.json';
import ds205 from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/runtime-registration/registration-05-ds2-shimhwa-01-840561-9e7b0c82c1bd.json';
import ds206 from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/runtime-registration/registration-06-ds2-shimhwa-01-840561-c9743a3c651d.json';
import ds207 from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/runtime-registration/registration-07-ds2-shimhwa-01-840561-92d00580cc20.json';
import ds208 from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/runtime-registration/registration-08-ds2-shimhwa-05-da57ce-78014ddd48c2.json';
import ds209 from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/runtime-registration/registration-09-ds2-shimhwa-05-da57ce-e7b7e0c3fd68.json';
import ds210 from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/runtime-registration/registration-10-ds2-shimhwa-05-da57ce-1e3920abf178.json';
import ds211 from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/runtime-registration/registration-11-ds2-shimhwa-03-0240bd-65d0f3493e98.json';
import ds212 from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/runtime-registration/registration-12-ds2-shimhwa-03-0240bd-8e6d732c29b9.json';
import ds213 from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/runtime-registration/registration-13-ds2-shimhwa-03-0240bd-7d3847287815.json';
import ds214 from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/runtime-registration/registration-14-ds2-shimhwa-03-0240bd-75533c2f1b75.json';
import ds215 from '../../data/ai-tutor-guides/2026-midterm-w1s2/ds2/runtime-registration/registration-15-ds2-shimhwa-03-0240bd-9266ee48840f.json';
import gh01 from '../../data/ai-tutor-guides/2026-midterm-w1s2/gh/runtime-registration/registration-01-gh-level42.json';
import gh02 from '../../data/ai-tutor-guides/2026-midterm-w1s2/gh/runtime-registration/registration-02-gh-level1.json';
import gh03 from '../../data/ai-tutor-guides/2026-midterm-w1s2/gh/runtime-registration/registration-03-gh-level2.json';
import gh04 from '../../data/ai-tutor-guides/2026-midterm-w1s2/gh/runtime-registration/registration-04-gh-level3.json';
import gh05 from '../../data/ai-tutor-guides/2026-midterm-w1s2/gh/runtime-registration/registration-05-gh-level5.json';
import gh06 from '../../data/ai-tutor-guides/2026-midterm-w1s2/gh/runtime-registration/registration-06-gh-allscan.json';
import gs201 from '../../data/ai-tutor-guides/2026-midterm-w1s2/gs2/runtime-registration/registration-01-gs2-line-level1.json';
import gs202 from '../../data/ai-tutor-guides/2026-midterm-w1s2/gs2/runtime-registration/registration-02-gs2-line-level2.json';
import gs203 from '../../data/ai-tutor-guides/2026-midterm-w1s2/gs2/runtime-registration/registration-03-gs2-line-level3.json';
import gs204 from '../../data/ai-tutor-guides/2026-midterm-w1s2/gs2/runtime-registration/registration-04-gs2-line-level4-2.json';
import gs205 from '../../data/ai-tutor-guides/2026-midterm-w1s2/gs2/runtime-registration/registration-05-gs2-line-level5.json';
import gs206 from '../../data/ai-tutor-guides/2026-midterm-w1s2/gs2/runtime-registration/registration-06-gs2-line-allscan.json';
import mj101 from '../../data/ai-tutor-guides/2026-midterm-w1s2/mj1/runtime-registration/registration-01-mj1-limit-level42.json';
import mj102 from '../../data/ai-tutor-guides/2026-midterm-w1s2/mj1/runtime-registration/registration-02-mj1-limit-stage1.json';
import mj103 from '../../data/ai-tutor-guides/2026-midterm-w1s2/mj1/runtime-registration/registration-03-mj1-limit-stage2.json';
import mj104 from '../../data/ai-tutor-guides/2026-midterm-w1s2/mj1/runtime-registration/registration-04-mj1-limit-stage3.json';
import mj105 from '../../data/ai-tutor-guides/2026-midterm-w1s2/mj1/runtime-registration/registration-05-mj1-limit-level5.json';
import mj106 from '../../data/ai-tutor-guides/2026-midterm-w1s2/mj1/runtime-registration/registration-06-mj1-limit-allscan.json';

const SHA256_HEX = /^[a-f0-9]{64}$/;
const REGISTRATIONS = [
  ds201, ds202, ds203, ds204, ds205, ds206, ds207, ds208, ds209, ds210, ds211, ds212, ds213, ds214, ds215,
  gh01, gh02, gh03, gh04, gh05, gh06,
  gs201, gs202, gs203, gs204, gs205, gs206,
  mj101, mj102, mj103, mj104, mj105, mj106,
] as const;

type RegistrationEntry = {
  readonly catalogEntry: { readonly manifestKey: string };
  readonly guideSha256: string;
};

type Registration = {
  readonly entries: readonly RegistrationEntry[];
};

export function defaultWebTutorGuideAssetHashes(): ReadonlyMap<string, string> {
  const hashes = new Map<string, string>();
  for (const registration of REGISTRATIONS) {
    for (const entry of registrationEntries(registration)) {
      if (SHA256_HEX.test(entry.guideSha256)) {
        hashes.set(entry.catalogEntry.manifestKey, entry.guideSha256);
      }
    }
  }
  return hashes;
}

function registrationEntries(registration: Registration): readonly RegistrationEntry[] {
  return registration.entries;
}

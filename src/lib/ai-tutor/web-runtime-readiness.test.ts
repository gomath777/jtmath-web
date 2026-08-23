import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalWebAiTutorRuntimeDependencies, createPreviewWebAiTutorRuntimeDependencies } from './web-runtime-readiness';
import { createPrivateReadinessFixture } from './web-runtime-readiness.test-support';
import { completeWebEnv } from './web-config.test-support';
import { parseWebAiTutorConfig } from './web-config';
import type { PrivateTutorGuideObjectPort } from './private-tutor-guide-asset-store';
import type { WebSupabaseReadinessClient } from './web-runtime-supabase-adapter';
import type { WebSupabaseDataClient } from './web-conversation-supabase';
import type {
  SupabaseResult,
  WebSupabaseQueryBuilder,
  WebSupabaseQueryStarter,
} from './web-conversation-supabase-core';

test('Given preview tables return PGRST205 When runtime readiness checks Then persistence is unavailable', async () => {
  const config = enabledPreviewConfig();

  const result = await createPreviewWebAiTutorRuntimeDependencies({
    config,
    lessonClient: readySupabaseClient(),
    dataClient: dataClient(),
    readinessClient: missingTablesClient(),
    objectPort: missingObjectPort(),
  });

  assert.deepEqual(result, { ok: false, reason: 'persistence_unavailable' });
});

test('Given preview private guide object is missing When runtime readiness checks Then private assets are unavailable', async () => {
  const config = enabledPreviewConfig();

  const result = await createPreviewWebAiTutorRuntimeDependencies({
    config,
    lessonClient: readySupabaseClient(),
    dataClient: dataClient(),
    readinessClient: readySupabaseClient(),
    objectPort: missingObjectPort(),
  });

  assert.deepEqual(result, { ok: false, reason: 'private_assets_unavailable' });
});

test('Given local runtime When dependencies are created Then filesystem guide stores are allowed without persistence tables', async () => {
  const configResult = parseWebAiTutorConfig({ ...completeWebEnv, VERCEL_ENV: undefined }, { nodeEnv: 'test' });
  assert.equal(configResult.ok, true);
  if (!configResult.ok || configResult.config.status !== 'enabled') assert.fail('expected enabled local config');

  const result = await createLocalWebAiTutorRuntimeDependencies({
    config: configResult.config,
    lessonClient: readySupabaseClient(),
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(typeof result.dependencies.lessonPort.loadCurriculumItemBySlug, 'function');
    assert.equal(typeof result.dependencies.guideStore?.load, 'function');
    assert.equal(typeof result.dependencies.problemImageStore?.load, 'function');
    assert.equal(result.dependencies.conversationRepository, undefined);
  }
});

test('Given ready preview private objects When runtime dependencies are created Then guide and problem stores load private assets', async () => {
  const fixture = createPrivateReadinessFixture();

  const result = await createPreviewWebAiTutorRuntimeDependencies({
    config: enabledPreviewConfig(),
    lessonClient: readySupabaseClient(),
    dataClient: dataClient(),
    readinessClient: readySupabaseClient(),
    objectPort: fixture.objectPort,
    catalog: fixture.catalog,
    guideAssetHashes: fixture.guideAssetHashes,
  });

  if (!result.ok) assert.fail(`expected ready preview dependencies, got ${result.reason}`);
  const guide = await result.dependencies.guideStore?.load(fixture.target);
  const problem = await result.dependencies.problemImageStore?.load({
    lessonSlug: fixture.target.lessonKey,
    level: fixture.target.level,
    problemNumber: fixture.target.problemNumber,
  });
  assert.equal(guide?.ok, true);
  assert.equal(problem?.ok, true);
  if (problem?.ok) assert.equal(problem.image.sha256Hex, fixture.problemSha256);
});

function enabledPreviewConfig() {
  const result = parseWebAiTutorConfig(completeWebEnv);
  assert.equal(result.ok, true);
  if (!result.ok || result.config.status !== 'enabled') assert.fail('expected enabled preview config');
  return result.config;
}

function readySupabaseClient(): WebSupabaseReadinessClient {
  return {
    from: () => ({
      select: () => ({
        limit: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  };
}

function missingTablesClient(): WebSupabaseReadinessClient {
  return {
    from: () => ({
      select: () => ({
        limit: () => Promise.resolve({ data: null, error: { code: 'PGRST205' } }),
      }),
    }),
  };
}

function missingObjectPort(): PrivateTutorGuideObjectPort {
  return {
    readPrivateObject: async () => ({ ok: false, reason: 'not_found' }),
  };
}

function dataClient(): WebSupabaseDataClient {
  return {
    from: () => queryStarter(),
  };
}

function queryStarter(): WebSupabaseQueryStarter {
  return {
    select: () => queryBuilder(),
    insert: () => queryBuilder(),
    upsert: () => queryBuilder(),
    update: () => queryBuilder(),
  };
}

function queryBuilder(): WebSupabaseQueryBuilder {
  const result: SupabaseResult<unknown> = { data: null, error: null };
  const builder: WebSupabaseQueryBuilder = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    lt: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result),
    then: (onfulfilled, onrejected) => Promise.resolve(result).then(onfulfilled, onrejected),
  };
  return builder;
}

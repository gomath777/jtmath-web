import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { createPrivateTutorGuideStore, type PrivateTutorGuideObjectPort } from './private-tutor-guide-asset-store';
import { createTutorGuideCatalog, serializeTutorGuideCatalog, type TutorGuideCatalog } from './tutor-guide-catalog';
import type { TutorGuideStore, TutorGuideStoreTarget } from './tutor-guide-store';
import { createSupabaseWebConversationRepository, type WebSupabaseDataClient } from './web-conversation-supabase';
import type { WebConversationRepository } from './web-conversation-repository';
import type { EnabledWebAiTutorConfig, WebAiTutorEnvironment } from './web-config';
import type { WebLessonContextQueryPort } from './web-lesson-context';
import { createSupabaseWebLessonPort, type SupabaseWebLessonClient } from './web-route-supabase';
import { createLocalWebProblemImageStore, createPrivateWebProblemImageStore, type WebProblemImageStore } from './web-problem-image';
import { createLocalWebTutorGuideStore, createPrivateWebTutorGuideStore, type WebTutorGuideStore } from './web-tutor-guide-store';
import { defaultWebTutorGuideAssetHashes } from './web-tutor-private-registrations';
import {
  createSupabasePrivateTutorGuideObjectPort,
  toWebSupabaseDataClient,
  toWebSupabaseReadinessClient,
  verifyWebConversationPersistenceReady,
  type WebSupabaseReadinessClient,
} from './web-runtime-supabase-adapter';

export type WebAiTutorRuntimeDependencies = {
  readonly lessonPort: WebLessonContextQueryPort;
  readonly conversationRepository: WebConversationRepository | undefined;
  readonly guideStore: WebTutorGuideStore | undefined;
  readonly problemImageStore: WebProblemImageStore | undefined;
};

export type WebAiTutorRuntimeDependenciesResult =
  | { readonly ok: true; readonly dependencies: WebAiTutorRuntimeDependencies }
  | { readonly ok: false; readonly reason: 'persistence_unavailable' | 'private_assets_unavailable' | 'unsupported_runtime' };

export async function createDefaultWebAiTutorRuntimeDependencies(
  env: WebAiTutorEnvironment,
  config: EnabledWebAiTutorConfig,
): Promise<WebAiTutorRuntimeDependenciesResult> {
  const client: unknown = createClient(env.NEXT_PUBLIC_SUPABASE_URL ?? '', env.SUPABASE_SERVICE_KEY ?? '', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const dataClient = toWebSupabaseDataClient(client);
  const lessonClient = toSupabaseWebLessonClient(dataClient);
  if (config.runtime === 'development' || config.runtime === 'test') {
    return createLocalWebAiTutorRuntimeDependencies({ config, lessonClient });
  }
  if (config.runtime === 'preview' || config.runtime === 'production') {
    return createPreviewWebAiTutorRuntimeDependencies({
      config,
      lessonClient,
      dataClient,
      readinessClient: toWebSupabaseReadinessClient(client),
      objectPort: createSupabasePrivateTutorGuideObjectPort(client),
    });
  }
  return { ok: false, reason: 'unsupported_runtime' };
}

export async function createLocalWebAiTutorRuntimeDependencies(input: Readonly<{
  readonly config: EnabledWebAiTutorConfig;
  readonly lessonClient: SupabaseWebLessonClient;
}>): Promise<WebAiTutorRuntimeDependenciesResult> {
  const guideStore = createLocalWebTutorGuideStore({ nodeEnv: input.config.runtime });
  return {
    ok: true,
    dependencies: {
      lessonPort: createSupabaseWebLessonPort(input.lessonClient),
      conversationRepository: undefined,
      guideStore,
      problemImageStore: createLocalWebProblemImageStore({ guideStore }),
    },
  };
}

export async function createPreviewWebAiTutorRuntimeDependencies(input: Readonly<{
  readonly config: EnabledWebAiTutorConfig;
  readonly lessonClient: SupabaseWebLessonClient;
  readonly dataClient: WebSupabaseDataClient;
  readonly readinessClient: WebSupabaseReadinessClient;
  readonly objectPort: PrivateTutorGuideObjectPort;
  readonly catalog?: TutorGuideCatalog;
  readonly guideAssetHashes?: ReadonlyMap<string, string>;
}>): Promise<WebAiTutorRuntimeDependenciesResult> {
  if (!(await verifyWebConversationPersistenceReady(input.readinessClient))) {
    return { ok: false, reason: 'persistence_unavailable' };
  }
  const catalog = input.catalog ?? createTutorGuideCatalog();
  const guideAssetHashes = input.guideAssetHashes ?? defaultWebTutorGuideAssetHashes();
  const privateGuideStore = createPrivateTutorGuideStore({ catalog, objectPort: input.objectPort, guideAssetHashes });
  const smokeTarget = firstPrivateSmokeTarget(catalog, guideAssetHashes);
  if (smokeTarget === null || !(await privateAssetsReady(privateGuideStore, smokeTarget))) {
    return { ok: false, reason: 'private_assets_unavailable' };
  }
  const guideStore = createPrivateWebTutorGuideStore({ guideStore: privateGuideStore });
  return {
    ok: true,
    dependencies: {
      lessonPort: createSupabaseWebLessonPort(input.lessonClient),
      conversationRepository: createSupabaseWebConversationRepository(input.dataClient),
      guideStore,
      problemImageStore: createPrivateWebProblemImageStore({ guideStore: privateGuideStore }),
    },
  };
}

function firstPrivateSmokeTarget(
  catalog: TutorGuideCatalog,
  guideAssetHashes: ReadonlyMap<string, string>,
): TutorGuideStoreTarget | null {
  for (const entry of serializeTutorGuideCatalog(catalog)) {
    if (entry.status === 'verified' && guideAssetHashes.has(entry.manifestKey)) {
      return {
        lessonKey: entry.target.lessonKey,
        level: entry.target.level,
        problemNumber: entry.target.problemNumber,
      };
    }
  }
  return null;
}

async function privateAssetsReady(store: TutorGuideStore, target: TutorGuideStoreTarget): Promise<boolean> {
  const result = await store.load(target);
  return result.ok;
}

function toSupabaseWebLessonClient(client: WebSupabaseDataClient): SupabaseWebLessonClient {
  return { from: (table) => client.from(table) };
}

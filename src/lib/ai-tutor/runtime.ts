import { handleGoogleChatEvent, type GoogleChatEvent, type GoogleChatResponse } from '../google-chat/add-on';
import { parseAiTutorConfig, type AiTutorEnvironment } from './config';
import { createGoogleChatAiTutorOrchestrator, type GoogleChatAiTutorOrchestratorOptions } from './orchestrator';
import { createGoogleChatAiTutorDependencies } from './runtime-dependencies';

export type GoogleChatAiTutorRuntimeEnvironment = AiTutorEnvironment & Readonly<Record<string, string | undefined>>;

export type GoogleChatAiTutorRuntime = {
  readonly handler: (event: GoogleChatEvent) => GoogleChatResponse | Promise<GoogleChatResponse>;
};

export type GoogleChatAiTutorRuntimeResult =
  | { readonly ok: true; readonly handler: GoogleChatAiTutorRuntime['handler'] }
  | { readonly ok: false; readonly reason: 'invalid_config' | 'enabled_runtime_unavailable' };

export type GoogleChatAiTutorRuntimeOptions = {
  readonly env: GoogleChatAiTutorRuntimeEnvironment;
  readonly enabledHandler?: GoogleChatAiTutorRuntime['handler'];
  readonly dependenciesFactory?: (input: GoogleChatAiTutorDependenciesInput) => GoogleChatAiTutorDependenciesResult;
};

export type GoogleChatAiTutorDependenciesInput = {
  readonly env: GoogleChatAiTutorRuntimeEnvironment;
  readonly config: Extract<ReturnType<typeof parseAiTutorConfig>, { readonly ok: true }>['config'];
};

export type GoogleChatAiTutorDependenciesResult =
  | { readonly ok: true; readonly value: GoogleChatAiTutorOrchestratorOptions }
  | { readonly ok: false };

export function createGoogleChatAiTutorRuntime(
  options: GoogleChatAiTutorRuntimeOptions,
): GoogleChatAiTutorRuntimeResult {
  const config = parseAiTutorConfig(options.env);
  if (!config.ok) return { ok: false, reason: 'invalid_config' };
  if (config.config.status === 'disabled') {
    return { ok: true, handler: handleGoogleChatEvent };
  }
  if (options.enabledHandler === undefined) {
    const dependencies = (options.dependenciesFactory ?? createGoogleChatAiTutorDependencies)({
      env: options.env,
      config: config.config,
    });
    return dependencies.ok
      ? { ok: true, handler: createGoogleChatAiTutorOrchestrator(dependencies.value) }
      : { ok: false, reason: 'enabled_runtime_unavailable' };
  }
  return { ok: true, handler: options.enabledHandler };
}

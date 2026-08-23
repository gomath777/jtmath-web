import {
  createWebAiTutorDependenciesWhenEnabled,
  type WebAiTutorDependencyConstructors,
} from './web-runtime-dependencies';
import type { EnabledWebAiTutorConfig, WebAiTutorConfigResult } from './web-config';

export type WebAiTutorRuntime<TDependencies> =
  | { readonly status: 'disabled'; readonly reason: 'config_closed' }
  | {
      readonly status: 'enabled';
      readonly config: EnabledWebAiTutorConfig;
      readonly dependencies: TDependencies;
    };

export function createWebAiTutorRuntime<TDependencies>(
  result: WebAiTutorConfigResult,
  constructors: WebAiTutorDependencyConstructors<TDependencies>,
): WebAiTutorRuntime<TDependencies> {
  const dependencies = createWebAiTutorDependenciesWhenEnabled(result, constructors);
  if (!result.ok || result.config.status !== 'enabled' || dependencies === undefined) {
    return { status: 'disabled', reason: 'config_closed' };
  }
  return { status: 'enabled', config: result.config, dependencies };
}

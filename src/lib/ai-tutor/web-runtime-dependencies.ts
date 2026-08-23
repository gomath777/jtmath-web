import {
  type EnabledWebAiTutorConfig,
  type WebAiTutorConfigResult,
  withEnabledWebAiTutorConfig,
} from './web-config';

export type WebAiTutorDependencyConstructors<TDependencies> = {
  readonly createSupabase: (config: EnabledWebAiTutorConfig) => unknown;
  readonly createPdf: (config: EnabledWebAiTutorConfig) => unknown;
  readonly createGemini: (config: EnabledWebAiTutorConfig) => unknown;
  readonly createAdmission: (config: EnabledWebAiTutorConfig) => unknown;
  readonly assemble: (parts: WebAiTutorDependencyParts) => TDependencies;
};

export type WebAiTutorDependencyParts = {
  readonly config: EnabledWebAiTutorConfig;
  readonly supabase: unknown;
  readonly pdf: unknown;
  readonly gemini: unknown;
  readonly admission: unknown;
};

export function createWebAiTutorDependenciesWhenEnabled<TDependencies>(
  result: WebAiTutorConfigResult,
  constructors: WebAiTutorDependencyConstructors<TDependencies>,
): TDependencies | undefined {
  return withEnabledWebAiTutorConfig(result, (config) =>
    constructors.assemble({
      config,
      supabase: constructors.createSupabase(config),
      pdf: constructors.createPdf(config),
      gemini: constructors.createGemini(config),
      admission: constructors.createAdmission(config),
    }),
  );
}

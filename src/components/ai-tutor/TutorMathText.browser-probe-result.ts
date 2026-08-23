export type BrowserProbeResult = {
  readonly hasKatexHtml: boolean; readonly hasKatexMathml: boolean; readonly unsafeNodeCount: number;
  readonly hasBareLatexHtml: boolean; readonly hrefText: string; readonly htmlClassText: string;
  readonly singleVariableKatexCount: number; readonly singleVariableLiteralCount: number;
  readonly curriculumKatexCount: number; readonly curriculumLiteralCount: number;
  readonly htmlIdText: string; readonly htmlStyleText: string; readonly htmlDataText: string;
  readonly includegraphicsText: string; readonly malformedText: string; readonly fragmentKatexCount: number;
  readonly fragmentLiteralCount: number; readonly listKatexCount: number; readonly listLiteralCount: number;
  readonly scriptMathKatexCount: number; readonly scriptMathLiteralCount: number; readonly scriptMathText: string;
  readonly recoveryFontFamily: string; readonly recoveryFitsHeight: boolean;
};

export function parseBrowserProbeResult(value: unknown): BrowserProbeResult {
  if (!isRecord(value)) throw new Error('Browser probe returned an invalid shape');
  return {
    hasKatexHtml: readBooleanField(value, 'hasKatexHtml'),
    hasKatexMathml: readBooleanField(value, 'hasKatexMathml'),
    unsafeNodeCount: readNumberField(value, 'unsafeNodeCount'),
    hasBareLatexHtml: readBooleanField(value, 'hasBareLatexHtml'),
    singleVariableKatexCount: readNumberField(value, 'singleVariableKatexCount'),
    singleVariableLiteralCount: readNumberField(value, 'singleVariableLiteralCount'),
    curriculumKatexCount: readNumberField(value, 'curriculumKatexCount'),
    curriculumLiteralCount: readNumberField(value, 'curriculumLiteralCount'),
    hrefText: readStringField(value, 'hrefText'),
    htmlClassText: readStringField(value, 'htmlClassText'),
    htmlIdText: readStringField(value, 'htmlIdText'),
    htmlStyleText: readStringField(value, 'htmlStyleText'),
    htmlDataText: readStringField(value, 'htmlDataText'),
    includegraphicsText: readStringField(value, 'includegraphicsText'),
    malformedText: readStringField(value, 'malformedText'),
    fragmentKatexCount: readNumberField(value, 'fragmentKatexCount'),
    fragmentLiteralCount: readNumberField(value, 'fragmentLiteralCount'),
    listKatexCount: readNumberField(value, 'listKatexCount'),
    listLiteralCount: readNumberField(value, 'listLiteralCount'),
    scriptMathKatexCount: readNumberField(value, 'scriptMathKatexCount'),
    scriptMathLiteralCount: readNumberField(value, 'scriptMathLiteralCount'),
    scriptMathText: readStringField(value, 'scriptMathText'),
    recoveryFontFamily: readStringField(value, 'recoveryFontFamily'),
    recoveryFitsHeight: readBooleanField(value, 'recoveryFitsHeight'),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readBooleanField(value: Record<string, unknown>, key: string): boolean {
  const field = value[key];
  if (typeof field === 'boolean') return field;
  throw new Error(`Browser probe ${key} was not a boolean`);
}

function readNumberField(value: Record<string, unknown>, key: string): number {
  const field = value[key];
  if (typeof field === 'number') return field;
  throw new Error(`Browser probe ${key} was not a number`);
}

function readStringField(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  if (typeof field === 'string') return field;
  throw new Error(`Browser probe ${key} was not a string`);
}

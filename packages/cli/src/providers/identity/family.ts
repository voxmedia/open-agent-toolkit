export type ModelFamily = 'claude' | 'openai' | 'composer' | 'glm' | 'unknown';

interface ClassifyModelFamilyInput {
  value: string;
  /**
   * Structured model-provider identifier, when a harness exposes one. This is
   * not the orchestration/runtime harness id; e.g. Cursor can run several model
   * families and must be classified from the concrete model value.
   */
  providerId?: string;
}

const PROVIDER_ID_FAMILIES: Array<[RegExp, ModelFamily]> = [
  [/^(anthropic|claude)$/i, 'claude'],
  [/^(openai|codex)$/i, 'openai'],
  [/^composer$/i, 'composer'],
  [/^(glm|zai|zhipu)$/i, 'glm'],
];

const VALUE_FAMILIES: Array<[RegExp, ModelFamily]> = [
  [/\b(claude|sonnet|opus|haiku|fable)\b/i, 'claude'],
  [/\b(gpt|openai|codex|o[1-9])[-\w.]*\b/i, 'openai'],
  [/\bcomposer\b/i, 'composer'],
  [/\bglm\b/i, 'glm'],
];

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function firstMatchingFamily(
  value: string,
  patterns: Array<[RegExp, ModelFamily]>,
): ModelFamily | undefined {
  for (const [pattern, family] of patterns) {
    if (pattern.test(value)) {
      return family;
    }
  }
  return undefined;
}

export function classifyModelFamily(
  input: ClassifyModelFamilyInput,
): ModelFamily {
  const providerId = normalize(input?.providerId);
  const providerFamily = firstMatchingFamily(providerId, PROVIDER_ID_FAMILIES);
  if (providerFamily) {
    return providerFamily;
  }

  const value = normalize(input?.value);
  return firstMatchingFamily(value, VALUE_FAMILIES) ?? 'unknown';
}

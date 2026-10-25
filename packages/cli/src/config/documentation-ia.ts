/**
 * Canonical IA preset IDs: the values `oat docs init --ia-preset` accepts and
 * the spelling documented for the `documentation.ia` mirror.
 */
export const IA_PRESET_IDS = [
  'product-engineering-qa',
  'consumer-maintainer',
  'domain-engineering',
  'task-type',
  'toolkit-cli',
  'flat-small',
] as const;
export type IaPresetId = (typeof IA_PRESET_IDS)[number];

/**
 * Approved preset labels from the authoring-docs preset table. Authored IA
 * records name these labels, and existing mirrors store them, so the mirror
 * accepts each label as an exact alias of its ID.
 */
export const IA_PRESET_LABELS: Readonly<Record<IaPresetId, string>> = {
  'product-engineering-qa': 'Product/Engineering/QA',
  'consumer-maintainer': 'Consumer and Maintainer',
  'domain-engineering': 'Domain Engineering',
  'task-type': 'Task Type',
  'toolkit-cli': 'Toolkit and CLI',
  'flat-small': 'Flat Small',
};

const ACCEPTED_PRESETS = new Set<string>([
  ...IA_PRESET_IDS,
  ...Object.values(IA_PRESET_LABELS),
]);

export function isDocumentationIaPreset(value: string): boolean {
  return ACCEPTED_PRESETS.has(value);
}

/** An unknown preset in an otherwise well-formed `documentation.ia` value. */
export class DocumentationIaPresetError extends Error {
  readonly detail: string;

  constructor(configPath: string, preset: string) {
    const detail = `unknown preset "${preset}"; expected one of ${IA_PRESET_IDS.join(', ')} (or its approved label)`;
    super(
      `Invalid documentation.ia in ${configPath}: ${detail}. Repair with oat config set documentation.ia '<JSON>' or oat config unset documentation.ia --shared.`,
    );
    this.name = 'DocumentationIaPresetError';
    this.detail = detail;
  }
}

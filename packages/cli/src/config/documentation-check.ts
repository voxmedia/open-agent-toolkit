/** Stable portable documentation rule identifiers. */
export const DOCS_CHECK_RULES = [
  'directory-index',
  'root-width',
  'contents-width',
  'leaf-size',
  'folder-size',
  'depth',
  'page-length',
  'frontmatter',
  'description',
  'h1',
  'links',
  'contents-description',
  'overview',
  'contents-separator',
  'navigation',
  'commands',
  'mermaid',
  'diagram-accessibility',
  'diagram-pairs',
  'diagram-freshness',
  'image-alt',
  'provenance',
] as const;
export type DocsCheckRule = (typeof DOCS_CHECK_RULES)[number];
export type DocsCheckSeverity = 'error' | 'warn' | 'off';
export const DOCS_CHECK_THRESHOLDS = {
  rootWarn: 10,
  rootError: 14,
  contentsWarn: 10,
  contentsError: 15,
  folderWarn: 12,
  folderError: 20,
  depthWarn: 4,
  depthError: 5,
  pageLines: 500,
  referenceLines: 1000,
  referenceH3: 40,
  descriptionMin: 40,
  descriptionMax: 160,
  overviewWords: 10,
  altMax: 155,
};
export interface DocumentationCheckConfig {
  rules?: Partial<Record<DocsCheckRule, DocsCheckSeverity>>;
  thresholds?: Partial<typeof DOCS_CHECK_THRESHOLDS>;
  exceptions?: Array<{
    path: string;
    rule: DocsCheckRule;
    reason: string;
    severity?: DocsCheckSeverity;
  }>;
  provenance?: { ticketPatterns?: string[]; milestonePatterns?: string[] };
  diagramBaseRef?: string;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function normalizeDocumentationCheck(
  value: unknown,
): DocumentationCheckConfig | undefined {
  if (value === undefined) return undefined;
  const fail = (detail: string): never => {
    throw new Error(
      `Invalid documentation.check: ${detail}. Repair with oat config set documentation.check '<JSON>' or oat config unset documentation.check --shared.`,
    );
  };
  const object = (
    input: unknown,
    keys: readonly string[],
    label: string,
  ): Record<string, unknown> => {
    if (!record(input)) return fail(`${label} must be an object`);
    const unknown = Object.keys(input).find((key) => !keys.includes(key));
    if (unknown) return fail(`unknown ${label} option "${unknown}"`);
    return input;
  };
  const severity = (v: unknown): v is DocsCheckSeverity =>
    ['error', 'warn', 'off'].includes(String(v));
  const root = object(
    value,
    ['rules', 'thresholds', 'exceptions', 'provenance', 'diagramBaseRef'],
    'check',
  );
  if (root.rules !== undefined) {
    for (const [key, v] of Object.entries(
      object(root.rules, DOCS_CHECK_RULES, 'rules'),
    )) {
      if (!severity(v)) fail(`${key} severity must be error, warn or off`);
    }
  }
  if (root.thresholds !== undefined) {
    const thresholds = object(
      root.thresholds,
      Object.keys(DOCS_CHECK_THRESHOLDS),
      'thresholds',
    );
    for (const [key, v] of Object.entries(thresholds)) {
      if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0)
        fail(`${key} must be a nonnegative safe integer`);
    }
    const t = {
      ...DOCS_CHECK_THRESHOLDS,
      ...thresholds,
    } as typeof DOCS_CHECK_THRESHOLDS;
    for (const [low, high] of [
      ['rootWarn', 'rootError'],
      ['contentsWarn', 'contentsError'],
      ['folderWarn', 'folderError'],
      ['depthWarn', 'depthError'],
      ['descriptionMin', 'descriptionMax'],
    ] as const) {
      if (t[low] > t[high]) fail(`${low} must not exceed ${high}`);
    }
  }
  if (root.exceptions !== undefined) {
    if (!Array.isArray(root.exceptions)) fail('exceptions must be an array');
    for (const input of root.exceptions as unknown[]) {
      const e = object(
        input,
        ['path', 'rule', 'reason', 'severity'],
        'exception',
      );
      if (
        typeof e.path !== 'string' ||
        !e.path.trim() ||
        e.path.startsWith('/') ||
        e.path.includes('\\') ||
        e.path.split('/').includes('..')
      )
        fail('exception path must be a content-root-relative bounded pattern');
      if (!DOCS_CHECK_RULES.includes(e.rule as DocsCheckRule))
        fail(`unknown exception rule "${String(e.rule)}"`);
      if (typeof e.reason !== 'string' || !e.reason.trim())
        fail('every exception needs a nonempty reason');
      if (e.severity !== undefined && !severity(e.severity))
        fail('exception severity must be error, warn or off');
    }
  }
  if (root.provenance !== undefined) {
    const p = object(
      root.provenance,
      ['ticketPatterns', 'milestonePatterns'],
      'provenance',
    );
    for (const [key, patterns] of Object.entries(p)) {
      if (
        !Array.isArray(patterns) ||
        patterns.some(
          (pattern) => typeof pattern !== 'string' || !pattern.trim(),
        )
      )
        fail(`${key} must be an array of nonempty regular expression strings`);
      for (const pattern of patterns as string[]) {
        try {
          RegExp(pattern, 'u');
        } catch {
          fail(`invalid ${key} regular expression "${pattern}"`);
        }
      }
    }
  }
  if (
    root.diagramBaseRef !== undefined &&
    (typeof root.diagramBaseRef !== 'string' ||
      !root.diagramBaseRef.trim() ||
      root.diagramBaseRef.startsWith('-') ||
      /\s/.test(root.diagramBaseRef) ||
      root.diagramBaseRef.includes(String.fromCharCode(0)))
  )
    fail('diagramBaseRef must be a Git ref without whitespace or leading dash');
  return root as DocumentationCheckConfig;
}

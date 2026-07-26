export type CursorPinSyntaxFamily =
  | 'gpt-reasoning'
  | 'claude-effort'
  | 'composer-fast'
  | 'grok-effort-fast';

/**
 * A probe observation, recorded so a mapping carries its own approval evidence.
 * `submittedSelector` must equal the mapping's `frontmatterModel` and
 * `resolvedModel` its `ladderModelId`; a mapping edited without re-probing
 * therefore fails its own consistency check rather than silently inheriting an
 * approval it was never granted.
 */
export interface CursorPinProbeRecord {
  submittedSelector: string;
  resolvedModel: string;
  verifiedAt: string;
  evidencePath: string;
}

export interface CursorPinGateEvidence {
  gate: 'g01';
  probeName: string;
  disposition: 'approved';
  probeRecord?: CursorPinProbeRecord;
}

export interface CursorModelPinMapping {
  ladderModelId: string;
  frontmatterModel: string;
  syntaxFamily: CursorPinSyntaxFamily;
  gateEvidence: CursorPinGateEvidence;
  catalogue: boolean;
}

function approvedMapping(
  ladderModelId: string,
  frontmatterModel: string,
  syntaxFamily: CursorPinSyntaxFamily,
  options: {
    catalogue?: boolean;
    probeName?: string;
    verifiedAt?: string;
    evidencePath?: string;
  } = {},
): CursorModelPinMapping {
  const probeRecord: CursorPinProbeRecord | undefined =
    options.verifiedAt && options.evidencePath
      ? {
          submittedSelector: frontmatterModel,
          resolvedModel: ladderModelId,
          verifiedAt: options.verifiedAt,
          evidencePath: options.evidencePath,
        }
      : undefined;

  return {
    ladderModelId,
    frontmatterModel,
    syntaxFamily,
    gateEvidence: {
      gate: 'g01',
      probeName:
        options.probeName ??
        `oat-pin-probe-${ladderModelId.replaceAll('.', '-')}`,
      disposition: 'approved',
      ...(probeRecord ? { probeRecord } : {}),
    },
    catalogue: options.catalogue ?? true,
  };
}

const G01_PROBE_2026_07_25 = {
  verifiedAt: '2026-07-25',
  evidencePath:
    '.oat/projects/shared/opus-5-model-guidance/references/g01-probe-results.md',
} as const;

export const CURSOR_MODEL_PIN_MAPPINGS = [
  approvedMapping('composer-2.5', 'composer-2.5[fast=true]', 'composer-fast'),
  approvedMapping(
    'composer-2.5-fast',
    'composer-2.5[fast=true]',
    'composer-fast',
    { catalogue: false },
  ),
  approvedMapping(
    'claude-sonnet-5-high',
    'claude-sonnet-5[effort=high]',
    'claude-effort',
  ),
  approvedMapping(
    'gpt-5.6-luna-high',
    'gpt-5.6-luna[reasoning=high]',
    'gpt-reasoning',
  ),
  approvedMapping(
    'gpt-5.6-luna-xhigh',
    'gpt-5.6-luna[reasoning=xhigh]',
    'gpt-reasoning',
  ),
  approvedMapping(
    'cursor-grok-4.5-high',
    'grok-4.5[effort=high,fast=false]',
    'grok-effort-fast',
  ),
  approvedMapping(
    'cursor-grok-4.5-high-fast',
    'grok-4.5[effort=high,fast=true]',
    'grok-effort-fast',
    { catalogue: false },
  ),
  approvedMapping(
    'gpt-5.6-terra-high',
    'gpt-5.6-terra[reasoning=high]',
    'gpt-reasoning',
  ),
  approvedMapping(
    'gpt-5.6-sol-medium',
    'gpt-5.6-sol[reasoning=medium]',
    'gpt-reasoning',
  ),
  approvedMapping(
    'gpt-5.6-sol-high',
    'gpt-5.6-sol[reasoning=high]',
    'gpt-reasoning',
  ),
  approvedMapping(
    'claude-fable-5-thinking-high',
    'claude-fable-5[effort=high]',
    'claude-effort',
  ),
  approvedMapping(
    'claude-fable-5-thinking-xhigh',
    'claude-fable-5[effort=xhigh]',
    'claude-effort',
  ),
  approvedMapping(
    'claude-fable-5-xhigh',
    'claude-fable-5[effort=xhigh]',
    'claude-effort',
    { catalogue: false },
  ),
  approvedMapping(
    'claude-opus-5-thinking-low',
    'claude-opus-5[effort=low]',
    'claude-effort',
    { probeName: 'zz-pin-probe-opus5-low', ...G01_PROBE_2026_07_25 },
  ),
  approvedMapping(
    'claude-opus-5-thinking-medium',
    'claude-opus-5[effort=medium]',
    'claude-effort',
    { probeName: 'zz-pin-probe-opus5-medium', ...G01_PROBE_2026_07_25 },
  ),
  approvedMapping(
    'claude-opus-5-thinking-high',
    'claude-opus-5[effort=high]',
    'claude-effort',
    { probeName: 'zz-pin-probe-opus5-high', ...G01_PROBE_2026_07_25 },
  ),
  approvedMapping(
    'claude-opus-5-thinking-xhigh',
    'claude-opus-5[effort=xhigh]',
    'claude-effort',
    { probeName: 'zz-pin-probe-opus5-xhigh', ...G01_PROBE_2026_07_25 },
  ),
  approvedMapping(
    'claude-opus-5-thinking-max',
    'claude-opus-5[effort=max]',
    'claude-effort',
    { probeName: 'zz-pin-probe-opus5-max', ...G01_PROBE_2026_07_25 },
  ),
  approvedMapping(
    'claude-opus-4-8-thinking-xhigh',
    'claude-opus-4-8[effort=xhigh]',
    'claude-effort',
    { probeName: 'zz-pin-probe-opus48-xhigh', ...G01_PROBE_2026_07_25 },
  ),
  approvedMapping(
    'gpt-5.6-sol-xhigh',
    'gpt-5.6-sol[reasoning=xhigh]',
    'gpt-reasoning',
  ),
  approvedMapping(
    'gpt-5.6-sol-max',
    'gpt-5.6-sol[reasoning=max]',
    'gpt-reasoning',
  ),
] as const satisfies readonly CursorModelPinMapping[];

export const SUPPORTED_CURSOR_ROLE_TARGETS = CURSOR_MODEL_PIN_MAPPINGS.filter(
  (mapping) => mapping.catalogue,
);

export const SUPPORTED_CURSOR_BASE_ROLES = [
  'oat-phase-implementer',
  'oat-reviewer',
] as const;

export function findCursorModelPinMapping(
  ladderModelId: string,
): CursorModelPinMapping | undefined {
  return CURSOR_MODEL_PIN_MAPPINGS.find(
    (mapping) => mapping.ladderModelId === ladderModelId,
  );
}

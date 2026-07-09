import type {
  WorkflowClaudeDispatchCeiling,
  WorkflowCodexDispatchCeiling,
  WorkflowDispatchCeiling,
  WorkflowDispatchCeilingPreset,
  WorkflowManagedDispatchPolicy,
} from './oat-config';

/**
 * Fixed mapping table: preset → concrete per-provider values.
 * This is the single authority for preset compilation; the resolver and skills
 * must not re-map these values.
 *
 * Design notes:
 * - cost-conscious holds Claude at `sonnet` (no Haiku reviewers by default).
 * - The table is `as const` to preserve literal types for downstream consumers.
 */
export const DISPATCH_CEILING_PRESETS = {
  balanced: { codex: 'high', claude: 'sonnet' },
  maximum: { codex: 'xhigh', claude: 'opus' },
  'cost-conscious': { codex: 'medium', claude: 'sonnet' },
} as const satisfies Record<
  WorkflowDispatchCeilingPreset,
  { codex: WorkflowCodexDispatchCeiling; claude: WorkflowClaudeDispatchCeiling }
>;

export type DispatchPolicyClaudeValue = WorkflowClaudeDispatchCeiling | 'fable';
export type CappedManagedDispatchPolicy = Exclude<
  WorkflowManagedDispatchPolicy,
  'uncapped'
>;

export const DISPATCH_POLICY_PRESETS = {
  economy: { codex: 'medium', claude: 'sonnet' },
  balanced: { codex: 'high', claude: 'sonnet' },
  high: { codex: 'xhigh', claude: 'opus' },
  frontier: { codex: 'xhigh', claude: 'fable' },
} as const satisfies Record<
  CappedManagedDispatchPolicy,
  { codex: WorkflowCodexDispatchCeiling; claude: DispatchPolicyClaudeValue }
>;

/**
 * Result of compiling a preset selection.
 * Both `preset` (provenance label) and `providers` (concrete values) are present.
 */
export interface PresetCompileResult {
  preset: WorkflowDispatchCeilingPreset;
  providers: {
    codex: WorkflowCodexDispatchCeiling;
    claude: WorkflowClaudeDispatchCeiling;
  };
}

/**
 * Result of compiling an advanced/manual per-provider selection.
 * No `preset` key — advanced selections store only `providers`.
 */
export interface AdvancedCompileResult {
  providers: WorkflowDispatchCeiling['providers'] & object;
}

export type DispatchPolicyCompileResult =
  | {
      mode: 'managed';
      policy: CappedManagedDispatchPolicy;
      providers: {
        codex: WorkflowCodexDispatchCeiling;
        claude: DispatchPolicyClaudeValue;
      };
    }
  | {
      mode: 'managed';
      policy: 'uncapped';
    };

/**
 * Compile a preset label into concrete per-provider values.
 * The returned `preset` field is provenance only; runtime dispatch reads
 * only `providers`.
 */
export function compileDispatchCeilingPreset(
  preset: WorkflowDispatchCeilingPreset,
): PresetCompileResult {
  return {
    preset,
    providers: { ...DISPATCH_CEILING_PRESETS[preset] },
  };
}

/**
 * Pass through advanced/manual per-provider values with no `preset` key.
 * Advanced selections do not set a preset so the persisted shape omits it.
 */
export function compileAdvancedDispatchCeiling(
  providers: WorkflowDispatchCeiling['providers'] & object,
): AdvancedCompileResult {
  return { providers };
}

export function dispatchPolicyProviderTargets(
  policy: CappedManagedDispatchPolicy,
): {
  codex: WorkflowCodexDispatchCeiling;
  claude: DispatchPolicyClaudeValue;
} {
  return { ...DISPATCH_POLICY_PRESETS[policy] };
}

/**
 * Compile the managed dispatch-policy ladder into concrete provider caps.
 * `uncapped` is intentionally explicit but has no provider caps.
 */
export function compileDispatchPolicyPreset(
  policy: WorkflowManagedDispatchPolicy,
): DispatchPolicyCompileResult {
  if (policy === 'uncapped') {
    return { mode: 'managed', policy };
  }

  return {
    mode: 'managed',
    policy,
    providers: { ...DISPATCH_POLICY_PRESETS[policy] },
  };
}

import type {
  WorkflowClaudeDispatchCeiling,
  WorkflowCodexDispatchCeiling,
  WorkflowDispatchCeiling,
  WorkflowDispatchCeilingPreset,
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

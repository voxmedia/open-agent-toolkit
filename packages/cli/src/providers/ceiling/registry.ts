import {
  VALID_CLAUDE_DISPATCH_CEILINGS,
  VALID_CODEX_DISPATCH_CEILINGS,
} from '@config/oat-config';

/**
 * Provider ceiling adapter registry.
 *
 * Each adapter is the single source of truth for *what a provider can do* with a
 * dispatch ceiling: whether it can enforce one, by what mechanism, the valid
 * value set, and how to compile a ceiling value into dispatch arguments for a
 * given role. The resolver (`oat project dispatch-ceiling resolve`) joins stored
 * ceiling intent with these adapters to decide enforced/advisory/unsupported and
 * to produce concrete dispatch args — skills never re-implement this logic.
 *
 * Codex enforces via sync-time pinned role variants
 * (`oat-phase-implementer-<effort>` / `oat-reviewer-<effort>`); the adapter only
 * *consumes* those existing names and never generates new variant files. Claude
 * enforces via the per-call Task `model` argument (no variant files). Every other
 * provider is advisory by default.
 */

export type EnforcementMechanism = 'pinned-variant' | 'model-arg' | 'none';

export type CeilingRole = 'implementer' | 'reviewer';

export interface CeilingCompileContext {
  /** The orchestrator's own tier, used to detect above-orchestrator upgrades. */
  orchestratorTier?: string;
}

export type CeilingDispatchArgs =
  | { variant: string }
  | { model: string }
  | null;

export interface ProviderCeilingAdapter {
  provider: string;
  supportsCeiling: boolean;
  validValues: string[];
  mechanism: EnforcementMechanism;
  /**
   * Compile a ceiling value into dispatch args for the given role, or `null`
   * when the value is invalid or the provider is advisory/unsupported.
   */
  compileToDispatchArgs(
    value: string,
    role: CeilingRole,
    ctx: CeilingCompileContext,
  ): CeilingDispatchArgs;
  /**
   * Whether dispatch must verify the actual model/tier before reporting
   * `enforced`. Only the upgrade path (requested tier > orchestrator tier) needs
   * verification; cap-down and lateral requests never do.
   */
  verifyOnDispatch(value: string, ctx: CeilingCompileContext): boolean;
}

/** Codex pinned-variant base role names (must match sync-extension output). */
const CODEX_IMPLEMENTER_ROLE = 'oat-phase-implementer';
const CODEX_REVIEWER_ROLE = 'oat-reviewer';

/** Claude tier order, low → high, for above-orchestrator comparison. */
export const CLAUDE_TIER_ORDER: readonly string[] = [
  'haiku',
  'sonnet',
  'opus',
  'fable',
];

const codexAdapter: ProviderCeilingAdapter = {
  provider: 'codex',
  supportsCeiling: true,
  validValues: [...VALID_CODEX_DISPATCH_CEILINGS],
  mechanism: 'pinned-variant',
  compileToDispatchArgs(value, role) {
    if (!VALID_CODEX_DISPATCH_CEILINGS.includes(value as never)) {
      return null;
    }
    const baseRole =
      role === 'reviewer' ? CODEX_REVIEWER_ROLE : CODEX_IMPLEMENTER_ROLE;
    return { variant: `${baseRole}-${value}` };
  },
  // Codex enforces via effort variants, not model tier; there is no
  // above-orchestrator upgrade path to verify.
  verifyOnDispatch() {
    return false;
  },
};

function isAboveOrchestrator(
  value: string,
  orchestratorTier: string | undefined,
): boolean {
  if (!orchestratorTier) {
    return false;
  }
  const requestedIndex = CLAUDE_TIER_ORDER.indexOf(value);
  const orchestratorIndex = CLAUDE_TIER_ORDER.indexOf(orchestratorTier);
  if (requestedIndex < 0 || orchestratorIndex < 0) {
    return false;
  }
  return requestedIndex > orchestratorIndex;
}

const claudeAdapter: ProviderCeilingAdapter = {
  provider: 'claude',
  supportsCeiling: true,
  validValues: [...VALID_CLAUDE_DISPATCH_CEILINGS],
  mechanism: 'model-arg',
  compileToDispatchArgs(value) {
    if (!VALID_CLAUDE_DISPATCH_CEILINGS.includes(value as never)) {
      return null;
    }
    return { model: value };
  },
  // Verify only when the request is above the orchestrator tier (upgrade path).
  verifyOnDispatch(value, ctx) {
    return isAboveOrchestrator(value, ctx.orchestratorTier);
  },
};

function advisoryAdapter(provider: string): ProviderCeilingAdapter {
  return {
    provider,
    supportsCeiling: false,
    validValues: [],
    mechanism: 'none',
    compileToDispatchArgs() {
      return null;
    },
    verifyOnDispatch() {
      return false;
    },
  };
}

const REGISTERED_ADAPTERS: Record<string, ProviderCeilingAdapter> = {
  codex: codexAdapter,
  claude: claudeAdapter,
};

/**
 * Look up the ceiling adapter for a provider. Unknown providers fall back to an
 * advisory no-op adapter (`supportsCeiling: false`, `mechanism: 'none'`,
 * `compileToDispatchArgs → null`).
 */
export function getCeilingAdapter(provider: string): ProviderCeilingAdapter {
  return REGISTERED_ADAPTERS[provider] ?? advisoryAdapter(provider);
}

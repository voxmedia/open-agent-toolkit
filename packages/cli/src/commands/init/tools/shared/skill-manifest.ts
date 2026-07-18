/**
 * Single source of truth for all bundled skill/asset lists per pack.
 *
 * Runtime installers and tests import from here.
 * `bundle-assets.sh` maintains its own bash array — `bundle-consistency.test.ts`
 * validates that it stays in sync with these lists.
 */

// ── Pack metadata ──────────────────────────────────────────────────
//
// PackMetadata generalizes per-pack installer behavior that previously
// would have required special-casing inside install-flow code paths.
//
// `defaultScope` controls the scope the installer chooses when a
// user-eligible pack is being installed without an explicit `--scope`
// flag and is not yet present at any scope. Existing-install detection
// still wins over `defaultScope`, so users with a prior install do not
// experience scope migrations on re-install.
//
// Absence in this map falls back to `'project'` to preserve the prior
// installer behavior for every pack that hasn't opted in.

export interface PackMetadata {
  name: string;
  defaultScope: 'user' | 'project';
}

export const PACK_METADATA: Record<string, PackMetadata> = {
  // Existing user-eligible packs (ideas, docs, utility, research) are
  // intentionally absent — absence falls back to 'project', preserving
  // current behavior. New packs that want user-default scope add an entry.
  brainstorm: { name: 'brainstorm', defaultScope: 'user' },
};

export function resolvePackDefaultScope(packName: string): 'user' | 'project' {
  return PACK_METADATA[packName]?.defaultScope ?? 'project';
}

// ── Workflow pack ──────────────────────────────────────────────────

export const WORKFLOW_SKILLS = [
  'oat-cursor-cloud-projects',
  'oat-project-autonomous',
  'oat-project-capture',
  'oat-project-clear-active',
  'oat-project-complete',
  'oat-project-design',
  'oat-project-dispatch-subagents',
  'oat-project-discover',
  'oat-project-document',
  'oat-project-implement',
  'oat-project-import-plan',
  'oat-project-new',
  'oat-project-next',
  'oat-project-open',
  'oat-project-plan',
  'oat-project-plan-writing',
  'oat-project-pr-final',
  'oat-project-pr-progress',
  'oat-project-progress',
  'oat-project-promote-spec-driven',
  'oat-project-quick-start',
  'oat-project-reconcile',
  'oat-project-revise',
  'oat-project-review-provide',
  'oat-project-review-provide-remote',
  'oat-project-review-receive',
  'oat-project-review-receive-remote',
  'oat-project-spec',
  'oat-project-split',
  'oat-project-summary',
  'oat-repo-knowledge-index',
  'oat-worktree-bootstrap',
  'oat-worktree-bootstrap-auto',
  'oat-wave-execute',
  'oat-wave-program',
  'oat-wrap-up',
] as const;

export const WORKFLOW_AGENTS = [
  'oat-codebase-mapper.md',
  'oat-phase-implementer.md',
  'oat-reviewer.md',
] as const;

export const WORKFLOW_TEMPLATES = [
  'state.md',
  'discovery.md',
  'spec.md',
  'design.md',
  'plan.md',
  'implementation.md',
  'summary.md',
] as const;

export const WORKFLOW_SCRIPTS = [
  'generate-oat-state.sh',
  'generate-thin-index.sh',
  'resolve-tracking.sh',
] as const;

// ── Ideas pack ─────────────────────────────────────────────────────

export const IDEA_SKILLS = [
  'oat-idea-new',
  'oat-idea-ideate',
  'oat-idea-summarize',
  'oat-idea-scratchpad',
] as const;

// ── Core pack (always user-level) ─────────────────────────────────

export const CORE_SKILLS = ['oat-docs', 'oat-doctor'] as const;

// ── Docs pack ─────────────────────────────────────────────────────

export const DOCS_SKILLS = [
  'authoring-docs',
  'oat-agent-instructions-analyze',
  'oat-agent-instructions-apply',
  'oat-docs-analyze',
  'oat-docs-apply',
  'oat-docs-authoring',
  'oat-docs-bootstrap',
] as const;

export const DOCS_SCRIPTS = ['resolve-tracking.sh'] as const;

// ── Utility pack ───────────────────────────────────────────────────

export const UTILITY_SKILLS = [
  'create-agnostic-skill',
  'oat-dispatch-subagents',
  'oat-repo-improve',
  'oat-repo-maintainability-review',
  'oat-review-provide',
  'oat-review-provide-remote',
  'oat-review-receive',
  'oat-review-receive-remote',
] as const;

// ── Project management pack ───────────────────────────────────────

export const PROJECT_MANAGEMENT_SKILLS = [
  'oat-pjm-add-backlog-item',
  'oat-pjm-decision',
  'oat-pjm-update-repo-reference',
  'oat-pjm-review-backlog',
] as const;

export const PROJECT_MANAGEMENT_TEMPLATES = [
  'backlog-item.md',
  'roadmap.md',
  'current-state.md',
  'decision.md',
  'repo-agents.md',
  'pjm-agents.md',
  'reference-agents.md',
] as const;

export const PROJECT_MANAGEMENT_SCRIPTS = [] as const;

// ── Brainstorm pack ───────────────────────────────────────────────

export const BRAINSTORM_SKILLS = ['oat-brainstorm'] as const;

// ── Research pack ─────────────────────────────────────────────────

export const RESEARCH_SKILLS = [
  'analyze',
  'compare',
  'deep-research',
  'skeptic',
  'synthesize',
] as const;

export const RESEARCH_AGENTS = ['skeptical-evaluator.md'] as const;

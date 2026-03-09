/**
 * Single source of truth for all bundled skill/asset lists per pack.
 *
 * Runtime installers and tests import from here.
 * `bundle-assets.sh` maintains its own bash array — `bundle-consistency.test.ts`
 * validates that it stays in sync with these lists.
 */

// ── Workflow pack ──────────────────────────────────────────────────

export const WORKFLOW_SKILLS = [
  'oat-project-clear-active',
  'oat-project-complete',
  'oat-project-design',
  'oat-project-discover',
  'oat-project-document',
  'oat-project-implement',
  'oat-project-import-plan',
  'oat-project-new',
  'oat-project-open',
  'oat-project-plan',
  'oat-project-plan-writing',
  'oat-project-pr-final',
  'oat-project-pr-progress',
  'oat-project-progress',
  'oat-project-promote-spec-driven',
  'oat-project-quick-start',
  'oat-project-review-provide',
  'oat-project-review-receive',
  'oat-project-review-receive-remote',
  'oat-project-spec',
  'oat-repo-knowledge-index',
  'oat-worktree-bootstrap',
] as const;

export const WORKFLOW_AGENTS = [
  'oat-codebase-mapper.md',
  'oat-reviewer.md',
] as const;

export const WORKFLOW_TEMPLATES = [
  'state.md',
  'discovery.md',
  'spec.md',
  'design.md',
  'plan.md',
  'implementation.md',
] as const;

export const WORKFLOW_SCRIPTS = [
  'generate-oat-state.sh',
  'generate-thin-index.sh',
] as const;

// ── Ideas pack ─────────────────────────────────────────────────────

export const IDEA_SKILLS = [
  'oat-idea-new',
  'oat-idea-ideate',
  'oat-idea-summarize',
  'oat-idea-scratchpad',
] as const;

// ── Utility pack ───────────────────────────────────────────────────

export const UTILITY_SKILLS = [
  'create-agnostic-skill',
  'oat-agent-instructions-analyze',
  'oat-agent-instructions-apply',
  'oat-docs-analyze',
  'oat-docs-apply',
  'oat-repo-maintainability-review',
  'oat-review-provide',
  'oat-review-receive',
  'oat-review-receive-remote',
] as const;

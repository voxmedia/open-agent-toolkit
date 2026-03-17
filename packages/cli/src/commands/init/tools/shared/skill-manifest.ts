/**
 * Single source of truth for all bundled skill/asset lists per pack.
 *
 * Runtime installers and tests import from here.
 * `bundle-assets.sh` maintains its own bash array — `bundle-consistency.test.ts`
 * validates that it stays in sync with these lists.
 */

// ── Workflow pack ──────────────────────────────────────────────────

export const WORKFLOW_SKILLS = [
  'oat-project-capture',
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
  'oat-project-reconcile',
  'oat-project-review-provide',
  'oat-project-review-receive',
  'oat-project-review-receive-remote',
  'oat-project-spec',
  'oat-project-subagent-implement',
  'oat-repo-knowledge-index',
  'oat-worktree-bootstrap',
  'oat-worktree-bootstrap-auto',
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

// ── Core pack (always user-level) ─────────────────────────────────

export const CORE_SKILLS = ['oat-docs', 'oat-doctor'] as const;

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

// ── Project management pack ───────────────────────────────────────

export const PROJECT_MANAGEMENT_SKILLS = [
  'oat-pjm-add-backlog-item',
  'oat-pjm-update-repo-reference',
  'oat-pjm-review-backlog',
] as const;

export const PROJECT_MANAGEMENT_TEMPLATES = [
  'backlog-item.md',
  'roadmap.md',
] as const;

export const PROJECT_MANAGEMENT_SCRIPTS = [] as const;

// ── Research pack ─────────────────────────────────────────────────

export const RESEARCH_SKILLS = [
  'analyze',
  'compare',
  'deep-research',
  'skeptic',
  'synthesize',
] as const;

export const RESEARCH_AGENTS = ['skeptical-evaluator.md'] as const;

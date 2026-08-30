/**
 * Single source of truth for all bundled skill/asset lists per pack.
 *
 * Runtime installers and tests import from here.
 * `bundle-assets.sh` maintains its own bash array — `bundle-consistency.test.ts`
 * validates that it stays in sync with these lists.
 */

import {
  getPackMemberNames,
  PACK_MANIFEST,
} from '../../../tools/shared/pack-manifest';

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

export const PACK_METADATA: Record<string, PackMetadata> = Object.fromEntries(
  PACK_MANIFEST.map(({ name, defaultScope }) => [name, { name, defaultScope }]),
);

export function resolvePackDefaultScope(packName: string): 'user' | 'project' {
  return PACK_METADATA[packName]?.defaultScope ?? 'project';
}

// ── Workflow pack ──────────────────────────────────────────────────

export const WORKFLOW_SKILLS = getPackMemberNames('workflows', 'skill');

export const WORKFLOW_AGENTS = getPackMemberNames('workflows', 'agent');

export const WORKFLOW_TEMPLATES = getPackMemberNames('workflows', 'template');

export const WORKFLOW_SCRIPTS = getPackMemberNames('workflows', 'script');

// ── Ideas pack ─────────────────────────────────────────────────────

export const IDEA_SKILLS = getPackMemberNames('ideas', 'skill');

// ── Core pack (always user-level) ─────────────────────────────────

export const CORE_SKILLS = getPackMemberNames('core', 'skill');

// ── Docs pack ─────────────────────────────────────────────────────

export const DOCS_SKILLS = getPackMemberNames('docs', 'skill');

export const DOCS_SCRIPTS = getPackMemberNames('docs', 'script');

// ── Utility pack ───────────────────────────────────────────────────

export const UTILITY_SKILLS = getPackMemberNames('utility', 'skill');

// ── Project management pack ───────────────────────────────────────

export const PROJECT_MANAGEMENT_SKILLS = getPackMemberNames(
  'project-management',
  'skill',
);

export const PROJECT_MANAGEMENT_TEMPLATES = getPackMemberNames(
  'project-management',
  'template',
);

export const PROJECT_MANAGEMENT_SCRIPTS = getPackMemberNames(
  'project-management',
  'script',
);

// ── Brainstorm pack ───────────────────────────────────────────────

export const BRAINSTORM_SKILLS = getPackMemberNames('brainstorm', 'skill');

// ── Research pack ─────────────────────────────────────────────────

export const RESEARCH_SKILLS = getPackMemberNames('research', 'skill');

export const RESEARCH_AGENTS = getPackMemberNames('research', 'agent');

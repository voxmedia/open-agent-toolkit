import {
  readdir as defaultReaddir,
  readFile as defaultReadFile,
} from 'node:fs/promises';
import { basename, join } from 'node:path';

import {
  getFrontmatterBlock,
  isProjectStateKind,
  isProjectStatePhase,
  type ProjectStateKind,
  type ProjectStatePhase,
} from '@commands/shared/frontmatter';
import type { ExplainerDecisionV1 } from '@open-agent-toolkit/control-plane';
import YAML from 'yaml';

const EXPLAINER_DECISIONS = ['generate', 'skip'] as const;
const EXPLAINER_SOURCES = [
  'interactive',
  'kickoff_prompt',
  'autonomous_policy',
] as const;
const EXPLAINER_DECISION_KEYS = ['decision', 'source', 'decided_at'] as const;
const EXPLAINER_ALLOWED_PAIRS = {
  oat_project_explainer: new Set([
    'generate:interactive',
    'skip:interactive',
    'generate:kickoff_prompt',
  ]),
  oat_project_recap: new Set([
    'generate:interactive',
    'skip:interactive',
    'generate:autonomous_policy',
  ]),
} as const;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export interface NormalizedProjectState {
  oat_kind: ProjectStateKind;
  oat_phase?: ProjectStatePhase;
  oat_phase_status?: string;
  oat_parent?: string;
  oat_siblings: string[];
  oat_depends_on: string[];
  oat_children: string[];
  oat_project_explainer?: ExplainerDecisionV1 | null;
  oat_project_recap?: ExplainerDecisionV1 | null;
}

export interface ProjectStateValidationError {
  code: string;
  message: string;
}

export interface ProjectStateValidationInput {
  slug?: string;
  frontmatter: Record<string, unknown>;
  relatedProjects?: ProjectStateSnapshot[];
}

export interface ProjectStateSnapshot {
  slug: string;
  frontmatter: Record<string, unknown>;
}

export interface ProjectStateValidationResult {
  ok: boolean;
  state: NormalizedProjectState;
  errors: ProjectStateValidationError[];
}

export interface AssertProjectStateContentOptions {
  filePath?: string;
  slug?: string;
  relatedProjects?: ProjectStateSnapshot[];
}

export interface AssertProjectStateFilesystemContentOptions extends Omit<
  AssertProjectStateContentOptions,
  'relatedProjects'
> {
  projectPath: string;
  projectsRoot?: string;
  readdir?: typeof defaultReaddir;
  readFile?: typeof defaultReadFile;
}

function readStringField(
  frontmatter: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = frontmatter[key];
  return typeof value === 'string' ? value : undefined;
}

function readStringArrayField(
  frontmatter: Record<string, unknown>,
  key: string,
  errors: ProjectStateValidationError[],
): string[] {
  const value = frontmatter[key];
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return [...value];
  }

  errors.push({
    code: 'invalid-string-array',
    message: `${key} must be an array of strings`,
  });
  return [];
}

function readExplainerDecision(
  frontmatter: Record<string, unknown>,
  key: 'oat_project_explainer' | 'oat_project_recap',
  errors: ProjectStateValidationError[],
): ExplainerDecisionV1 | null | undefined {
  const value = frontmatter[key];
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    errors.push({
      code: 'invalid-explainer-decision-record',
      message: `${key} must be null or a decision object`,
    });
    return null;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (
    keys.some(
      (entry) =>
        !(EXPLAINER_DECISION_KEYS as readonly string[]).includes(entry),
    )
  ) {
    errors.push({
      code: 'invalid-explainer-decision-keys',
      message: `${key} must contain only decision, source, and decided_at`,
    });
    return null;
  }

  const decision = record.decision;
  const source = record.source;
  const decidedAt = record.decided_at;
  let valid = true;
  if (
    typeof decision !== 'string' ||
    !(EXPLAINER_DECISIONS as readonly string[]).includes(decision)
  ) {
    errors.push({
      code: 'invalid-explainer-decision',
      message: `${key}.decision must be generate or skip`,
    });
    valid = false;
  }
  if (
    typeof source !== 'string' ||
    !(EXPLAINER_SOURCES as readonly string[]).includes(source)
  ) {
    errors.push({
      code: 'invalid-explainer-source',
      message: `${key}.source must be interactive, kickoff_prompt, or autonomous_policy`,
    });
    valid = false;
  }
  if (
    typeof decidedAt !== 'string' ||
    !ISO_TIMESTAMP_PATTERN.test(decidedAt) ||
    Number.isNaN(Date.parse(decidedAt))
  ) {
    errors.push({
      code: 'invalid-explainer-timestamp',
      message: `${key}.decided_at must be an ISO 8601 timestamp`,
    });
    valid = false;
  }
  if (
    valid &&
    !EXPLAINER_ALLOWED_PAIRS[key].has(`${String(decision)}:${String(source)}`)
  ) {
    errors.push({
      code: 'invalid-explainer-decision-source',
      message: `${key} does not allow decision ${String(decision)} from source ${String(source)}`,
    });
    valid = false;
  }

  return valid
    ? {
        decision: decision as ExplainerDecisionV1['decision'],
        source: source as ExplainerDecisionV1['source'],
        decided_at: decidedAt as string,
      }
    : null;
}

function readKind(frontmatter: Record<string, unknown>): ProjectStateKind {
  const rawKind = readStringField(frontmatter, 'oat_kind');
  return rawKind && isProjectStateKind(rawKind) ? rawKind : 'implementation';
}

function sameStringSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

function graphHasCycle(graph: Map<string, string[]>): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(slug: string): boolean {
    if (visiting.has(slug)) {
      return true;
    }
    if (visited.has(slug)) {
      return false;
    }

    visiting.add(slug);
    for (const dependency of graph.get(slug) ?? []) {
      if (graph.has(dependency) && visit(dependency)) {
        return true;
      }
    }
    visiting.delete(slug);
    visited.add(slug);
    return false;
  }

  return [...graph.keys()].some((slug) => visit(slug));
}

function validateChildLinkage(
  input: ProjectStateValidationInput,
  state: NormalizedProjectState,
  errors: ProjectStateValidationError[],
): void {
  if (!state.oat_parent) {
    return;
  }

  const relatedProjects = input.relatedProjects ?? [];
  const parent = relatedProjects.find(
    (project) => project.slug === state.oat_parent,
  );

  if (!parent && input.relatedProjects !== undefined) {
    errors.push({
      code: 'parent-missing',
      message: `oat_parent ${state.oat_parent} must reference an existing project`,
    });
  }

  if (parent && readKind(parent.frontmatter) !== 'coordination') {
    errors.push({
      code: 'parent-not-coordination',
      message: `oat_parent ${state.oat_parent} must reference a coordination project`,
    });
  }

  for (const dependency of state.oat_depends_on) {
    if (!state.oat_siblings.includes(dependency)) {
      errors.push({
        code: 'depends-on-non-sibling',
        message: `oat_depends_on entry ${dependency} must be listed in oat_siblings`,
      });
    }
  }

  if (input.slug && parent) {
    const parentChildren = readStringArrayField(
      parent.frontmatter,
      'oat_children',
      errors,
    );
    if (parentChildren.length > 0) {
      const expectedSiblings = parentChildren.filter(
        (childSlug) => childSlug !== input.slug,
      );
      if (!sameStringSet(state.oat_siblings, expectedSiblings)) {
        errors.push({
          code: 'siblings-must-match-parent-children',
          message:
            'oat_siblings must equal parent oat_children minus the current child',
        });
      }
    }
  }

  const graph = new Map<string, string[]>();
  if (input.slug) {
    graph.set(input.slug, state.oat_depends_on);
  }

  for (const project of relatedProjects) {
    if (project.slug === input.slug || project.slug === state.oat_parent) {
      continue;
    }
    if (
      readStringField(project.frontmatter, 'oat_parent') !== state.oat_parent
    ) {
      continue;
    }
    graph.set(
      project.slug,
      readStringArrayField(project.frontmatter, 'oat_depends_on', errors),
    );
  }

  if (graphHasCycle(graph)) {
    errors.push({
      code: 'sibling-dependency-cycle',
      message: 'oat_depends_on across sibling projects must be acyclic',
    });
  }
}

function validateInheritedContextGate(
  frontmatter: Record<string, unknown>,
  state: NormalizedProjectState,
  errors: ProjectStateValidationError[],
): void {
  if (!state.oat_parent) {
    return;
  }

  if (
    readStringField(frontmatter, 'oat_status') === 'complete' &&
    frontmatter['oat_inherited_context_revalidated'] === false
  ) {
    errors.push({
      code: 'inherited-context-revalidation-required',
      message:
        'child discovery cannot complete until oat_inherited_context_revalidated is true',
    });
  }
}

function validateCoordinationParent(
  state: NormalizedProjectState,
  errors: ProjectStateValidationError[],
): void {
  if (state.oat_phase !== 'decomposition') {
    return;
  }

  if (state.oat_children.length === 0) {
    errors.push({
      code: 'decomposition-requires-children',
      message: 'oat_phase: decomposition requires non-empty oat_children',
    });
  }
}

function parseFrontmatterObject(
  content: string,
  filePath: string,
): Record<string, unknown> {
  const frontmatter = getFrontmatterBlock(content);
  if (!frontmatter) {
    throw new Error(`${filePath} is missing frontmatter`);
  }

  const parsed: unknown = YAML.parse(frontmatter);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${filePath} frontmatter must be a YAML object`);
  }

  return parsed as Record<string, unknown>;
}

export function validateProjectState(
  input: ProjectStateValidationInput,
): ProjectStateValidationResult {
  const errors: ProjectStateValidationError[] = [];
  const rawKind = readStringField(input.frontmatter, 'oat_kind');
  const rawPhase = readStringField(input.frontmatter, 'oat_phase');
  const rawPhaseStatus = readStringField(input.frontmatter, 'oat_phase_status');
  const rawParent = readStringField(input.frontmatter, 'oat_parent');

  let kind: ProjectStateKind = 'implementation';
  if (rawKind) {
    if (isProjectStateKind(rawKind)) {
      kind = rawKind;
    } else {
      errors.push({
        code: 'invalid-oat-kind',
        message: `Invalid oat_kind: ${rawKind}`,
      });
    }
  }

  let phase: ProjectStatePhase | undefined;
  if (rawPhase) {
    if (isProjectStatePhase(rawPhase)) {
      phase = rawPhase;
    } else {
      errors.push({
        code: 'invalid-oat-phase',
        message: `Invalid oat_phase: ${rawPhase}`,
      });
    }
  }

  if (phase === 'decomposition' && kind !== 'coordination') {
    errors.push({
      code: 'decomposition-requires-coordination',
      message: 'oat_phase: decomposition requires oat_kind: coordination',
    });
  }

  const state: NormalizedProjectState = {
    oat_kind: kind,
    oat_phase: phase,
    oat_phase_status: rawPhaseStatus,
    oat_parent: rawParent,
    oat_siblings: readStringArrayField(
      input.frontmatter,
      'oat_siblings',
      errors,
    ),
    oat_depends_on: readStringArrayField(
      input.frontmatter,
      'oat_depends_on',
      errors,
    ),
    oat_children: readStringArrayField(
      input.frontmatter,
      'oat_children',
      errors,
    ),
    oat_project_explainer: readExplainerDecision(
      input.frontmatter,
      'oat_project_explainer',
      errors,
    ),
    oat_project_recap: readExplainerDecision(
      input.frontmatter,
      'oat_project_recap',
      errors,
    ),
  };

  validateChildLinkage(input, state, errors);
  validateInheritedContextGate(input.frontmatter, state, errors);
  validateCoordinationParent(state, errors);

  return {
    ok: errors.length === 0,
    state,
    errors,
  };
}

export function assertValidProjectStateContent(
  content: string,
  options: AssertProjectStateContentOptions = {},
): void {
  const filePath = options.filePath ?? 'state.md';
  const frontmatter = parseFrontmatterObject(content, filePath);
  const result = validateProjectState({
    frontmatter,
    slug: options.slug,
    relatedProjects: options.relatedProjects,
  });

  if (!result.ok) {
    throw new Error(result.errors.map((error) => error.message).join('; '));
  }
}

export async function readRelatedProjectStateSnapshots(options: {
  projectsRoot: string;
  currentProjectSlug: string;
  readdir?: typeof defaultReaddir;
  readFile?: typeof defaultReadFile;
}): Promise<ProjectStateSnapshot[]> {
  const readdir = options.readdir ?? defaultReaddir;
  const readFile = options.readFile ?? defaultReadFile;
  const snapshots: ProjectStateSnapshot[] = [];
  const entries = await readdir(options.projectsRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === options.currentProjectSlug) {
      continue;
    }

    const statePath = join(options.projectsRoot, entry.name, 'state.md');
    try {
      const content = await readFile(statePath, 'utf8');
      snapshots.push({
        slug: entry.name,
        frontmatter: parseFrontmatterObject(content, statePath),
      });
    } catch {
      continue;
    }
  }

  return snapshots;
}

export async function assertValidProjectStateFilesystemContent(
  content: string,
  options: AssertProjectStateFilesystemContentOptions,
): Promise<void> {
  const slug = options.slug ?? basename(options.projectPath);
  const relatedProjects = await readRelatedProjectStateSnapshots({
    projectsRoot: options.projectsRoot ?? join(options.projectPath, '..'),
    currentProjectSlug: slug,
    readdir: options.readdir,
    readFile: options.readFile,
  });

  const frontmatter = parseFrontmatterObject(
    content,
    options.filePath ?? 'state.md',
  );
  const result = validateProjectState({
    frontmatter,
    slug,
    relatedProjects,
  });
  const errors = [...result.errors];

  if (
    result.state.oat_kind === 'coordination' ||
    result.state.oat_phase === 'decomposition'
  ) {
    const readdir = options.readdir ?? defaultReaddir;
    const entries = await readdir(options.projectPath, {
      withFileTypes: true,
    });
    const executableArtifacts = new Set([
      'spec.md',
      'design.md',
      'plan.md',
      'implementation.md',
    ]);
    const presentExecutableArtifacts = entries
      .filter((entry) => entry.isFile() && executableArtifacts.has(entry.name))
      .map((entry) => entry.name)
      .sort();

    if (presentExecutableArtifacts.length > 0) {
      errors.push({
        code: 'coordination-parent-no-executable-artifacts',
        message: `coordination projects must not contain executable phase artifacts: ${presentExecutableArtifacts.join(', ')}`,
      });
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }
}

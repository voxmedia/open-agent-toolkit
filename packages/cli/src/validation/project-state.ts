import {
  getFrontmatterBlock,
  isProjectStateKind,
  isProjectStatePhase,
  type ProjectStateKind,
  type ProjectStatePhase,
} from '@commands/shared/frontmatter';
import YAML from 'yaml';

export interface NormalizedProjectState {
  oat_kind: ProjectStateKind;
  oat_phase?: ProjectStatePhase;
  oat_phase_status?: string;
}

export interface ProjectStateValidationError {
  code: string;
  message: string;
}

export interface ProjectStateValidationInput {
  frontmatter: Record<string, unknown>;
}

export interface ProjectStateValidationResult {
  ok: boolean;
  state: NormalizedProjectState;
  errors: ProjectStateValidationError[];
}

export interface AssertProjectStateContentOptions {
  filePath?: string;
}

function readStringField(
  frontmatter: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = frontmatter[key];
  return typeof value === 'string' ? value : undefined;
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

  return {
    ok: errors.length === 0,
    state: {
      oat_kind: kind,
      oat_phase: phase,
      oat_phase_status: rawPhaseStatus,
    },
    errors,
  };
}

export function assertValidProjectStateContent(
  content: string,
  options: AssertProjectStateContentOptions = {},
): void {
  const filePath = options.filePath ?? 'state.md';
  const frontmatter = parseFrontmatterObject(content, filePath);
  const result = validateProjectState({ frontmatter });

  if (!result.ok) {
    throw new Error(result.errors.map((error) => error.message).join('; '));
  }
}

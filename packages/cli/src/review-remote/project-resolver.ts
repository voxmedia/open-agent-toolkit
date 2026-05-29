/**
 * Project resolution helper for the project-rail provide-remote skill
 * (see design.md → Component Design → `oat-project-review-provide-remote`).
 *
 * Locates the OAT project on machine B by scanning the PR diff for
 * `state.md` files two levels deep under `.oat/projects/` (scope/project). An
 * explicit `--project <path>` override takes precedence over the scan and is
 * validated to resolve to a directory containing `state.md`.
 *
 * The result is a discriminated union mirroring {@link NarrowingResult}'s
 * pattern so callers branch on `kind`.
 */

/** Matches a two-level `.oat/projects/<scope>/<project>/state.md` path. */
const STATE_MD_PATTERN = /^\.oat\/projects\/([^/]+)\/([^/]+)\/state\.md$/;

export interface ResolvedProject {
  kind: 'resolved';
  /** Project directory path (no trailing slash, no `state.md` suffix). */
  projectPath: string;
}

export interface AmbiguousProject {
  kind: 'ambiguous';
  /** Sorted, de-duplicated candidate project directory paths. */
  candidates: string[];
}

export interface ProjectNotFound {
  kind: 'not-found';
}

export interface InvalidOverride {
  kind: 'invalid-override';
  overridePath: string;
  message: string;
}

export type ResolveResult =
  | ResolvedProject
  | AmbiguousProject
  | ProjectNotFound
  | InvalidOverride;

export interface ResolveOptions {
  /** Explicit `--project <path>` override; takes precedence over diff scan. */
  overridePath?: string;
  /**
   * Existence probe for `state.md`. Injected so tests avoid the real
   * filesystem. Receives a candidate `state.md` path.
   */
  pathExists?: (path: string) => boolean;
}

/** Strip a trailing slash and a trailing `state.md` segment from a path. */
function normalizeProjectDir(path: string): string {
  let dir = path.replace(/\/+$/, '');
  if (dir.endsWith('/state.md')) {
    dir = dir.slice(0, -'/state.md'.length);
  } else if (dir === 'state.md') {
    dir = '';
  }
  return dir;
}

/**
 * Resolve the target OAT project from a PR's changed-file list, honoring an
 * explicit override.
 */
export function resolveProject(
  diffFiles: string[],
  options: ResolveOptions = {},
): ResolveResult {
  // 1. Explicit override wins, but must point at a real project (has state.md).
  if (options.overridePath !== undefined && options.overridePath !== '') {
    const projectDir = normalizeProjectDir(options.overridePath);
    const stateMdPath = `${projectDir}/state.md`;
    const exists = options.pathExists?.(stateMdPath) ?? false;
    if (!exists) {
      return {
        kind: 'invalid-override',
        overridePath: options.overridePath,
        message: `--project path "${options.overridePath}" does not resolve to a directory containing state.md.`,
      };
    }
    return { kind: 'resolved', projectPath: projectDir };
  }

  // 2. Diff scan for `.oat/projects/<scope>/<project>/state.md`.
  const candidates = new Set<string>();
  for (const file of diffFiles) {
    const match = file.match(STATE_MD_PATTERN);
    if (match) {
      candidates.add(`.oat/projects/${match[1]}/${match[2]}`);
    }
  }

  if (candidates.size === 0) {
    return { kind: 'not-found' };
  }
  if (candidates.size > 1) {
    return { kind: 'ambiguous', candidates: [...candidates].sort() };
  }
  return { kind: 'resolved', projectPath: [...candidates][0]! };
}

import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export async function resolveExplainerOutputRoot({
  repoRoot,
  invocation,
  activeProject,
  outputRoot,
}) {
  if (!repoRoot) {
    throw new TypeError('repoRoot is required.');
  }

  if (invocation === 'direct') {
    if (!outputRoot) {
      throw new Error(
        'Direct callers must provide an explicit outputRoot to the core.',
      );
    }
    return resolveSafePath(outputRoot, {
      baseRoot: repoRoot,
      field: 'outputRoot',
    });
  }

  const canonicalRepoRoot = await realpath(resolve(repoRoot));
  if (invocation === 'repo') {
    return resolveSafePath('.oat/repo/reference/explainers', {
      baseRoot: canonicalRepoRoot,
      confinedRoot: canonicalRepoRoot,
      field: 'repo explainer output root',
    });
  }

  if (invocation !== 'project') {
    throw new Error(`Unsupported OAT explainer invocation: ${invocation}`);
  }
  if (!activeProject) {
    throw new Error('Project explainer invocation requires an active project.');
  }

  const projectRoot = await resolveSafePath(activeProject, {
    baseRoot: canonicalRepoRoot,
    confinedRoot: canonicalRepoRoot,
    field: 'active project',
    mustExist: true,
  });
  if (projectRoot === canonicalRepoRoot) {
    throw new Error('The active project cannot be the repository root.');
  }

  return resolveSafePath(join(projectRoot, 'explainers'), {
    baseRoot: canonicalRepoRoot,
    confinedRoot: projectRoot,
    field: 'project explainer output root',
  });
}

export async function resolveSourceAwarePath({
  repoRoot,
  candidate,
  source,
  field,
}) {
  if (typeof candidate !== 'string' || !candidate.trim()) {
    throw new Error(`${field} must be a non-empty path.`);
  }
  if (source === 'user') {
    throw new Error(`${field} cannot be resolved from user config.`);
  }
  if (source === 'shared' && isAbsolute(candidate)) {
    throw new Error(`${field} from shared config must be repository-relative.`);
  }

  const canonicalRepoRoot = await realpath(resolve(repoRoot));
  const absolute = isAbsolute(candidate);
  const confined =
    source === 'shared' ||
    (!absolute && (source === 'local' || source === 'runtime'));

  return resolveSafePath(candidate, {
    baseRoot: canonicalRepoRoot,
    confinedRoot: confined ? canonicalRepoRoot : undefined,
    field,
    mustExist: true,
  });
}

async function resolveSafePath(
  candidate,
  { baseRoot, confinedRoot, field, mustExist = false },
) {
  validateLexicalPath(candidate, field);
  const lexicalPath = resolve(baseRoot, candidate);
  if (confinedRoot && !isWithin(resolve(confinedRoot), lexicalPath)) {
    throw new Error(`${field} resolves outside its allowed root.`);
  }

  let canonicalPath;
  try {
    canonicalPath = await realpath(lexicalPath);
  } catch (error) {
    if (!isMissing(error)) {
      throw error;
    }
    if (mustExist) {
      throw new Error(`${field} does not exist: ${candidate}`, {
        cause: error,
      });
    }
    canonicalPath = await canonicalizeMissingPath(lexicalPath);
  }

  if (confinedRoot) {
    const canonicalConfinedRoot = await realpath(resolve(confinedRoot));
    if (!isWithin(canonicalConfinedRoot, canonicalPath)) {
      throw new Error(
        `${field} resolves outside its allowed root through a symlink ancestor.`,
      );
    }
  }
  return canonicalPath;
}

async function canonicalizeMissingPath(target) {
  const suffix = [];
  let ancestor = target;
  while (true) {
    try {
      await lstat(ancestor);
      return join(await realpath(ancestor), ...suffix.reverse());
    } catch (error) {
      if (!isMissing(error)) {
        throw error;
      }
    }
    const parent = resolve(ancestor, '..');
    if (parent === ancestor) {
      throw new Error(`No existing ancestor found for path: ${target}`);
    }
    suffix.push(relative(parent, ancestor));
    ancestor = parent;
  }
}

function validateLexicalPath(candidate, field) {
  if (typeof candidate !== 'string' || !candidate.trim()) {
    throw new Error(`${field} must be a non-empty path.`);
  }
  if (
    candidate.includes('\0') ||
    candidate.includes('\\') ||
    candidate.split('/').includes('..')
  ) {
    throw new Error(`${field} contains unsafe traversal or path separators.`);
  }
}

function isWithin(root, target) {
  const path = relative(root, target);
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`));
}

function isMissing(error) {
  return error && typeof error === 'object' && error.code === 'ENOENT';
}

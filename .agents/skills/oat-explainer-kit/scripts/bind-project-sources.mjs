import { execFile as execFileCallback } from 'node:child_process';
import { access, readFile, realpath } from 'node:fs/promises';
import { basename, join, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

const RECIPE_ARTIFACTS = Object.freeze({
  'project-explainer': ['plan', 'design', 'spec'],
  'project-recap': ['plan', 'design', 'spec', 'implementation', 'summary'],
});

export async function bindProjectSources({
  projectRoot,
  repoRoot,
  recipe,
  suppliedFactBasePath,
  reviewedRepository,
}) {
  if (!projectRoot) {
    throw new TypeError('projectRoot is required to bind OAT artifacts.');
  }
  const artifactIds = RECIPE_ARTIFACTS[recipe];
  if (!artifactIds) {
    throw new Error(`Unsupported OAT project recipe: ${recipe}`);
  }

  const canonicalProjectRoot = await realpath(projectRoot);
  const repository =
    reviewedRepository ??
    (repoRoot ? await resolveReviewedRepository(repoRoot) : null);
  if (suppliedFactBasePath) {
    const path = await realpath(suppliedFactBasePath);
    return {
      factBase: {
        mode: 'supplied',
        path,
        freshnessPolicy: 'live-wins',
      },
      reviewedSource: {
        kind: 'approved-fact-base',
        locator: repository?.repositoryUrl ?? path,
        ...(repository && repository),
      },
    };
  }

  const sourceSetId = basename(canonicalProjectRoot);
  const sources = [];
  for (const id of artifactIds) {
    const locator = join(canonicalProjectRoot, `${id}.md`);
    try {
      await access(locator);
    } catch (error) {
      if (error?.code === 'ENOENT') continue;
      throw error;
    }
    sources.push({
      id,
      kind: 'file',
      locator: await realpath(locator),
      role: 'project',
      sourceSetId,
      authoritativeFor: authoritativeTopics(id),
    });
  }
  if (sources.length === 0) {
    throw new Error(
      `No approved OAT lifecycle artifacts were found for ${recipe}.`,
    );
  }
  const sourceProvenance =
    repository && repoRoot
      ? await provenanceForSources(sources, repoRoot, repository)
      : undefined;

  return {
    factBase: {
      mode: 'federated',
      freshnessPolicy: 'live-wins',
      sources,
    },
    reviewedSource: {
      kind: 'approved-oat-artifacts',
      locator: repository?.repositoryUrl ?? canonicalProjectRoot,
      ...(repository && repository),
    },
    ...(sourceProvenance && { sourceProvenance }),
    sourceLoader: loadOatArtifact,
  };
}

export async function resolveReviewedRepository(
  repoRoot,
  { command = execFile } = {},
) {
  const cwd = resolve(repoRoot);
  const [{ stdout: revisionOutput }, { stdout: remoteOutput }] =
    await Promise.all([
      command('git', ['rev-parse', 'HEAD'], { cwd }),
      command('git', ['config', '--get', 'remote.origin.url'], { cwd }),
    ]);
  const revision = String(revisionOutput).trim();
  if (!/^[a-f0-9]{40}$/.test(revision)) {
    throw new Error(
      'Reviewed OAT sources require a full commit SHA, not a moving revision.',
    );
  }
  const repository = githubRepositoryIdentity(String(remoteOutput).trim());
  return {
    repository,
    repositoryUrl: `https://github.com/${repository}`,
    revision,
  };
}

async function loadOatArtifact(source) {
  const text = (await readFile(source.locator, 'utf8')).trim();
  return {
    claims: [
      {
        id: source.id,
        text,
        locator: source.locator,
        lineRange: lineRangeFor(text),
      },
    ],
  };
}

async function provenanceForSources(sources, repoRoot, repository) {
  const canonicalRepoRoot = await realpath(repoRoot);
  return Object.fromEntries(
    await Promise.all(
      sources.map(async (source) => {
        const repositoryPath = relative(canonicalRepoRoot, source.locator)
          .split(sep)
          .join('/');
        if (
          !repositoryPath ||
          repositoryPath.startsWith('../') ||
          repositoryPath === '..'
        ) {
          throw new Error(
            `OAT source ${source.id} is outside the reviewed repository.`,
          );
        }
        const text = (await readFile(source.locator, 'utf8')).trim();
        return [
          source.id,
          {
            repository: repository.repository,
            revision: repository.revision,
            path: repositoryPath,
            lineRange: lineRangeFor(text),
          },
        ];
      }),
    ),
  );
}

function lineRangeFor(text) {
  return {
    start: 1,
    end: Math.max(1, text.split('\n').length),
  };
}

function githubRepositoryIdentity(remote) {
  const patterns = [
    /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
    /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,
    /^ssh:\/\/git@github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
  ];
  for (const pattern of patterns) {
    const match = remote.match(pattern);
    if (match) return `${match[1]}/${match[2]}`;
  }
  throw new Error(
    'Reviewed OAT sources require a canonical GitHub origin repository.',
  );
}

function authoritativeTopics(id) {
  return {
    plan: ['phases', 'validation-approach'],
    design: ['planned-architecture', 'decisions', 'risks'],
    spec: ['original-request', 'requirements'],
    implementation: [
      'key-agent-decisions',
      'as-built-architecture',
      'implementation-record',
      'validation-evidence',
    ],
    summary: ['outcome'],
  }[id];
}

import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
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
  const reviewedSources =
    repository && repoRoot
      ? await bindReviewedSources(sources, repoRoot, repository)
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
    ...(reviewedSources && {
      sourceProvenance: reviewedSources.provenance,
    }),
    sourceLoader: reviewedSources
      ? (source) => loadReviewedOatArtifact(source, reviewedSources.documents)
      : loadOatArtifact,
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
  return oatArtifactDocument(
    source,
    (await readFile(source.locator, 'utf8')).trim(),
  );
}

function loadReviewedOatArtifact(source, documents) {
  const document = documents.get(source.id);
  if (!document) {
    throw new Error(
      `No reviewed Git blob was bound for OAT source ${source.id}.`,
    );
  }
  return structuredClone(document);
}

function oatArtifactDocument(source, text, sourceHash) {
  return {
    claims: [
      {
        id: source.id,
        text,
        locator: source.locator,
        lineRange: lineRangeFor(text),
      },
    ],
    ...(sourceHash && { sourceHash }),
  };
}

async function bindReviewedSources(sources, repoRoot, repository) {
  const canonicalRepoRoot = await realpath(repoRoot);
  const entries = await Promise.all(
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
      try {
        await execFile(
          'git',
          ['ls-files', '--error-unmatch', '--', repositoryPath],
          { cwd: canonicalRepoRoot },
        );
      } catch {
        throw new Error(
          `OAT source ${source.id} is not tracked in the reviewed repository.`,
        );
      }
      let reviewedBytes;
      try {
        ({ stdout: reviewedBytes } = await execFile(
          'git',
          ['show', `${repository.revision}:${repositoryPath}`],
          {
            cwd: canonicalRepoRoot,
            encoding: null,
            maxBuffer: 16 * 1024 * 1024,
          },
        ));
      } catch {
        throw new Error(
          `OAT source ${source.id} is absent from reviewed revision ${repository.revision}.`,
        );
      }
      const workingBytes = await readFile(source.locator);
      const canonicalReviewedBytes = Buffer.from(reviewedBytes);
      if (!workingBytes.equals(canonicalReviewedBytes)) {
        throw new Error(
          `OAT source ${source.id} working tree bytes mismatch reviewed Git blob at revision ${repository.revision}.`,
        );
      }
      const text = canonicalReviewedBytes.toString('utf8').trim();
      return {
        id: source.id,
        provenance: {
          repository: repository.repository,
          revision: repository.revision,
          path: repositoryPath,
          lineRange: lineRangeFor(text),
        },
        document: oatArtifactDocument(
          source,
          text,
          `sha256:${createHash('sha256')
            .update(canonicalReviewedBytes)
            .digest('hex')}`,
        ),
      };
    }),
  );
  return {
    provenance: Object.fromEntries(
      entries.map((entry) => [entry.id, entry.provenance]),
    ),
    documents: new Map(entries.map((entry) => [entry.id, entry.document])),
  };
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

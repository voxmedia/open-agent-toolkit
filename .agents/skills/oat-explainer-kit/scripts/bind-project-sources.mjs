import { access, readFile, realpath } from 'node:fs/promises';
import { basename, join } from 'node:path';

const RECIPE_ARTIFACTS = Object.freeze({
  'project-explainer': ['plan', 'design', 'spec'],
  'project-recap': ['plan', 'design', 'spec', 'implementation', 'summary'],
});

export async function bindProjectSources({
  projectRoot,
  recipe,
  suppliedFactBasePath,
}) {
  if (!projectRoot) {
    throw new TypeError('projectRoot is required to bind OAT artifacts.');
  }
  const artifactIds = RECIPE_ARTIFACTS[recipe];
  if (!artifactIds) {
    throw new Error(`Unsupported OAT project recipe: ${recipe}`);
  }

  const canonicalProjectRoot = await realpath(projectRoot);
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
        locator: path,
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

  return {
    factBase: {
      mode: 'federated',
      freshnessPolicy: 'live-wins',
      sources,
    },
    reviewedSource: {
      kind: 'approved-oat-artifacts',
      locator: canonicalProjectRoot,
    },
    sourceLoader: loadOatArtifact,
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
      },
    ],
  };
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

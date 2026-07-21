import { execFile } from 'node:child_process';
import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SOURCE_CHECKOUT_ROOT = resolve(import.meta.dirname, '../../../..');
const NOW = '2026-07-18T14:00:00.000Z';
const HASH = `sha256:${'a'.repeat(64)}`;

export async function createPackagedLayout() {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), 'explainer-packaged-layout-')),
  );
  const assetsRoot = join(root, 'assets');
  const poisonedAssetsRoot = join(root, 'assets-poisoned-do-not-use');
  const userRoot = join(root, 'home');
  const userSkillsRoot = join(userRoot, '.agents', 'skills');
  const coreRoot = join(userSkillsRoot, 'explainer-kit');
  const repoRoot = join(root, 'repo');
  const adapterRoot = join(repoRoot, '.agents', 'skills', 'oat-explainer-kit');
  const projectRelative = join('.oat', 'projects', 'shared', 'demo');
  const projectRoot = join(repoRoot, projectRelative);
  const binRoot = join(root, 'bin');

  try {
    await bundleAssets(assetsRoot);
    await Promise.all([
      installSkill(assetsRoot, 'explainer-kit', coreRoot),
      installSkill(assetsRoot, 'oat-explainer-kit', adapterRoot),
      mkdir(projectRoot, { recursive: true }),
      mkdir(binRoot, { recursive: true }),
    ]);

    await Promise.all([
      writeProjectArtifacts(projectRoot),
      writeOatStub(join(binRoot, 'oat')),
    ]);

    const factBasePath = join(root, 'approved-fact-base.json');
    const requestPath = join(root, 'core-request.json');
    const authorModulePath = join(root, 'author.mjs');
    const criticModulePath = join(root, 'critic.mjs');
    const adapterRunnerPath = join(root, 'adapter-runner.mjs');
    const adapterContextPath = join(root, 'adapter-context.json');
    await Promise.all([
      writeJson(factBasePath, suppliedFactBase()),
      writeAuthorModule(authorModulePath),
      writeFile(
        criticModulePath,
        `export async function critic() {
  return {
    criticId: 'packaged-layout-smoke',
    executedAt: '${NOW}',
    findings: [],
  };
}
`,
      ),
      writeAdapterRunner(adapterRunnerPath),
    ]);
    await writeJson(requestPath, {
      schemaVersion: 'explainer-kit.run-request/v1',
      recipe: { id: 'project-explainer', version: '1' },
      slug: 'packaged-core',
      outputRoot: join(root, 'core-output'),
      factBase: {
        mode: 'supplied',
        path: factBasePath,
        freshnessPolicy: 'live-wins',
      },
      theme: {
        palette: 'neutral',
        visualProfile: 'clean',
        renderStrategy: 'default-only',
      },
      durability: { strategy: 'none' },
      privacy: { retainRawArtDirection: false },
      mode: 'unattended',
    });
    await writeJson(adapterContextPath, {
      adapterRoot,
      userSkillsRoot,
      repoRoot,
      invocation: 'project',
      activeProject: projectRelative,
      recipe: 'project-explainer',
      slug: 'packaged-adapter',
      authorModulePath,
      criticModulePath,
      mode: 'unattended',
    });

    await rename(assetsRoot, poisonedAssetsRoot);
    const env = isolatedEnvironment({ userRoot, binRoot });

    return {
      root,
      sourceCheckoutRoot: SOURCE_CHECKOUT_ROOT,
      assetsRoot,
      poisonedAssetsRoot,
      userRoot,
      userSkillsRoot,
      coreRoot,
      repoRoot,
      adapterRoot,
      requestPath,
      coreRunArgs: {
        script: join(coreRoot, 'scripts', 'run.mjs'),
        args: ['--request', requestPath, '--author-module', authorModulePath],
        cwd: root,
        env,
      },
      adapterRunArgs: {
        script: adapterRunnerPath,
        args: ['--context', adapterContextPath],
        cwd: repoRoot,
        env,
      },
      cleanup: () => rm(root, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

async function bundleAssets(assetsRoot) {
  await execFileAsync(
    'bash',
    [join(SOURCE_CHECKOUT_ROOT, 'packages/cli/scripts/bundle-assets.sh')],
    {
      cwd: SOURCE_CHECKOUT_ROOT,
      env: { ...process.env, OAT_ASSETS_DIR: assetsRoot },
      maxBuffer: 10 * 1024 * 1024,
    },
  );
}

async function installSkill(assetsRoot, skill, destination) {
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(assetsRoot, 'skills', skill), destination, {
    recursive: true,
    dereference: true,
  });
}

async function writeProjectArtifacts(projectRoot) {
  await Promise.all(
    [
      ['plan.md', '# Plan\n\nPackage and run the explainer core.'],
      ['design.md', '# Design\n\nUse a config-blind installed core.'],
      ['spec.md', '# Spec\n\nNever fall back to source checkout assets.'],
    ].map(([name, content]) =>
      writeFile(join(projectRoot, name), `${content}\n`),
    ),
  );
}

async function writeOatStub(path) {
  await writeFile(
    path,
    `#!/usr/bin/env node
const key = process.argv[4];
const values = {
  'explainers.defaults.palette': 'neutral',
  'explainers.defaults.visualProfile': 'clean',
  'workflow.explainers.projectExplainer': 'ask',
  'workflow.explainers.projectRecap': 'ask',
};
process.stdout.write(JSON.stringify({
  status: 'ok',
  key,
  value: values[key] ?? null,
  source: 'default',
}));
`,
  );
  await chmod(path, 0o755);
}

async function writeAuthorModule(path) {
  await writeFile(
    path,
    `export async function author(request) {
  return {
    schemaVersion: 'explainer-kit.author-result/v1',
    artifactId: request.artifact.id,
    content: {
      title: 'Packaged Project Explainer',
      description: 'A packaged execution generated from approved project evidence.',
      sections: request.narrativeOutline.map(({ id, title }) => ({
        id,
        title,
        prose: \`The packaged author synthesized the \${title.toLowerCase()} section from approved project evidence while preserving the destination-neutral explainer contract.\`,
      })),
    },
    provenance: {
      authorId: 'packaged-layout-provider-neutral-author',
      generatedAt: '${NOW}',
      method: 'structured-evidence-synthesis',
      model: 'packaged-layout-author/v1',
    },
  };
}
`,
  );
}

async function writeAdapterRunner(path) {
  await writeFile(
    path,
    `#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

if (process.argv.length !== 4 || process.argv[2] !== '--context') {
  throw new Error('Usage: adapter-runner.mjs --context <adapter-context.json>');
}
const contextPath = process.argv[3];
const context = JSON.parse(await readFile(contextPath, 'utf8'));
const adapter = await import(
  pathToFileURL(\`\${context.adapterRoot}/scripts/run.mjs\`).href
);
const authorModule = await import(pathToFileURL(context.authorModulePath).href);
delete context.authorModulePath;

try {
  const result = await adapter.runOatExplainer({
    ...context,
    coreOptions: { author: authorModule.author },
  });
  process.stdout.write(\`\${JSON.stringify(result, null, 2)}\\n\`);
  process.exitCode = result.result.outcome === 'failed' ? 1 : 0;
} catch (error) {
  process.stderr.write(
    \`\${JSON.stringify({
      outcome: 'failed',
      errors: [{
        code: error.code ?? 'E_ADAPTER',
        message: error instanceof Error ? error.message : String(error),
      }],
    }, null, 2)}\\n\`,
  );
  process.exitCode = 1;
}
`,
  );
  await chmod(path, 0o755);
}

function isolatedEnvironment({ userRoot, binRoot }) {
  return {
    HOME: userRoot,
    PATH: `${binRoot}:${process.env.PATH ?? ''}`,
    TMPDIR: process.env.TMPDIR ?? tmpdir(),
    LANG: process.env.LANG ?? 'C',
  };
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function suppliedFactBase() {
  return {
    schemaVersion: 'explainer-kit.fact-base/v1',
    generatedAt: NOW,
    mode: 'supplied',
    freshnessPolicy: 'live-wins',
    sources: [
      {
        id: 'project',
        kind: 'file',
        locator: 'approved-project.md',
        hash: HASH,
        observedAt: NOW,
      },
    ],
    claims: [
      {
        id: 'packaged-layout',
        text: 'The packaged core resolves every runtime asset relatively.',
        status: 'confirmed',
        citations: [
          {
            sourceId: 'project',
            locator: 'approved-project.md:1',
          },
        ],
      },
    ],
    unresolvedClaims: [],
    overrides: [],
  };
}

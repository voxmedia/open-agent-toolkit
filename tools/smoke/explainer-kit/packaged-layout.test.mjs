import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, readFile, rename, writeFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { promisify } from 'node:util';

import { createPackagedLayout } from './fixtures/package-root.mjs';

const execFileAsync = promisify(execFile);
let fixture;

before(async () => {
  fixture = await createPackagedLayout();
});

after(async () => {
  await fixture?.cleanup();
});

test('bundles and installs the explainer skills at their intended scopes', async () => {
  await access(fixture.coreRoot);
  await access(fixture.adapterRoot);
  await access(fixture.poisonedAssetsRoot);
  await assert.rejects(access(fixture.assetsRoot), { code: 'ENOENT' });

  assert.equal(
    fixture.coreRoot,
    `${fixture.userRoot}/.agents/skills/explainer-kit`,
  );
  assert.equal(
    fixture.adapterRoot,
    `${fixture.repoRoot}/.agents/skills/oat-explainer-kit`,
  );
});

test('runs a config-free project explainer from the packaged core only', async () => {
  const result = await runJson(fixture.coreRunArgs);

  assert.equal(result.outcome, 'built-not-durable');
  assert.equal(result.errors, undefined);
  const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8'));
  await assertAuthoredRun(result.runRoot, manifest);
  const request = await readFile(fixture.requestPath, 'utf8');
  assert.equal(manifest.schemaVersion, 'explainer-kit.manifest/v1');
  assert.equal(manifest.recipe.id, 'project-explainer');
  assert.doesNotMatch(
    `${request}\n${JSON.stringify(manifest)}`,
    new RegExp(escapeRegExp(fixture.sourceCheckoutRoot)),
  );
});

test('runs the packaged adapter against the user-scoped packaged core', async () => {
  assert.equal(
    fixture.adapterRunArgs.script,
    `${fixture.adapterRoot}/scripts/run.mjs`,
  );
  const result = await runJson(fixture.adapterRunArgs);

  assert.equal(result.compatibility.coreRoot, fixture.coreRoot);
  const packagedCoreSkill = await readFile(
    `${fixture.coreRoot}/SKILL.md`,
    'utf8',
  );
  const packagedCoreVersion = readSkillVersion(packagedCoreSkill);
  assert.equal(result.compatibility.installedVersion, packagedCoreVersion);
  assert.equal(result.request.recipe.id, 'project-explainer');
  assert.equal(result.result.outcome, 'built-not-durable');
  assert.equal(result.manifest.schemaVersion, 'explainer-kit.manifest/v1');
  assert.match(fixture.reviewedRepository.revision, /^[a-f0-9]{40}$/);
  const approval = JSON.parse(
    await readFile(
      `${result.result.runRoot}/source/content-approval.json`,
      'utf8',
    ),
  );
  assert.deepEqual(approval.reviewedSource, {
    kind: 'approved-oat-artifacts',
    locator: fixture.reviewedRepository.repositoryUrl,
    ...fixture.reviewedRepository,
  });
  assert.ok(result.manifest.source.backlinks.length > 0);
  assert.equal(
    result.manifest.source.backlinks.every(
      ({ url }) =>
        url.startsWith(`${fixture.reviewedRepository.repositoryUrl}/blob/`) &&
        url.includes(`/${fixture.reviewedRepository.revision}/`),
    ),
    true,
  );
  await assertAuthoredRun(result.result.runRoot, result.manifest);
  assert.doesNotMatch(
    JSON.stringify(result),
    new RegExp(escapeRegExp(fixture.sourceCheckoutRoot)),
  );
});

test('packaged adapter fails closed when its packaged core is missing or incompatible', async () => {
  const missingRoot = `${fixture.coreRoot}.missing`;
  await rename(fixture.coreRoot, missingRoot);
  const missing = await runJsonFailure(fixture.adapterRunArgs);
  assert.equal(missing.outcome, 'failed');
  assert.deepEqual(missing.reasons, [
    { stage: 'finalization', kind: 'pipeline-failure', count: 1 },
  ]);
  assert.equal('errors' in missing, false);
  await rename(missingRoot, fixture.coreRoot);

  const skillPath = `${fixture.coreRoot}/SKILL.md`;
  const compatibleSkill = await readFile(skillPath, 'utf8');
  const incompatibleSkill = withSkillVersion(compatibleSkill, '1.9.9');
  // A shape-blind rewrite would silently no-op once the core declares its
  // version under `metadata`, and this case would stop testing anything.
  assert.notEqual(incompatibleSkill, compatibleSkill);
  assert.equal(readSkillVersion(incompatibleSkill), '1.9.9');
  await writeFile(skillPath, incompatibleSkill);
  const incompatible = await runJsonFailure(fixture.adapterRunArgs);
  assert.equal(incompatible.outcome, 'failed');
  assert.deepEqual(incompatible.reasons, [
    { stage: 'finalization', kind: 'pipeline-failure', count: 1 },
  ]);
  assert.equal('errors' in incompatible, false);
});

async function runJson({ script, args, cwd, env }) {
  const { stdout } = await execFileAsync(process.execPath, [script, ...args], {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

async function runJsonFailure(invocation) {
  try {
    await runJson(invocation);
    assert.fail('Expected packaged adapter invocation to fail.');
  } catch (error) {
    assert.equal(error.code, 1);
    return JSON.parse(error.stderr);
  }
}

async function assertAuthoredRun(runRoot, manifest) {
  assert.deepEqual(manifest.source.authorResultPaths, [
    'source/author/project-explainer.json',
  ]);
  const authorResult = JSON.parse(
    await readFile(
      `${runRoot}/${manifest.source.authorResultPaths[0]}`,
      'utf8',
    ),
  );
  const { generatedAt, ...identity } = authorResult.provenance;
  assert.deepEqual(identity, {
    authorId: 'packaged-layout-provider-neutral-author',
    method: 'structured-evidence-synthesis',
    trust: 'self-asserted',
  });
  // The core stamps generation time from its own clock, so the author
  // module's backdated claim never reaches the hash-pinned record.
  assert.notEqual(generatedAt, '2026-07-18T14:00:00.000Z');
  assert.equal(new Date(generatedAt).toISOString(), generatedAt);
}

/**
 * Locate every version declaration in a packaged skill's opening frontmatter:
 * the direct `metadata.version` child and the deprecated top-level `version`
 * alias. Only the frontmatter block is scanned, so a `version:` line inside the
 * skill's prose is never mistaken for a declaration, and only direct children
 * of `metadata:` count.
 *
 * Comment lines carry no structure in YAML, so they neither end a block nor set
 * its indentation; a repeated declaration reads as none at all, which fails the
 * callers loudly rather than picking one silently.
 */
function readSkillVersionSites(content) {
  const lines = content.split('\n');
  const end = lines[0] === '---' ? lines.indexOf('---', 1) : -1;
  const sites = { topLevel: null, metadata: null };
  let inMetadata = false;
  let seenMetadata = false;
  let childIndent = null;
  let duplicated = false;

  for (let index = 1; index < end; index += 1) {
    const line = lines[index];
    if (line.trim() === '' || line.trimStart().startsWith('#')) {
      continue;
    }
    if (/^\S/.test(line)) {
      inMetadata = /^metadata:[ \t]*(?:#.*)?$/.test(line);
      duplicated ||= inMetadata && seenMetadata;
      seenMetadata ||= inMetadata;
      childIndent = null;
      const value = line.match(/^version:[ \t]+([^\s#]+)/)?.[1];
      if (value !== undefined) {
        duplicated ||= sites.topLevel !== null;
        sites.topLevel = { index, indent: 0, value };
      }
      continue;
    }
    if (!inMetadata) {
      continue;
    }
    const indent = line.length - line.trimStart().length;
    childIndent ??= indent;
    if (indent !== childIndent) {
      continue;
    }
    const value = line.trimStart().match(/^version:[ \t]+([^\s#]+)/)?.[1];
    if (value !== undefined) {
      duplicated ||= sites.metadata !== null;
      sites.metadata = { index, indent, value };
    }
  }

  return {
    lines,
    sites: duplicated ? { topLevel: null, metadata: null } : sites,
  };
}

/** `metadata.version` wins over the deprecated top-level alias. */
function readSkillVersion(content) {
  const { sites } = readSkillVersionSites(content);
  return (sites.metadata ?? sites.topLevel)?.value;
}

/**
 * Rewrite every version declaration the frontmatter carries, replacing the
 * whole line so no quote or comment survives. Rewriting only one of two
 * declarations would leave the core self-contradictory, and the adapter would
 * then reject a conflict rather than the incompatible version under test.
 */
function withSkillVersion(content, version) {
  const { lines, sites } = readSkillVersionSites(content);
  const targets = [sites.topLevel, sites.metadata].filter(
    (site) => site !== null,
  );
  assert.notEqual(targets.length, 0, 'the packaged core declares no version');
  for (const target of targets) {
    lines[target.index] = `${' '.repeat(target.indent)}version: ${version}`;
  }
  return lines.join('\n');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

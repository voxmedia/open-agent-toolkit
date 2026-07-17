import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import {
  CORE_INSTALL_COMMAND,
  CORE_UPDATE_COMMAND,
  checkCoreCompatibility,
} from '../scripts/check-core.mjs';

const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function createInstalledLayout(version) {
  const root = await mkdtemp(join(tmpdir(), 'oat-explainer-core-'));
  tempDirs.push(root);
  const skillsRoot = join(root, '.agents', 'skills');
  const adapterRoot = join(skillsRoot, 'oat-explainer-kit');
  await mkdir(adapterRoot, { recursive: true });
  if (version !== null) {
    const coreRoot = join(skillsRoot, 'explainer-kit');
    await mkdir(coreRoot, { recursive: true });
    await writeFile(
      join(coreRoot, 'SKILL.md'),
      `---\nname: explainer-kit\nversion: ${version}\n---\n`,
      'utf8',
    );
  }
  return { root, skillsRoot, adapterRoot };
}

test('accepts a compatible installed canonical core', async () => {
  const { adapterRoot, skillsRoot } = await createInstalledLayout('1.4.2');

  assert.deepEqual(
    await checkCoreCompatibility({
      adapterRoot,
      userSkillsRoot: skillsRoot,
      minimumVersion: '1.2.0',
    }),
    {
      ok: true,
      code: 'compatible',
      coreRoot: join(adapterRoot, '..', 'explainer-kit'),
      installedVersion: '1.4.2',
      minimumVersion: '1.2.0',
      message: 'Installed explainer-kit 1.4.2 is compatible.',
      guidance: null,
    },
  );
});

test('resolves a user-scoped core independently from a project-scoped adapter', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oat-explainer-cross-scope-'));
  tempDirs.push(root);
  const adapterRoot = join(
    root,
    'project',
    '.agents',
    'skills',
    'oat-explainer-kit',
  );
  const userSkillsRoot = join(root, 'home', '.agents', 'skills');
  const coreRoot = join(userSkillsRoot, 'explainer-kit');
  await mkdir(adapterRoot, { recursive: true });
  await mkdir(coreRoot, { recursive: true });
  await writeFile(
    join(coreRoot, 'SKILL.md'),
    '---\nname: explainer-kit\nversion: 1.3.0\n---\n',
    'utf8',
  );

  const result = await checkCoreCompatibility({
    adapterRoot,
    userSkillsRoot,
    minimumVersion: '1.0.0',
  });

  assert.equal(result.ok, true);
  assert.equal(result.coreRoot, coreRoot);
});

test('fails closed with install guidance when the core is missing', async () => {
  const { adapterRoot, skillsRoot } = await createInstalledLayout(null);
  const result = await checkCoreCompatibility({
    adapterRoot,
    userSkillsRoot: skillsRoot,
    minimumVersion: '1.0.0',
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'missing');
  assert.equal(result.guidance, CORE_INSTALL_COMMAND);
  assert.equal(CORE_INSTALL_COMMAND, 'oat tools install utility --scope user');
});

test('rejects old major and old minor versions with update guidance', async () => {
  for (const version of ['0.9.0', '1.1.9']) {
    const { adapterRoot, skillsRoot } = await createInstalledLayout(version);
    const result = await checkCoreCompatibility({
      adapterRoot,
      userSkillsRoot: skillsRoot,
      minimumVersion: '1.2.0',
    });

    assert.equal(result.ok, false, version);
    assert.equal(result.code, 'incompatible', version);
    assert.equal(result.guidance, CORE_UPDATE_COMMAND, version);
  }
  assert.equal(
    CORE_UPDATE_COMMAND,
    'oat tools update --pack utility --scope user',
  );
});

test('does not treat a source checkout core as installed', async () => {
  const { root, adapterRoot, skillsRoot } = await createInstalledLayout(null);
  const sourceCore = join(
    root,
    'checkout',
    '.agents',
    'skills',
    'explainer-kit',
  );
  await mkdir(sourceCore, { recursive: true });
  await writeFile(
    join(sourceCore, 'SKILL.md'),
    '---\nname: explainer-kit\nversion: 9.0.0\n---\n',
    'utf8',
  );

  const result = await checkCoreCompatibility({
    adapterRoot,
    userSkillsRoot: skillsRoot,
    minimumVersion: '1.0.0',
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'missing');
  assert.equal(result.coreRoot, join(skillsRoot, 'explainer-kit'));
});

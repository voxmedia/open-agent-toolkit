import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { applyPresetToFixture } from './apply-preset.mjs';

const presetsRoot = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.dirname(presetsRoot);
const fixtureProjectRoot = path.join(fixtureRoot, 'project');
const applierPath = path.join(presetsRoot, 'apply-preset.mjs');
const artifactNames = ['state.md', 'plan.md', 'implementation.md'];

function createFixtureCopy() {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'oat-fixture-'));
  const projectRoot = path.join(temporaryRoot, 'project');

  cpSync(fixtureProjectRoot, projectRoot, { recursive: true });

  return { projectRoot, temporaryRoot };
}

function runPreset(presetName, projectRoot) {
  return spawnSync(process.execPath, [applierPath, presetName, projectRoot], {
    encoding: 'utf8',
  });
}

test('implementation-ready produces implementation-ready frontmatter', (t) => {
  const { projectRoot, temporaryRoot } = createFixtureCopy();
  t.after(() => rmSync(temporaryRoot, { force: true, recursive: true }));

  const result = runPreset('implementation-ready', projectRoot);

  assert.equal(result.status, 0, result.stderr);
  const plan = readFileSync(path.join(projectRoot, 'plan.md'), 'utf8');
  const state = readFileSync(path.join(projectRoot, 'state.md'), 'utf8');
  const implementation = readFileSync(
    path.join(projectRoot, 'implementation.md'),
    'utf8',
  );
  assert.match(plan, /^oat_status: complete$/m);
  assert.match(plan, /^oat_ready_for: oat-project-implement$/m);
  assert.match(plan, /^oat_template: false$/m);
  assert.match(plan, /^\| plan\s+\| artifact \| passed\s+\| -\s+\| -\s+\|$/m);
  assert.match(state, /^oat_phase: implement$/m);
  assert.match(state, /^oat_phase_status: in_progress$/m);
  assert.match(state, /^oat_current_task: p01-t01$/m);
  assert.match(implementation, /^oat_current_task_id: p01-t01$/m);
  assert.deepEqual(
    readdirSync(projectRoot).filter((entry) => entry.includes('.preset-')),
    [],
  );
});

test('pre-review restores the canonical fixture shape', (t) => {
  const { projectRoot, temporaryRoot } = createFixtureCopy();
  t.after(() => rmSync(temporaryRoot, { force: true, recursive: true }));

  assert.equal(runPreset('implementation-ready', projectRoot).status, 0);
  assert.equal(runPreset('pre-review', projectRoot).status, 0);

  for (const artifact of artifactNames) {
    assert.equal(
      readFileSync(path.join(projectRoot, artifact), 'utf8'),
      readFileSync(path.join(fixtureProjectRoot, artifact), 'utf8'),
      `${artifact} must match the canonical fixture after reset`,
    );
  }
});

test('unknown presets fail closed without changing the fixture copy', (t) => {
  const { projectRoot, temporaryRoot } = createFixtureCopy();
  t.after(() => rmSync(temporaryRoot, { force: true, recursive: true }));

  const before = new Map(
    artifactNames.map((artifact) => [
      artifact,
      readFileSync(path.join(projectRoot, artifact)),
    ]),
  );
  const result = runPreset('unknown-preset', projectRoot);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown preset/i);
  for (const [artifact, contents] of before) {
    assert.deepEqual(readFileSync(path.join(projectRoot, artifact)), contents);
  }
});

test('a later publish failure rolls back every fixture artifact', (t) => {
  const { projectRoot, temporaryRoot } = createFixtureCopy();
  t.after(() => rmSync(temporaryRoot, { force: true, recursive: true }));

  const before = new Map(
    artifactNames.map((artifact) => [
      artifact,
      readFileSync(path.join(projectRoot, artifact)),
    ]),
  );
  let publishCount = 0;
  const fileSystem = {
    readFileSync,
    renameSync(source, destination) {
      publishCount += 1;
      if (publishCount === 2) {
        throw new Error('injected later publish failure');
      }
      renameSync(source, destination);
    },
    rmSync,
    writeFileSync,
  };

  assert.throws(
    () =>
      applyPresetToFixture('implementation-ready', projectRoot, {
        fileSystem,
        transactionId: 'rollback-test',
      }),
    /injected later publish failure/,
  );
  assert.equal(publishCount, 2);
  for (const [artifact, contents] of before) {
    assert.deepEqual(readFileSync(path.join(projectRoot, artifact)), contents);
  }
  assert.deepEqual(
    readdirSync(projectRoot).filter((entry) => entry.includes('.preset-')),
    [],
  );
});

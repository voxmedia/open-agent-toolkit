// Reproduction for UP-03. See manual-state-writers.md for the historical source.
// Usage: node probe-state-check.mjs <oat-bin> <bad-state.md> [--baseline]
// <oat-bin> is an executable installed oat, or an absolute dist/index.js.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [cliArg, badArg, mode] = process.argv.slice(2);
assert(cliArg && badArg, 'Pass the CLI executable and incident-derived input');
const cli = resolve(cliArg);
const bad = readFileSync(resolve(badArg), 'utf8');
const baseline = mode === '--baseline';
const root = mkdtempSync(join(tmpdir(), 'oat-state-probe-'));
const statePath = join(root, 'state.md');
const env = { ...process.env, NO_UPDATE_NOTIFIER: '1' };
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, env, encoding: 'utf8' });
  if (result.error) throw result.error;
  return {
    exit: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
};
const oat = (...args) => run(process.execPath, [cli, ...args]);
const git = (...args) =>
  run('git', [
    '-c',
    'core.hooksPath=/dev/null',
    '-c',
    'user.name=State Probe',
    '-c',
    'user.email=state-probe@example.invalid',
    ...args,
  ]);
const report = {
  baseline,
  cli,
  node: process.version,
  platform: `${process.platform}/${process.arch}`,
};
try {
  writeFileSync(statePath, bad);
  writeFileSync(
    join(root, 'plan.md'),
    '---\noat_plan_parallel_groups: []\n---\n\n### Task p01-t01: Probe\n',
  );
  assert.equal(git('init', '-q').exit, 0);
  // The old validation path tolerates the malformed state. Git does not parse it.
  if (baseline) {
    report.validation = oat(
      '--json',
      'project',
      'validate-plan',
      '--project-path',
      root,
    );
    assert.equal(report.validation.exit, 0);
    assert.equal(JSON.parse(report.validation.stdout).valid, true);
    assert.equal(git('add', 'state.md', 'plan.md').exit, 0);
    report.commit = git('commit', '-qm', 'accept unchecked malformed state');
    assert.equal(report.commit.exit, 0);
    report.outcome =
      'malformed state unchecked; validation and commit accepted';
  } else {
    report.invalid = oat('--json', 'project', 'check-state', root);
    assert.equal(report.invalid.exit, 1);
    assert.equal(JSON.parse(report.invalid.stdout).code, 'BAD_INDENT');
    assert.equal(readFileSync(statePath, 'utf8'), bad);
    // Pass values as positional shell arguments, never interpolate shell text.
    report.stopped = run('bash', [
      '-c',
      '"$1" "$2" project check-state "$3" || exit 1\ngit -c core.hooksPath=/dev/null -c user.name="State Probe" -c user.email=state-probe@example.invalid add state.md\ngit -c core.hooksPath=/dev/null -c user.name="State Probe" -c user.email=state-probe@example.invalid commit -qm continuation\nprintf continued > continued',
      'state-check-probe',
      process.execPath,
      cli,
      root,
    ]);
    assert.equal(report.stopped.exit, 1);
    assert.equal(existsSync(join(root, 'continued')), false);
    assert.notEqual(git('rev-parse', '--verify', 'HEAD').exit, 0);
    const valid =
      '---\n# optional gate stays commented\n# oat_implement_exit_gate:\n#   receive_correlation: null\noat_phase: custom-phase # parse only\nmetadata: { tags: [one, two] }\n---\n\nBody remains byte-for-byte.\n';
    writeFileSync(statePath, valid);
    report.valid = oat('--json', 'project', 'check-state', root);
    assert.equal(report.valid.exit, 0);
    assert.equal(JSON.parse(report.valid.stdout).valid, true);
    assert.equal(readFileSync(statePath, 'utf8'), valid);
    report.continued = run('bash', [
      '-c',
      '"$1" "$2" project check-state "$3" || exit 1\nprintf continued > continued',
      'state-check-probe',
      process.execPath,
      cli,
      root,
    ]);
    assert.equal(report.continued.exit, 0);
    assert.equal(existsSync(join(root, 'continued')), true);
    report.outcome =
      'BAD_INDENT refused before commit/continuation; valid control accepted unchanged';
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  rmSync(root, { recursive: true, force: true });
}

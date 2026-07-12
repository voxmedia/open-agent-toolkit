import assert from 'node:assert/strict';
import test from 'node:test';

import { UsageError, parseArgs } from './args.mjs';
import { HandlerUnavailableError, runSmoke } from './run-smoke.mjs';

const baseArgs = ['--harness', 'codex', '--scenario', 'plan-review'];

test('parses required options with all stages by default', () => {
  assert.deepEqual(parseArgs(baseArgs), {
    driveMode: 'automated',
    dryRun: false,
    harness: 'codex',
    keep: false,
    scenario: 'plan-review',
    stages: ['prepare', 'drive', 'collect'],
  });
});

test('accepts every harness and scenario enum value', () => {
  const harnesses = ['codex', 'claude', 'cursor-ide', 'cursor-cli'];
  const scenarios = ['plan-review', 'implement', 'full'];

  for (const harness of harnesses) {
    for (const scenario of scenarios) {
      assert.deepEqual(
        parseArgs(['--harness', harness, '--scenario', scenario]),
        {
          driveMode: 'automated',
          dryRun: false,
          harness,
          keep: false,
          scenario,
          stages: ['prepare', 'drive', 'collect'],
        },
      );
    }
  }
});

test('parses each stage and boolean flag', () => {
  for (const stage of ['prepare', 'drive', 'collect']) {
    assert.deepEqual(
      parseArgs([...baseArgs, '--stage', stage, '--dry-run', '--keep']),
      {
        driveMode: 'automated',
        dryRun: true,
        harness: 'codex',
        keep: true,
        scenario: 'plan-review',
        stages: [stage],
      },
    );
  }
});

test('parses automated and operator drive modes', () => {
  for (const driveMode of ['automated', 'operator']) {
    const parsed = parseArgs([...baseArgs, '--drive-mode', driveMode]);
    assert.equal(parsed.driveMode, driveMode);
    assert.deepEqual(
      parsed.stages,
      driveMode === 'operator' ? ['prepare'] : ['prepare', 'drive', 'collect'],
    );
  }
});

test('rejects missing required option values and unknown values with usage', () => {
  const invalidArgv = [
    [],
    ['--harness'],
    ['--scenario'],
    ['--harness', 'unknown', '--scenario', 'full'],
    ['--harness', 'codex', '--scenario', 'unknown'],
    [...baseArgs, '--drive-mode', 'unknown'],
    [...baseArgs, '--stage', 'unknown'],
  ];

  for (const argv of invalidArgv) {
    assert.throws(
      () => parseArgs(argv),
      (error) =>
        error instanceof UsageError && error.message.includes('Usage:'),
    );
  }
});

test('rejects repeated options, flags, positional arguments, and unknown arguments', () => {
  const invalidArgv = [
    [...baseArgs, '--harness', 'claude'],
    [...baseArgs, '--scenario', 'implement'],
    [...baseArgs, '--stage', 'prepare', '--stage', 'drive'],
    [...baseArgs, '--drive-mode', 'operator', '--drive-mode', 'automated'],
    [...baseArgs, '--dry-run', '--dry-run'],
    [...baseArgs, '--keep', '--keep'],
    [...baseArgs, 'unexpected'],
    [...baseArgs, '--unknown'],
  ];

  for (const argv of invalidArgv) {
    assert.throws(
      () => parseArgs(argv),
      (error) =>
        error instanceof UsageError && error.message.includes('Usage:'),
    );
  }
});

test('orchestrates only selected injected stage handlers in order', async () => {
  const calls = [];
  const options = parseArgs([...baseArgs, '--stage', 'drive']);
  const result = await runSmoke(options, {
    handlers: {
      drive: async (receivedOptions) => {
        calls.push(receivedOptions);
        return { protocol: 'printed' };
      },
    },
  });

  assert.deepEqual(calls, [options]);
  assert.deepEqual(result, { drive: { protocol: 'printed' } });
});

test('fails clearly when a selected stage has no handler', async () => {
  await assert.rejects(
    () => runSmoke(parseArgs(baseArgs), { handlers: {} }),
    (error) =>
      error instanceof HandlerUnavailableError &&
      error.message === 'Smoke runner stage "prepare" is unavailable.',
  );
});

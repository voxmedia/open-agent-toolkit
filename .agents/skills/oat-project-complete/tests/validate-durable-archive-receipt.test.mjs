import assert from 'node:assert/strict';
import { execFileSync, execFile as execFileCallback } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { validateSyncedArchiveTerminalReport } from '../scripts/finalize-synced-archive.mjs';
import {
  discoverValidatedDurableArchive,
  isTerminalArchivedState,
  validateDurableArchiveReceipt,
} from '../scripts/validate-durable-archive-receipt.mjs';

const execFile = promisify(execFileCallback);
const validatorPath = fileURLToPath(
  new URL('../scripts/validate-durable-archive-receipt.mjs', import.meta.url),
);

const sharedReceipt = {
  status: 'ok',
  mode: 'apply',
  archivePath: '.oat/projects/archived/demo',
  summaryExportFile: null,
};

const terminalArchivedState = [
  '---',
  'oat_lifecycle: complete',
  '---',
  '',
  '# State',
  '',
  '## Current Phase',
  '',
  'Lifecycle complete; archived locally',
  '',
].join('\n');

async function makeArchivedRoot(entries) {
  const root = await mkdtemp(join(tmpdir(), 'durable-archive-'));
  const archivedRoot = join(root, 'archived');
  await mkdir(archivedRoot, { recursive: true });
  for (const [name, stateContent] of Object.entries(entries)) {
    const projectDirectory = join(archivedRoot, name);
    await mkdir(projectDirectory, { recursive: true });
    if (stateContent !== null) {
      await writeFile(join(projectDirectory, 'state.md'), stateContent, 'utf8');
    }
  }
  return archivedRoot;
}

test('accepts a successful shared archive apply receipt', () => {
  assert.equal(
    validateDurableArchiveReceipt(sharedReceipt),
    '.oat/projects/archived/demo',
  );
});

test('rejects archive reports that are not a successful apply', () => {
  for (const report of [
    null,
    'ok',
    [],
    { ...sharedReceipt, status: 'failed' },
    { ...sharedReceipt, mode: 'dry-run' },
  ]) {
    assert.throws(() => validateDurableArchiveReceipt(report), {
      code: 'E_DURABLE_ARCHIVE_RECEIPT',
    });
  }
});

test('rejects a receipt with no archive path', () => {
  for (const archivePath of [undefined, '', 42]) {
    assert.throws(
      () => validateDurableArchiveReceipt({ ...sharedReceipt, archivePath }),
      { code: 'E_DURABLE_ARCHIVE_RECEIPT' },
    );
  }
});

test('never accepts a shared receipt through the synced finalizer', () => {
  // The synced terminal contract requires lifecycleCommit, completedRef,
  // verifiedSourceSha, and recordRetired, none of which a shared archive
  // carries. This pins the plan's separate-validator requirement.
  assert.throws(
    () => validateSyncedArchiveTerminalReport(sharedReceipt, 'demo'),
    { code: 'E_SYNCED_ARCHIVE_FINALIZATION' },
  );
});

test('recognizes only a completed archived state as terminal evidence', () => {
  assert.equal(isTerminalArchivedState(terminalArchivedState), true);
  assert.equal(
    isTerminalArchivedState(
      terminalArchivedState.replace(
        'oat_lifecycle: complete',
        'oat_lifecycle: active',
      ),
    ),
    false,
  );
  assert.equal(
    isTerminalArchivedState(
      terminalArchivedState.replace(
        'Lifecycle complete; archived locally',
        'Lifecycle complete',
      ),
    ),
    false,
  );
  assert.equal(isTerminalArchivedState(undefined), false);
});

test('discovers exactly one validated archive for the project', async () => {
  const archivedRoot = await makeArchivedRoot({
    demo: terminalArchivedState,
    unrelated: terminalArchivedState,
  });
  const { stdout } = await execFile('node', [
    validatorPath,
    '--mode',
    'directory',
    '--archived-root',
    archivedRoot,
    '--project-name',
    'demo',
  ]);
  assert.equal(stdout.trim(), join(archivedRoot, 'demo'));
});

test('accepts a dated snapshot directory as the single candidate', async () => {
  const archivedRoot = await makeArchivedRoot({
    '20260902-demo': terminalArchivedState,
  });
  assert.equal(
    await discoverValidatedDurableArchive({
      archivedRoot,
      projectName: 'demo',
      listDirectory: (directory) => readdir(directory),
      readStateFile: (statePath) => readFile(statePath, 'utf8'),
    }),
    join(archivedRoot, '20260902-demo'),
  );
});

test('refuses an ambiguous resume when several archives match', async () => {
  const archivedRoot = await makeArchivedRoot({
    demo: terminalArchivedState,
    '20260902-demo': terminalArchivedState,
  });
  await assert.rejects(
    execFile('node', [
      validatorPath,
      '--mode',
      'directory',
      '--archived-root',
      archivedRoot,
      '--project-name',
      'demo',
    ]),
    (error) => {
      assert.match(error.stderr, /refusing an ambiguous resume/);
      return true;
    },
  );
});

test('refuses to resume when no archive carries terminal evidence', async () => {
  const archivedRoot = await makeArchivedRoot({
    demo: terminalArchivedState.replace(
      'Lifecycle complete; archived locally',
      'Lifecycle complete',
    ),
  });
  await assert.rejects(
    execFile('node', [
      validatorPath,
      '--mode',
      'directory',
      '--archived-root',
      archivedRoot,
      '--project-name',
      'demo',
    ]),
    (error) => {
      assert.match(error.stderr, /with a completed archived state\.md/);
      return true;
    },
  );
});

test('refuses to resume when the archived root does not exist', async () => {
  await assert.rejects(
    execFile('node', [
      validatorPath,
      '--mode',
      'directory',
      '--archived-root',
      join(tmpdir(), 'durable-archive-absent-root'),
      '--project-name',
      'demo',
    ]),
    (error) => {
      assert.match(error.stderr, /Invalid durable archive receipt/);
      return true;
    },
  );
});

test('validates a receipt piped on stdin through the CLI entry point', () => {
  const stdout = execFileSync('node', [validatorPath, '--mode', 'receipt'], {
    encoding: 'utf8',
    input: JSON.stringify(sharedReceipt),
  });
  assert.equal(stdout.trim(), '.oat/projects/archived/demo');
});

test('rejects a malformed receipt piped on stdin', () => {
  assert.throws(
    () =>
      execFileSync('node', [validatorPath, '--mode', 'receipt'], {
        encoding: 'utf8',
        input: JSON.stringify({ ...sharedReceipt, status: 'failed' }),
        stdio: ['pipe', 'pipe', 'pipe'],
      }),
    (error) => {
      assert.match(error.stderr, /not a successful apply result/);
      return true;
    },
  );
});

test('rejects an unusable mode', async () => {
  await assert.rejects(
    execFile('node', [validatorPath, '--mode', 'guess']),
    (error) => {
      assert.match(
        error.stderr,
        /Usage: validate-durable-archive-receipt\.mjs/,
      );
      return true;
    },
  );
});

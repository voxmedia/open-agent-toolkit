import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { checkEvidenceReport } from './report.mjs';

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, '../../..');

async function canonicalReportPaths() {
  const { stdout } = await execFileAsync(
    'git',
    ['ls-files', 'tools/smoke/reports'],
    { cwd: repositoryRoot },
  );
  return stdout
    .split('\n')
    .filter((path) => path.endsWith('/report.json'))
    .filter((path) => !path.includes('/legacy-three-tier/'))
    .sort();
}

test('every tracked canonical report remains bound after formatting', async () => {
  const reportPaths = await canonicalReportPaths();
  assert.ok(reportPaths.length > 0, 'expected tracked canonical smoke reports');

  const temporaryRoot = await mkdtemp(join(tmpdir(), 'oat-smoke-reports-'));
  try {
    for (const reportPath of reportPaths) {
      const sourceDirectory = join(repositoryRoot, dirname(reportPath));
      const packetDirectory = join(
        temporaryRoot,
        relative('tools/smoke/reports', dirname(reportPath)),
      );
      await cp(sourceDirectory, packetDirectory, { recursive: true });
      const packetPaths = ['bundle.json', 'report.json', 'report.md'].map(
        (name) => join(packetDirectory, name),
      );
      await execFileAsync(
        'pnpm',
        ['exec', 'oxfmt', '--write', ...packetPaths],
        { cwd: repositoryRoot },
      );

      const copiedReportPath = join(packetDirectory, 'report.json');
      const report = JSON.parse(await readFile(copiedReportPath, 'utf8'));
      assert.equal(
        await checkEvidenceReport(copiedReportPath, {
          expectedProfile: report.profile,
        }),
        true,
        reportPath,
      );
    }
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
});

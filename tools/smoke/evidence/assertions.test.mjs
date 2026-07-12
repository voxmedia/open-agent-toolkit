import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { evaluateEvidence, EvidenceAssertionError } from './assertions.mjs';
import {
  checkEvidenceReport,
  emitEvidenceReport,
  parseReportArgs,
  renderMarkdown,
} from './report.mjs';

const execFileAsync = promisify(execFile);
const goldenDirectory = join(import.meta.dirname, 'golden/bundles');
const reportPath = join(import.meta.dirname, 'report.mjs');

async function readGolden(name) {
  return JSON.parse(
    await readFile(join(goldenDirectory, `${name}.json`), 'utf8'),
  );
}

function failedIds(report) {
  return report.assertions
    .filter((entry) => entry.status === 'failed')
    .map((entry) => entry.id);
}

test('scenario profiles pass their complete golden evidence', async () => {
  const expectations = {
    'plan-review': 5,
    implement: 8,
    full: 10,
  };

  for (const [scenario, assertionCount] of Object.entries(expectations)) {
    const report = evaluateEvidence(await readGolden(scenario));
    assert.equal(report.scenario, scenario);
    assert.equal(report.status, 'passed');
    assert.equal(report.summary.failed, 0);
    assert.equal(report.summary.total, assertionCount);
    assert.equal(
      new Set(report.assertions.map((entry) => entry.id)).size,
      assertionCount,
    );
  }
});

test('plan-review profile detects plan drift, missing durability, and non-atomic transitions', async () => {
  const bundle = await readGolden('plan-review');
  bundle.orchestrationEvents.find(
    (event) => event.event === 'plan-resume-verified',
  ).afterHash = 'drifted';
  bundle.orchestrationEvents.find(
    (event) => event.event === 'review-disposition-committed',
  ).committed = false;
  bundle.orchestrationEvents.find(
    (event) => event.event === 'state-transition',
  ).atomic = false;

  assert.deepEqual(failedIds(evaluateEvidence(bundle)), [
    'plan-review-substantive-plan-stable',
    'review-disposition-durable',
    'plan-review-state-transitions',
  ]);
});

test('implement profile detects incomplete dispatch, ceiling, isolation, fan-in, review, and identity evidence', async () => {
  const bundle = await readGolden('implement');
  bundle.dispatches.pop();
  bundle.dispatches[0].selection.atOrBelowCeiling = false;
  bundle.dispatches[1].runtimeIdentity.status = 'unknown';
  bundle.orchestrationEvents.find(
    (event) => event.event === 'parallel-isolation-verified',
  ).disjointWrites = false;
  bundle.orchestrationEvents.find(
    (event) => event.event === 'fan-in-completed',
  ).reconciled = false;
  bundle.reviews[0].corroboration = {};
  bundle.orchestrationEvents.find(
    (event) => event.event === 'review-disposition-committed',
  ).durable = false;

  assert.deepEqual(failedIds(evaluateEvidence(bundle)), [
    'implement-dispatch-completeness',
    'implement-exact-target-within-ceiling',
    'implement-parallel-isolation',
    'implement-fan-in-reconciliation',
    'review-gate-corroborated',
    'review-disposition-durable',
    'implement-runtime-identity-status',
  ]);
});

test('full profile is the deduplicated union of plan-review and implement', async () => {
  const bundle = await readGolden('full');
  const report = evaluateEvidence(bundle);
  const ids = report.assertions.map((entry) => entry.id);

  assert.equal(report.status, 'passed');
  assert.ok(ids.includes('plan-review-substantive-plan-stable'));
  assert.ok(ids.includes('implement-dispatch-completeness'));
  assert.equal(ids.filter((id) => id === 'review-gate-corroborated').length, 1);
  assert.equal(
    ids.filter((id) => id === 'review-disposition-durable').length,
    1,
  );
});

test('rejects unknown or malformed evidence bundles', () => {
  assert.throws(() => evaluateEvidence(null), EvidenceAssertionError);
  assert.throws(
    () => evaluateEvidence({ scenario: 'unknown' }),
    /Unknown evidence scenario/,
  );
});

test('report emitters are deterministic and check mode reflects assertion status', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'oat-smoke-report-'));
  const bundlePath = join(directory, 'bundle.json');
  const outputDirectory = join(directory, 'report');

  try {
    await writeFile(
      bundlePath,
      `${JSON.stringify(await readGolden('full'), null, 2)}\n`,
    );
    const first = await emitEvidenceReport({
      bundlePath,
      outDirectory: outputDirectory,
    });
    const firstJson = await readFile(first.jsonPath, 'utf8');
    const firstMarkdown = await readFile(first.markdownPath, 'utf8');
    const second = await emitEvidenceReport({
      bundlePath,
      outDirectory: outputDirectory,
    });

    assert.equal(await readFile(second.jsonPath, 'utf8'), firstJson);
    assert.equal(await readFile(second.markdownPath, 'utf8'), firstMarkdown);
    assert.equal(renderMarkdown(first.report), firstMarkdown);
    assert.match(firstMarkdown, /\*\*Status:\*\* passed/u);
    assert.equal(await checkEvidenceReport(first.jsonPath), true);

    await execFileAsync(process.execPath, [
      reportPath,
      '--check',
      first.jsonPath,
    ]);

    const failedReport = {
      ...first.report,
      assertions: first.report.assertions.map((entry, index) =>
        index === 0 ? { ...entry, status: 'failed' } : entry,
      ),
      status: 'failed',
    };
    const failedPath = join(directory, 'failed-report.json');
    await writeFile(failedPath, JSON.stringify(failedReport));
    assert.equal(await checkEvidenceReport(failedPath), false);
    await assert.rejects(
      () =>
        execFileAsync(process.execPath, [reportPath, '--check', failedPath]),
      (error) => error.code === 1,
    );
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test('report CLI argument parsing fails closed', () => {
  assert.deepEqual(parseReportArgs(['--check', 'report.json']), {
    checkPath: join(process.cwd(), 'report.json'),
    mode: 'check',
  });
  assert.throws(() => parseReportArgs(['--check']), /Usage/);
  assert.throws(() => parseReportArgs(['--bundle', 'bundle.json']), /Usage/);
  assert.throws(
    () =>
      parseReportArgs([
        '--bundle',
        'bundle.json',
        '--out',
        'out',
        '--extra',
        'value',
      ]),
    /Unknown report argument/,
  );
});

import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateEvidence, EvidenceAssertionError } from './assertions.mjs';

export class EvidenceReportError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EvidenceReportError';
  }
}

async function readJson(path, label) {
  try {
    const contents = await readFile(path, 'utf8');
    return { contents, value: JSON.parse(contents) };
  } catch (error) {
    throw new EvidenceReportError(
      `${label} is not readable JSON: ${error.message}`,
    );
  }
}

async function atomicWrite(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}-${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, contents);
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => {});
  }
}

function escapeTable(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

export function renderMarkdown(report) {
  const lines = [
    '# Smoke Evidence Report',
    '',
    `**Scenario:** ${report.scenario}`,
    `**Status:** ${report.status}`,
    `**Assertions:** ${report.summary.passed} passed / ${report.summary.failed} failed`,
    `**Bundle SHA-256:** ${report.bundle.sha256}`,
    '**Authority:** `report.json` is authoritative; this Markdown is a derived view.',
    '',
    '| Assertion | Severity | Status | Description |',
    '| --------- | -------- | ------ | ----------- |',
  ];
  for (const entry of report.assertions) {
    lines.push(
      `| ${escapeTable(entry.id)} | ${escapeTable(entry.severity)} | ${escapeTable(entry.status)} | ${escapeTable(entry.description)} |`,
    );
  }
  lines.push('', '## Evidence', '');
  for (const entry of report.assertions) {
    lines.push(
      `### ${entry.id}`,
      '',
      '```json',
      JSON.stringify(entry.evidence, null, 2),
      '```',
      '',
    );
  }
  return `${lines.join('\n')}\n`;
}

export async function emitEvidenceReport({ bundlePath, outDirectory }) {
  const bundleSource = await readJson(bundlePath, 'Evidence bundle');
  const bundle = bundleSource.value;
  let report;
  try {
    report = evaluateEvidence(bundle);
  } catch (error) {
    if (error instanceof EvidenceAssertionError) {
      throw new EvidenceReportError(error.message);
    }
    throw error;
  }

  const boundBundlePath = join(outDirectory, 'bundle.json');
  const bundleBinding = {
    path: 'bundle.json',
    sha256: createHash('sha256').update(bundleSource.contents).digest('hex'),
  };
  report = { ...report, bundle: bundleBinding };
  const jsonPath = join(outDirectory, 'report.json');
  const markdownPath = join(outDirectory, 'report.md');
  if (resolve(bundlePath) !== resolve(boundBundlePath)) {
    await atomicWrite(boundBundlePath, bundleSource.contents);
  }
  await atomicWrite(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await atomicWrite(markdownPath, renderMarkdown(report));
  return { jsonPath, markdownPath, report };
}

export async function checkEvidenceReport(reportPath, { expectedProfile }) {
  if (typeof expectedProfile !== 'string' || expectedProfile.length === 0) {
    throw new EvidenceReportError(
      'Report checks require an explicit expected profile.',
    );
  }
  const { value: report } = await readJson(reportPath, 'Evidence report');
  if (
    report?.schemaVersion !== 1 ||
    report?.bundle?.path !== 'bundle.json' ||
    typeof report.bundle.sha256 !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(report.bundle.sha256)
  ) {
    return false;
  }
  const bundlePath = join(dirname(reportPath), report.bundle.path);
  let bundleSource;
  try {
    bundleSource = await readJson(bundlePath, 'Bound evidence bundle');
  } catch {
    return false;
  }
  const digest = createHash('sha256')
    .update(bundleSource.contents)
    .digest('hex');
  if (digest !== report.bundle.sha256) {
    return false;
  }

  let recomputed;
  try {
    recomputed = evaluateEvidence(bundleSource.value);
  } catch {
    return false;
  }
  const expected = { ...recomputed, bundle: report.bundle };
  return (
    recomputed.profile === expectedProfile &&
    recomputed.status === 'passed' &&
    JSON.stringify(report) === JSON.stringify(expected)
  );
}

export function parseReportArgs(argv) {
  if (argv[0] === '--check') {
    if (
      argv.length !== 4 ||
      !argv[1] ||
      argv[1].startsWith('--') ||
      argv[2] !== '--expect-profile' ||
      !argv[3] ||
      argv[3].startsWith('--')
    ) {
      throw new EvidenceReportError(
        'Usage: report.mjs --check <report.json> --expect-profile <profile>',
      );
    }
    return {
      checkPath: resolve(argv[1]),
      expectedProfile: argv[3],
      mode: 'check',
    };
  }

  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (!['--bundle', '--out'].includes(option)) {
      throw new EvidenceReportError(`Unknown report argument: ${option}`);
    }
    if (Object.hasOwn(values, option)) {
      throw new EvidenceReportError(`Repeated report argument: ${option}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new EvidenceReportError(`Missing value for ${option}.`);
    }
    values[option] = value;
    index += 1;
  }
  if (!values['--bundle'] || !values['--out']) {
    throw new EvidenceReportError(
      'Usage: report.mjs --bundle <bundle.json> --out <directory>',
    );
  }
  return {
    bundlePath: resolve(values['--bundle']),
    mode: 'emit',
    outDirectory: resolve(values['--out']),
  };
}

async function main() {
  const options = parseReportArgs(process.argv.slice(2));
  if (options.mode === 'check') {
    const passed = await checkEvidenceReport(options.checkPath, {
      expectedProfile: options.expectedProfile,
    });
    if (!passed) {
      process.exitCode = 1;
    }
    return;
  }

  const result = await emitEvidenceReport(options);
  process.stdout.write(`${result.jsonPath}\n${result.markdownPath}\n`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

import { randomUUID } from 'node:crypto';
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
    return JSON.parse(await readFile(path, 'utf8'));
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
  const bundle = await readJson(bundlePath, 'Evidence bundle');
  let report;
  try {
    report = evaluateEvidence(bundle);
  } catch (error) {
    if (error instanceof EvidenceAssertionError) {
      throw new EvidenceReportError(error.message);
    }
    throw error;
  }

  const jsonPath = join(outDirectory, 'report.json');
  const markdownPath = join(outDirectory, 'report.md');
  await atomicWrite(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await atomicWrite(markdownPath, renderMarkdown(report));
  return { jsonPath, markdownPath, report };
}

export async function checkEvidenceReport(reportPath) {
  const report = await readJson(reportPath, 'Evidence report');
  if (
    report?.status !== 'passed' ||
    !Array.isArray(report.assertions) ||
    report.assertions.length === 0 ||
    report.assertions.some((entry) => entry?.status !== 'passed')
  ) {
    return false;
  }
  return true;
}

export function parseReportArgs(argv) {
  if (argv[0] === '--check') {
    if (argv.length !== 2 || !argv[1] || argv[1].startsWith('--')) {
      throw new EvidenceReportError('Usage: report.mjs --check <report.json>');
    }
    return { checkPath: resolve(argv[1]), mode: 'check' };
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
    const passed = await checkEvidenceReport(options.checkPath);
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

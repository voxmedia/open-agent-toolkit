#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

function fail(message) {
  process.stderr.write(`Invalid non-archive lifecycle receipt: ${message}\n`);
  process.exit(1);
}

function git(cwd, args) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const detail =
      error?.stderr?.toString().trim() || error?.message || String(error);
    fail(detail);
  }
}

const [recordArgument, commit, projectName] = process.argv.slice(2);
if (!recordArgument || !/^[0-9a-f]{40}$/.test(commit ?? '') || !projectName) {
  fail('expected <record-path> <full-commit-sha> <project-name>.');
}

const recordPath = realpathSync(resolve(recordArgument));
const repoRoot = realpathSync(
  git(dirname(recordPath), ['rev-parse', '--show-toplevel']),
);
const recordRelative = relative(repoRoot, recordPath);
if (
  recordRelative === '' ||
  recordRelative === '..' ||
  recordRelative.startsWith(`..${sep}`) ||
  isAbsolute(recordRelative)
) {
  fail('record path is outside the repository root.');
}
const gitRecordPath = recordRelative.split(sep).join('/');
const expectedSubject = `chore(oat): complete synced project ${projectName}`;
const subject = git(repoRoot, ['show', '-s', '--format=%s', commit]);
if (subject !== expectedSubject) {
  fail(`commit subject must be "${expectedSubject}".`);
}

let record;
try {
  record = JSON.parse(git(repoRoot, ['show', `${commit}:${gitRecordPath}`]));
} catch (error) {
  fail(
    `committed record is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
  );
}
if (
  !record ||
  typeof record !== 'object' ||
  record.slug !== projectName ||
  record.status !== 'complete'
) {
  fail('committed record must name the project and have status: complete.');
}

process.stdout.write(`${commit}\n`);

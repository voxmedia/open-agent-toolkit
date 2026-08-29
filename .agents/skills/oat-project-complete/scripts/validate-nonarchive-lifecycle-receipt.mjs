#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';

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

function gitRaw(cwd, args) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const detail =
      error?.stderr?.toString().trim() || error?.message || String(error);
    fail(detail);
  }
}

function gitSucceeds(cwd, args) {
  try {
    execFileSync('git', args, {
      cwd,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

const [recordArgument, commit, projectName] = process.argv.slice(2);
if (!recordArgument || !/^[0-9a-f]{40}$/.test(commit ?? '') || !projectName) {
  fail('expected <record-path> <full-commit-sha> <project-name>.');
}

const unresolvedRecordPath = resolve(recordArgument);
if (!existsSync(unresolvedRecordPath)) {
  fail('record path does not exist; restore the synced discovery record.');
}
const recordPath = realpathSync(unresolvedRecordPath);
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
if (basename(gitRecordPath, extname(gitRecordPath)) !== projectName) {
  fail('record filename must match the project name.');
}
if (!gitSucceeds(repoRoot, ['merge-base', '--is-ancestor', commit, 'HEAD'])) {
  fail('receipt commit must be an ancestor of the current repository HEAD.');
}
const changedPaths = git(repoRoot, [
  'diff-tree',
  '--root',
  '--no-commit-id',
  '--name-only',
  '-r',
  '--format=',
  commit,
])
  .split('\n')
  .filter(Boolean);
if (changedPaths.length !== 1 || changedPaths[0] !== gitRecordPath) {
  fail('receipt commit must change exactly the synced discovery record path.');
}
const expectedSubject = `chore(oat): complete synced project ${projectName}`;
const subject = git(repoRoot, ['show', '-s', '--format=%s', commit]);
if (subject !== expectedSubject) {
  fail(`commit subject must be "${expectedSubject}".`);
}

let committedRecordContents;
let record;
try {
  committedRecordContents = gitRaw(repoRoot, [
    'show',
    `${commit}:${gitRecordPath}`,
  ]);
  record = JSON.parse(committedRecordContents);
} catch (error) {
  fail(
    `committed record is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
  );
}
if (readFileSync(recordPath, 'utf8') !== committedRecordContents) {
  fail('working-tree record content must exactly match the receipt commit.');
}
const expectedKeys = new Set([
  'archiveSnapshot',
  'completedAt',
  'createdAt',
  'ref',
  'remote',
  'schemaVersion',
  'scope',
  'slug',
  'status',
]);
if (
  !record ||
  typeof record !== 'object' ||
  Array.isArray(record) ||
  Object.keys(record).some((key) => !expectedKeys.has(key)) ||
  record.schemaVersion !== 1 ||
  record.slug !== projectName ||
  record.scope !== 'synced' ||
  record.ref !== `refs/oat/projects/${projectName}` ||
  record.remote !== 'origin' ||
  record.status !== 'complete' ||
  typeof record.createdAt !== 'string' ||
  Number.isNaN(Date.parse(record.createdAt)) ||
  typeof record.completedAt !== 'string' ||
  Number.isNaN(Date.parse(record.completedAt)) ||
  (record.archiveSnapshot !== undefined &&
    (typeof record.archiveSnapshot !== 'string' ||
      record.archiveSnapshot.length === 0))
) {
  fail(
    'committed record must be a complete synced record with the exact project identity and lifecycle content.',
  );
}

process.stdout.write(`${commit}\n`);

import { createHash, randomUUID } from 'node:crypto';
import { lstat, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import { validateIntentRecord } from './resolve-intent.mjs';

const FRONTMATTER_KEYS = Object.freeze({
  projectExplainer: 'oat_project_explainer',
  projectRecap: 'oat_project_recap',
});

export function hashStateContent(content) {
  if (typeof content !== 'string') {
    throw new TypeError('State content must be a string.');
  }
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export function updateStateFrontmatter(content, product, record) {
  validateIntentRecord(product, record);
  if (typeof content !== 'string') {
    throw new TypeError('State content must be a string.');
  }

  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  if (lines[0] !== '---') {
    throw new Error('Project state must begin with YAML frontmatter.');
  }
  const closingIndex = lines.indexOf('---', 1);
  if (closingIndex < 0) {
    throw new Error('Project state has no closing frontmatter delimiter.');
  }

  const key = FRONTMATTER_KEYS[product];
  const keyPattern = new RegExp(`^${key}\\s*:`);
  const matches = [];
  for (let index = 1; index < closingIndex; index += 1) {
    if (keyPattern.test(lines[index])) matches.push(index);
  }
  if (matches.length > 1) {
    throw new Error(`Project state contains duplicate ${key} fields.`);
  }

  const replacement = [
    `${key}:`,
    `  decision: ${record.decision}`,
    `  source: ${record.source}`,
    `  decided_at: '${record.decided_at}'`,
  ];
  if (matches.length === 0) {
    lines.splice(closingIndex, 0, ...replacement);
  } else {
    const start = matches[0];
    let end = start + 1;
    while (
      end < closingIndex &&
      (lines[end].startsWith(' ') ||
        lines[end].startsWith('\t') ||
        lines[end].trim() === '')
    ) {
      end += 1;
    }
    lines.splice(start, end - start, ...replacement);
  }
  return lines.join(newline);
}

export async function persistIntent({
  statePath,
  product,
  record,
  expectedHash,
}) {
  if (typeof statePath !== 'string' || !statePath) {
    throw new TypeError('statePath is required.');
  }
  if (basename(statePath) !== 'state.md') {
    throw new Error('Lifecycle intent may only be persisted to state.md.');
  }
  if (
    typeof expectedHash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(expectedHash)
  ) {
    throw new TypeError('expectedHash must be a SHA-256 state content hash.');
  }
  validateIntentRecord(product, record);

  const fileInfo = await lstat(statePath);
  if (fileInfo.isSymbolicLink() || !fileInfo.isFile()) {
    throw new Error('Project state must be a regular file, not a symlink.');
  }
  const current = await readFile(statePath, 'utf8');
  assertExpectedHash(current, expectedHash);
  const updated = updateStateFrontmatter(current, product, record);
  const tempPath = join(
    dirname(statePath),
    `.${basename(statePath)}.${process.pid}.${randomUUID()}.tmp`,
  );

  try {
    await writeFile(tempPath, updated, {
      encoding: 'utf8',
      flag: 'wx',
      mode: fileInfo.mode,
    });
    const latest = await readFile(statePath, 'utf8');
    assertExpectedHash(latest, expectedHash);
    await rename(tempPath, statePath);
  } finally {
    await rm(tempPath, { force: true });
  }

  return {
    statePath,
    product,
    record,
    previousHash: expectedHash,
    stateHash: hashStateContent(updated),
  };
}

function assertExpectedHash(content, expectedHash) {
  if (hashStateContent(content) === expectedHash) return;
  const error = new Error(
    'Project state changed after intent resolution; refusing stale intent write.',
  );
  error.code = 'E_INTENT_STALE_WRITE';
  throw error;
}

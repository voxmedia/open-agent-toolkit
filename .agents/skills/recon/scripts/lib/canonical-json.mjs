import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

function canonicalize(value, seen) {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'string'
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Canonical JSON cannot encode non-finite numbers');
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item, seen)).join(',')}]`;
  }
  if (typeof value !== 'object' || value === undefined) {
    throw new TypeError(`Canonical JSON cannot encode ${typeof value}`);
  }
  if (seen.has(value)) {
    throw new TypeError('Canonical JSON cannot encode cyclic values');
  }
  seen.add(value);
  const entries = Object.keys(value)
    .sort()
    .map((key) => {
      const item = value[key];
      if (item === undefined) {
        throw new TypeError(`Canonical JSON cannot encode undefined at ${key}`);
      }
      return `${JSON.stringify(key)}:${canonicalize(item, seen)}`;
    });
  seen.delete(value);
  return `{${entries.join(',')}}`;
}

export function canonicalJson(value) {
  return canonicalize(value, new Set());
}

export function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export function hashCanonicalJson(value) {
  return sha256(Buffer.from(canonicalJson(value), 'utf8'));
}

export async function hashFile(path) {
  return sha256(await readFile(path));
}

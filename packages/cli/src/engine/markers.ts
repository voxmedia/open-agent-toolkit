import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const OAT_MARKER_PREFIX = '<!-- OAT-managed: do not edit directly.';
export const OAT_DIRECTORY_SENTINEL = '.oat-generated';

function buildMarkerLine(canonicalPath: string): string {
  return `${OAT_MARKER_PREFIX} Source: ${canonicalPath} -->`;
}

export async function hasMarker(filePath: string): Promise<boolean> {
  const contents = await readFile(filePath, 'utf8');
  return contents.startsWith(OAT_MARKER_PREFIX);
}

export async function insertMarker(
  filePath: string,
  canonicalPath: string,
): Promise<void> {
  const contents = await readFile(filePath, 'utf8');
  if (contents.startsWith(OAT_MARKER_PREFIX)) {
    return;
  }

  const marker = buildMarkerLine(canonicalPath);
  await writeFile(filePath, `${marker}\n${contents}`, 'utf8');
}

export async function writeDirectorySentinel(
  directoryPath: string,
  canonicalPath: string,
): Promise<void> {
  const sentinelPath = join(directoryPath, OAT_DIRECTORY_SENTINEL);
  const marker = buildMarkerLine(canonicalPath);
  await writeFile(sentinelPath, `${marker}\n`, 'utf8');
}

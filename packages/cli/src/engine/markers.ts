import { readFile, writeFile } from 'node:fs/promises';

export const OAT_MARKER_PREFIX = '<!-- OAT-managed: do not edit directly.';

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

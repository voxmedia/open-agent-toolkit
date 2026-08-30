import { readFile, writeFile } from 'node:fs/promises';

import { fileExists } from '@fs/io';

export interface ApplyManagedBlockResult {
  action: 'created' | 'updated' | 'no-change';
  entries: string[];
}

function preserveUnmanagedTail(
  tail: string,
  entries: readonly string[],
): string {
  const managedEntries = new Set(entries);
  const lines = tail.startsWith('\n')
    ? tail.slice(1).split('\n')
    : tail.split('\n');
  return lines.filter((line) => !managedEntries.has(line)).join('\n');
}

export async function applyManagedBlock(
  filePath: string,
  options: { start: string; end: string; entries: string[] },
): Promise<ApplyManagedBlockResult> {
  const section = `${options.start}\n${options.entries.join('\n')}\n${options.end}`;
  if (!(await fileExists(filePath))) {
    await writeFile(filePath, `${section}\n`, 'utf8');
    return { action: 'created', entries: options.entries };
  }

  const content = await readFile(filePath, 'utf8');
  const startIndex = content.indexOf(options.start);
  const endIndex = content.indexOf(options.end);
  if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
    const existing = content.slice(startIndex, endIndex + options.end.length);
    if (existing === section) {
      return { action: 'no-change', entries: options.entries };
    }
    await writeFile(
      filePath,
      `${content.slice(0, startIndex)}${section}${content.slice(endIndex + options.end.length)}`,
      'utf8',
    );
    return { action: 'updated', entries: options.entries };
  }

  if (startIndex !== -1) {
    const prefix = content.slice(0, startIndex);
    const preservedTail = preserveUnmanagedTail(
      content.slice(startIndex + options.start.length),
      options.entries,
    );
    const prefixSeparator =
      prefix.length === 0 || prefix.endsWith('\n') ? '' : '\n';
    const preservedSuffix =
      preservedTail.length === 0
        ? '\n'
        : `\n${preservedTail.replace(/^\n+/, '')}`;
    await writeFile(
      filePath,
      `${prefix}${prefixSeparator}${section}${preservedSuffix}`,
      'utf8',
    );
    return { action: 'updated', entries: options.entries };
  }

  const separator = content.endsWith('\n') ? '\n' : '\n\n';
  await writeFile(filePath, `${content}${separator}${section}\n`, 'utf8');
  return { action: 'updated', entries: options.entries };
}

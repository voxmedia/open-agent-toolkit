import { readFile, writeFile } from 'node:fs/promises';

import { fileExists } from '@fs/io';

export interface ApplyManagedBlockResult {
  action: 'created' | 'updated' | 'no-change';
  entries: string[];
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

  const separator = content.endsWith('\n') ? '\n' : '\n\n';
  await writeFile(filePath, `${content}${separator}${section}\n`, 'utf8');
  return { action: 'updated', entries: options.entries };
}

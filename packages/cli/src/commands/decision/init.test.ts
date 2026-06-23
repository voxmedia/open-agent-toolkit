import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { initializeDecisionRecords } from './init';

describe('initializeDecisionRecords', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  it('creates the decision shell and managed index marker pair', async () => {
    const decisionsRoot = await mkdtemp(join(tmpdir(), 'oat-decision-init-'));
    tempDirs.push(decisionsRoot);

    const result = await initializeDecisionRecords(decisionsRoot);

    expect(result).toEqual({
      decisionsRoot,
      created: ['index.md'],
      skipped: [],
    });
    await expect(access(decisionsRoot)).resolves.toBeUndefined();
    const index = await readFile(join(decisionsRoot, 'index.md'), 'utf8');
    expect(index).toContain('<!-- OAT DECISION-INDEX -->');
    expect(index).toContain('<!-- END OAT DECISION-INDEX -->');
    expect(index).toContain('| ID | Date | Status | Title | Legacy |');
  });

  it('does not overwrite an existing index', async () => {
    const decisionsRoot = await mkdtemp(join(tmpdir(), 'oat-decision-init-'));
    tempDirs.push(decisionsRoot);
    const sentinel = '# Curated Decision Index\n';
    await writeFile(join(decisionsRoot, 'index.md'), sentinel, 'utf8');

    const result = await initializeDecisionRecords(decisionsRoot);

    await expect(
      readFile(join(decisionsRoot, 'index.md'), 'utf8'),
    ).resolves.toBe(sentinel);
    expect(result.created).toEqual([]);
    expect(result.skipped).toEqual(['index.md']);
  });
});

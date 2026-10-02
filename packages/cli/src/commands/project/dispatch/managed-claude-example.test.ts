import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { recordProjectDispatch } from './record';

/**
 * The published managed Claude example is documentation that must execute.
 * Each role input is validated exactly as published, so a validator change
 * that would reject it fails here instead of reaching an operator.
 */
const EXAMPLE_PATH = join(
  process.cwd(),
  '..',
  '..',
  '.agents',
  'skills',
  'oat-dispatch-subagents',
  'references',
  'managed-claude-example.json',
);

async function loadExample(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(EXAMPLE_PATH, 'utf8')) as Record<
    string,
    unknown
  >;
}

describe('published managed Claude dispatch-record example', () => {
  it.each([
    ['implementer', 'oat-phase-implementer', 'implementation'],
    ['reviewer', 'oat-reviewer', 'review'],
  ] as const)('validates the %s input as-is', async (key, roleName, action) => {
    const example = await loadExample();
    const input = example[key];
    expect(Object.keys(input as object).sort()).toEqual([
      'claudeLaunch',
      'event',
      'recordBase',
    ]);

    const result = await recordProjectDispatch({ input });

    expect(result.status).toBe('validated-only');
    expect(result).not.toHaveProperty('path');
    expect(result.record).toMatchObject({
      provider: 'claude',
      role_name: roleName,
      action,
      selection_source: 'policy-resolved',
    });
    expect(result.record.oat.canonicalRole).toMatchObject({
      status: 'resolved',
      canonicalRole: roleName,
    });
  });

  it('publishes only the two role inputs and a description', async () => {
    expect(Object.keys(await loadExample()).sort()).toEqual([
      'description',
      'implementer',
      'reviewer',
    ]);
  });
});

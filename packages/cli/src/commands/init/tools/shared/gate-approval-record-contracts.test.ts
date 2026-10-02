import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Lifecycle gate approval record.
 *
 * The five-field core is defined once in `.agents/docs/gate-approval-record.md`
 * and vendored into every skill that writes or reads a record. Implement keeps
 * its larger `oat_implement_exit_gate` transition and points at the core;
 * quick-start writes `oat_quick_start_gate` with exactly the core.
 */

const REPO_ROOT = join(import.meta.dirname, '../../../../../../../');
const SHARED_DOC = '.agents/docs/gate-approval-record.md';
const VENDORED_DOC = 'references/docs/gate-approval-record.md';
const CORE_FIELDS = [
  'status',
  'disposition',
  'config_fingerprint',
  'reviewed_head',
  'decided_at',
] as const;
const VENDORING_SKILLS = [
  'oat-project-quick-start',
  'oat-project-implement',
  'oat-project-next',
  'oat-project-progress',
] as const;

function readRepoFile(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ');
}

function yamlBlockKeys(block: string): string[] {
  return [...block.matchAll(/^ {2}([a-z_]+):/gm)].map((match) => match[1]!);
}

describe('lifecycle gate approval record', () => {
  it('defines exactly the five-field core once', () => {
    const doc = readRepoFile(SHARED_DOC);
    const fence = /```yaml\n(<carrier>:\n[\s\S]*?)```/.exec(doc);

    expect(fence, 'the doc shows the core record').not.toBeNull();
    expect(yamlBlockKeys(fence![1]!)).toEqual([...CORE_FIELDS]);
    expect(doc).toContain('`allowed` | `blocked`');
    for (const disposition of [
      'passed',
      'warned',
      'prompt_approved',
      'project_disabled',
    ]) {
      expect(doc).toContain(`\`${disposition}\``);
    }
  });

  it('names both carriers and the quick-start validation rule', () => {
    const doc = normalize(readRepoFile(SHARED_DOC));

    expect(doc).toContain('`oat_implement_exit_gate`');
    expect(doc).toContain('`oat_quick_start_gate`');
    expect(doc).toMatch(
      /`config_fingerprint` matches the currently resolved quick-start gate declaration/,
    );
    expect(doc).toMatch(/`reviewed_head` is (?:provenance only|not compared)/);
    expect(doc).toMatch(/never anything that reads as approval/);
  });

  it.each(VENDORING_SKILLS)('vendors the shared doc into %s', (skill) => {
    expect(
      existsSync(join(REPO_ROOT, '.agents/skills', skill, VENDORED_DOC)),
    ).toBe(true);
  });

  it('scaffolds the quick-start record with exactly the core', () => {
    const template = readRepoFile('.oat/templates/state.md');
    const start = template.indexOf('# oat_quick_start_gate:');
    expect(start, 'template carries the quick-start block').toBeGreaterThan(-1);

    const lines = template.slice(start).split('\n').slice(1);
    const block = lines.filter((line, index) =>
      lines.slice(0, index + 1).every((entry) => entry.startsWith('#   ')),
    );
    expect(block.map((line) => /^# {3}([a-z_]+):/.exec(line)?.[1])).toEqual([
      ...CORE_FIELDS,
    ]);
  });
});

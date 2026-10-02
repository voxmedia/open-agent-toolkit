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

const QUICK_START = '.agents/skills/oat-project-quick-start/SKILL.md';
const STEP_3_7 =
  '### Step 3.7: Record Review Disposition and Mark Plan Complete';

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
    expect(doc).toMatch(/`reviewed_head` is (?:provenance only|not compared)/);
    expect(doc).toMatch(/never anything that reads as approval/);
    // Readers report the record as recorded: no CLI emits a canonical
    // fingerprint, so a recomputation could not be reproduced.
    expect(doc).toContain(
      'Readers report a quick-start record as recorded and do not recompute `config_fingerprint`',
    );
    expect(doc).not.toMatch(
      /computed the same way by the writer and every reader/,
    );
    expect(doc).not.toMatch(/superseded/);
    // Implement writes allowed/no_gate; older records without decided_at stay valid.
    expect(doc).toMatch(
      /Not configured[^|]*\|[^|]*no record \(quick-start\); implement writes `allowed\/no_gate`/,
    );
    expect(doc).toContain(
      'A record written before `decided_at` existed is not malformed for that reason alone.',
    );
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

  it('persists every configured quick-start gate outcome', () => {
    const skill = readRepoFile(QUICK_START);
    const gate = normalize(
      skill.slice(skill.indexOf('### Gate Execution'), skill.indexOf(STEP_3_7)),
    );

    expect(gate).toContain(VENDORED_DOC);
    expect(gate).toMatch(
      /write `oat_quick_start_gate` to `\$PROJECT_PATH\/state\.md`/,
    );
    expect(gate).toMatch(/passed: `allowed\/passed`/);
    expect(gate).toMatch(/`warn` failure: `allowed\/warned`/);
    expect(gate).toMatch(
      /operator explicitly continues past: `allowed\/prompt_approved`/,
    );
    expect(gate).toMatch(
      /declined or deferred[\s\S]*?`block` exhausted after `maxAttempts`[\s\S]*?: `blocked` with `disposition: null`/,
    );
    expect(gate).toMatch(
      /`configured_disabled_by_project`: `allowed\/project_disabled` with `reviewed_head: null` and no launch/,
    );
    expect(gate).toContain('`not_configured` writes no record');
  });

  it('keeps Step 3.7 gated by control flow, not by the record', () => {
    const skill = readRepoFile(QUICK_START);
    const step37 = skill.slice(
      skill.indexOf(STEP_3_7),
      skill.indexOf('### Quick Plan Readiness (Named Predicate)'),
    );

    expect(step37).not.toContain('oat_quick_start_gate');
    expect(normalize(skill)).toContain(
      'Step 3.7 stays gated by the control flow above and does not read this record back.',
    );
  });
});

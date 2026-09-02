import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const skill = readFileSync(
  join(
    import.meta.dirname,
    '../../../../.agents/skills/oat-project-review-provide/SKILL.md',
  ),
  'utf8',
);

function section(start: string, end: string): string {
  const from = skill.indexOf(start);
  const to = skill.indexOf(end, from + start.length);
  expect(from, start).toBeGreaterThanOrEqual(0);
  expect(to, end).toBeGreaterThan(from);
  return skill.slice(from, to);
}

describe('local review coordinator integration contract', () => {
  it.each([
    ['Tier 1', '**Step 6b: Tier 1', '**Step 6c: Tier 2'],
    [
      'Tier 3',
      '### Step 6d: Tier 3',
      '### Step 7: Determine Review Artifact Path',
    ],
  ])('%s validates before publishing or bookkeeping', (_, start, end) => {
    const rail = section(start, end).replace(/\s+/g, ' ');
    const binding = rail.indexOf('bindWorkerDossier');
    const overlay = rail.indexOf('ReviewerTerminalOverlayV1');
    const validation = rail.indexOf('validate-output');
    const terminal = rail.indexOf('ReviewerTerminalV1', validation);
    const publication = rail.indexOf('publish-output');
    const bookkeeping = rail.indexOf('bookkeeping');
    expect(binding).toBeGreaterThanOrEqual(0);
    expect(overlay).toBeGreaterThan(binding);
    expect(validation).toBeGreaterThan(overlay);
    expect(terminal).toBeGreaterThan(validation);
    expect(publication).toBeGreaterThan(terminal);
    expect(bookkeeping).toBeGreaterThan(publication);
    expect(rail).toContain(
      'oat review publish-output --run-id <id> --destination <final-path> --json',
    );
    expect(rail).toContain('never reads or re-snapshots the reviewer draft');
    expect(rail).toContain('preparation-supplied');
    expect(rail).toContain('{ executable, argv, cwd, stdin }');
    expect(rail).toContain('required absolute `cwd`');
    expect(rail).toContain('__OAT_PLAN_RECEIPT__');
    expect(rail).toContain('bounded JSON stdin');
    expect(rail).toContain('ambient `oat`');
  });

  it('keeps full worker dossiers inside the accepted Tier 1 continuation', () => {
    const tier1 = section('**Step 6b: Tier 1', '**Step 6c: Tier 2').replace(
      /\s+/g,
      ' ',
    );
    expect(tier1).toContain(
      'Never invoke ambient `oat`, override descriptor cwd, reconstruct a dossier from terminal digests, or hand a full dossier back to the parent launcher.',
    );
    expect(tier1).toContain(
      'The parent must not reconstruct or submit a dossier from terminal digest fields.',
    );
  });

  it('retains accepted continuations and forbids fallback after acceptance', () => {
    const tier1 = section('**Step 6b: Tier 1', '**Step 6c: Tier 2').replace(
      /\s+/g,
      ' ',
    );
    const tier3 = section(
      '### Step 6d: Tier 3',
      '### Step 7: Determine Review Artifact Path',
    ).replace(/\s+/g, ' ');
    expect(tier1).toContain('Retain that exact accepted reviewer handle');
    expect(tier3).toContain(
      'The current planning parent is the accepted inline continuation.',
    );
    for (const rail of [tier1, tier3]) {
      expect(rail).toContain('same-handle accounting repair');
      expect(rail).toContain(
        'never launch a replacement after accepted timeout, blocked, malformed, or accounting-invalid output',
      );
    }
  });

  it('passes only the private artifact draft path to Tier 1', () => {
    const tier1 = section('**Step 6b: Tier 1', '**Step 6c: Tier 2');
    expect(tier1).toContain('Pass only `artifactDraftPath`');
    expect(tier1).toContain(
      'Do not include the pre-computed final publication path',
    );
    expect(tier1).not.toContain(
      'Include the pre-computed artifact path for the subagent to write to',
    );
  });

  it('keeps blocked output non-actionable across every local sink side effect', () => {
    for (const rail of [
      section('**Step 6b: Tier 1', '**Step 6c: Tier 2'),
      section(
        '### Step 6d: Tier 3',
        '### Step 7: Determine Review Artifact Path',
      ),
    ]) {
      expect(rail.replace(/\s+/g, ' ')).toContain(
        'No discoverable artifact, Reviews row, project log, or bookkeeping commit',
      );
    }
  });
});

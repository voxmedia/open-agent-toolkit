import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '../../../../../../..');
const read = (path: string): string =>
  readFileSync(join(root, path), 'utf8').replace(/\s+/g, ' ');
const skill = (name: string): string =>
  read(`.agents/skills/oat-project-${name}/SKILL.md`);
const completion = read(
  '.agents/skills/oat-project-complete/references/freestyle-completion.md',
);

// These are agent-executed text contracts. CLI transaction behavior stays in
// the existing log/complete-state/push/archive suites; no new orchestration
// interpreter is introduced just to exercise prose.
describe('freestyle closing skills (p15, Outcome 13)', () => {
  it('selects a separate completion route before lifecycle machinery', () => {
    const complete = skill('complete');
    expect(complete.indexOf('references/freestyle-completion.md')).toBeLessThan(
      complete.indexOf('SYNCED_ARCHIVE_ENTRY='),
    );
    expect(complete).toContain(
      'Never continue into Step 1.5 or the lifecycle steps below for it',
    );
    expect(completion).toContain(
      "Ask the user to confirm that `shape.md`'s done criteria are met",
    );
    expect(completion).toContain(
      'A declined or unanswered completion confirmation writes nothing',
    );
    expect(completion).toContain(
      'Freestyle requires no final review, summary or PR',
    );
    expect(completion).toContain(
      'Do not invoke `oat-project-summary`, `oat-project-pr-final` or the configured post-implement sequence',
    );
    for (const name of ['summary', 'pr-final']) {
      expect(skill(name)).toMatch(/freestyle[^]*?stop/);
    }
  });

  it('offers optional skills before synthesis without making them gates', () => {
    expect(completion).toContain(
      'Load the current `oat-project-retro/SKILL.md` only when the user accepted',
    );
    expect(completion).toContain(
      '`oat-project-document/SKILL.md` only when documentation was accepted',
    );
    expect(completion).toContain(
      'Run retro before documentation, then finish both before synthesis',
    );
    expect(completion).toContain('it is not a completion gate');
  });

  it('skips an absent log, writes pending synthesis, and preserves existing synthesis', () => {
    expect(completion).toContain(
      '`status: "absent"`: skip synthesis; do not create `project-log.md`',
    );
    expect(completion).toContain('`synthesisPending: true`: read the log');
    expect(completion).toContain(
      'oat project log synthesize --project "$PROJECT_PATH" --body "$SYNTHESIS_BODY"',
    );
    expect(completion).toContain('Run that write only for the pending case');
    expect(completion).toContain(
      'Existing `## End-of-run synthesis` with `synthesisPending: false`: keep it unchanged',
    );
    expect(completion).toContain('`status: "ambiguous"`: stop');
    expect(completion.indexOf('## 3. Finish')).toBeLessThan(
      completion.indexOf('## 4. Complete'),
    );
  });

  it('publishes completed synced state before archive and retains withheld-push work', () => {
    expect(
      completion.indexOf('oat project complete-state "$PROJECT_PATH"'),
    ).toBeLessThan(completion.indexOf('oat project push "$PROJECT_PATH"'));
    expect(completion.indexOf('oat project push "$PROJECT_PATH"')).toBeLessThan(
      completion.indexOf('oat project archive "$PROJECT_PATH" --json'),
    );
    expect(completion).toContain(
      '**complete locally; archive pending until the agreed push succeeds**',
    );
    expect(completion).toContain('Retain the checkout and active pointer');
    expect(completion).toContain(
      'Do not run archive after a failed or withheld synced push',
    );
    expect(completion).toContain(
      'Synced archive itself retires the discovery record with a parent-branch lifecycle commit',
    );
    expect(completion).toContain('Do not use `--no-commit`');
  });

  it('documents freestyle from live records and merged changes without lifecycle state writes', () => {
    const document = skill('document');
    expect(document).toContain(
      "Read `shape.md`'s documents, `decisions.md` `## Live`, the lane reports, the project log when present, and the merged changes",
    );
    expect(document).toContain(
      'Use those sources instead of requiring `plan.md` and `implementation.md`',
    );
    expect(document).toContain(
      'do not add `oat_docs_updated` or lifecycle timestamps',
    );
    expect(document).toContain(
      'including no recommendations, user skip, partial failure and success',
    );
    expect(document).toContain(
      'For freestyle, use **Freestyle output and consent rules** above and return',
    );
    expect(document).toContain(
      "For freestyle, skip Step 1's automatic PJM writer",
    );
    expect(document).toContain(
      'Continue through the same capability inventory, delta plan, content approval',
    );
  });

  it('governs every document/retro output by shape consent and scope', () => {
    const retro = read(
      '.agents/skills/oat-project-retro/references/freestyle.md',
    );
    for (const content of [skill('document'), retro]) {
      expect(content).toContain(
        'oat project scope "$PROJECT_PATH" --format value',
      );
      expect(content).toMatch(
        /local records stay uncommitted|Local records:[^]*?uncommitted/,
      );
      expect(content).toMatch(
        /Unshaped, deferred or withheld|unshaped, deferred or withheld/,
      );
      expect(content).toContain('exact');
      expect(content).toContain('oat project push');
    }
    expect(retro).toContain(
      'including every output of `references/apply-procedure.md`',
    );
    expect(retro).toContain(
      'project-log corrections and later retro writebacks',
    );
    expect(retro).toContain(
      'do not apply it or claim `Status: applied` / `Applied-ref`',
    );
    const entry = skill('retro');
    expect(entry.indexOf('For both modes')).toBeLessThan(
      entry.indexOf('For apply mode, follow'),
    );
    expect(
      read('.agents/skills/oat-project-retro/references/apply-procedure.md'),
    ).toContain(
      'Its scope and shape-consent rules override every commit/push below',
    );
    expect(retro).toContain(
      'No `plan.md`, `implementation.md`, summary, closeout snapshot or review is required',
    );
  });

  it('gives the scaffold a closing section with the command order and pending states', () => {
    const agents = read('.oat/templates/project-agents.md');
    const closing = agents.slice(agents.indexOf('## Closing the project'));
    for (const name of [
      'oat-project-complete',
      'oat-project-retro',
      'oat-project-document',
    ]) {
      expect(closing).toContain(name);
    }
    const commands = [
      'oat project log synthesize',
      'oat project complete-state',
      'oat project push',
      'oat project archive',
    ];
    let previous = -1;
    for (const command of commands) {
      const at = closing.indexOf(command);
      expect(at).toBeGreaterThan(previous);
      previous = at;
    }
    expect(closing).toContain('archive pending');
    expect(closing).toContain('Local records stay uncommitted');
    expect(closing).toContain(
      'Freestyle requires no final review, summary or PR',
    );
  });
});

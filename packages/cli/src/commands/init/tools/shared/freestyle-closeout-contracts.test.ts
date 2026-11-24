import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
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

  it.each([
    [
      'complete',
      completion
        .split('## 1. Resolve the project and confirm done')[1]!
        .split('## 2.')[0]!,
    ],
    [
      'document',
      skill('document')
        .split('For `oat_workflow_mode: freestyle`,')[1]!
        .split('For other modes')[0]!,
    ],
    [
      'retro',
      read('.agents/skills/oat-project-retro/references/freestyle.md').split(
        '## Evidence',
      )[0]!,
    ],
  ])('refreshes synced %s records before using the shape', (_skill, entry) => {
    const scope = 'oat project scope "$PROJECT_PATH" --format value';
    const pull = 'oat project pull "$PROJECT_PATH" --no-children --no-commit';
    const policy = "read the project's `AGENTS.md` and `shape.md`";
    expect(entry.indexOf(scope)).toBeGreaterThanOrEqual(0);
    expect(entry.indexOf(pull)).toBeGreaterThan(entry.indexOf(scope));
    expect(entry.toLowerCase().indexOf(policy.toLowerCase())).toBeGreaterThan(
      entry.indexOf(pull),
    );
    expect(entry).toContain('If the pull fails, stop');
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

  it('requires the actual archive preview and shape authority in every scope and terminal retry', () => {
    expect(completion).toContain('For every scope (shared, local and synced)');
    expect(completion).toContain(
      'oat project archive "$PROJECT_PATH" --dry-run --json',
    );
    expect(completion).toContain(
      'A non-null `s3Path` means records will be uploaded',
    );
    expect(completion).toContain(
      'local records must not be uploaded automatically',
    );
    expect(completion).toContain(
      'complete locally; archive pending because publication is not permitted',
    );
    const terminal = completion.slice(0, completion.indexOf('## 1. Resolve'));
    expect(terminal.indexOf('--dry-run --json')).toBeGreaterThan(0);
    expect(terminal.indexOf('Read the archived')).toBeLessThan(
      terminal.indexOf('execute-synced-archive-entry.mjs'),
    );
    expect(terminal).toContain(
      'Only after the scope and shape permit all previewed effects',
    );
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

// H1: exercise the actual shipped entry shell, not a second router in the test.
// The archive command is the external seam; its report matches the existing
// resolve-synced-archive-entry fixture. Real executor/decoder/finalizer scripts
// consume it. This proves route selection, not the archive transaction itself.
describe('retired synced archive mode routing (p15 H1)', () => {
  it.each(['freestyle', 'quick'])(
    '%s retains its completion route after the active source and record retire',
    (mode) => {
      const directory = mkdtempSync(join(tmpdir(), 'oat-p15-resume-'));
      try {
        const bin = join(directory, 'bin');
        const archive = join(directory, '.oat/projects/archived/demo');
        const project = join(directory, '.oat/projects/synced/demo');
        const trace = join(directory, 'calls.jsonl');
        mkdirSync(bin, { recursive: true });
        mkdirSync(archive, { recursive: true });
        writeFileSync(
          join(archive, 'shape.md'),
          '## Commits, PRs and merges\nNo code-branch pushes. Archive and project-ref publication are permitted.\n',
        );
        const report = {
          status: 'ok',
          mode: 'apply',
          archivePath: archive,
          snapshotId: '20261124-demo',
          lifecycleCommit: 'b'.repeat(40),
          completedRef: 'refs/oat/completed/demo',
          verifiedSourceSha: 'a'.repeat(40),
          activeAliasDisposition: 'removed',
          recordRetired: true,
        };
        const stub = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.P15_TRACE, JSON.stringify(['oat', ...args]) + '\\n');
if (args[0] === 'project' && args[1] === 'scope') process.stdout.write('synced\\n');
else if (args[0] === 'project' && args[1] === 'archive') process.stdout.write(process.env.P15_REPORT);
else if (args[0] === 'project' && args[1] === 'status') {
  for (const mapping of args.filter(arg => arg.includes('='))) {
    const [key, field] = mapping.split('=');
    const value = field === 'project.workflowMode' ? process.env.P15_MODE : 'null';
    process.stdout.write(key + '=' + value + '\\n');
  }
} else if (!(args[0] === 'config' && args[1] === 'set' && args[2] === 'activeProject' && args[3] === '')) process.exit(91);
`;
        writeFileSync(join(bin, 'oat'), stub, { mode: 0o755 });
        writeFileSync(
          join(bin, 'git'),
          `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.P15_TRACE, JSON.stringify(['git', ...args]) + '\\n');
if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') process.stdout.write(process.env.P15_ROOT + '\\n');
else process.exit(92);
`,
          { mode: 0o755 },
        );
        const scripts = join(
          root,
          '.agents/skills/oat-project-complete/scripts',
        );
        const env = {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          P15_TRACE: trace,
          P15_REPORT: JSON.stringify(report),
          P15_MODE: mode,
          P15_ROOT: directory,
          SKILL_DIR: join(root, '.agents/skills/oat-project-complete'),
          PROJECT_PATH: project,
          PROJECT_NAME: 'demo',
          SYNCED_ARCHIVE_EXECUTE_SCRIPT: join(
            scripts,
            'execute-synced-archive-entry.mjs',
          ),
          SYNCED_ARCHIVE_RESUME_FIELDS_SCRIPT: join(
            scripts,
            'parse-synced-archive-resume-fields.mjs',
          ),
          SYNCED_ARCHIVE_FINALIZE_SCRIPT: join(
            scripts,
            'finalize-synced-archive.mjs',
          ),
        };
        const content = readFileSync(
          join(root, '.agents/skills/oat-project-complete/SKILL.md'),
          'utf8',
        );
        const start = content.lastIndexOf(
          'PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value)',
          content.indexOf('SYNCED_ARCHIVE_RESUME="false"'),
        );
        const end = content.indexOf('PROJECT_RETAINED_REF=""', start);
        expect(start).toBeGreaterThan(0);
        expect(end).toBeGreaterThan(start);
        const generic = 'generic lifecycle Step 8.5';
        // Freestyle executes this existing retry only after the reference's
        // preview/shape agreement. Other modes retain their lifecycle entry.
        const reference = readFileSync(
          join(
            root,
            '.agents/skills/oat-project-complete/references/freestyle-completion.md',
          ),
          'utf8',
        );
        const freestyleResume =
          /# freestyle-synced-archive-resume:start([\s\S]*?)# freestyle-synced-archive-resume:end/.exec(
            reference,
          );
        const entryShell =
          mode === 'freestyle'
            ? freestyleResume![1]!
            : content.slice(start, end);
        const run = spawnSync(
          '/bin/bash',
          [
            '-c',
            `${entryShell}\nprintf '%s\\n' '${mode === 'freestyle' ? 'Freestyle synced archive resume' : generic}'`,
          ],
          { cwd: directory, env, encoding: 'utf8' },
        );
        expect(run.status, run.stderr).toBe(0);
        if (mode === 'freestyle') {
          expect(run.stdout).not.toContain(generic);
          expect(run.stdout).toContain('Freestyle synced archive resume');
          // The archived shape withholds code-branch pushes but permits the
          // completed archive. Execute its terminal-only finalizer block.
          const terminal =
            /# freestyle-synced-archive-finalize:start([\s\S]*?)# freestyle-synced-archive-finalize:end/.exec(
              reference,
            );
          expect(terminal).not.toBeNull();
          const finalized = spawnSync('/bin/bash', ['-c', terminal![1]!], {
            cwd: directory,
            env: { ...env, ARCHIVE_OUTPUT: JSON.stringify(report) },
            encoding: 'utf8',
          });
          expect(finalized.status, finalized.stderr).toBe(0);
          expect(JSON.parse(finalized.stdout)).toMatchObject({
            pointerCleared: true,
            lifecycleCommit: report.lifecycleCommit,
          });
        } else {
          expect(run.stdout).toContain(generic);
          expect(run.stdout).toContain('continuing at Step 8.5');
        }
        const calls: string[][] = readFileSync(trace, 'utf8')
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line) as string[]);
        expect(calls.some((call) => call.includes('push'))).toBe(false);
        expect(
          calls.filter(
            (call) => call[1] === 'project' && call[2] === 'archive',
          ),
        ).toHaveLength(1);
        expect(
          calls.some((call) => call[1] === 'config' && call[2] === 'set'),
        ).toBe(mode === 'freestyle');
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );
});

// M1 starts at the first selector, before the existing terminal executor tests.
// Git's ref advertisement and oat's status are external inputs; the shipped
// shell itself decides whether to give pull advice or reach archive recovery.
describe('first completion selector (m04 M1)', () => {
  it.each([
    ['retained', 'freestyle', 'terminal'],
    ['removed', 'freestyle', 'terminal'],
    ['ordinary', 'freestyle', 'unpulled'],
    ['retained', 'quick', 'lifecycle'],
    ['mismatched', 'freestyle', 'refused'],
    ['malformed', 'freestyle', 'refused'],
  ])('%s alias in %s selects %s', (alias, mode, expected) => {
    const directory = mkdtempSync(join(tmpdir(), 'oat-rev2-selector-'));
    try {
      const bin = join(directory, 'bin');
      mkdirSync(bin);
      const sha = 'a'.repeat(40);
      const active = `${sha}\trefs/oat/projects/demo`;
      const completed = `${alias === 'mismatched' ? 'b'.repeat(40) : sha}\trefs/oat/completed/demo`;
      const refs =
        alias === 'ordinary'
          ? active
          : alias === 'removed'
            ? completed
            : alias === 'malformed'
              ? 'broken advertisement'
              : `${active}\n${completed}`;
      writeFileSync(
        join(bin, 'git'),
        `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'rev-parse') console.log(process.env.SELECTOR_ROOT);
else if (args[0] === 'ls-remote') {
  const rows = process.env.SELECTOR_REFS.split('\\n').filter(row => row === 'broken advertisement' || args.includes(row.split('\\t')[1]));
  if (!rows.length) process.exit(2);
  console.log(rows.join('\\n'));
}
else if (args[0] === 'fetch') {}
else if (args[0] === 'show') console.log('oat_workflow_mode: ' + process.env.SELECTOR_MODE);
else process.exit(92);
`,
        { mode: 0o755 },
      );
      writeFileSync(
        join(bin, 'oat'),
        `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'config' && args[1] === 'get') console.log('.oat/projects/synced/demo');
else if (args[1] === 'scope') console.log('synced');
else if (args[1] === 'status') console.log(process.env.SELECTOR_MODE);
else process.exit(91);
`,
        { mode: 0o755 },
      );
      const content = readFileSync(
        join(root, '.agents/skills/oat-project-complete/SKILL.md'),
        'utf8',
      );
      const selector = /```bash\n(PROJECT_PATH=([\s\S]*?))\n```/.exec(
        content,
      )?.[1];
      expect(selector).toBeDefined();
      const run = spawnSync(
        '/bin/bash',
        ['-c', `${selector}\necho reached-archive-classifier`],
        {
          cwd: directory,
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH}`,
            SELECTOR_ROOT: directory,
            SELECTOR_MODE: mode,
            SELECTOR_REFS: refs,
          },
        },
      );
      if (expected === 'refused') {
        expect(run.status).toBe(1);
        expect(run.stderr).toMatch(/terminal refs|Git advertisement/);
      } else {
        expect(run.status, run.stderr).toBe(0);
        if (expected === 'terminal')
          expect(run.stderr).toContain('Retired synced archive resume');
        if (expected === 'unpulled') {
          expect(run.stderr).toContain('references/freestyle-completion.md');
          expect(run.stderr).not.toContain('Retired synced archive resume');
        }
        if (expected === 'lifecycle')
          expect(run.stdout).toContain('reached-archive-classifier');
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

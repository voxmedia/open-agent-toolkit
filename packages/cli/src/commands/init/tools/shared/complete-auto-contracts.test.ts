import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { WORKFLOW_SKILLS } from './skill-manifest';

/**
 * `oat-project-complete-auto` contracts.
 *
 * The companion completes projects without prompts behind a three-layer guard:
 * a standing config opt-in, an objective per-project preflight, and an
 * activation contract that admits only named requesting steps. Its PR-merge
 * precondition composes with OAT's complete-before-merge ordering through one
 * recorded exception. The composed controls below evaluate the skill's own
 * recognized-step and precondition tables, so editing a row changes the
 * outcome these scenarios observe.
 */

const REPO_ROOT = join(import.meta.dirname, '../../../../../../../');
const SKILL = 'oat-project-complete-auto';
const SKILL_PATH = `.agents/skills/${SKILL}/SKILL.md`;
const INTERACTIVE_PATH = '.agents/skills/oat-project-complete/SKILL.md';

function readRepoFile(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

function sliceBetween(content: string, start: string, end: string): string {
  const startIndex = content.indexOf(start);
  if (startIndex < 0) {
    throw new Error(`Missing section start: ${start}`);
  }
  const endIndex = content.indexOf(end, startIndex + start.length);
  if (endIndex < 0) {
    throw new Error(`Missing section end after ${start}: ${end}`);
  }
  return content.slice(startIndex, endIndex);
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function frontmatter(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    throw new Error('Missing frontmatter');
  }
  return match[1]!;
}

function tableAfter(content: string, heading: string): string[][] {
  const lines = content.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  if (headingIndex < 0) {
    throw new Error(`Missing heading: ${heading}`);
  }
  const start = lines.findIndex(
    (line, index) => index > headingIndex && line.trim().startsWith('|'),
  );
  const rows: string[][] = [];
  for (const line of lines.slice(start)) {
    if (!line.trim().startsWith('|')) break;
    const cells = line
      .trim()
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim());
    if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue;
    rows.push(cells);
  }
  return rows.slice(1);
}

const unquote = (cell: string): string => cell.replace(/^`|`$/g, '');

interface RequestingStep {
  value: string;
  beforeMerge: boolean;
}

interface PreconditionRow {
  requestedBy: string;
  beforeMerge: string;
  prState: string;
  prStatus: string;
  prUrl: string;
  finalReview: string;
  result: string;
}

interface Scenario {
  optIn: boolean;
  requestedBy: string;
  completionBeforeMerge: boolean;
  autonomousEnv: boolean;
  prState: string | null;
  prStatus: string | null;
  prUrl: string | null;
  finalReview: string;
}

type Outcome =
  | { kind: 'interactive completion required' }
  | { kind: 'refused'; layer: 'activation' | 'preflight' }
  | { kind: 'completed'; exception: boolean };

function readContract(): {
  steps: RequestingStep[];
  rows: PreconditionRow[];
} {
  const skill = readRepoFile(SKILL_PATH);
  const steps = tableAfter(skill, '### Recognized requesting steps').map(
    (cells) => ({
      value: unquote(cells[0]!),
      beforeMerge: cells[2] === 'yes',
    }),
  );
  const rows = tableAfter(skill, '#### PR-merge precondition').map((cells) => ({
    requestedBy: cells[0]!,
    beforeMerge: cells[1]!,
    prState: unquote(cells[2]!),
    prStatus: unquote(cells[3]!),
    prUrl: cells[4]!,
    finalReview: unquote(cells[5]!),
    result: cells[6]!,
  }));
  return { steps, rows };
}

function recognizedStep(
  steps: readonly RequestingStep[],
  requestedBy: string,
): RequestingStep | undefined {
  return steps.find((step) => {
    const placeholder = step.value.indexOf('<');
    return placeholder < 0
      ? step.value === requestedBy
      : requestedBy.startsWith(step.value.slice(0, placeholder)) &&
          requestedBy.length > placeholder;
  });
}

function decide(scenario: Scenario): Outcome {
  if (!scenario.optIn) {
    return { kind: 'interactive completion required' };
  }
  const { steps, rows } = readContract();
  const step = recognizedStep(steps, scenario.requestedBy);
  if (
    !step ||
    (scenario.completionBeforeMerge && !step.beforeMerge) ||
    (step.value.startsWith('oat-autonomous-lifecycle:') &&
      !scenario.autonomousEnv)
  ) {
    return { kind: 'refused', layer: 'activation' };
  }

  const match = rows.find((row) => {
    const requesterOk =
      row.requestedBy === 'a recognized step' ||
      (row.requestedBy === 'a before-merge step' && step.beforeMerge);
    const beforeMergeOk =
      row.beforeMerge === 'any' ||
      (row.beforeMerge === 'yes') === scenario.completionBeforeMerge;
    const stateOk = row.prState === scenario.prState;
    const statusOk =
      row.prStatus === 'any' || row.prStatus === scenario.prStatus;
    const urlOk = row.prUrl !== 'set' || Boolean(scenario.prUrl);
    const reviewOk = row.finalReview === scenario.finalReview;
    return (
      requesterOk && beforeMergeOk && stateOk && statusOk && urlOk && reviewOk
    );
  });
  if (!match) {
    return { kind: 'refused', layer: 'preflight' };
  }
  return {
    kind: 'completed',
    exception: match.result === 'pass, exception recorded',
  };
}

const REVIEWED_WAVE_OPEN_PR: Scenario = {
  optIn: true,
  requestedBy: 'oat-wave-execute:closeout-step-8',
  completionBeforeMerge: true,
  autonomousEnv: true,
  prState: 'OPEN',
  prStatus: 'open',
  prUrl: 'https://github.com/example/repo/pull/1',
  finalReview: 'passed',
};

const MERGED_BATCH_MEMBER: Scenario = {
  optIn: true,
  requestedBy: 'oat-wave-program:program-completion-checkpoint',
  completionBeforeMerge: false,
  autonomousEnv: true,
  prState: 'MERGED',
  prStatus: 'open',
  prUrl: 'https://github.com/example/repo/pull/2',
  finalReview: 'passed',
};

describe('oat-project-complete-auto identity', () => {
  it('is a model-invocable, non-user-invocable companion with no prompt tool', () => {
    const fm = frontmatter(readRepoFile(SKILL_PATH));

    expect(fm).toContain(`name: ${SKILL}`);
    expect(fm).toContain('disable-model-invocation: false');
    expect(fm).toContain('user-invocable: false');
    expect(fm).toMatch(/metadata:\n {2}version: 1\.0\.0/);
    expect(fm).not.toContain('AskUserQuestion');
  });

  it('leaves the interactive oat-project-complete human gate in place', () => {
    const fm = frontmatter(readRepoFile(INTERACTIVE_PATH));

    expect(fm).toContain('disable-model-invocation: true');
    expect(fm).toContain('user-invocable: true');
  });

  it('points to the interactive steps instead of copying them', () => {
    const skill = readRepoFile(SKILL_PATH);
    const complete = sliceBetween(
      skill,
      '### Step 5: Complete the Project',
      '### Batch Mode',
    );

    expect(normalize(complete)).toContain(
      'Load the current `oat-project-complete/SKILL.md` and follow its Steps 1 through 12',
    );
    for (const copied of [
      'COMPLETE_STATE_ARGS',
      'archive-decision-resolution:start',
      'oat project complete-state',
      'oat project archive',
    ]) {
      expect(skill, copied).not.toContain(copied);
    }
  });

  it('resolves archive and PR choices from config', () => {
    const answers = normalize(
      sliceBetween(
        readRepoFile(SKILL_PATH),
        '#### Answer table',
        '### Step 4:',
      ),
    );

    expect(answers).toContain(
      '`workflow.archiveOnComplete` when set; local projects never archive; unset on a durable project: refuse.',
    );
    expect(answers).toContain(
      '`workflow.createPrOnComplete` is read and reported, never acted on.',
    );
  });

  it('is registered in the bundle and the workflows pack', () => {
    expect(WORKFLOW_SKILLS).toContain(SKILL);
    expect(readRepoFile('packages/cli/scripts/bundle-inputs.mjs')).toContain(
      `'${SKILL}',`,
    );
    expect(
      readRepoFile('apps/oat-docs/docs/workflows/skills/index.md'),
    ).toContain(`- \`${SKILL}\``);
  });
});

describe('oat-project-complete-auto three-layer guard', () => {
  it('layer 1: stops with "interactive completion required" before anything else', () => {
    const skill = readRepoFile(SKILL_PATH);
    const optIn = sliceBetween(
      skill,
      '### Step 1: Opt-in Guard',
      '### Step 2: Activation Contract',
    );

    expect(optIn).toContain('oat config get workflow.autonomousComplete');
    expect(optIn).toContain('[[ "$AUTONOMOUS_COMPLETE" != "true" ]]');
    expect(optIn).toContain('interactive completion required');
    expect(normalize(optIn)).toContain('and write nothing');
    expect(skill.indexOf('### Step 1: Opt-in Guard')).toBeLessThan(
      skill.indexOf('### Step 3: Objective Preflight (Per Project)'),
    );
  });

  it('layer 2: preflights each project objectively and never assumes an answer', () => {
    const preflight = normalize(
      sliceBetween(
        readRepoFile(SKILL_PATH),
        '### Step 3: Objective Preflight (Per Project)',
        '#### PR-merge precondition',
      ),
    );

    expect(preflight).toContain(
      'oat project closeout-check "$PROJECT_PATH" --json --autonomous',
    );
    expect(preflight).toContain('never assume an answer');
    for (const check of [
      '**Post-implement sequence incomplete:**',
      '**Incomplete tasks:**',
      '**Final review not passed:**',
      '**PR precondition unmet:**',
      '**Unresolved blockers:**',
      '**Project-log gate unsatisfied:**',
      '**A completion question has no recorded answer:**',
    ]) {
      expect(preflight, check).toContain(check);
    }
  });

  it('layer 3: runs only for a naming step or an OAT_AUTONOMOUS run, with provenance', () => {
    const skill = readRepoFile(SKILL_PATH);
    const activation = normalize(
      sliceBetween(
        skill,
        '### Step 2: Activation Contract',
        '### Step 3: Objective Preflight (Per Project)',
      ),
    );

    expect(activation).toContain(
      'Refuse, writing nothing, when `--requested-by` is missing or unrecognized',
    );
    expect(activation).toContain('`OAT_AUTONOMOUS=1`');
    expect(activation).toContain('self-initiated cleanup is refused');
    expect(activation).toContain(
      'recorded in the run report (Step 6) and in the completion commit body (Step 5)',
    );
    expect(normalize(skill)).toContain(
      'a `Requested-by: {--requested-by value}` line',
    );
    expect(skill).toContain("requested_by: '{--requested-by value}'");
  });

  it('writes nothing before every guard passes, and records an exception before completing', () => {
    const skill = readRepoFile(SKILL_PATH);
    const exception = skill.indexOf(
      '### Step 4: Record a Completion-Before-Merge Exception',
    );
    const complete = skill.indexOf('### Step 5: Complete the Project');
    const load = skill.indexOf(
      'Load the current `oat-project-complete/SKILL.md`',
    );

    expect(normalize(skill)).toContain(
      'Steps 1 through 3 are read-only. Nothing is written',
    );
    expect(exception).toBeGreaterThan(
      skill.indexOf('#### PR-merge precondition'),
    );
    expect(complete).toBeGreaterThan(exception);
    expect(load).toBeGreaterThan(complete);
    expect(skill).toContain('- Requesting workflow: {--requested-by value}');
    expect(skill).toContain('- PR: {oat_pr_url} (open)');
    expect(skill).toContain('- Reason: {--reason value}');
  });

  it('batch mode sits behind the program-end checkpoint and preflights each project', () => {
    const batch = normalize(
      sliceBetween(
        readRepoFile(SKILL_PATH),
        '### Batch Mode',
        '### Step 6: Run Report',
      ),
    );

    expect(batch).toContain('that answer is the human gate for the batch');
    expect(batch).toContain(
      '--requested-by oat-wave-program:program-completion-checkpoint --batch --program-checkpoint <ledger-ref>',
    );
    expect(batch).toContain(
      'each project is preflighted individually (Step 3) and a failed preflight refuses only that project',
    );
    expect(batch).toContain(
      'the completion-before-merge exception is not available in batch mode',
    );
  });
});

describe('oat-project-complete-auto composed controls', () => {
  it('completes an opted-in, reviewed wave with an open tracked PR from wave-execute step 8, recording the exception', () => {
    expect(decide(REVIEWED_WAVE_OPEN_PR)).toEqual({
      kind: 'completed',
      exception: true,
    });
  });

  it('refuses the same project when no workflow names the skill', () => {
    expect(
      decide({
        ...REVIEWED_WAVE_OPEN_PR,
        requestedBy: '',
        completionBeforeMerge: false,
      }),
    ).toEqual({ kind: 'refused', layer: 'activation' });
    expect(
      decide({ ...REVIEWED_WAVE_OPEN_PR, requestedBy: 'self-initiated' }),
    ).toEqual({ kind: 'refused', layer: 'activation' });
  });

  it('completes a merged program-end batch member with no exception', () => {
    expect(decide(MERGED_BATCH_MEMBER)).toEqual({
      kind: 'completed',
      exception: false,
    });
  });

  it('refuses every open PR outside the recorded exception', () => {
    // Batch mode cannot claim completion-before-merge.
    expect(
      decide({ ...MERGED_BATCH_MEMBER, completionBeforeMerge: true }),
    ).toEqual({ kind: 'refused', layer: 'activation' });
    // An open PR at program close.
    expect(decide({ ...MERGED_BATCH_MEMBER, prState: 'OPEN' })).toEqual({
      kind: 'refused',
      layer: 'preflight',
    });
    // An open PR the project does not track as open, or has no URL for.
    expect(decide({ ...REVIEWED_WAVE_OPEN_PR, prStatus: null })).toEqual({
      kind: 'refused',
      layer: 'preflight',
    });
    expect(decide({ ...REVIEWED_WAVE_OPEN_PR, prStatus: 'ready' })).toEqual({
      kind: 'refused',
      layer: 'preflight',
    });
    expect(decide({ ...REVIEWED_WAVE_OPEN_PR, prUrl: null })).toEqual({
      kind: 'refused',
      layer: 'preflight',
    });
    // A before-merge step that did not pass its provenance.
    expect(
      decide({ ...REVIEWED_WAVE_OPEN_PR, completionBeforeMerge: false }),
    ).toEqual({ kind: 'refused', layer: 'preflight' });
    // A closed or unreadable PR.
    expect(decide({ ...MERGED_BATCH_MEMBER, prState: 'CLOSED' })).toEqual({
      kind: 'refused',
      layer: 'preflight',
    });
    expect(decide({ ...MERGED_BATCH_MEMBER, prState: null })).toEqual({
      kind: 'refused',
      layer: 'preflight',
    });
  });

  it('refuses a final review row that is not passed, merged or not', () => {
    for (const base of [REVIEWED_WAVE_OPEN_PR, MERGED_BATCH_MEMBER]) {
      expect(decide({ ...base, finalReview: 'fixes_completed' })).toEqual({
        kind: 'refused',
        layer: 'preflight',
      });
    }
  });

  it('admits an autonomous lifecycle run only under OAT_AUTONOMOUS=1', () => {
    const lifecycle: Scenario = {
      ...MERGED_BATCH_MEMBER,
      requestedBy: 'oat-autonomous-lifecycle:oat-project-autonomous',
    };

    expect(decide(lifecycle)).toEqual({ kind: 'completed', exception: false });
    expect(decide({ ...lifecycle, autonomousEnv: false })).toEqual({
      kind: 'refused',
      layer: 'activation',
    });
  });

  it('stops without the opt-in regardless of the request', () => {
    for (const base of [REVIEWED_WAVE_OPEN_PR, MERGED_BATCH_MEMBER]) {
      expect(decide({ ...base, optIn: false })).toEqual({
        kind: 'interactive completion required',
      });
    }
  });
});

describe('wave closeout invokes the companion', () => {
  const WAVE_EXECUTE = '.agents/skills/oat-wave-execute/SKILL.md';
  const WAVE_PROGRAM = '.agents/skills/oat-wave-program/SKILL.md';

  function waveExecuteStep8(): string {
    return normalize(
      sliceBetween(
        readRepoFile(WAVE_EXECUTE),
        '8. **The full `oat-project-complete` PROCESS',
        '9. **After the operator merges:**',
      ),
    );
  }

  function waveProgramCheckpoint(): string {
    return normalize(
      sliceBetween(
        readRepoFile(WAVE_PROGRAM),
        '6. When the final wave',
        '### Program-close explainer caller',
      ),
    );
  }

  function requestedBy(section: string): string {
    const match = section.match(/--requested-by (\S+)/);
    if (!match) {
      throw new Error('Missing --requested-by in the requesting step');
    }
    return match[1]!;
  }

  it('wave-execute step 8 invokes oat-project-complete-auto with its completion-before-merge provenance', () => {
    const step = waveExecuteStep8();

    expect(step).toContain('invoke `oat-project-complete-auto`');
    expect(step).toContain(
      '--requested-by oat-wave-execute:closeout-step-8 --completion-before-merge --reason',
    );
    expect(step).not.toContain('as a document');
    expect(step).not.toContain('until an `oat-project-complete-auto`');
  });

  it('the provenance wave-execute step 8 passes completes a reviewed wave with an open tracked PR', () => {
    const step = waveExecuteStep8();

    expect(
      decide({
        ...REVIEWED_WAVE_OPEN_PR,
        requestedBy: requestedBy(step),
        completionBeforeMerge: step.includes('--completion-before-merge'),
      }),
    ).toEqual({ kind: 'completed', exception: true });
  });

  it('the program completion checkpoint runs the companion in batch mode, never as a document', () => {
    const checkpoint = waveProgramCheckpoint();

    expect(checkpoint).toContain('`oat-project-complete-auto`');
    expect(checkpoint).toContain(
      '--requested-by oat-wave-program:program-completion-checkpoint --batch --program-checkpoint',
    );
    expect(checkpoint).toContain('never answer it autonomously');
    expect(checkpoint).not.toContain('as a document');
    expect(checkpoint).not.toContain('when it ships');
    expect(
      decide({
        ...MERGED_BATCH_MEMBER,
        requestedBy: requestedBy(checkpoint),
      }),
    ).toEqual({ kind: 'completed', exception: false });
  });
});

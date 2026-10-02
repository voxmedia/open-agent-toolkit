import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

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

const stubDirs: string[] = [];

afterAll(() => {
  for (const dir of stubDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** The skill's own Step 1 opt-in block, run against a stub `oat`. */
function runOptInGuard(configured: string | null): {
  status: number | null;
  stderr: string;
} {
  const section = sliceBetween(
    readRepoFile(SKILL_PATH),
    '### Step 1: Opt-in Guard',
    '### Step 2: Activation Contract',
  );
  const block = section.match(/```bash\n([\s\S]*?)\n```/);
  if (!block) {
    throw new Error('Missing the Step 1 opt-in block');
  }
  const dir = mkdtempSync(join(tmpdir(), 'complete-auto-opt-in-'));
  stubDirs.push(dir);
  const stub = join(dir, 'oat');
  writeFileSync(
    stub,
    configured === null
      ? '#!/bin/sh\nexit 1\n'
      : `#!/bin/sh\nprintf '%s\\n' '${configured}'\n`,
  );
  chmodSync(stub, 0o755);
  const result = spawnSync('bash', ['-c', block[1]!], {
    env: { ...process.env, PATH: `${dir}:${process.env.PATH ?? ''}` },
    encoding: 'utf8',
  });
  return { status: result.status, stderr: result.stderr };
}

/**
 * The literal a lifecycle skill must carry to name the companion as a step,
 * read from the companion's own Step 2 rule.
 */
function lifecycleNamingLiteral(skillName: string): string {
  const activation = normalize(
    sliceBetween(
      readRepoFile(SKILL_PATH),
      '### Step 2: Activation Contract',
      '### Step 3: Objective Preflight (Per Project)',
    ),
  );
  const rule = activation.match(
    /refuse unless that skill's current `SKILL\.md` contains the exact invocation `([^`]+)`/,
  );
  if (!rule) {
    throw new Error('Missing the lifecycle naming rule in Step 2');
  }
  return rule[1]!.replace('<skill-name>', skillName);
}

type SkillReader = (skillName: string) => string | null;

const readRepoSkill: SkillReader = (skillName) => {
  try {
    return readRepoFile(`.agents/skills/${skillName}/SKILL.md`);
  } catch {
    return null;
  }
};

function decide(
  scenario: Scenario,
  readSkill: SkillReader = readRepoSkill,
): Outcome {
  const optIn = runOptInGuard(scenario.optIn ? 'true' : 'false');
  if (optIn.status !== 0) {
    if (!optIn.stderr.includes('interactive completion required')) {
      throw new Error(`Opt-in guard failed unexpectedly: ${optIn.stderr}`);
    }
    return { kind: 'interactive completion required' };
  }
  const { steps, rows } = readContract();
  const step = recognizedStep(steps, scenario.requestedBy);
  const lifecycle = step?.value.startsWith('oat-autonomous-lifecycle:');
  const lifecycleSkill = scenario.requestedBy.slice(
    'oat-autonomous-lifecycle:'.length,
  );
  if (
    !step ||
    (scenario.completionBeforeMerge && !step.beforeMerge) ||
    (lifecycle &&
      (!scenario.autonomousEnv ||
        !(readSkill(lifecycleSkill) ?? '').includes(
          lifecycleNamingLiteral(lifecycleSkill),
        )))
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

  it('advertises only the activation routes that work today', () => {
    const skill = readRepoFile(SKILL_PATH);
    const description = frontmatter(skill).match(/^description: (.+)$/m)![1]!;
    const activation = normalize(
      sliceBetween(
        skill,
        '### Step 2: Activation Contract',
        '### Step 3: Objective Preflight (Per Project)',
      ),
    );
    const configuration = normalize(
      readRepoFile('apps/oat-docs/docs/cli-utilities/configuration.md'),
    );

    // No lifecycle skill names the companion, so the OAT_AUTONOMOUS route
    // refuses every claim; no surface may present it as a working trigger.
    expect(description).not.toContain('OAT_AUTONOMOUS');
    expect(description).toContain('oat-wave-execute closeout step 8');
    expect(activation).toContain(
      'No lifecycle skill carries it today, so the two workflow steps above are the only working routes.',
    );
    expect(configuration).not.toContain(
      'or under an `OAT_AUTONOMOUS` lifecycle run',
    );
    expect(configuration).toContain(
      'Its `OAT_AUTONOMOUS` lifecycle route refuses until a lifecycle skill names the companion, and none does today.',
    );
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

  it('routes an archived project to oat-project-complete instead of promising another companion run', () => {
    const skill = readRepoFile(SKILL_PATH);
    const preflight = normalize(
      sliceBetween(
        skill,
        '### Step 3: Objective Preflight (Per Project)',
        '#### PR-merge precondition',
      ),
    );
    const complete = normalize(
      sliceBetween(skill, '### Step 5: Complete the Project', '### Batch Mode'),
    );

    // closeout-check reports `Project not found` once the directory has been
    // archived, so the companion can never reach the archive-resume branches.
    expect(preflight).toContain('`status: error` with `Project not found`');
    expect(preflight).toContain(
      '`project directory absent (archived?); resume with oat-project-complete`',
    );
    expect(complete).not.toContain('recover the project on the next run');
    expect(complete).toContain(
      'A later companion run refuses at preflight once the project directory has been archived; resume with `oat-project-complete`, whose archive-resume branches finish the tail.',
    );
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

  it('refuses an autonomous lifecycle run whose skill does not name the companion', () => {
    // oat-project-autonomous does not name the companion as a step, so a run
    // claiming it is self-initiated, even under OAT_AUTONOMOUS=1.
    for (const skillName of ['oat-project-autonomous', 'oat-anything']) {
      expect(
        decide({
          ...MERGED_BATCH_MEMBER,
          requestedBy: `oat-autonomous-lifecycle:${skillName}`,
        }),
      ).toEqual({ kind: 'refused', layer: 'activation' });
    }
  });

  it('admits a lifecycle skill that names the companion, only under OAT_AUTONOMOUS=1', () => {
    const lifecycle: Scenario = {
      ...MERGED_BATCH_MEMBER,
      requestedBy: 'oat-autonomous-lifecycle:oat-example-lifecycle',
    };
    const namingSkill: SkillReader = (skillName) =>
      skillName === 'oat-example-lifecycle'
        ? `Run \`oat-project-complete-auto\` with \`${lifecycleNamingLiteral(skillName)}\`.`
        : null;

    expect(decide(lifecycle, namingSkill)).toEqual({
      kind: 'completed',
      exception: false,
    });
    expect(decide({ ...lifecycle, autonomousEnv: false }, namingSkill)).toEqual(
      { kind: 'refused', layer: 'activation' },
    );
  });

  it('runs the skill opt-in block: only a configured true passes', () => {
    for (const configured of ['false', '', null]) {
      const result = runOptInGuard(configured);
      expect(result.status, String(configured)).toBe(1);
      expect(result.stderr).toContain('interactive completion required');
    }
    expect(runOptInGuard('true').status).toBe(0);
  });

  it('stops without the opt-in regardless of the request', () => {
    for (const base of [REVIEWED_WAVE_OPEN_PR, MERGED_BATCH_MEMBER]) {
      expect(decide({ ...base, optIn: false })).toEqual({
        kind: 'interactive completion required',
      });
    }
  });

  it('resolves its own and the interactive skill directory before any write', () => {
    const skill = readRepoFile(SKILL_PATH);
    const flat = normalize(skill);
    const ownDir = flat.indexOf(
      'Set `SKILL_DIR` to the absolute physical (`cd -P`) directory containing this loaded `SKILL.md`',
    );
    const resolve = flat.indexOf('COMPLETE_SKILL_DIR=');
    const exception = flat.indexOf(
      '### Step 4: Record a Completion-Before-Merge Exception',
    );

    expect(ownDir).toBeGreaterThanOrEqual(0);
    expect(resolve).toBeGreaterThan(ownDir);
    expect(exception).toBeGreaterThan(resolve);
    expect(skill).toContain('[ -d "$CANDIDATE/scripts" ]');
    expect(flat).toContain('`SKILL_DIR="$COMPLETE_SKILL_DIR"`');
    expect(flat).toContain('oat-project-complete unavailable');
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

  it('wave-execute step 8 defers only benign stops and stops at a boundary on objective preflight failures', () => {
    const step = waveExecuteStep8();
    const companion = readRepoFile(SKILL_PATH);
    const checks = new Map(
      [...companion.matchAll(/^(\d)\. \*\*(.+?):\*\*/gm)].map((match) => [
        `preflight:${match[1]}`,
        match[2]!,
      ]),
    );
    expect(checks.get('preflight:4')).toBe('PR precondition unmet');
    expect(checks.get('preflight:7')).toBe(
      'A completion question has no recorded answer',
    );
    expect(companion).toContain(
      "refused_check: '{opt-in | activation | preflight:<n> | -}'",
    );

    const deferral = step.match(
      /only when the run report's `refused_check` is (.+?)\./,
    );
    expect(deferral).not.toBeNull();
    const deferred = [...deferral![1]!.matchAll(/`([^`]+)`/g)]
      .map((match) => match[1]!)
      .filter((token) => /^(?:opt-in|activation|preflight:\d)$/.test(token));
    expect(deferred).toEqual(['opt-in', 'preflight:4', 'preflight:7']);

    const boundary = step.slice(step.indexOf('Any other refusal'));
    expect(boundary).toContain(
      'stops wave closeout at a boundary: report the failing check and run neither `oat project complete-state` nor the merge handoff',
    );
    for (const check of checks.keys()) {
      if (deferred.includes(check)) continue;
      expect(boundary, check).toContain(`\`${check}\``);
    }
    expect(boundary).toContain('`activation`');
  });

  it('wave-execute step 8 names oat-project-complete as the next owner of an archived wrapper', () => {
    const boundary = waveExecuteStep8().slice(
      waveExecuteStep8().indexOf('Any other refusal'),
    );

    expect(boundary).toContain(
      'A `preflight:1` refusal whose reason is `project directory absent (archived?); resume with oat-project-complete`',
    );
    expect(boundary).toContain(
      'the boundary report names `oat-project-complete` as the next owner',
    );
  });

  it('the program completion checkpoint names the next step for every deferrable refusal', () => {
    const checkpoint = waveProgramCheckpoint();

    expect(checkpoint).toContain(
      'When the companion stops with `interactive completion required`, the operator completes the wrappers with `oat-project-complete`.',
    );
    expect(checkpoint).toContain(
      'List every wrapper refused for a deferrable reason (`preflight:4` or `preflight:7`) with its next step: the operator completes it with `oat-project-complete`',
    );
    expect(checkpoint).toContain(
      'A wrapper refused for an objective reason keeps its deferral and reports the failing check.',
    );
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

describe('the companion never creates a PR', () => {
  function interactivePrRules(): {
    configOpens: boolean;
    trackedOpenSkips: boolean;
    createGatedOnShouldOpen: boolean;
    syncRunsForOpenPr: boolean;
  } {
    const interactive = readRepoFile(INTERACTIVE_PATH);
    const flat = normalize(interactive);
    const stepEleven = sliceBetween(
      interactive,
      '### Step 11: Open PR in GitHub (Conditional)',
      '### Step 11.5:',
    );
    return {
      configOpens: flat.includes(
        '**If `PR_ON_COMPLETE` is `true` AND no tracked open PR exists:** Set `SHOULD_OPEN_PR="true"`. Skip the Open PR question.',
      ),
      trackedOpenSkips: flat.includes(
        'If `oat_pr_status` is `open`, do not ask the Open PR question. Set `SHOULD_OPEN_PR="false"`',
      ),
      createGatedOnShouldOpen:
        stepEleven.includes('**Skip if `SHOULD_OPEN_PR` is false.**') &&
        stepEleven.includes('gh pr create'),
      syncRunsForOpenPr: flat.includes(
        '**Run only when `WAS_PR_OPEN_AT_START="true"`',
      ),
    };
  }

  function companionForcesNoPr(): boolean {
    const stepFive = normalize(
      sliceBetween(
        readRepoFile(SKILL_PATH),
        '### Step 5: Complete the Project',
        '### Batch Mode',
      ),
    );
    return (
      stepFive.includes(
        'set `SHOULD_OPEN_PR="false"`, whatever `workflow.createPrOnComplete` or `oat_pr_status` says',
      ) && stepFive.includes('This skill never runs `gh pr create`')
    );
  }

  /**
   * Walk the interactive PR decisions (Step 2 config and tracked-PR rules,
   * the Step 11 create gate, the Step 11.5 sync gate) with or without the
   * companion's Step 5 override.
   */
  function simulatePr(
    prStatus: string | null,
    createPrOnComplete: boolean,
    companion: boolean,
  ): { prCreate: boolean; prSync: boolean } {
    const rules = interactivePrRules();
    expect(rules.createGatedOnShouldOpen).toBe(true);
    let shouldOpen = false;
    if (rules.configOpens && createPrOnComplete && prStatus !== 'open') {
      shouldOpen = true;
    }
    if (rules.trackedOpenSkips && prStatus === 'open') {
      shouldOpen = false;
    }
    if (companion && companionForcesNoPr()) {
      shouldOpen = false;
    }
    return {
      prCreate: shouldOpen,
      prSync: rules.syncRunsForOpenPr && prStatus === 'open',
    };
  }

  it('the interactive flow alone would create a PR for a merged project with createPrOnComplete', () => {
    expect(simulatePr('merged', true, false).prCreate).toBe(true);
  });

  it('a merged project with createPrOnComplete true completes without a PR-create attempt', () => {
    expect(decide({ ...MERGED_BATCH_MEMBER, prStatus: 'merged' })).toEqual({
      kind: 'completed',
      exception: false,
    });
    expect(simulatePr('merged', true, true)).toEqual({
      prCreate: false,
      prSync: false,
    });
  });

  it('the tracked open path still updates the existing PR and creates none', () => {
    expect(decide(REVIEWED_WAVE_OPEN_PR)).toEqual({
      kind: 'completed',
      exception: true,
    });
    expect(simulatePr('open', true, true)).toEqual({
      prCreate: false,
      prSync: true,
    });
  });
});

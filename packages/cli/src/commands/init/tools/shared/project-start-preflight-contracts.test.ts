import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildDecisionAgentsSectionBody } from '@commands/decision/agents-guidance';
import { buildProjectManagementAgentsSectionBody } from '@commands/init/tools/project-management/agents-guidance';
import { describe, expect, it } from 'vitest';

const PROJECT_START_SKILLS = [
  'oat-project-new',
  'oat-project-quick-start',
  'oat-project-lite',
  'oat-project-import-plan',
] as const;

/** Plan-producing workflows that must run the shared gate-posture setup. */
const GATE_POSTURE_CALLER_SKILLS = [
  'oat-project-quick-start',
  'oat-project-lite',
  'oat-project-plan',
  'oat-project-import-plan',
] as const;

const PJM_WRITE_SKILLS = [
  'oat-pjm-add-backlog-item',
  'oat-pjm-decision',
  'oat-pjm-update-repo-reference',
  'oat-pjm-review-backlog',
] as const;

const PJM_CONSUMER_SKILLS = [
  'oat-project-document',
  'oat-project-summary',
  'oat-brainstorm',
] as const;

/**
 * Consumers that branch on `adoption.state` with prose branches rather than a
 * single positive equality gate. These must cover the empty/unknown value —
 * `oat pjm doctor` failing, or `jq` missing from PATH, yields `""` while
 * `oat tools has project-management` still reports `true`.
 */
const PJM_ADOPTION_BRANCHING_SKILLS = [
  'oat-project-document',
  'oat-project-summary',
] as const;

/**
 * `oat decision init` and `oat backlog init` are behind `requireRepositoryPjm()`,
 * so recommending them as a recovery for a missing surface recommends a command
 * that is guaranteed to fail in exactly that situation.
 */
const GUARDED_INIT_COMMANDS = [
  'oat decision init',
  'oat backlog init',
] as const;

function readSkill(name: string): string {
  return readFileSync(
    join(
      import.meta.dirname,
      `../../../../../../../.agents/skills/${name}/SKILL.md`,
    ),
    'utf8',
  );
}

function readPreflightStep(name: string): string {
  const content = readSkill(name);
  const start = content.indexOf('### Step 0 (Preflight): Inherited Git State');
  expect(start, `${name} has a Step 0 preflight`).toBeGreaterThanOrEqual(0);
  const end = content.indexOf('### Step 0.5', start);
  return content.slice(start, end > start ? end : undefined);
}

/**
 * Porcelain codes that pair `M` with an unsafe second state. An earlier version
 * of this rule allowed "status `M` in either column", which silently admitted
 * every one of these — `MD` would have staged and committed a worktree
 * deletion of the manifest.
 */
const UNSAFE_M_MIXES = ['MD', 'MT', 'AM', 'RM', 'CM'] as const;

describe('project-start preflight contracts', () => {
  it.each(PROJECT_START_SKILLS)(
    '%s restricts the manifest auto-commit to plain modifications',
    (name) => {
      const step = readPreflightStep(name);

      expect(step).toContain('made up solely of the letter `M` and blanks');
      expect(step).toContain('`??`');
      // The loose phrasing this replaced.
      expect(step).not.toContain('in either column');
    },
  );

  it.each(PROJECT_START_SKILLS)(
    '%s names every unsafe code that pairs with M',
    (name) => {
      const step = readPreflightStep(name);

      for (const code of UNSAFE_M_MIXES) {
        expect(step, `${name} rejects ${code}`).toContain(`\`${code}\``);
      }
      expect(step).toContain('every unmerged state');
    },
  );

  it.each(PROJECT_START_SKILLS)(
    '%s scopes the auto-commit to the manifest path alone',
    (name) => {
      const step = readPreflightStep(name);

      expect(step).toContain('git add -- .oat/sync/manifest.json');
      expect(step).not.toContain('git add -A');
      expect(step).not.toContain('git add .');
    },
  );

  it.each(PROJECT_START_SKILLS)(
    '%s keeps the explicit-choice guard off the auto-commit branch',
    (name) => {
      const step = readPreflightStep(name);

      expect(step).toContain(
        'Once the dirty list has been presented, do not advance past this gate without',
      );
      expect(step).toContain(
        'The step 2 manifest-only auto-commit is not a choice point',
      );
    },
  );

  it('records the QS-01 autonomy gate only in quick-start', () => {
    expect(readSkill('oat-project-quick-start')).toContain('QS-01');
    expect(readSkill('oat-project-new')).not.toContain('QS-01');
    expect(readSkill('oat-project-import-plan')).not.toContain('QS-01');
  });

  it.each(PJM_WRITE_SKILLS)(
    '%s checks repository adoption read-only before writes',
    (name) => {
      const content = readSkill(name);
      const processStart = content.indexOf('## Process');
      const preflight = content.indexOf('oat pjm doctor --json', processStart);
      const firstWrite = Math.min(
        ...[
          'oat backlog new',
          'oat decision new',
          'Write the **living** review',
        ]
          .map((needle) => content.indexOf(needle, processStart))
          .filter((index) => index >= 0),
      );

      expect(preflight).toBeGreaterThanOrEqual(0);
      expect(preflight).toBeLessThan(firstWrite);
      expect(content).toContain('adoption.state');
      expect(content).toContain('partial-initialization');
      expect(content).toContain('oat pjm init');
    },
  );

  it('resolves backlog-review templates from the loaded skill directory', () => {
    const content = readSkill('oat-pjm-review-backlog');
    expect(content).toContain(
      '$SKILL_DIR/references/backlog-review-template.md',
    );
    expect(content).toContain(
      '$SKILL_DIR/references/priority-alignment-template.md',
    );
    expect(content).not.toContain(
      '.agents/skills/oat-pjm-review-backlog/references/',
    );
  });

  it.each(PJM_CONSUMER_SKILLS)(
    '%s separates capability presence from repository adoption',
    (name) => {
      const content = readSkill(name);
      expect(content).toContain('oat tools has project-management');
      expect(content).toContain('oat pjm doctor --json');
      expect(content).toContain('adoption.state');
      expect(content).toContain('partial-initialization');
      expect(content).toContain('oat pjm init');
    },
  );

  it('does not initialize decisions as an implicit PJM adoption path', () => {
    expect(readSkill('oat-project-summary')).not.toContain(
      'test -f .oat/repo/reference/decisions/index.md || oat decision init',
    );
  });

  it('checks the canonical decision index during the decision scaffold preflight', () => {
    const content = readSkill('oat-pjm-decision');
    const start = content.indexOf('### Step 2: Verify Decision Scaffold');
    const end = content.indexOf(
      '### Step 3: Create the Decision Record',
      start,
    );
    const preflight = content.slice(start, end);

    expect(preflight).toContain('`.oat/repo/reference/decisions/index.md`');
    expect(preflight).not.toContain('`reference/decisions/index.md`');
  });

  it.each(PJM_ADOPTION_BRANCHING_SKILLS)(
    '%s handles an empty or unknown adoption state explicitly',
    (name) => {
      const content = readSkill(name);

      expect(content).toContain('PJM_ADOPTION_STATE');
      expect(content).toMatch(
        /`PJM_ADOPTION_STATE`\s+is\s+empty\s+or\s+holds\s+any\s+value\s+other\s+than/,
      );
      // The four documented states must all be named in the fallback clause.
      for (const state of [
        'declared',
        'inferred-legacy',
        'none',
        'partial-initialization',
      ]) {
        expect(content, `${name} names ${state}`).toContain(state);
      }
      expect(content).toMatch(/unverified/i);
      expect(content).toMatch(/could not be determined/i);
    },
  );

  it('keeps the brainstorm adoption gate a fail-closed positive test', () => {
    // oat-brainstorm needs no unknown-state clause because its gate is a
    // positive equality test: an empty state simply does not enable the write.
    const content = readSkill('oat-brainstorm');
    expect(content).toMatch(
      /`PJM_ADOPTION_STATE`\s+equal\s+to\s*\n?\s*`declared`\s+or\s+`inferred-legacy`/,
    );
  });

  describe('lifecycle gate posture setup', () => {
    /** Wrap-insensitive: hard line breaks must not decide contract coverage. */
    function flat(value: string): string {
      return value.replace(/\s+/g, ' ').trim();
    }

    function readPostureContract(): string {
      const content = readSkill('oat-project-plan-writing');
      const start = content.indexOf(
        '## Shared Lifecycle Gate Posture Setup Contract',
      );
      expect(
        start,
        'plan-writing defines the shared gate-posture contract',
      ).toBeGreaterThanOrEqual(0);
      const end = content.indexOf('## Auto Artifact-Review Loop', start);
      return content.slice(start, end > start ? end : undefined);
    }

    function readPostureStep(name: string): string {
      const content = readSkill(name);
      const start = content.indexOf(': Configure Lifecycle Gate Posture');
      expect(
        start,
        `${name} has a lifecycle gate posture step`,
      ).toBeGreaterThanOrEqual(0);
      const end = content.indexOf('### Step', start + 1);
      return content.slice(start, end > start ? end : undefined);
    }

    it('probes configured gate-aware skills without executing them', () => {
      const contract = readPostureContract();

      expect(contract).toContain(
        'oat gate resolve <gate-aware-skill> --project "$PROJECT_PATH" --json',
      );
      expect(contract).toContain('never launches a gate');
      expect(contract).toContain('oat_gateable: true');
      // Only a configured gate is offerable; an override alone is not config.
      expect(flat(contract)).toContain(
        'A gate qualifies for a choice only when `resolution` is literally `configured`',
      );
      expect(contract).toContain('never fabricate configuration');
    });

    it('offers an independent keep-or-disable choice per configured gate', () => {
      const contract = readPostureContract();

      expect(flat(contract)).toContain(
        'present each configured gate separately',
      );
      expect(contract).toContain('Granularity is per skill');
      expect(contract).toContain('no single answer disables');
      expect(contract).toMatch(/\*\*Keep\*\*/);
      expect(contract).toMatch(/\*\*Disable\*\*/);
    });

    it('persists only disabled overrides and never touches config layers', () => {
      const contract = readPostureContract();

      expect(contract).toContain('Persist only the disabled choices');
      expect(contract).toContain('oat_skill_gate_overrides:');
      expect(contract).toContain('the literal `disabled`');
      expect(contract).toContain('Keeping every gate leaves the map absent');
      expect(flat(contract)).toContain(
        'Never write an `enabled` value, a boolean, or a list',
      );
      expect(flat(contract)).toContain(
        'the shared, local, and user configuration layers are never modified',
      );
      expect(flat(contract)).toContain(
        'never marks a gate passed, failed, or missing',
      );
    });

    it('preserves an explicit existing map without probing or prompting', () => {
      const contract = readPostureContract();

      expect(flat(contract)).toContain('preserve the complete value unchanged');
      expect(contract).toContain('Do not probe, prompt, or mutate it');
      expect(contract).toContain('resumed and imported projects');
      expect(flat(contract)).toContain(
        'A malformed map is never silently repaired, replaced, or dropped',
      );
    });

    it('never prompts or writes a map in non-interactive mode', () => {
      const contract = readPostureContract();

      expect(contract).toContain('OAT_NON_INTERACTIVE=1');
      expect(flat(contract)).toContain(
        'Never prompt in this mode, and never write a new map',
      );
      expect(contract).toContain('even when configured gates exist');
      expect(contract).toContain('Leave the setting absent');
    });

    it('stays independent from phase gate review and HiLL policy', () => {
      const contract = readPostureContract();

      expect(flat(contract)).toContain(
        'after the complete plan has stable phase IDs and before the plan artifact review begins',
      );
      expect(flat(contract)).toContain(
        'adjacent to, but independently from, that setup',
      );
      expect(flat(contract)).toContain(
        "neither contract reads, writes, or satisfies the other's setting",
      );
      expect(flat(contract)).toContain(
        'It never reads or writes `oat_phase_review_gate`, HiLL policy, or any autonomous design-gate setting',
      );
    });

    it.each(GATE_POSTURE_CALLER_SKILLS)(
      '%s runs gate-posture setup after stable plan structure and before artifact review',
      (name) => {
        const content = readSkill(name);
        const stablePlanStructure = content.indexOf(
          name === 'oat-project-lite'
            ? '### Step 5: Resolve Dispatch Ceiling'
            : ': Configure Optional Phase Gate Review',
        );
        const posture = content.indexOf(': Configure Lifecycle Gate Posture');
        const artifactReview = content.indexOf('Plan Artifact Review Loop');

        // Ordering, not mere presence: the posture choice must be persisted
        // after the plan has stable phase IDs and before artifact review.
        expect(
          stablePlanStructure,
          `${name} has stable plan structure`,
        ).toBeGreaterThan(0);
        expect(posture, `${name} has posture setup`).toBeGreaterThan(
          stablePlanStructure,
        );
        expect(artifactReview, `${name} has artifact review`).toBeGreaterThan(
          posture,
        );

        const step = readPostureStep(name);

        expect(step).toContain(
          'invoke the `Shared Lifecycle Gate Posture Setup Contract` from',
        );
        expect(step).toContain('load the current');
        expect(step).toContain('oat-project-plan-writing/SKILL.md');
        expect(step).toContain('follow that contract as written');
        expect(step).toContain('oat_skill_gate_overrides');
        expect(flat(step)).toContain(
          'preserve it through the shared contract without',
        );
        expect(step).toContain('Persist only disabled choices');
        expect(flat(step)).toContain(
          'Never modify the shared, local, or user configuration layers',
        );
        expect(step).toContain('non-interactive');
      },
    );

    it.each(GATE_POSTURE_CALLER_SKILLS)(
      '%s resolves its configured gate with project context',
      (name) => {
        const content = readSkill(name);

        expect(content).toContain(
          'oat gate resolve <this-skill> --project "$PROJECT_PATH" --json',
        );
        expect(content).not.toContain('oat gate resolve <this-skill> --json');
        expect(content).toContain(
          'Handle all three `resolution` values explicitly',
        );
        for (const resolution of [
          'not_configured',
          'configured_disabled_by_project',
          'configured',
        ]) {
          expect(content, `${name} handles ${resolution}`).toContain(
            `\`${resolution}\``,
          );
        }
        expect(content).toContain('Do not launch any process');
        expect(content).toContain(
          'never enters the passed, missing, or failed branches',
        );
        expect(content).toContain('evidence only, never executed');
      },
    );
  });

  it('never recommends a guarded init command in generated AGENTS guidance', () => {
    const generatedBodies = {
      'project-management': buildProjectManagementAgentsSectionBody(),
      decisions: buildDecisionAgentsSectionBody(),
    };

    for (const [key, body] of Object.entries(generatedBodies)) {
      for (const command of GUARDED_INIT_COMMANDS) {
        expect(body, `${key} guidance recommends ${command}`).not.toContain(
          command,
        );
      }
      expect(body, `${key} guidance names the adoption probe`).toContain(
        'oat pjm doctor --json',
      );
      expect(body, `${key} guidance names adoption.state`).toContain(
        'adoption.state',
      );
      expect(body, `${key} guidance names the adoption action`).toContain(
        'oat pjm init',
      );
    }
  });
});

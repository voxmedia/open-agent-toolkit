import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expectDispatchStampFieldContract } from '@test-support/skills/dispatch-stamp-contract';
import { readDeclaredVersion } from '@test-support/skills/skill-version';
import { describe, expect, it } from 'vitest';

function repoFilePath(relativePath: string): string {
  return join(import.meta.dirname, '../../../../../../../', relativePath);
}

function readRepoFile(relativePath: string): string {
  const content = readFileSync(repoFilePath(relativePath), 'utf8');
  if (relativePath !== '.agents/skills/oat-project-implement/SKILL.md') {
    return content;
  }
  const successIndex = content.indexOf('## Success Criteria');
  const references = [
    'dispatch-and-dry-run.md',
    'plan-and-resume.md',
    'phase-execution.md',
    'completion-and-closeout.md',
  ].map((path) =>
    readFileSync(
      repoFilePath(`.agents/skills/oat-project-implement/references/${path}`),
      'utf8',
    ),
  );
  return [
    content.slice(0, successIndex),
    ...references,
    content.slice(successIndex),
  ].join('\n\n');
}

function executeFinalProjectPushGuard(
  content: string,
  projectScope: string,
  shouldArchive: string,
  projectRefCommit: string,
): string {
  const step = content.slice(
    content.indexOf('#### Step 8.6: Render Final Synced Project Links'),
    content.indexOf('#### Step 8.7: Non-Archive Synced Completion Transaction'),
  );
  const guard = [...step.matchAll(/if \[\[ ([\s\S]*?) \]\]; then/g)]
    .map((match) => match[1])
    .find(
      (candidate) =>
        candidate.includes('PROJECT_SCOPE') &&
        candidate.includes('PROJECT_REF_COMMIT'),
    );
  if (!guard) {
    throw new Error('Missing final project push guard in Step 8.6.');
  }

  return execFileSync(
    '/bin/bash',
    [
      '-c',
      `PROJECT_SCOPE="$1"\nSHOULD_ARCHIVE="$2"\nPROJECT_REF_COMMIT="$3"\nif [[ ${guard} ]]; then\n  printf push\nelse\n  printf skip\nfi`,
      'completion-final-project-push-guard',
      projectScope,
      shouldArchive,
      projectRefCommit,
    ],
    { encoding: 'utf8' },
  );
}

function actionableResolverInvocations(content: string): string[] {
  const normalized = content.replace(/\\\r?\n\s*/g, ' ');
  return [
    ...normalized.matchAll(
      /(?:pnpm run cli -- project|oat project) dispatch-ceiling resolve[^`\n]*/g,
    ),
  ]
    .map(([command]) => command.trim())
    .filter((command) => command.includes('--provider'));
}

function expectValidReportContext(command: string): void {
  expect(command).toMatch(/--report-scope\s+\S+/);
  expect(command).toMatch(
    /--report-action\s+(implementation|fix|review)(?:\s|$)/,
  );
  if (/--role\s+reviewer/.test(command)) {
    expect(command).toMatch(/--report-action\s+review(?:\s|$)/);
  }
  if (/--role\s+implementer/.test(command)) {
    expect(command).toMatch(/--report-action\s+(?:implementation|fix)(?:\s|$)/);
  }
}

const QUICK_SCAFFOLD_ANCHOR =
  '- Create project via the same scaffolding path used by `oat-project-new`';

/**
 * The scaffold branch is prose plus one executable block, so the consolidation
 * control below runs the block the skill actually ships against a real
 * `oat project new` instead of asserting that the prose exists.
 */
function extractQuickScaffoldBlock(content: string): string {
  const start = content.indexOf(QUICK_SCAFFOLD_ANCHOR);
  const end = content.indexOf('### Step 1: Set Quick Workflow Metadata', start);
  if (start < 0 || end <= start) {
    throw new Error('Missing quick-start scaffold branch.');
  }
  const block = content.slice(start, end).match(/```bash\n([\s\S]*?)\n```/);
  if (!block?.[1]?.includes('oat project new')) {
    throw new Error('Missing `oat project new` block in quick-start.');
  }
  return block[1];
}

const LEDGER_GUARD_ANCHOR = '**Ledger-path guard (both PR paths).**';

/**
 * The pr-final ledger-path guard, so the controls below run the skill's own
 * block instead of a second model of it living in this test.
 */
function extractLedgerPathGuard(content: string): string {
  const start = content.indexOf(LEDGER_GUARD_ANCHOR);
  const end = content.indexOf(
    'For a synced project, use this ordered flow',
    start,
  );
  if (start < 0 || end <= start) {
    throw new Error('Missing pr-final ledger-path guard.');
  }
  const block = content.slice(start, end).match(/```bash\n([\s\S]*?)\n```/);
  if (!block?.[1]?.includes('PRFINAL-05')) {
    throw new Error('Missing PRFINAL-05 guard block in pr-final.');
  }
  return block[1];
}

/**
 * The repository's own `.oat` ignore rules. `local`, `synced`, and `archived`
 * projects are ignored in their entirety, not just their `reviews/archived/`
 * directories, so a fixture that reproduces only the archive rule cannot see
 * how the guard behaves in three of the four scopes.
 */
function oatIgnoreRules(): string[] {
  const rules = readRepoFile('.gitignore')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^!?\.oat\//.test(line));
  if (!rules.includes('.oat/projects/local/**')) {
    throw new Error(
      'Missing OAT project ignore rules in the repository .gitignore.',
    );
  }
  return rules;
}

/** `printf '%s\n' 'rule' 'rule' … > .gitignore`, one shell-quoted rule each. */
function writeIgnoreRulesCommand(): string {
  const quoted = oatIgnoreRules()
    .map((rule) => `'${rule.replaceAll("'", `'\\''`)}'`)
    .join(' ');
  return `printf '%s\\n' ${quoted} > .gitignore`;
}

function builtCliEntry(): string {
  const entry = repoFilePath('packages/cli/dist/index.js');
  if (!existsSync(entry)) {
    throw new Error(
      `Missing built CLI at ${entry}. This control runs the real scaffolder; ` +
        'run `pnpm --filter @open-agent-toolkit/cli build` first (turbo already ' +
        'orders build before test).',
    );
  }
  return entry;
}

interface ScaffoldWorkspace {
  readonly workspace: string;
  readonly repository: string;
  readonly env: NodeJS.ProcessEnv;
}

/**
 * A scratch repository with `oat` on PATH and an isolated HOME, so the skill
 * block runs verbatim and nothing resolves against the maintainer's
 * `~/.oat/templates`.
 */
function createScaffoldWorkspace(cliEntry: string): ScaffoldWorkspace {
  const workspace = mkdtempSync(join(tmpdir(), 'quick-start-scaffold-'));
  const binDirectory = join(workspace, 'bin');
  const home = join(workspace, 'home');
  const repository = join(workspace, 'repo');
  for (const directory of [binDirectory, home, repository]) {
    mkdirSync(directory, { recursive: true });
  }
  const shellQuote = (value: string): string =>
    `'${value.replaceAll("'", `'\\''`)}'`;
  writeFileSync(
    join(binDirectory, 'oat'),
    `#!/bin/sh\nexec ${shellQuote(process.execPath)} ${shellQuote(cliEntry)} "$@"\n`,
    { mode: 0o755 },
  );
  // Inherited `OAT_*` settings (notably `OAT_PROJECTS_ROOT`) outrank the
  // scratch repository's own config and can place the scaffolded projects
  // outside `workspace`, where the cleanup below never reaches them.
  const inherited = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('OAT_')),
  );
  return {
    workspace,
    repository,
    env: {
      ...inherited,
      HOME: home,
      PATH: `${binDirectory}:${process.env.PATH ?? ''}`,
    },
  };
}

const QUICK_PLAN_READINESS_HEADING =
  '### Quick Plan Readiness (Named Predicate)';
const QUICK_PLAN_READINESS_DEFINITION =
  'A quick `plan.md` is implementation-ready only when all of the following hold';
const QUICK_ROUTING_SKILLS = [
  '.agents/skills/oat-project-plan/SKILL.md',
  '.agents/skills/oat-project-progress/SKILL.md',
  '.agents/skills/oat-project-next/SKILL.md',
] as const;

/**
 * The readiness predicate is prose plus one executable guard, so the fixture
 * classifications below run the skill's own guard rather than a second model of
 * it living in this test.
 */
function extractQuickPlanReadinessGuard(content: string): string {
  const start = content.indexOf(QUICK_PLAN_READINESS_HEADING);
  const end = content.indexOf('### Step 4: Sync Project State', start);
  if (start < 0 || end <= start) {
    throw new Error('Missing quick plan readiness section in quick-start.');
  }
  const guard = content.slice(start, end).match(/```bash\n([\s\S]*?)\n```/);
  if (!guard?.[1]?.includes('quick_plan_ready()')) {
    throw new Error('Missing quick_plan_ready guard in quick-start.');
  }
  return guard[1];
}

function normalizeProse(value: string): string {
  return value.replace(/\s+/g, ' ');
}

function quickPlanFixture(parts: {
  frontmatter: readonly string[];
  reviews: readonly string[];
  tasks: readonly string[];
}): string {
  return [
    '---',
    ...parts.frontmatter,
    '---',
    '',
    '# Implementation Plan: Example',
    '',
    '## Phase 1: Example',
    '',
    ...parts.tasks,
    '',
    '## Reviews',
    '',
    ...parts.reviews,
    '',
    '## Implementation Complete',
    '',
    '## References',
    '',
  ].join('\n');
}

function classifyQuickPlan(guard: string, plan: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'quick-plan-readiness-'));
  try {
    const planPath = join(directory, 'plan.md');
    writeFileSync(planPath, plan);
    return execFileSync(
      '/bin/bash',
      [
        '-c',
        `${guard}\nif quick_plan_ready "$1"; then printf ready; else printf not-ready; fi`,
        'quick-plan-readiness',
        planPath,
      ],
      { encoding: 'utf8' },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const PRE_REVIEW_FRONTMATTER = [
  'oat_status: in_progress',
  'oat_ready_for: null',
  'oat_plan_source: quick',
  'oat_template: true',
] as const;
const REVIEWED_FRONTMATTER = [
  'oat_status: complete',
  'oat_ready_for: oat-project-implement',
  'oat_plan_source: quick',
  'oat_template: false',
] as const;
const REVIEW_TABLE_HEADER = [
  '| Scope | Type     | Status  | Date | Artifact |',
  '| ----- | -------- | ------- | ---- | -------- |',
] as const;
const PASSED_PLAN_ROW = [
  ...REVIEW_TABLE_HEADER,
  '| plan  | artifact | passed  | 2026-09-07 | reviews/2026-09-07-plan.md |',
] as const;
const PENDING_PLAN_ROW = [
  ...REVIEW_TABLE_HEADER,
  '| plan  | artifact | pending | -    | -        |',
] as const;
const POLICY_SKIP_DISPOSITION = [
  'Plan artifact review: skipped (workflow.autoArtifactReview.plan=false)',
] as const;
const SUBSTANTIVE_TASKS = [
  '### Task p01-t01: Add the quick resume branch',
  '',
  '**Files:**',
  '',
  '- Modify: `src/index.ts`',
] as const;
const TEMPLATE_TASKS = [
  '### Task p01-t01: {Task Name}',
  '',
  '**Files:**',
  '',
  '- Create: `{path/to/file.ts}`',
] as const;

describe('review skill contracts', () => {
  it('keeps reviewer timestamps aligned and next-step guidance inside the artifact template', () => {
    const content = readRepoFile('.agents/agents/oat-reviewer.md');
    const templateStart = content.indexOf('````markdown\n---');
    const templateEnd = content.indexOf('````', templateStart + 4);
    const nextStep = content.indexOf('## Recommended Next Step');

    // The `oat-reviewer` AGENT role is out of scope for the skill version
    // migration and keeps its top-level declaration, so this read stays direct.
    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.2.5');
    expect(content).toContain(
      'must represent the same instant from the same `date -u` capture',
    );
    expect(content).toContain(
      'The filename uses the colon-free form (`YYYY-MM-DDTHHMMSSZ`) of the frontmatter value (`YYYY-MM-DDTHH:MM:SSZ`)',
    );
    expect(nextStep).toBeGreaterThan(templateStart);
    expect(nextStep).toBeLessThan(templateEnd);
  });

  it('keeps the model-invokable project workflow skills gated by explicit asks', () => {
    const skills = [
      {
        path: '.agents/skills/oat-project-review-provide/SKILL.md',
        descriptionTriggers: ['"review project"', '"review the project"'],
        bodyContracts: [
          '## Model Invocation Gate',
          'Do NOT auto-invoke merely because a task, phase, or implementation appears complete.',
          'active OAT project or a user-provided review target',
          '### Step 0: Resolve Project or Explicit Review Target',
          'If neither an active project nor an explicit target resolves to a valid `PROJECT_PATH` with `state.md`',
          'ask before running the review',
        ],
      },
      {
        path: '.agents/skills/oat-project-review-receive/SKILL.md',
        descriptionTriggers: ['"receive review"', '"process review"'],
        bodyContracts: [
          '## Model Invocation Gate',
          'oat review latest --project "$PROJECT_PATH" --actionable-project --json',
          'kind: "adhoc"',
          'Fallback when the CLI is unavailable',
          'ask before updating artifacts',
        ],
      },
      {
        path: '.agents/skills/oat-project-discover/SKILL.md',
        descriptionTriggers: ['"continue discovery"', '"run discovery"'],
        bodyContracts: [
          '## Model Invocation Gate',
          'active spec-driven OAT project',
          '`oat-project-new` for a new spec-driven project',
          '`oat-project-quick-start` for a quick project',
        ],
      },
      {
        path: '.agents/skills/oat-project-progress/SKILL.md',
        descriptionTriggers: ['"check progress"', `"what's next"`],
        bodyContracts: [
          '## Model Invocation Routing',
          'no active-project gate',
          'Do NOT auto-invoke only because another workflow step finished.',
          'offer the recommended next skill before routing',
        ],
      },
    ];

    for (const skill of skills) {
      const content = readRepoFile(skill.path);
      expect(content).toContain('disable-model-invocation: false');
      expect(content).toContain('Do NOT auto-invoke');
      for (const trigger of skill.descriptionTriggers) {
        expect(content).toContain(trigger);
      }
      for (const contract of skill.bodyContracts) {
        expect(content).toContain(contract);
      }
    }
  });

  it('gates interactive plan explainers with ask-once persisted intent', () => {
    const content = readRepoFile('.agents/skills/oat-project-plan/SKILL.md');

    expect(content).toContain(
      'Resolve `projectExplainer` intent before drafting the plan.',
    );
    expect(content).toContain(
      'When resolution returns `needsPrompt: true`, ask exactly once whether to generate the project explainer, then resolve again with the answer and persist the returned `interactive` record.',
    );
    expect(content).toContain(
      'A valid persisted `oat_project_explainer` decision prevents another prompt.',
    );
    expect(content).toContain(
      'Generate only after plan artifact review, the configured plan gate, and the plan commit have completed successfully.',
    );
    expect(content).toContain(
      'Supply the provider-neutral critic callback (or validated critic module entry point for JSON/CLI invocation) on every federated adapter run.',
    );
    expect(content).toContain(
      'Explainer failure must not roll back, amend, or invalidate the valid committed plan.',
    );
  });

  it('persists autonomous explainer policy without broadening kickoff intent', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-autonomous/SKILL.md',
    );

    expect(content).toContain(
      'Resolve and persist `projectRecap` as `generate` with source `autonomous_policy` after project creation or resolution.',
    );
    expect(content).toContain(
      'Reassert this forced recap intent on resume; a stale lower-precedence skip is overridden, warned, and recorded.',
    );
    expect(content).toMatch(
      /Kickoff persists the forced `generate` intent without probing seams/,
    );
    expect(content).toMatch(
      /may resolve a recordable\s+`skip` with source `capability_probe`/,
    );
    expect(content).toMatch(
      /it is decided before any run rather than from a failed one, and\s+it never blocks unattended completion/,
    );
    expect(content).toMatch(
      /Do not reassert `generate` over a\s+recorded `capability_probe` skip within the same closeout\./,
    );
    expect(content).toContain(
      'Resolve and persist `projectExplainer` as `generate` with source `kickoff_prompt` only when the kickoff request explicitly asks for a project explainer.',
    );
    expect(content).toContain(
      'A general autonomous goal, project creation, or normal planning does not count as an explainer request.',
    );
    expect(content).toContain(
      'When no explicit kickoff explainer request exists, do not persist a project-explainer intent record.',
    );
  });

  it('halts autonomous project work when the synced arrival pull fails', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-autonomous/SKILL.md',
    );
    const arrivalStart = content.indexOf(
      'if [ -n "$PROJECT_PATH" ]; then',
      content.indexOf('Before reading artifacts for an existing project'),
    );
    const arrivalEnd = content.indexOf('\n```', arrivalStart);
    const arrivalBlock = content.slice(arrivalStart, arrivalEnd);
    const pullGuard =
      'oat project pull "$PROJECT_PATH" || { echo "oat: project pull failed for $PROJECT_PATH; resolve the reported state before autonomous work continues" >&2; exit 1; }';

    expect(arrivalBlock).toContain(pullGuard);
    expect(content.indexOf(pullGuard)).toBeLessThan(
      content.indexOf('### Step 1: Detect the Persisted Entry State'),
    );

    const runArrival = (pullStatus: string) =>
      execFileSync(
        '/bin/bash',
        [
          '-c',
          `oat() {
  if [[ "$1 $2" == "project scope" ]]; then
    printf synced
  elif [[ "$1 $2" == "project pull" ]]; then
    [[ "$pullStatus" == "success" ]]
  fi
}
${arrivalBlock}
printf 'artifact-read\\n'`,
          'autonomous-arrival',
        ],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            PROJECT_PATH: '/tmp/synced-project',
            pullStatus,
          },
        },
      );

    expect(runArrival('success')).toContain('artifact-read');
    expect(() => runArrival('conflict')).toThrow();
  });

  it('runs one non-blocking implementation-tail recap before final HiLL approval', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    );

    expect(content).toContain(
      'A fresh `project-recap` manifest for the current completed implementation deduplicates the lifecycle-tail run: reuse it and do not invoke the adapter again.',
    );
    expect(content).toContain(
      'When `OAT_AUTONOMOUS=1` and no fresh recap exists, run this recap gate exactly once; missing or stale persisted intent cannot suppress this autonomous gate. In autonomy, attempt the adapter run exactly once and only when the seam probe resolves every required seam and intent resolves to `generate`; an interactive `generate` still attempts the run regardless of the probe result, and a seam-less interactive attempt is still the `failed` outcome it is today.',
    );
    expect(content).toContain(
      'Invoke the `oat-explainer-kit` adapter first, then run its shared tracked-run finalizer in `dedicated` mode for a successful build.',
    );
    expect(content).toContain(
      'Outcomes `failed` and `built-not-durable` are recorded warnings, never blockers for final HiLL approval, completion reporting, or later PR steps.',
    );
    expect(content).toContain(
      'Run this recap gate after the final code review has passed and configured pre-approval summary/document steps have completed, but before final HiLL approval.',
    );
    expect(content).toMatch(
      /construct exactly one brief-aware,\s+provider-neutral author seam/,
    );
    expect(content).toMatch(
      /In-process callers pass\s+`author`; JSON\/CLI callers pass a validated `authorModulePath`\./,
    );
    expect(content).toMatch(
      /Supply it\s+alongside the existing `critic` callback \(or validated\s+`criticModulePath`\)/,
    );
    expect(content).toMatch(
      /always invoke this implementation-tail recap with\s+`mode: unattended`\./,
    );
    expect(content).toMatch(
      /Probe seam availability before resolving intent\. Call\s+`oat-explainer-kit\/scripts\/probe-recap-seams\.mjs#probeRecapSeams` in\s+`mode: unattended`/,
    );
    expect(content).toMatch(
      /covers all five required seams — author, fact critic, browser session,\s+visual critic, and set planner/,
    );
    expect(content).toMatch(
      /a host missing only the set planner is\s+detected here instead of at the adapter's `E_SET_PLANNER_REQUIRED`/,
    );
    expect(content).toMatch(
      /In autonomy, a probe result of `seams-unavailable` means no provider is\s+configured for a required seam\. Autonomous resolution then returns a recordable\s+`skip` with source `capability_probe`: record it with the warning, do not invoke\s+the adapter, and continue closeout\./,
    );
    expect(content).toMatch(
      /Interactive closeout is unchanged: a\s+recorded interactive `generate` still attempts the recap and a run that fails\s+for a missing seam is still the `failed` outcome it is today\./,
    );
    expect(content).toMatch(
      /never blocks final HiLL approval on a missing recap, and this skip is\s+resolved before any run, never from a failed one/,
    );
    expect(content).toMatch(
      /Never convert a configured-but-invalid seam, or a run that failed after a\s+passing probe, into a skip; that run stays `failed`\./,
    );
    expect(content).toMatch(
      /A `skip` intent requires no manifest; pass its recorded source as\s+`--skip-reason` so the receipt states why no recap exists\./,
    );
    expect(content).toContain(
      'The autonomy gate and the interactive rule are two separate rules and are never read as one.',
    );
    expect(content).toMatch(
      /an interactive `generate` still attempts the run regardless of the probe result, and a seam-less interactive attempt is still the `failed` outcome it is today/,
    );
    expect(content).toMatch(
      /That probe-driven skip record supersedes the\s+intent resolved and persisted earlier in this run for the remainder of the run/,
    );
    expect(content).toMatch(
      /pass the skip — not the earlier `generate` — to\s+the terminal-outcome guard as `--intent skip --skip-reason capability_probe`/,
    );

    const normalizedContent = content.replace(/\s+/g, ' ');
    const finalReviewIndex = normalizedContent.indexOf(
      'Final review must be `passed` and the configured implementation exit gate in Step 14 must be allowed before any pre-approval dispatch.',
    );
    const preApprovalIndex = normalizedContent.indexOf(
      'Dispatch incomplete `pre_approval` steps in stored order.',
    );
    expect(finalReviewIndex).toBeGreaterThanOrEqual(0);
    expect(preApprovalIndex).toBeGreaterThan(finalReviewIndex);
    expect(content).toMatch(
      /If final checkpoint auto-review is enabled, Step 8 has\s+already run `oat-project-review-provide code final`; do not run a duplicate\s+final review here\./,
    );
  });

  it('surfaces a concise explainer outcome in project summaries', () => {
    const content = readRepoFile('.agents/skills/oat-project-summary/SKILL.md');

    expect(content).toContain('## Explainer Outcome');
    expect(content).toContain(
      'Include exactly one concise item with its recipe, state (`generated`, `degraded`, or `skipped`), and either its outcome (`built-durable`, `built-not-durable`, `built-needs-review`, or `failed`) with run path, or its skip reason.',
    );
    expect(content).toContain(
      'Use `generated` for `built-durable`, `degraded` for any other terminal outcome, and `skipped` only for a recap whose intent resolved to skip.',
    );
    expect(content).toContain(
      'Use `manifest.json` and `build-record.json` as the source of truth for a run, and the recorded recap intent for a skip; refresh the existing item instead of appending a duplicate.',
    );
    expect(content).toContain(
      'Omit `Explainer Outcome` only when no project-recap attempt and no recorded recap skip exist.',
    );
    expect(content).toContain(
      'A `capability_probe` skip means the host had no provider configured for a required seam, not that the recap failed.',
    );
    expect(content).toContain('- **project-recap:** skipped — {skip reason}');
  });

  it('allows quick/import design artifact reviews without spec.md', () => {
    const skillPath = repoFilePath(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );
    const content = readFileSync(skillPath, 'utf8');

    expect(content).toContain(
      'reviewing `design` in `quick/import` mode requires only `discovery.md`',
    );
    expect(content).toContain(
      'missing `spec.md` must not be treated as a project review gate failure for `artifact design`',
    );
    expect(content).toContain('`pNN-pMM` contiguous phase range');
    expect(content).toContain(
      'This is the canonical scope format for checkpoint auto-reviews',
    );
    expect(content).toContain(
      'For contiguous phase-range scopes (`pNN-pMM`), aggregate commit matches for each phase in the inclusive range',
    );
  });

  it('passes explicit lite review scope for artifact-plan and code-final reviews', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );
    const validation = content.slice(
      content.indexOf('### Step 2: Validate Artifacts Exist (Mode-Aware)'),
      content.indexOf('### Step 3: Determine Scope and Commits'),
    );
    const scope = content.slice(
      content.indexOf('Build the "Review Scope" metadata for the reviewer:'),
      content.indexOf('### Step 6:'),
    );

    expect(content).toContain(
      'reviewing `design` in `quick/import` mode requires only `discovery.md`',
    );
    expect(validation).toMatch(
      /`lite`:[^\n]*`plan\.md`[^\n]*`implementation\.md`/,
    );
    expect(validation).toMatch(
      /reviewing `plan` in `lite` mode requires only `plan\.md`/,
    );
    expect(scope).toContain('- Workflow mode: {WORKFLOW_MODE}');
    expect(scope).toMatch(
      /lite[\s\S]{0,500}Discovery: not required[\s\S]{0,300}Spec: not required[\s\S]{0,300}Design: not required[\s\S]{0,300}Import reference: not required/i,
    );
  });

  it('preserves narrowed-review provenance in the inline artifact template', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );
    const template =
      content.match(
        /\*\*Review artifact template:\*\*[\s\S]*?```markdown\n([\s\S]*?)\n```/,
      )?.[1] ?? '';

    for (const field of [
      'oat_review_range',
      'oat_prior_review_artifact',
      'oat_prior_review_head_sha',
    ]) {
      expect(template, `${field} in inline artifact template`).toContain(
        `${field}:`,
      );
    }
  });

  it('pins headless routing and pre-plan inheritance in review-provide', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );

    expect(content).toContain('OAT_GATE_HEADLESS=1');
    expect(content).toContain('"$OAT_GATE_CLI_PATH" gate route --json');
    expect(content).toContain(
      'value.cliRoot !== process.env.OAT_GATE_CLI_ROOT',
    );
    expect(content).toContain(
      'never retry with bare `oat` or another installed CLI',
    );
    expect(content).toContain(
      'Headless gate mode overrides the Tier 1 background-dispatch preference',
    );
    expect(content).toContain('OAT_GATE_REFUSAL: <reason from route output>');
    expect(content).toContain(
      'selection_reason: inherit (pre-plan; no project policy)',
    );
    expect(content).toMatch(
      /An explicitly set\s+project policy is always honored/,
    );
    expect(content).toMatch(
      /Code\s+reviews and `artifact plan` reviews still hard-require a resolved policy/,
    );
    expect(content).toMatch(
      /Gate exec-target selection is unaffected by this\s+inheritance rule/,
    );
  });

  it('defines auto-review checkpoint scope from the last passed whole-phase review', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );

    expect(content).toContain(
      'Count only whole-phase scopes: `pNN` or `pNN-pMM`',
    );
    expect(content).toContain(
      'Example: prior passed row `p01`, current checkpoint `p03` → review `p02-p03`',
    );
    expect(content).toContain(
      'Example: no prior passed whole-phase review, current checkpoint `p03` → review `p01-p03`',
    );
  });

  it('pins every oat-project-implement project-log append point', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const appendPoints =
      content.match(
        /## Project Log Append Points[\s\S]*?## Autonomy Policy/,
      )?.[0] ?? '';

    expect(appendPoints).toContain('oat project log append --help');
    expect(appendPoints).toContain('the helper no-ops when the feature is off');
    expect(content).toMatch(/^allowed-tools:.*Bash\(oat project log:\*\).*$/m);
    expect(appendPoints).toMatch(
      /accepted subagent dispatch[\s\S]*?generic\s+dispatch record/i,
    );
    expect(appendPoints).toContain(
      '$PROJECT_PATH/implementation.md#<run-anchor>',
    );
    expect(appendPoints).toContain('never mirror that record');
    expect(appendPoints).toContain(
      'Do not write the project log at acceptance',
    );
    expect(appendPoints).toMatch(
      /Never append while a dispatched child owns the worktree/i,
    );
    expect(appendPoints).toMatch(/STOP or park[\s\S]*?oat project log append/i);
    expect(appendPoints).toMatch(
      /phase outcome[\s\S]*?oat project log append/i,
    );
    expect(appendPoints).toMatch(
      /parallel-group merge[\s\S]*?oat project log append/i,
    );
    expect(appendPoints).toContain('fix-loop count');
  });

  it('keeps reviewer orchestration logging in root project workflows', () => {
    const implement = readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const reviewProvide = readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );

    for (const [name, content] of [
      ['project implement', implement],
      ['project review provide', reviewProvide],
    ] as const) {
      expect(content, `${name} validates orchestration evidence`).toMatch(
        /validat(?:e|es|ing)[\s\S]{0,180}review artifact[\s\S]{0,240}orchestration/i,
      );
      expect(content, `${name} appends one artifact reference`).toMatch(
        /one (?:concise )?structural (?:project-log )?entry[\s\S]{0,280}(?:review artifact|artifact path)/i,
      );
      expect(content, `${name} uses CLI-owned logging`).toContain(
        'oat project log append',
      );
    }
  });

  it('requires local and remote review rails to record the launch without a mandatory per-dispatch file', () => {
    for (const skill of [
      'oat-project-review-provide',
      'oat-project-review-provide-remote',
    ]) {
      const content = readRepoFile(`.agents/skills/${skill}/SKILL.md`);
      expect(content, skill).toMatch(/writes no launch record/i);
      expect(content, skill).toMatch(
        /(?:not|never)(?: in)?[^]{0,40}`implementation\.md`/i,
      );
      expect(content, skill).toMatch(
        /oat project dispatch record[^]{0,160}optional and off by default/i,
      );
      expect(content, skill).not.toMatch(
        /immediately after[^]{0,200}run `oat project dispatch record/i,
      );
      expect(content, skill).toMatch(
        /timeout[^]{0,160}`BLOCKED`[^]{0,180}(?:never|not)[^]{0,100}(?:fallback|replacement)/i,
      );
    }
  });

  it('materializes synced projects before implementation and review validation', () => {
    const implement = readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const reviewProvide = readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );

    for (const [name, content] of [
      ['project implement', implement],
      ['project review provide', reviewProvide],
    ] as const) {
      expect(content, `${name} pulls before validation`).toContain(
        'The pull runs before directory and `state.md` validation.',
      );
      expect(content, `${name} supports an absent synced checkout`).toContain(
        'This materializes an\nabsent synced checkout when its discovery record or remote ref exists',
      );
      expect(content, `${name} runs the adopting pull`).toContain(
        'oat project pull "$PROJECT_PATH"',
      );
    }

    expect(reviewProvide).toContain(
      'git -C "$PROJECT_PATH" status --porcelain -- discovery.md spec.md design.md plan.md implementation.md state.md',
    );
  });

  it('pins oat-project-summary project-log graduation and roll-up ordering', () => {
    const content = readRepoFile('.agents/skills/oat-project-summary/SKILL.md');
    const graduationIndex = content.indexOf(
      '### Step 2.5: Check Project Log and Offer Ledger Graduation',
    );
    const summaryAuthoringIndex = content.indexOf(
      '### Step 4: Generate / Update Summary Sections',
    );
    const rollupIndex = content.indexOf(
      '### Step 6: Roll Up Project Observations and Offer Backlog Graduation',
    );
    const learningsIndex = content.indexOf(
      '**Autonomous Execution Learnings (conditional):**',
    );
    const coexistenceIndex = content.indexOf(
      '**Workflow Observations coexistence contract:**',
    );

    expect(graduationIndex).toBeGreaterThanOrEqual(0);
    expect(summaryAuthoringIndex).toBeGreaterThan(graduationIndex);
    expect(rollupIndex).toBeGreaterThan(summaryAuthoringIndex);
    expect(coexistenceIndex).toBeGreaterThan(learningsIndex);
    expect(content).toContain(
      'oat project log check --project "$PROJECT_PATH" --json',
    );
    expect(content).toMatch(
      /Before roll-up[\s\S]*?oat project log append[\s\S]*?--scope general/i,
    );
    expect(content).toMatch(/original entry's\s+exact heading/);
    expect(content).toMatch(
      /never edit, annotate, strike through, or add\s+side metadata to the original entry/,
    );
    expect(content).toContain(
      'oat project log rollup --project "$PROJECT_PATH" --json',
    );
    expect(content).toMatch(
      /status: "failed"[\s\S]*?surface the failure[\s\S]*?stop before commit/i,
    );
    expect(content).toMatch(
      /ledgerOutcome: "skipped_permitted"[\s\S]*?proceed and report/i,
    );
    expect(content).toContain('## Workflow Observations');
    expect(content).toContain('## Autonomous Execution Learnings');
    expect(content).toContain('one-line cross-reference');
    expect(content).toContain('oat-pjm-add-backlog-item');
    expect(content).toMatch(
      /Backlog graduation creates a\s+tracked work item; it is not ledger graduation/,
    );

    const commitStep =
      content.match(/### Step 8: Commit[\s\S]*?(?=### Step 9:)/)?.[0] ?? '';
    expect(content).toContain('PROJECT_LOG_PROMOTION_APPENDED="false"');
    expect(content).toContain('PROJECT_LOG_LEDGER_APPENDED="false"');
    expect(content).toContain('oat config get workflow.projectLogLedgerPath');
    expect(commitStep).toContain('PROJECT_LOG_PROMOTION_APPENDED');
    expect(commitStep).toContain(
      'PROJECT_OUTPUT_PATHS+=("$PROJECT_PATH/project-log.md")',
    );
    expect(commitStep).toContain('PROJECT_LOG_LEDGER_APPENDED');
    expect(commitStep).toContain(
      'PARENT_OUTPUT_PATHS+=("$PROJECT_LOG_LEDGER_PATH")',
    );
  });

  it('requires workflow skills to use canonical dispatch policy choices', () => {
    const quickStartContent = readRepoFile(
      '.agents/skills/oat-project-quick-start/SKILL.md',
    );
    const implementContent = readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );

    for (const content of [quickStartContent, implementContent]) {
      expect(content).toContain(
        'oat project dispatch-ceiling choices --format markdown',
      );
      expect(content).toContain('Do not hand-type the dispatch policy menu');
      expect(content).toContain('OAT still manages dispatch selection');
      expect(content).toContain('OAT does not choose model or effort');
      expect(content).toContain('Implementation preflight must block');
      expect(content).not.toContain('Managed capped policies:');
      expect(content).not.toContain('1. Economy   ');
    }
  });

  it('uses final code review scope for final-phase HiLL auto-review', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );

    expect(content).toMatch(
      /If this is the final implementation phase checkpoint, run\s+`oat-project-review-provide code final`/,
    );
    expect(content).toMatch(
      /do not run a duplicate final\s+phase-only lifecycle\s+review/,
    );
  });

  it('keeps dispatch display human-facing while preserving parseable stamps', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );

    expect(content).toContain('Human-facing dispatch display rules');
    expect(content).toMatch(
      /Lead with route, OAT dispatch tier, requested controls, configured defaults, and runtime\s+confirmation/,
    );
    expect(content).toContain('Do not headline `producer=unknown`');
    expect(content).toContain(
      'Runtime confirmation: {observed:<slug> | declared:<slug> | not-observable | mismatch:<detail>}',
    );
    const primaryDisplaySection =
      content.match(
        /Print before phase work:[\s\S]*?### Dispatch Policy Enforcement Log/,
      )?.[0] ?? '';
    expect(primaryDisplaySection).toContain('OAT Dispatch Tier: balanced');
    expect(primaryDisplaySection).toContain(
      'OAT Dispatch Tier: {economy | balanced | high | frontier | uncapped | inherit host defaults | legacy capped}',
    );
    expect(primaryDisplaySection).not.toMatch(/^Dispatch policy:/m);
    expect(content).toContain(
      'Dispatch stamp: Dispatch: scope=<phase-or-task> action=<implementation|fix|review> role=<implementer|fix|reviewer> producer=<slug|unknown>',
    );
    expect(content).toContain(
      'Dispatch policy: {policy}; selected={selected value | none}; cap={value | none}',
    );
    expect(content).not.toContain('Producer: {slug | unknown}');
  });

  it('requires implementation and review workflows to consume Dispatch Report V1', () => {
    const skillPaths = [
      '.agents/skills/oat-project-implement/SKILL.md',
      '.agents/skills/oat-project-review-provide/SKILL.md',
      '.agents/skills/oat-project-review-provide-remote/SKILL.md',
    ];

    for (const path of skillPaths) {
      const content = readRepoFile(path);
      const invocations = actionableResolverInvocations(content);
      expect(
        invocations.length,
        `${path} actionable resolver invocations`,
      ).toBeGreaterThan(0);
      for (const invocation of invocations) {
        expectValidReportContext(invocation);
      }
      expect(content, `${path} schema version`).toContain(
        'dispatchReport.schemaVersion: 1',
      );
      expect(content, `${path} human renderer`).toContain(
        'formatDispatchReport(dispatchReport)',
      );
      expect(content, `${path} derived stamp`).toContain(
        'formatDispatchStamp(dispatchReport)',
      );
      expect(content, `${path} stamp adapter`).toContain(
        'toDispatchStampRecord(dispatchReport)',
      );
      expectDispatchStampFieldContract(content, path);
      expect(content, `${path} exact provider payload`).toContain(
        'providers.<provider>.dispatchArgs',
      );
      expect(content, `${path} exact selected target`).toContain(
        'providers.<provider>.selection.target',
      );
      expect(content, `${path} runtime identity field`).toContain(
        'dispatchReport.runtimeIdentity',
      );
      expect(content, `${path} runtime identity default`).toContain(
        'not-reported',
      );
    }

    const remote = readRepoFile(
      '.agents/skills/oat-project-review-provide-remote/SKILL.md',
    );
    expect(remote).toMatch(
      /oat gate[\s\S]{0,160}must not contain or add[\s\S]{0,120}--target/i,
    );
  });

  it('preserves remote receive ledger migrations on clean and findings paths', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-review-receive-remote/SKILL.md',
    );
    const contractStart = content.indexOf(
      '**Reviews ledger write contract (all receive paths):**',
    );
    const cleanStart = content.indexOf('If no unresolved comments:');
    const findingsStart = content.indexOf(
      '### Step 6: Update Project Artifacts',
    );
    const cleanPath = content.slice(
      cleanStart,
      content.indexOf('### Step 3: Classify and Normalize Findings'),
    );
    const findingsPath = content.slice(
      findingsStart,
      content.indexOf('### Step 6.5: Commit Review Bookkeeping'),
    );
    const contract = content
      .slice(contractStart, cleanStart)
      .replace(/\s+/g, ' ');

    expect(readDeclaredVersion(content)).toBe('1.5.2');
    expect(contractStart).toBeGreaterThanOrEqual(0);
    expect(contractStart).toBeLessThan(cleanStart);
    expect(contractStart).toBeLessThan(findingsStart);
    expect(contract).toContain(
      'Resolve `Scope`, `Type`, `Status`, `Date`, `Artifact`, `Reviewed Head`, `Invocation`, and `Gate Target` by header name',
    );
    expect(contract).toMatch(
      /legacy five columns.*add `Reviewed Head`, `Invocation`, and `Gate Target`.*pad every existing row with `-`/,
    );
    expect(contract).toContain(
      'pad a shorter row with `-` through the current header width',
    );
    expect(contract).toContain(
      'Preserve every unknown column in its original position',
    );
    expect(contract).toContain(
      'every existing known value unless the operation explicitly advances that cell',
    );
    expect(contract).toContain(
      'Never truncate a row to five, eight, or any other assumed width.',
    );
    for (const [name, path] of [
      ['clean', cleanPath],
      ['findings', findingsPath],
    ] as const) {
      expect(path, `${name} path applies shared ledger contract`).toContain(
        'Apply the Reviews ledger write contract above',
      );
    }
  });

  it('fails open remote review discovery errors without unnecessary enumeration', () => {
    const skillPaths = [
      '.agents/skills/oat-project-review-provide-remote/SKILL.md',
      '.agents/skills/oat-review-provide-remote/SKILL.md',
    ];

    for (const path of skillPaths) {
      const content = readRepoFile(path);
      const diagnosticInit = content.indexOf('REVIEWS_ERROR_FILE=""');
      const firstRedirect = content.indexOf('2>"$REVIEWS_ERROR_FILE"');
      const finallySection = content.indexOf(
        'Always release the ephemeral worktree in a `finally`',
      );
      const finalDiagnosticCleanup = content.indexOf(
        'if [[ -n "${REVIEWS_ERROR_FILE:-}" ]]',
        finallySection,
      );

      expect(
        diagnosticInit,
        `${path} diagnostic initialization exists`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        firstRedirect,
        `${path} diagnostic redirect exists`,
      ).toBeGreaterThan(diagnosticInit);
      expect(
        content.slice(diagnosticInit, firstRedirect),
        `${path} guarded diagnostic creation precedes redirect`,
      ).toContain('REVIEWS_ERROR_FILE=$(mktemp ');
      expect(content, `${path} bounded diagnostic before cleanup`).toMatch(
        /else\s+REVIEWS_DIAGNOSTIC=\$\(dd if="\$REVIEWS_ERROR_FILE" bs=500 count=1 2>\/dev\/null\)[\s\S]{0,160}rm -f -- "\$REVIEWS_ERROR_FILE"/,
      );
      expect(
        content.match(/rm -f -- "\$REVIEWS_ERROR_FILE"/g)?.length ?? 0,
        `${path} success, failure, and final cleanup`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        finalDiagnosticCleanup,
        `${path} finally cleanup follows finally contract`,
      ).toBeGreaterThan(finallySection);
      expect(content, `${path} diagnostic creation failure policy`).toMatch(
        /Do not run `gh api` when diagnostic-file creation fails[\s\S]{0,600}REVIEWS_DISCOVERY_OK=false/,
      );
      expect(content, `${path} stable discovery reason`).toContain(
        '`prior-reviews-unavailable`',
      );
      expect(content, `${path} automatic fail-open`).toMatch(
        /automatic path[\s\S]{0,180}fails open to full PR scope/i,
      );
      expect(content, `${path} forced hard error`).toMatch(
        /forced `--narrow`[\s\S]{0,180}hard error/i,
      );
      expect(content, `${path} diagnostic preservation`).toMatch(
        /preserve at most 500 bytes from stderr[\s\S]{0,240}parse error/i,
      );
      expect(content, `${path} disabled enumeration skip`).toMatch(
        /`--no-narrow`[\s\S]{0,180}skips `gh api` review enumeration entirely/i,
      );
      expect(content, `${path} preference-false enumeration skip`).toMatch(
        /only `false` forces full PR scope[\s\S]{0,120}skips `gh api` review enumeration entirely/i,
      );
      expect(content, `${path} response parsing failure`).toMatch(
        /response-level enumeration\/parsing failure/i,
      );
    }
  });

  it('dispatches concrete Cursor reviews through resolver-selected native variants', () => {
    const local = readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );
    const remote = readRepoFile(
      '.agents/skills/oat-project-review-provide-remote/SKILL.md',
    );

    for (const [name, content] of [
      ['local review', local],
      ['remote review', remote],
    ] as const) {
      expect(content, `${name} Cursor variant payload`).toContain(
        'providers.cursor.dispatchArgs.variant',
      );
      expect(content, `${name} exact native variant`).toMatch(
        /Cursor[\s\S]{0,420}exact resolver-(?:returned|selected) native reviewer variant/i,
      );
      expect(content, `${name} pre-start rejection boundary`).toMatch(
        /pre-start native role-selection rejection/i,
      );
      expect(content, `${name} no stale Cursor model argument`).not.toContain(
        'providers.cursor.dispatchArgs.model',
      );
      expect(content, `${name} no concrete base reviewer launch`).not.toContain(
        'Cursor: explicit invocation `/oat-reviewer`',
      );
    }

    expect(
      remote,
      'malformed output remains terminal after acceptance',
    ).not.toMatch(
      /malformed (?:structured )?output[\s\S]{0,160}(?:fall through|fallback|proceed|continue|route)[\s\S]{0,80}Tier [23]/i,
    );
  });

  it('keeps canonical reviewer instructions separate from native target selection', () => {
    const local = readRepoFile(
      '.agents/skills/oat-project-review-provide/SKILL.md',
    );
    const remote = readRepoFile(
      '.agents/skills/oat-project-review-provide-remote/SKILL.md',
    );

    for (const [name, content] of [
      ['local review', local],
      ['remote review', remote],
    ] as const) {
      expect(content, `${name} workflows root`).toContain(
        '${WORKFLOWS_AGENT_PROVIDER_ROOT}/agents/oat-reviewer.md',
      );
      expect(content, `${name} immutable dispatch axes`).toMatch(
        /role instructions[\s\S]{0,240}(?:must not|cannot)[\s\S]{0,180}(?:target|provider)[\s\S]{0,120}model[\s\S]{0,120}effort[\s\S]{0,120}variant/i,
      );
      expect(content, `${name} native first`).toMatch(
        /native[\s\S]{0,180}(?:variant|agent_type)[\s\S]{0,180}first/i,
      );
      expect(content, `${name} rejection-only fallback`).toMatch(
        /only[\s\S]{0,180}pre-start native role-selection rejection[\s\S]{0,240}fresh/i,
      );
    }
  });

  it('keeps implementation fallback instructions subordinate to the accepted target', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md',
    );

    expect(content).toMatch(
      /native[\s\S]{0,180}(?:variant|agent_type)[\s\S]{0,180}first/i,
    );
    expect(content).toMatch(
      /fresh child[\s\S]{0,180}only[\s\S]{0,180}pre-start native role-selection\s+rejection/i,
    );
    expect(content).toMatch(
      /role instructions[\s\S]{0,240}(?:must not|cannot)[\s\S]{0,180}(?:target|provider)[\s\S]{0,120}model[\s\S]{0,120}effort[\s\S]{0,120}variant/i,
    );
    expect(content).toMatch(
      /accepted[\s\S]{0,180}(?:continue|existing handle)[\s\S]{0,240}(?:never|must not|cannot)[\s\S]{0,120}(?:replacement|fallback|fresh child)/i,
    );
  });

  it('documents codex dispatch through resolver-returned materialized roles', () => {
    const implementerContent = readRepoFile(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const reviewerContent = readRepoFile('.agents/agents/oat-reviewer.md');
    const combined = `${implementerContent}\n${reviewerContent}`;

    for (const legacyRole of [
      'oat-phase-implementer-low',
      'oat-phase-implementer-medium',
      'oat-phase-implementer-high',
      'oat-phase-implementer-xhigh',
      'oat-reviewer-low',
      'oat-reviewer-medium',
      'oat-reviewer-high',
      'oat-reviewer-xhigh',
    ]) {
      expect(combined).not.toContain(legacyRole);
    }

    expect(combined).toContain('materialized Codex role name');
    expect(combined).toContain('providers.codex.dispatchArgs.variant');
    expect(combined).toContain('providers.codex.selection.target');
    expect(combined).toContain(
      'Use base `oat-reviewer` only when the resolver returns no `dispatchArgs.variant`',
    );
    expect(implementerContent).toMatch(
      /Use base `oat-phase-implementer` only (?:for the allowed exceptions above|when the resolver returns no `dispatchArgs\.variant`)/,
    );
    expect(combined).toContain(
      'derive `model_axis` and `effort_axis` from resolver output',
    );

    const reviewScopeBlock = implementerContent.match(
      /Include resolved dispatch context in scope packets when known:[\s\S]*?```yaml(?<scope>[\s\S]*?)```/,
    )?.groups?.scope;
    expect(reviewScopeBlock).toBeDefined();
    expect(reviewScopeBlock).toContain(
      'model_axis: { selected:<value> | inherited | not-applicable | host-auto }',
    );
    expect(reviewScopeBlock).not.toContain(
      'model_axis: {inherited | selected:<Claude model>}',
    );
    expect(implementerContent).toMatch(
      /For review dispatch:[\s\S]{0,240}providers\.codex\.dispatchArgs\.variant[\s\S]{0,160}providers\.codex\.selection\.target/,
    );

    const inheritedMaterializedCodexExamples = Array.from(
      implementerContent.matchAll(/```text\n(?<example>[\s\S]*?)\n```/g),
      (match) => match.groups?.example ?? '',
    ).filter(
      (example) =>
        /Dispatch target: oat-(?:phase-implementer|reviewer)-gpt-5-6-/.test(
          example,
        ) && example.includes('Model axis: inherited'),
    );

    expect(inheritedMaterializedCodexExamples).toEqual([]);
  });

  it('accepts a project-disabled exit gate only with null launch provenance', () => {
    const next = readRepoFile('.agents/skills/oat-project-next/SKILL.md');
    const flat = next.replace(/\s+/g, ' ');

    // The router must recognize the disposition the closeout can now persist,
    // or a deliberate project override loops the operator back to implement.
    expect(flat).toContain(
      '`allowed/configured` with `disposition: project_disabled` is the third valid combination.',
    );
    expect(flat).toContain(
      'Null gate-run and artifact provenance is required here, not merely tolerated',
    );
    expect(flat).toContain(
      '`project_override` sub-record recording the disabled value and its `state.md:oat_skill_gate_overrides` source',
    );
    expect(flat).toContain(
      'an override-era transition routes as stale and a fresh configured run is required',
    );

    // The closeout side must persist exactly what the router requires.
    const closeout = readRepoFile(
      '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    ).replace(/\s+/g, ' ');
    expect(closeout).toContain(
      'A `configured_disabled_by_project` resolution persists `allowed/configured` with `disposition: project_disabled`.',
    );
    expect(closeout).toContain('keeps `launch_state: not_started`');
  });

  it('routes phase-range review fixes into the last phase in the range', () => {
    const skillPath = repoFilePath(
      '.agents/skills/oat-project-review-receive/SKILL.md',
    );
    const content = readFileSync(skillPath, 'utf8');

    expect(content).toContain(
      'If scope is `pNN-pMM` (contiguous phase range): add fix tasks to the last phase in the range (`pMM`)',
    );
    expect(content).toContain(
      'including range review tags such as `(p02-p03-review)`',
    );
  });

  it('requires project completion to skip PR prompting when an open PR is tracked', () => {
    const skillPath = repoFilePath(
      '.agents/skills/oat-project-complete/SKILL.md',
    );
    const content = readFileSync(skillPath, 'utf8');

    expect(content).toContain('oat_pr_status');
    expect(content).toContain(
      'If `oat_pr_status` is `open`, do not ask the Open PR question',
    );
    expect(content).toContain(
      'If `oat_pr_url` is present, show it in the completion summary',
    );
  });

  it('routes synced completion through the terminal-aware entry before artifact reads', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-complete/SKILL.md',
    );
    const executor = readRepoFile(
      '.agents/skills/oat-project-complete/scripts/execute-synced-archive-entry.mjs',
    );
    const scopeIndex = content.indexOf(
      'PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value)',
    );
    const entryIndex = content.indexOf(
      'SYNCED_ARCHIVE_ENTRY=$(node "$SYNCED_ARCHIVE_EXECUTE_SCRIPT"',
    );
    const stateReadIndex = content.indexOf(
      'Before asking the batched questions, read `oat_pr_status`',
    );

    expect(scopeIndex).toBeGreaterThanOrEqual(0);
    expect(entryIndex).toBeGreaterThan(scopeIndex);
    expect(stateReadIndex).toBeGreaterThan(entryIndex);
    expect(executor).toContain("if (entry.route === 'pull')");
    expect(executor).toContain('await pullProject(projectPath);');
    expect(executor).toContain(
      "await runOat(['project', 'pull', projectPath], options.repoRoot);",
    );
    expect(executor).toContain(
      "throw executionError(`oat ${args.join(' ')} failed: ${error.message}`);",
    );
  });

  it('integrates interactive completion recap and retro policy before lifecycle mutation', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-complete/SKILL.md',
    );
    const normalizedContent = content.replace(/\s+/g, ' ');

    expect(readDeclaredVersion(content)).toBe('1.7.10');
    expect(content).toContain(
      'if [[ "$PROJECT_SCOPE" == "shared" || "$PROJECT_SCOPE" == "synced" ]]; then',
    );
    expect(content).toContain(
      'Resolve `projectRecap` intent before presenting the batched completion prompt.',
    );
    expect(content).toContain(
      'When resolution returns `needsPrompt: true`, add exactly one project-recap question to that same batched prompt',
    );
    expect(content).toContain(
      'Persist either `generate` or `skip` as the returned `interactive` record before continuing.',
    );
    expect(content).toContain(
      'A valid persisted `oat_project_recap` decision prevents another prompt.',
    );
    expect(content).toContain(
      'Preflight `{PROJECT_PATH}/references/project-retro.md` alongside the summary.',
    );
    expect(normalizedContent).toContain(
      'When the retro is missing and this completion run is interactive, add exactly one question to the batched prompt: "No project retro exists. Generate one before completing?"',
    );
    expect(normalizedContent).toContain(
      'When the retro is missing and this completion run is non-interactive, skip the offer.',
    );
    expect(content).toContain(
      'When the retro exists, never offer regeneration.',
    );
    expect(content).toContain('When `SHOULD_GENERATE_RETRO="true"`, dispatch');
    expect(normalizedContent).toContain(
      'dispatch `oat-project-retro` in generate mode before any lifecycle mutation: load the current `oat-project-retro/SKILL.md` and follow it, or dispatch a child that carries it.',
    );
    expect(content).toMatch(
      /construct exactly one brief-aware, provider-neutral\s+author seam/,
    );
    expect(content).toMatch(
      /In-process callers pass\s+`author`; JSON\/CLI callers pass a validated `authorModulePath`\./,
    );
    expect(content).toMatch(
      /Supply it\s+alongside the existing `critic` callback \(or validated\s+`criticModulePath`\)/,
    );
    expect(content).toMatch(/invoke the recap with `mode: unattended`\./);
    expect(content).toMatch(
      /If no fresh recap exists, probe seam availability before invoking the adapter\.\s+Call `oat-explainer-kit\/scripts\/probe-recap-seams\.mjs#probeRecapSeams` in\s+`mode: unattended`/,
    );
    expect(content).toMatch(
      /covers all five required seams — author, fact critic, browser session,\s+visual critic, and set planner/,
    );
    expect(content).toMatch(
      /In autonomy, a probe result of `seams-unavailable` means no provider is\s+configured for a required seam\. Autonomous resolution then returns a recordable\s+`skip` with source `capability_probe`: record it with the warning, leave\s+`SELECTED_PROJECT_RECAP_RUN` empty, and complete without a recap\./,
    );
    expect(content).toMatch(
      /An interactive\s+completion is unchanged: the decision recorded at the batched prompt governs, a\s+recorded `generate` still attempts the recap, and a run that fails for a missing\s+seam is still the `failed` outcome it is today\./,
    );
    expect(content).toMatch(
      /Never convert a\s+configured-but-invalid seam, or a run that failed after a passing probe, into a\s+skip; that run stays `failed`\./,
    );
    expect(content).toMatch(
      /This covers both an interactive skip and a\s+probe-driven `capability_probe` skip; neither prompts, and neither blocks\s+completion\./,
    );
    expect(content).toContain(
      'The autonomy gate and the interactive rule are two separate rules and are never read as one.',
    );
    expect(content).toMatch(
      /In autonomy, attempt the adapter run exactly once and only when the probe resolves every seam; an interactive `generate` still attempts the run regardless of the probe result/,
    );
    expect(content).toMatch(
      /When the gate above allows the attempt, invoke `scripts\/run\.mjs#runOatExplainer` exactly once with recipe `project-recap`/,
    );
    expect(content).toMatch(
      /That\s+probe-driven skip record supersedes the intent resolved and persisted earlier in\s+this run for the remainder of the run/,
    );
    expect(content).toMatch(
      /treat any `SHOULD_GENERATE_RECAP="true"` set from the earlier resolution as\s+stale, and pass the skip — not the earlier `generate` — to the terminal-outcome\s+guard as `--intent skip --skip-reason capability_probe`/,
    );

    const resolveIndex = normalizedContent.indexOf(
      'Resolve `projectRecap` intent before presenting the batched completion prompt.',
    );
    const recapIndex = normalizedContent.indexOf(
      '### Step 3.6: Select Final Project Recap',
    );
    const retroIndex = normalizedContent.indexOf(
      '### Step 3.5.5: Retro Safety-Net',
    );
    const completeStateIndex = normalizedContent.indexOf(
      '### Step 5: Set Lifecycle Complete',
    );
    expect(resolveIndex).toBeGreaterThanOrEqual(0);
    expect(retroIndex).toBeGreaterThan(resolveIndex);
    expect(recapIndex).toBeGreaterThan(resolveIndex);
    expect(recapIndex).toBeGreaterThan(retroIndex);
    expect(completeStateIndex).toBeGreaterThan(recapIndex);
  });

  it('selects and archives only the final shared-project recap', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-complete/SKILL.md',
    );

    expect(content).toContain(
      'A fresh `project-recap` manifest for the current completed implementation is reused without invoking the adapter again.',
    );
    expect(content).toContain(
      'Set `SELECTED_PROJECT_RECAP_RUN` only to the final selected `project-recap` run.',
    );
    expect(content).toContain('ARCHIVE_ARGS=("$PROJECT_PATH")');
    expect(content).toContain(
      'ARCHIVE_ARGS+=("--project-recap-run" "$SELECTED_PROJECT_RECAP_RUN")',
    );
    expect(content).toContain(
      'Never add `--project-recap-run` when `SELECTED_PROJECT_RECAP_RUN` is empty.',
    );
    expect(content).toContain(
      '`project-explainer` runs are active-project working artifacts, not durable post-completion reference products.',
    );
    expect(content).toContain(
      'Do not export, re-attest, or add archive-aware PR or summary reference links for a `project-explainer` run.',
    );
  });

  it('keeps local completion recaps outside tracked archive durability', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-complete/SKILL.md',
    );

    expect(content).toContain(
      'For `IS_DURABLE_PROJECT="false"`, never export a tracked project recap and never construct or pass `--project-recap-run`.',
    );
    expect(content).toContain(
      'A local-scope recap remains `built-not-durable` unless its manifest already contains independently verified publish evidence.',
    );
    expect(content).toContain(
      'Do not treat local filesystem presence as durability.',
    );
  });

  it('delegates project completion state mutation to the CLI command', () => {
    const skillPath = repoFilePath(
      '.agents/skills/oat-project-complete/SKILL.md',
    );
    const content = readFileSync(skillPath, 'utf8');

    expect(content).toContain(
      'oat project complete-state "${COMPLETE_STATE_ARGS[@]}"',
    );
    expect(content).toContain(
      'The CLI command owns both the frontmatter completion fields and the canonical markdown body updates for `state.md`.',
    );
    expect(content).not.toContain(
      'sed \'s/^oat_lifecycle:.*/oat_lifecycle: complete/\' "$STATE_FILE" > "$STATE_FILE.tmp"',
    );
  });

  it('pins project-log roll-up and seal before lifecycle completion and archive', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-complete/SKILL.md',
    );
    const checkIndex = content.indexOf(
      'oat project log check --project "$PROJECT_PATH" --json',
    );
    const rollupIndex = content.indexOf(
      'oat project log rollup --project "$PROJECT_PATH" --json',
    );
    const sealIndex = content.indexOf(
      '--producer oat-project-complete \\\n  --ref seal',
    );
    const completeStateIndex = content.indexOf(
      'oat project complete-state "${COMPLETE_STATE_ARGS[@]}"',
    );
    const archiveIndex = content.indexOf(
      'ARCHIVE_OUTPUT=$(oat project archive "${ARCHIVE_ARGS[@]}" --json 2>&1)',
    );

    expect(checkIndex).toBeGreaterThanOrEqual(0);
    expect(rollupIndex).toBeGreaterThan(checkIndex);
    expect(sealIndex).toBeGreaterThan(rollupIndex);
    expect(completeStateIndex).toBeGreaterThan(sealIndex);
    expect(archiveIndex).toBeGreaterThan(completeStateIndex);
    expect(content).toMatch(
      /synthesisPending: true[\s\S]*?Warning:[\s\S]*?do not block completion/i,
    );
    expect(content).toContain('Synthesis is warn-only');
    expect(content).toMatch(
      /Do not set lifecycle complete, seal, or archive unless[\s\S]*?status: "ok"/,
    );
    expect(content).toMatch(
      /ledgerOutcome: "skipped_permitted"[\s\S]*?proceed and report/,
    );
    expect(content).toMatch(
      /status: "failed"[\s\S]*?stop and surface the roll-up failure[\s\S]*?Never continue to seal or\s+archive/,
    );
    expect(content).toContain('No project-log append may follow the seal');
  });

  it('records absorbed project slugs and backlog IDs at quick-start consolidation', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-quick-start/SKILL.md',
    );

    const consolidationIndex = content.indexOf(
      '**Consolidating earlier scaffolds.**',
    );
    const stepOneIndex = content.indexOf(
      '### Step 1: Set Quick Workflow Metadata',
    );

    expect(consolidationIndex).toBeGreaterThanOrEqual(0);
    expect(stepOneIndex).toBeGreaterThan(consolidationIndex);

    const branch = content
      .slice(consolidationIndex, stepOneIndex)
      .replace(/\s+/g, ' ');

    expect(branch).toContain('absorbed_projects: [<slug>]');
    expect(branch).toContain('absorbed_backlog_ids: [<BL-id>]');
    expect(branch).toContain('"$PROJECT_PATH/state.md"` frontmatter');
    expect(branch, 'names the retired scaffold directories').toMatch(
      /names the scaffold directory[\s\S]{0,120}supersedes/i,
    );
    expect(branch, 'consolidation is conditional, not unconditional').toContain(
      'only when a consolidation actually happened',
    );
    expect(branch, 'the two fields are the sweep inputs').toContain(
      'only inputs the absorbed-project retirement sweep reads at completion',
    );
    expect(branch, 'retirement is semantic, not physical').toContain(
      'semantic claim about the planning surfaces rather than the physical removal of a directory',
    );
  });

  it('sweeps and dispositions absorbed ownership before the project-log roll-up and seal', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-complete/SKILL.md',
    );

    const checkIndex = content.indexOf(
      'oat project log check --project "$PROJECT_PATH" --json',
    );
    const sweepIndex = content.indexOf(
      '**Absorbed-project retirement sweep.**',
    );
    const rollupIndex = content.indexOf(
      'oat project log rollup --project "$PROJECT_PATH" --json',
    );
    const sealIndex = content.indexOf(
      '--producer oat-project-complete \\\n  --ref seal',
    );
    const completeStateIndex = content.indexOf(
      'oat project complete-state "${COMPLETE_STATE_ARGS[@]}"',
    );
    const archiveIndex = content.indexOf(
      'ARCHIVE_OUTPUT=$(oat project archive "${ARCHIVE_ARGS[@]}" --json 2>&1)',
    );

    expect(checkIndex).toBeGreaterThanOrEqual(0);
    expect(
      sweepIndex,
      'the sweep runs after the status probe it depends on',
    ).toBeGreaterThan(checkIndex);
    expect(rollupIndex).toBeGreaterThan(sweepIndex);
    expect(sealIndex).toBeGreaterThan(rollupIndex);
    expect(completeStateIndex).toBeGreaterThan(sealIndex);
    expect(archiveIndex).toBeGreaterThan(completeStateIndex);

    const sweep = content.slice(sweepIndex, rollupIndex).replace(/\s+/g, ' ');

    expect(sweep, 'reads both recorded inputs').toContain(
      'read `absorbed_projects` and `absorbed_backlog_ids` from',
    );
    expect(sweep, 'those two fields are the only inputs').toContain(
      'These two fields are the only inputs the sweep takes',
    );
    expect(sweep, 'degrades without PJM adoption').toContain(
      'adoption.state` other than `declared` or `inferred-legacy`',
    );
    expect(sweep, 'a missing surface never fails closeout').toContain(
      'degrades this sweep and never fails closeout',
    );
    expect(sweep, 'advisory, not a mechanical block').toContain(
      'advisory: a raw match is never a hard block on closeout',
    );

    for (const surface of [
      '.oat/repo/pjm/roadmap.md',
      '.oat/repo/pjm/current-state.md',
      '.oat/repo/pjm/backlog/index.md',
      '.oat/projects/*/*/state.md',
    ]) {
      expect(sweep, `sweeps ${surface}`).toContain(surface);
    }

    expect(
      sweep,
      'the project glob matches the real scope-nested layout',
    ).toContain(
      'scope-nested as `<projects-root-parent>/<scope>/<project>/state.md`',
    );
    expect(
      sweep,
      'the configured projects root is resolved, not hardcoded',
    ).toContain('oat config get projects.root');
    expect(sweep, 'the archive tree is excluded').toContain(
      'Skip the sibling `archived` tree',
    );
    expect(
      sweep,
      'terminal projects in an active scope are not live claims',
    ).toContain('already records a terminal `oat_lifecycle: complete`');
    expect(sweep, 'searches per slug and per backlog ID').toContain(
      'For each absorbed slug and each absorbed backlog ID',
    );
    expect(sweep, 'matches future-oriented ownership language').toContain(
      'Match a slug or backlog ID only where it carries future-oriented ownership language',
    );
    expect(sweep, 'a bare mention is not a finding').toContain(
      'A bare mention that makes no such claim is not a finding',
    );
    expect(
      sweep,
      "the completing project's own recorded fields are input, never a finding",
    ).toContain(
      "The completing project's own `absorbed_projects` and `absorbed_backlog_ids` fields are the sweep's input, never a finding",
    );
    expect(sweep, 'names what a stale ownership claim looks like').toContain(
      'still claims the absorbed work as planned, owned, scheduled, or in flight',
    );
    expect(sweep, 'historical prose is exempt').toContain(
      'clearly describes past state is exempt',
    );
    expect(sweep, 'each finding carries a disposition').toContain(
      'named finding carrying a recorded disposition',
    );
    expect(sweep, 'both in-run dispositions are named').toMatch(
      /either fixed now[\s\S]{0,140}accepted as historical/i,
    );
    expect(sweep, 'dispositions are appended before the roll-up').toContain(
      'Append the dispositions to the project log before the roll-up runs',
    );
    expect(sweep, 'sweep appends are structural log entries').toContain(
      '--producer oat-project-complete \\ --ref retirement-sweep',
    );
    expect(sweep, 'summary regenerates before the roll-up').toContain(
      'regenerate the summary before the roll-up',
    );
    expect(sweep, 'autonomous completion warns and continues').toContain(
      'advisory warning entry with the disposition `deferred advisory` and continue',
    );
    expect(sweep, 'an absent log is reported, never created').toContain(
      'never create a project log for them',
    );
  });

  it('never appends retirement findings after an existing seal on resume', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-complete/SKILL.md',
    );

    const sweepIndex = content.indexOf(
      '**Absorbed-project retirement sweep.**',
    );
    const rollupIndex = content.indexOf(
      'oat project log rollup --project "$PROJECT_PATH" --json',
    );
    const resumeIndex = content.indexOf(
      '**Resumed completion whose log already carries a seal.**',
    );

    expect(sweepIndex).toBeGreaterThanOrEqual(0);
    expect(
      resumeIndex,
      'the resume clause sits inside the sweep, before the roll-up',
    ).toBeGreaterThan(sweepIndex);
    expect(resumeIndex).toBeLessThan(rollupIndex);

    const resumeClause = content
      .slice(resumeIndex, rollupIndex)
      .replace(/\s+/g, ' ');

    expect(
      resumeClause,
      'the seal is read from the probe, not grepped out of the log file',
    ).toContain('`sealed: true` in `PROJECT_LOG_CHECK`');
    expect(
      resumeClause,
      'the standing claim names the code that owns it (DR-260906)',
    ).toContain('`oat project log check`');
    expect(
      resumeClause,
      'a seal written before the keyed convention is still recognized',
    ).toContain('recognized the same way');
    expect(
      resumeClause,
      'the model is not told to re-read the log to find the seal',
    ).not.toContain('read `logPath` from `PROJECT_LOG_CHECK`');
    expect(
      resumeClause,
      'the grep-for-heading workaround is gone',
    ).not.toContain('### <date> · structural · oat-project-complete · seal');
    expect(
      resumeClause,
      'the invariant is enforced by the CLI, not only by this prose',
    ).toContain('status: "sealed"');
    expect(resumeClause, 'report-only on a sealed log').toContain(
      'runs in report-only mode',
    );
    expect(resumeClause, 'appends nothing to a sealed log').toContain(
      'append nothing to the sealed log',
    );
    expect(resumeClause, 'never re-enters the roll-up or seal').toContain(
      'never re-enter the roll-up or the seal',
    );
    expect(
      resumeClause,
      'the resume clause itself restates the no-post-seal invariant',
    ).toContain('No project-log append may follow the seal');
  });

  it('keys the completion seal append so a replay cannot write a second seal', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-complete/SKILL.md',
    );

    const sealAppendIndex = content.indexOf('--ref seal \\');
    expect(sealAppendIndex).toBeGreaterThanOrEqual(0);

    const sealAppend = content.slice(
      sealAppendIndex,
      content.indexOf('```', sealAppendIndex),
    );

    expect(sealAppend, 'the seal append carries a stable key').toContain(
      '--idempotency-key "oat-seal:$PROJECT_NAME"',
    );

    const bodyLine = sealAppend
      .split('\n')
      .find((line) => line.includes('--body'));
    expect(bodyLine).toBeDefined();

    // The body as the shell passes it, without the surrounding quotes.
    const bodyValue = /--body "(.*)"\s*$/.exec(bodyLine!)?.[1];
    expect(
      bodyValue,
      'the --body argument is a single quoted string',
    ).toBeDefined();

    // The key must be its own whitespace-delimited word: the command records
    // the whole word carrying the key, so a key fused to the varying timestamp
    // never matches its own earlier append and writes a second seal.
    expect(
      bodyValue!.split(/\s+/),
      'the key stands alone as a word in --body',
    ).toContain('oat-seal:$PROJECT_NAME');

    expect(
      content,
      'a sealed log skips the seal append rather than replaying it',
    ).toContain('did not report\n`sealed: true`');
  });

  it('routes the summary ledger graduation around a sealed project log', () => {
    const content = readRepoFile('.agents/skills/oat-project-summary/SKILL.md');

    const probeIndex = content.indexOf(
      'PROJECT_LOG_CHECK=$(oat project log check',
    );
    const graduationIndex = content.indexOf(
      'Before roll-up, inspect `project`-scoped judgments',
    );
    expect(probeIndex).toBeGreaterThanOrEqual(0);
    expect(graduationIndex).toBeGreaterThan(probeIndex);

    const routing = content.slice(probeIndex, graduationIndex);

    expect(routing, 'the summary flow routes on the probe field').toContain(
      '`sealed: true`',
    );
    expect(
      routing,
      'a sealed log skips ledger graduation instead of attempting it',
    ).toContain('Skip the ledger graduation');
    expect(
      routing,
      'the skip is backed by the CLI refusal, not only by convention',
    ).toContain('status: "sealed"');
  });

  it('delegates project completion archive side effects to the CLI command', () => {
    const skillPath = repoFilePath(
      '.agents/skills/oat-project-complete/SKILL.md',
    );
    const content = readFileSync(skillPath, 'utf8');

    const step7Index = content.indexOf('### Step 7: Generate PR Description');
    const step8Index = content.indexOf(
      '### Step 8: Archive Project (Conditional)',
    );
    const step10Index = content.indexOf(
      '### Step 10: Commit + Push Bookkeeping (Required)',
    );

    expect(step7Index).toBeGreaterThanOrEqual(0);
    expect(step8Index).toBeGreaterThan(step7Index);
    expect(step10Index).toBeGreaterThan(step8Index);

    expect(content).toContain(
      '**Skip if `SHOULD_ARCHIVE` is false or `IS_DURABLE_PROJECT` is false.**',
    );
    expect(content).toContain(
      'Archive happens after PR description generation. For a synced project, the',
    );
    expect(content).toContain(
      'archive command owns the exact lifecycle commit that deletes the discovery',
    );
    expect(content).toContain(
      'The archive-side effects in this step are CLI-owned. Do not reimplement local archive movement, summary export, S3 sync, AWS credential handling, or worktree durability checks in the skill.',
    );
    expect(content).toContain('oat project archive "$PROJECT_PATH"');
    expect(content).toContain('PROJECT_PATH="$ARCHIVE_PATH"');

    expect(content).not.toContain('ARCHIVE_RELATIVE_PATH');
    expect(content).not.toContain('mv "$PROJECT_PATH"');
    expect(content).not.toContain('aws s3 sync');
    expect(content).not.toContain(
      'git check-ignore --quiet --no-index "$ARCHIVE_RELATIVE_PATH"',
    );
    expect(content).not.toContain(
      'If running from a git worktree, the primary repo archive directory is the canonical/durable archive destination.',
    );
    expect(content).toContain(
      'Use `ARCHIVE_S3_CONTEXT` in Step 12 if the command reports profile/region details.',
    );
  });

  it.each([
    ['configured archive decline', 'workflow.archiveOnComplete=false'],
    [
      'interactive archive decline',
      'the interactive archive answer is `false`',
    ],
  ])(
    'completes synced projects without archiving after %s',
    (_scenario, archiveDecision) => {
      const content = readRepoFile(
        '.agents/skills/oat-project-complete/SKILL.md',
      );
      const normalizedContent = content.replace(/\s+/g, ' ');

      expect(normalizedContent).toContain(archiveDecision);
      expect(normalizedContent).toContain(
        '### Step 8.7: Non-Archive Synced Completion Transaction',
      );
      expect(normalizedContent).toContain(
        'Mark the discovery record `complete` with `completedAt` using a structured JSON write',
      );
      expect(normalizedContent).toMatch(
        /commit only `SYNCED_RECORD_PATH` on the parent branch/i,
      );
      expect(normalizedContent).toContain(
        'The retained project ref remains the artifact authority after non-archive completion.',
      );
      expect(normalizedContent).toMatch(
        /On retry,[\s\S]*?already-complete record[\s\S]*?final artifact push receipt/,
      );
    },
  );

  it.each([
    ['archive enabled', 'true', '', 'skip'],
    ['configured archive decline', 'false', '', 'push'],
    ['interactive archive decline', 'false', '', 'push'],
    ['final receipt already captured', 'false', 'a'.repeat(40), 'skip'],
  ])(
    'executes the final synced project push guard for %s',
    (_scenario, shouldArchive, projectRefCommit, expected) => {
      const content = readRepoFile(
        '.agents/skills/oat-project-complete/SKILL.md',
      );

      expect(
        executeFinalProjectPushGuard(
          content,
          'synced',
          shouldArchive,
          projectRefCommit,
        ),
      ).toBe(expected);
    },
  );

  it('recovers exact non-archive recap receipts through the executable completion surface', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-complete/SKILL.md',
    );
    const normalizedContent = content.replace(/\s+/g, ' ');
    const retryRouterIndex = content.indexOf(
      'COMPLETION_RETRY_JSON=$(node "$COMPLETION_RETRY_SCRIPT"',
    );
    const retryDecoderIndex = content.indexOf(
      'COMPLETION_RETRY_FIELDS=$(node "$COMPLETION_RETRY_FIELDS_SCRIPT"',
    );
    const retryRouteReadIndex = content.indexOf(
      "IFS=$'\\t' read -r COMPLETION_RETRY_ROUTE _",
    );
    const recoveryBranchIndex = content.indexOf(
      'if [[ "$COMPLETION_RETRY_ROUTE" == "recovery" ]]',
    );
    const recoveryFieldReadIndex = content.indexOf(
      "IFS=$'\\t' read -r COMPLETION_RETRY_ROUTE PROJECT_LINKS_PIN_COMMIT",
    );
    const finalLinksIndex = content.indexOf(
      '#### Step 8.6: Render Final Synced Project Links',
    );

    expect(normalizedContent).toContain(
      '`scripts/recover-completion-receipts.mjs#resolveCompletionArchiveDecision`',
    );
    expect(normalizedContent).toContain(
      'For a local project, pass the explicit `localNonArchive=true` decision without asking the archive question.',
    );
    expect(content).toContain(
      'ARCHIVE_DECISION_ARGS+=(--local-nonarchive true)',
    );
    expect(content).toContain(
      'EXPECTED_ARCHIVE_DECISION_SOURCE="local-default"',
    );
    expect(content).toContain(
      'COMPLETION_RECEIPT_SCRIPT="$SKILL_DIR/scripts/recover-completion-receipts.mjs"',
    );
    expect(content).toContain(
      'COMPLETION_RETRY_SCRIPT="$SKILL_DIR/scripts/resolve-completion-retry.mjs"',
    );
    expect(content).toContain(
      'COMPLETION_RETRY_FIELDS_SCRIPT="$SKILL_DIR/scripts/parse-completion-retry-fields.mjs"',
    );
    expect(content).toContain(
      'ARCHIVE_DECISION_JSON=$(node "$COMPLETION_RECEIPT_SCRIPT"',
    );
    expect(content).not.toContain('--detect-candidate true');
    expect(retryRouterIndex).toBeGreaterThan(-1);
    expect(retryDecoderIndex).toBeGreaterThan(retryRouterIndex);
    expect(retryRouteReadIndex).toBeGreaterThan(retryDecoderIndex);
    expect(recoveryBranchIndex).toBeGreaterThan(retryRouteReadIndex);
    expect(recoveryFieldReadIndex).toBeGreaterThan(recoveryBranchIndex);
    expect(retryRouterIndex).toBeLessThan(
      content.indexOf('PROJECT_LOG_CHECK=$(oat project log check'),
    );
    expect(normalizedContent).toContain(
      'This is the one executable routing surface; do not recreate candidate detection and recovery as separate shell branches',
    );
    expect(normalizedContent).toContain(
      'The executable transaction matrix must use this same router for all configured and interactive interruption rows.',
    );
    expect(normalizedContent).toContain(
      'Jump directly to Step 7.5 and skip every mutation in Steps 3.7 through 7.',
    );
    expect(normalizedContent).toContain(
      'When it is `route: "pin-source"`, the executable has validated the already-published pin-source tree and PR artifact',
    );
    expect(normalizedContent).toContain(
      'jump directly to Step 8.6, and skip Steps 3.7 through 7, including a duplicate pin-source push.',
    );
    expect(finalLinksIndex).toBeGreaterThan(
      content.indexOf('#### Step 7.5: Publish Synced Project Pin Source'),
    );
    expect(normalizedContent).toContain(
      'single-parent pin-source → final-artifact → optional evidence ordering',
    );
    expect(normalizedContent).toContain(
      'exactly the two supplied recap record paths in an evidence commit',
    );
    expect(normalizedContent).toContain(
      'the one allowed unpublished-evidence state',
    );
    expect(normalizedContent).toContain(
      'Do not fall through to a new pin-source publication after a partial or contradictory candidate.',
    );
    expect(normalizedContent).toContain(
      'receipt SHA exactly equal to `EVIDENCE_COMMIT`',
    );
    expect(content).toContain('"$COMPLETION_RETRY_FIELDS" != "normal"');
    expect(content).not.toContain('["normal", "-", "-", "-", "false", "-"]');
    expect(content).toContain(
      'PUBLISHED_RECOVERY_JSON=$(node "$COMPLETION_RECEIPT_SCRIPT"',
    );
    expect(content).toContain(
      'test "$RECOVERED_PUSH_SHA" = "$EVIDENCE_COMMIT" || exit 1',
    );
    expect(normalizedContent).toContain(
      'When Step 7.5 restored `EVIDENCE_COMMIT` for a non-archive completion, do not stage or commit recap records again.',
    );
    expect(content).toContain(
      'git commit --only -m "chore(oat): attest final project recap" --',
    );
    expect(content).toContain('git -C "$ACTIVE_PROJECT_PATH" commit --only');
    expect(content).toContain(
      'test "$(git diff --cached --binary)" = "$UNRELATED_STAGED_PATCH_BEFORE"',
    );
  });

  it('chains and validates fresh non-archive lifecycle receipts', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-complete/SKILL.md',
    );
    const step10 = content.slice(
      content.indexOf('### Step 10: Commit + Push Bookkeeping (Required)'),
      content.indexOf('### Step 10.5: Re-attest Final Project Recap'),
    );

    expect(step10).toMatch(
      /git commit --only "\$SYNCED_RECORD_PATH"[\s\S]*?&&\s+LIFECYCLE_COMMIT=\$\(git rev-parse HEAD\) &&\s+node "\$NONARCHIVE_LIFECYCLE_RECEIPT_SCRIPT"[\s\S]*?\|\| exit 1/,
    );
    expect(step10).toMatch(
      /ancestor[\s\S]*?changes exactly `SYNCED_RECORD_PATH`[\s\S]*?byte-identical complete record/,
    );
    expect(step10).toMatch(
      /a\s+failed commit or hook must not reuse the prior `HEAD` as a receipt/i,
    );
  });

  it.each([
    ['without a selected recap', 'SELECTED_PROJECT_RECAP_RUN is empty'],
    ['with a selected recap', 'SELECTED_PROJECT_RECAP_RUN is non-empty'],
  ])(
    'uses the correct non-archive synced receipts %s',
    (_scenario, recapState) => {
      const content = readRepoFile(
        '.agents/skills/oat-project-complete/SKILL.md',
      );
      const normalizedContent = content.replace(/\s+/g, ' ');

      expect(normalizedContent).toContain(recapState);
      expect(normalizedContent).toContain(
        'Capture the exact structured receipt SHA as `PROJECT_LINKS_PIN_COMMIT`.',
      );
      expect(normalizedContent).toContain(
        'Capture that exact SHA as `PROJECT_REF_COMMIT`.',
      );
      expect(normalizedContent).toContain(
        'Use `PROJECT_REF_COMMIT`, not the parent-branch `LIFECYCLE_COMMIT`, as the active recap artifact commit.',
      );
      expect(normalizedContent).toContain(
        'The non-archive recap evidence commit must be the immediate child of `PROJECT_REF_COMMIT` in the project checkout.',
      );
      expect(normalizedContent).toMatch(
        /publish the evidence commit with `oat project push`, retaining the custom ref and checkout\./i,
      );
      expect(normalizedContent).toMatch(
        /Snapshot unrelated staged state[\s\S]*?verify[\s\S]*?byte-for-byte unchanged/,
      );
    },
  );

  it.each([
    [
      'configured decline without a recap',
      'workflow.archiveOnComplete=false',
      'SELECTED_PROJECT_RECAP_RUN is empty',
    ],
    [
      'configured decline with a recap',
      'workflow.archiveOnComplete=false',
      'SELECTED_PROJECT_RECAP_RUN is non-empty',
    ],
    [
      'interactive decline without a recap',
      'the interactive archive answer is `false`',
      'SELECTED_PROJECT_RECAP_RUN is empty',
    ],
    [
      'interactive decline with a recap',
      'the interactive archive answer is `false`',
      'SELECTED_PROJECT_RECAP_RUN is non-empty',
    ],
  ])(
    'publishes an initially absent late PR artifact after %s',
    (_scenario, archiveDecision, recapState) => {
      const content = readRepoFile(
        '.agents/skills/oat-project-complete/SKILL.md',
      );
      const normalizedContent = content.replace(/\s+/g, ' ');
      const stepFiveIndex = content.indexOf(
        '### Step 5: Set Lifecycle Complete',
      );
      const stepSevenIndex = content.indexOf(
        '### Step 7: Generate PR Description',
      );
      const writeArtifactIndex = content.indexOf(
        '**Write PR description artifact**',
        stepSevenIndex,
      );
      const finalPublicationIndex = content.indexOf(
        '#### Step 7.5: Publish Synced Project Pin Source',
      );
      const pinSourcePushIndex = content.indexOf(
        'PROJECT_PUSH_OUTPUT=$(oat project push "$PROJECT_PATH"',
      );
      const finalLinksIndex = content.indexOf(
        '#### Step 8.6: Render Final Synced Project Links',
      );
      const finalArtifactPushIndex = content.indexOf(
        'FINAL_PROJECT_PUSH_OUTPUT=$(oat project push',
      );
      const nonArchiveTransactionIndex = content.indexOf(
        '### Step 8.7: Non-Archive Synced Completion Transaction',
      );

      expect(normalizedContent).toContain(archiveDecision);
      expect(normalizedContent).toContain(recapState);
      expect(normalizedContent).toContain(
        'When no PR description artifact exists, write it before the final synced project-ref publication, regardless of archive or recap selection.',
      );
      expect(normalizedContent).toContain(
        'Keep it separate from the final non-archive artifact receipt',
      );
      expect(normalizedContent).toContain(
        'render this block in the active PR-description artifact before the push whose receipt becomes `PROJECT_REF_COMMIT`.',
      );
      expect(finalPublicationIndex).toBeGreaterThan(writeArtifactIndex);
      expect(pinSourcePushIndex).toBeGreaterThan(finalPublicationIndex);
      expect(finalLinksIndex).toBeGreaterThan(pinSourcePushIndex);
      expect(finalArtifactPushIndex).toBeGreaterThan(finalLinksIndex);
      expect(nonArchiveTransactionIndex).toBeGreaterThan(
        finalArtifactPushIndex,
      );
      expect(content.slice(stepFiveIndex, stepSevenIndex)).not.toContain(
        'PROJECT_PUSH_OUTPUT=$(oat project push',
      );
    },
  );

  it('defines runtime-safe summary handling during pr-final and completion', () => {
    const prFinalPath = repoFilePath(
      '.agents/skills/oat-project-pr-final/SKILL.md',
    );
    const completePath = repoFilePath(
      '.agents/skills/oat-project-complete/SKILL.md',
    );

    const prFinalContent = readFileSync(prFinalPath, 'utf8');
    const completeContent = readFileSync(completePath, 'utf8');

    expect(prFinalContent).toContain(
      'If `summary.md` is missing or stale, refresh it automatically before proceeding.',
    );
    expect(prFinalContent).toContain(
      'When skill-to-skill invocation is available in the current host/runtime, load the current `oat-project-summary/SKILL.md` and follow it;',
    );
    expect(prFinalContent).toContain(
      'Do not assume `oat-project-summary` is a shell command on `PATH`.',
    );
    expect(prFinalContent).toContain(
      'Do not ask whether to generate or refresh `summary.md` during pr-final.',
    );
    expect(completeContent).toContain(
      'Also preflight summary status using the same freshness rules as `oat-project-summary`, read from the current `oat-project-summary/SKILL.md` rather than a remembered version of that step:',
    );
    expect(completeContent).toContain(
      'Would you like me to generate it now as part of completion?',
    );
    expect(completeContent).toContain('SHOULD_GENERATE_SUMMARY');
    expect(completeContent).toContain(
      'If `summary.md` is missing or stale and `SHOULD_GENERATE_SUMMARY="true"`, generate or refresh it before completing.',
    );
    expect(completeContent).toContain(
      'Do not assume `oat-project-summary` is a shell command on `PATH`.',
    );
    expect(completeContent).toContain(
      'Warning: Proceeding without summary generation.',
    );
  });

  // Step 0.5 is prose the executing agent follows; it has no bash block to run,
  // so these three cases pin the wording of that contract. The executable
  // control for this plan is the ledger-path guard case below, which runs the
  // skill's own block.
  it('archives only terminal review artifacts during pr-final preflight', () => {
    const prFinal = readRepoFile(
      '.agents/skills/oat-project-pr-final/SKILL.md',
    );
    const stepZeroFive = prFinal.slice(
      prFinal.indexOf('### Step 0.5: Archive Residual Active Review Artifacts'),
      prFinal.indexOf('### Step 1: Validate Required Artifacts (Mode-Aware)'),
    );

    // Eligibility is a predicate over the binding ledger event, not "every
    // file in reviews/". The old rule moved a late final-review artifact that
    // Step 2 had not consumed yet.
    expect(stepZeroFive).toContain(
      'An artifact is archive-eligible only when the `## Reviews` event that binds it — matched by `Scope` + `Type` + `Artifact` filename — has Status `passed` or `fixes_completed`.',
    );
    expect(stepZeroFive).toContain(
      'A `pending`, `received`, or `fixes_added` event is still being consumed: leave its artifact in the top level of `reviews/` and report it.',
    );
    expect(stepZeroFive).toContain(
      'Leave a top-level artifact that no ledger event binds in place and report it too.',
    );
    expect(stepZeroFive).not.toContain(
      'Move each review artifact into `reviews/archived/`',
    );

    // Event selection by identity, so duplicate scope/type rows keep theirs.
    expect(stepZeroFive).toContain(
      "select the ledger event by `Scope` + `Type` + `Artifact` filename and rewrite only that event's Artifact cell",
    );
    expect(stepZeroFive).toContain(
      'never rewrite a sibling row that merely shares the scope and type',
    );

    // The enumerated rewrite list, as in `oat-project-pr-progress`.
    for (const referenceFile of [
      '`"$PROJECT_PATH/plan.md"`',
      '`"$PROJECT_PATH/implementation.md"`',
      '`"$PROJECT_PATH/state.md"`',
    ]) {
      expect(stepZeroFive).toContain(referenceFile);
    }

    // References are rewritten before the move, matching
    // `oat-project-review-receive`, so no window exists where the ledger row
    // points at a path that no longer exists.
    expect(stepZeroFive.indexOf('Rewrite references from')).toBeGreaterThan(0);
    expect(stepZeroFive.indexOf('Rewrite references from')).toBeLessThan(
      stepZeroFive.indexOf(
        'Move the review artifact to `reviews/archived/{destination}` only after those references are rewritten.',
      ),
    );
  });

  it('keeps pr-final archive eligibility distinct from final approval', () => {
    const prFinal = readRepoFile(
      '.agents/skills/oat-project-pr-final/SKILL.md',
    );
    const stepZeroFive = prFinal.slice(
      prFinal.indexOf('### Step 0.5: Archive Residual Active Review Artifacts'),
      prFinal.indexOf('### Step 1: Validate Required Artifacts (Mode-Aware)'),
    );
    const stepTwo = prFinal.slice(
      prFinal.indexOf('### Step 2: Check Final Review Status'),
      prFinal.indexOf('### Step 3: Collect Project Summary'),
    );

    // `fixes_completed` is archive-eligible and still unapproved. Widening
    // eligibility must never widen the gate.
    expect(stepZeroFive).toContain(
      'Archive eligibility is not the Step 2 final-review gate. Step 2 still requires the latest `final`/`code` event to be `passed`, so an archived `fixes_completed` final row still stops autonomous finalization at `PRFINAL-03`.',
    );

    // Step 2's approval rule is untouched: same ledger read, same autonomous
    // stop, and completed fixes are still not approval.
    expect(stepTwo).toContain(
      'If `FINAL_ROW` is missing or does not contain `passed`:',
    );
    expect(stepTwo).toContain(
      '- If `OAT_AUTONOMOUS=1`, gate `PRFINAL-03` is a boundary stop. Never select',
    );
    expect(stepTwo).toContain(
      '  - If the status is `fixes_completed`, require that same re-review/receive\n    sequence to reach `passed`; completed fixes alone are not approval.',
    );
    // Archiving grants no exemption inside the gate.
    expect(stepTwo).not.toContain('archived');
  });

  it('keeps pr-final Step 0.5 archiving idempotent across re-runs', () => {
    const prFinal = readRepoFile(
      '.agents/skills/oat-project-pr-final/SKILL.md',
    );
    const stepZeroFive = prFinal.slice(
      prFinal.indexOf('### Step 0.5: Archive Residual Active Review Artifacts'),
      prFinal.indexOf('### Step 1: Validate Required Artifacts (Mode-Aware)'),
    );

    // The collision rule resolves the destination name before anything is
    // rewritten or moved, so the cell and the file agree on the suffixed name.
    expect(stepZeroFive).toContain(
      'This is the same collision-free identity rule as `oat-project-review-receive` Step 1, per DR-260706.',
    );
    // DR-260706 owns the timestamp token; a second format here would sort and
    // parse differently from every other archived review artifact.
    expect(stepZeroFive).toContain(
      '`{stem}-$(date -u +%Y-%m-%dT%H%M%SZ).md`, then a `-2`, `-3`, … index while that name is also taken',
    );
    expect(stepZeroFive).toContain(
      'Never overwrite an existing archive destination.',
    );
    expect(
      stepZeroFive.indexOf('Resolve the destination filename'),
    ).toBeLessThan(stepZeroFive.indexOf('Rewrite references from'));

    // A second pass over the same artifact set is a no-op rather than a
    // duplicate archive or a double-rewritten cell.
    expect(stepZeroFive).toContain('Step 0.5 is idempotent.');
    expect(stepZeroFive).toContain(
      'an event whose Artifact cell already points inside `reviews/archived/` and whose top-level file is gone is already archived, so skip it — never rewrite its cell a second time and never write a second archived copy',
    );
    expect(stepZeroFive).toContain(
      'Re-running over the same artifact set therefore neither duplicates nor clobbers an archived artifact.',
    );
    // An interruption between the reference rewrite and the move leaves the
    // cell naming a destination that does not exist yet; deriving a second name
    // on the rerun would strand the artifact behind PRFINAL-05.
    expect(stepZeroFive).toContain(
      'complete the move to that exact destination rather than deriving a second name',
    );
  });

  it('stops pr-final at PRFINAL-05 when a Reviews ledger artifact path does not resolve', () => {
    const prFinal = readRepoFile(
      '.agents/skills/oat-project-pr-final/SKILL.md',
    );
    const guard = extractLedgerPathGuard(prFinal);
    const { workspace, repository, env } =
      createScaffoldWorkspace(builtCliEntry());

    try {
      // A real project directory created by the real CLI, so the skill's own
      // block runs against the layout it ships for.
      const setup = [
        'set -eu',
        'git init -q .',
        'git config user.email pr-final@example.invalid',
        'git config user.name "PR Final Control"',
        "printf '# scratch\\n' > README.md",
        // The repository's own `.oat` ignore rules, read from its `.gitignore`
        // at test time. A hand-written subset hid the fact that `local`,
        // `synced`, and `archived` projects are ignored in their entirety.
        writeIgnoreRulesCommand(),
        'git add -A',
        'git commit -q -m init',
        'oat config set projects.defaultScope shared --shared > /dev/null',
        'oat project new "ledger-guard" --mode quick --json > /dev/null',
        'PROJECT_PATH=$(oat config get activeProject)',
        'mkdir -p "$PROJECT_PATH/reviews/archived"',
        `printf 'archived\\n' > "$PROJECT_PATH/reviews/archived/final-code.md"`,
        `printf 'active\\n' > "$PROJECT_PATH/reviews/p01-code.md"`,
        'mkdir -p "$PROJECT_PATH/reviews/directory.md"',
        `printf 'outside\\n' > outside.md`,
        'ln -s "$PWD/outside.md" "$PROJECT_PATH/reviews/escape.md"',
        // A symlink that stays inside the project is legitimate.
        'ln -s "archived/final-code.md" "$PROJECT_PATH/reviews/inside-link.md"',
        // A chain longer than the guard's hop limit, landing outside.
        'ln -s "$PWD/outside.md" "$PROJECT_PATH/reviews/hop0.md"',
        'i=1; while [ $i -le 25 ]; do ln -s "hop$((i - 1)).md" "$PROJECT_PATH/reviews/hop$i.md"; i=$((i + 1)); done',
        // A symlinked directory whose `..` collapses back into the project
        // under a logical `cd`, while the kernel resolves it elsewhere.
        'mkdir -p outside-dir',
        'ln -s "$PWD/outside-dir" "$PROJECT_PATH/reviews/linkdir"',
        `printf 'decoy\\n' > "$PROJECT_PATH/reviews/decoy.md"`,
        `printf '%s\\n' "$PROJECT_PATH"`,
      ].join('\n');
      const projectPath = execFileSync('/bin/bash', ['-c', setup], {
        cwd: repository,
        encoding: 'utf8',
        env,
      })
        .trim()
        .split('\n')
        .at(-1)!;

      const runGuard = (
        rows: readonly string[],
        separator = '| --- | --- | --- | --- | --- |',
      ): ReturnType<typeof spawnSync> => {
        writeFileSync(
          join(repository, projectPath, 'plan.md'),
          [
            '# Plan',
            '',
            '## Reviews',
            '',
            '| Scope | Type | Status | Date | Artifact |',
            separator,
            ...rows,
            '',
            '## Tasks',
            '',
          ].join('\n'),
          'utf8',
        );
        return spawnSync(
          '/bin/bash',
          [
            '-c',
            `set -eu\nPROJECT_PATH=${JSON.stringify(projectPath)}\n${guard}`,
          ],
          { cwd: repository, encoding: 'utf8', env },
        );
      };

      // Accepted control: an archived terminal row, a non-terminal row that is
      // still legitimately in the active top level, and an unbound `-`
      // placeholder all resolve.
      const accepted = runGuard([
        '| final | code | passed | 2026-07-15 | reviews/archived/final-code.md |',
        '| p01 | code | received | 2026-07-16 | reviews/p01-code.md |',
        '| spec | artifact | pending | 2026-07-10 | - |',
      ]);
      expect(accepted.stderr).toBe('');
      expect(accepted.status).toBe(0);

      // Duplicate scope/type events with distinct artifacts both validate.
      const duplicates = runGuard([
        '| p01 | code | fixes_added | 2026-07-14 | reviews/p01-code.md |',
        '| p01 | code | passed | 2026-07-16 | reviews/archived/final-code.md |',
      ]);
      expect(duplicates.status).toBe(0);

      // The regression: Step 0.5 moved the artifact and the row still points at
      // the old active path. `.gitignore` hides `reviews/archived/`, so no CI
      // diff would ever show it.
      const dangling = runGuard([
        '| final | code | passed | 2026-07-15 | reviews/final-code.md |',
      ]);
      expect(dangling.status).toBe(1);
      expect(dangling.stderr).toContain('PRFINAL-05');
      expect(dangling.stderr).toContain(
        'scope=final type=code artifact=reviews/final-code.md',
      );
      expect(dangling.stderr).toContain('artifact file does not exist');

      const directory = runGuard([
        '| final | code | passed | 2026-07-15 | reviews/directory.md |',
      ]);
      expect(directory.status).toBe(1);
      expect(directory.stderr).toContain('artifact path is a directory');

      const escaping = runGuard([
        '| final | code | passed | 2026-07-15 | ../../../../outside.md |',
      ]);
      expect(escaping.status).toBe(1);
      expect(escaping.stderr).toContain(
        'artifact resolves outside the project',
      );

      const symlinked = runGuard([
        '| final | code | passed | 2026-07-15 | reviews/escape.md |',
      ]);
      expect(symlinked.status).toBe(1);
      expect(symlinked.stderr).toContain(
        'artifact resolves outside the project',
      );

      // A chain longer than the hop limit resolves outside the project for the
      // kernel, so giving up mid-chain and containment-checking the unresolved
      // in-project pathname would wave it through.
      const longChain = runGuard([
        '| final | code | passed | 2026-07-15 | reviews/hop25.md |',
      ]);
      expect(longChain.status).toBe(1);
      expect(longChain.stderr).toContain(
        'artifact symlink chain does not resolve within 16 hops',
      );

      // A symlink that stays inside the project is still valid.
      const insideLink = runGuard([
        '| final | code | passed | 2026-07-15 | reviews/inside-link.md |',
      ]);
      expect(insideLink.status).toBe(0);

      // Alignment colons are valid GFM separator syntax; treating that row as a
      // ledger event blocked a healthy project.
      const aligned = runGuard(
        ['| final | code | passed | 2026-07-15 | reviews/p01-code.md |'],
        '| :--- | :--- | :---: | ---: | :--- |',
      );
      expect(aligned.stderr).toBe('');
      expect(aligned.status).toBe(0);

      // `symlinked-dir/..` is collapsed by a logical `cd` before `pwd -P`, so
      // logical traversal would validate `reviews/decoy.md` while the published
      // path resolves to a file outside the project that does not exist.
      const logicalParent = runGuard([
        '| final | code | passed | 2026-07-15 | reviews/linkdir/../decoy.md |',
      ]);
      expect(logicalParent.status).toBe(1);
      expect(logicalParent.stderr).toContain('PRFINAL-05');

      // A row the parser cannot read is a stop, never a silent skip: skipping
      // it would let exactly the dangling path this guard exists for through.
      const unsupportedRow = runGuard([
        'final | code | passed | 2026-07-15 | reviews/gone.md |',
      ]);
      expect(unsupportedRow.status).toBe(1);
      expect(unsupportedRow.stderr).toContain(
        'PRFINAL-05: unsupported review-ledger row (a row must start with |)',
      );

      // Blockquoted placeholder rows are the standing convention in this
      // repository's wave plans; they are notes, not events.
      const blockquoted = runGuard([
        '| p01 | code | passed | 2026-07-16 | reviews/p01-code.md |',
        '',
        '> Placeholder rows stay quoted out until an artifact exists:',
        '> | spec | artifact | pending | - | - | - | - | - |',
        '> | design | artifact | pending | - | - | - | - | - |',
      ]);
      expect(blockquoted.stderr).toBe('');
      expect(blockquoted.status).toBe(0);

      // A fenced example inside the section is documentation, so its rows are
      // neither validated nor rejected.
      const fenced = runGuard([
        '| p01 | code | passed | 2026-07-16 | reviews/p01-code.md |',
        '',
        '```text',
        '| final | code | passed | 2026-07-15 | reviews/does-not-exist.md |',
        '```',
      ]);
      expect(fenced.stderr).toBe('');
      expect(fenced.status).toBe(0);

      // A second table under a `###` subheading has its header and separator
      // skipped by shape, so its real rows are validated. The scan boundary
      // stays at the next level-two heading, exactly as Step 2's pinned block
      // reads the ledger: ending at `###` would hide a `final`/`code` row that
      // authorizes finalization from the guard that validates it.
      const subsectionValid = runGuard([
        '| p01 | code | passed | 2026-07-16 | reviews/p01-code.md |',
        '',
        '### Superseded',
        '',
        '| Scope | Type | Status | Date | Artifact |',
        '| --- | --- | --- | --- | --- |',
        '| p02 | code | passed | 2026-07-15 | reviews/p01-code.md |',
      ]);
      expect(subsectionValid.stderr).toBe('');
      expect(subsectionValid.status).toBe(0);

      const subsectionDangling = runGuard([
        '| p01 | code | passed | 2026-07-16 | reviews/p01-code.md |',
        '',
        '### Superseded',
        '',
        '| Scope | Type | Status | Date | Artifact |',
        '| --- | --- | --- | --- | --- |',
        '| final | code | passed | 2026-07-15 | reviews/gone.md |',
      ]);
      expect(subsectionDangling.status).toBe(1);
      expect(subsectionDangling.stderr).toContain(
        'scope=final type=code artifact=reviews/gone.md',
      );

      // A table inside `## Reviews` that is not the ledger — the
      // `### Artifact Review` iteration table that ships in
      // `.oat/projects/archived/config-bug/plan.md` — is recognized by its
      // header and skipped, instead of having its rows read as events.
      const nonLedgerTable = runGuard([
        '| p01 | code | passed | 2026-07-16 | reviews/p01-code.md |',
        '',
        '### Artifact Review',
        '',
        '| Iteration | Reviewer | Outcome | Action |',
        '| --- | --- | --- | --- |',
        '| 1 | codex | fixes | applied |',
      ]);
      expect(nonLedgerTable.stderr).toBe('');
      expect(nonLedgerTable.status).toBe(0);

      // The ledger signature is `Scope` + `Type`, not `Scope` alone: a notes
      // table whose first column happens to be `Scope` is not the ledger.
      const scopeShapedTable = runGuard([
        '| p01 | code | passed | 2026-07-16 | reviews/p01-code.md |',
        '',
        '### Scope notes',
        '',
        '| Scope | Notes |',
        '| --- | --- |',
        '| p01 | rebased onto main |',
      ]);
      expect(scopeShapedTable.stderr).toBe('');
      expect(scopeShapedTable.status).toBe(0);

      // Each table establishes its own artifact column rather than inheriting
      // the previous one's index.
      const reorderedColumns = runGuard([
        '| p01 | code | passed | 2026-07-16 | reviews/p01-code.md |',
        '',
        '| Scope | Type | Artifact | Status | Date |',
        '| --- | --- | --- | --- | --- |',
        '| p02 | code | reviews/gone.md | passed | 2026-07-15 |',
      ]);
      expect(reorderedColumns.status).toBe(1);
      expect(reorderedColumns.stderr).toContain(
        'scope=p02 type=code artifact=reviews/gone.md',
      );

      // A fence is closed only by a matching marker at least as long as its
      // opener, and tilde fences count. Toggling on any ``` prefix left the
      // scanner inside a fence after a nested example and hid every real row
      // that followed it.
      const nestedFence = runGuard([
        '| p01 | code | passed | 2026-07-16 | reviews/p01-code.md |',
        '',
        '````text',
        '```',
        '| example | code | passed | 2026-07-15 | never-validated.md |',
        '````',
        '',
        '| Scope | Type | Status | Date | Artifact |',
        '| --- | --- | --- | --- | --- |',
        '| final | code | passed | 2026-07-15 | reviews/gone.md |',
      ]);
      expect(nestedFence.status).toBe(1);
      expect(nestedFence.stderr).toContain(
        'scope=final type=code artifact=reviews/gone.md',
      );
      expect(nestedFence.stderr).not.toContain('never-validated.md');

      const tildeFence = runGuard([
        '| p01 | code | passed | 2026-07-16 | reviews/p01-code.md |',
        '',
        '~~~text',
        '| final | code | passed | 2026-07-15 | reviews/gone.md |',
        '~~~',
      ]);
      expect(tildeFence.stderr).toBe('');
      expect(tildeFence.status).toBe(0);

      // A row whose Type is `artifact` is an event, not a header: keying
      // header detection on any `artifact` cell skipped it and mis-set the
      // artifact column for every row after it.
      const artifactTypeRow = runGuard([
        '| plan | artifact | passed | 2026-07-16 | reviews/gone.md |',
      ]);
      expect(artifactTypeRow.status).toBe(1);
      expect(artifactTypeRow.stderr).toContain(
        'scope=plan type=artifact artifact=reviews/gone.md',
      );

      // `reviews/archived/` exists in this fixture, so a file missing from it
      // is an interrupted archive, not a fresh checkout: it stops. The
      // never-materialized shape is covered below, after the tree is removed.
      const missingFromArchive = runGuard([
        '| final | code | passed | 2026-07-15 | reviews/archived/never-materialized.md |',
      ]);
      expect(missingFromArchive.status).toBe(1);
      expect(missingFromArchive.stderr).toContain(
        'artifact file does not exist',
      );
      expect(missingFromArchive.stdout).toBe('');

      // That acceptance never reaches a tracked location (`dangling` above),
      // and an ignored path that escapes is still rejected by containment.
      const ignoredEscape = runGuard([
        '| final | code | passed | 2026-07-15 | reviews/archived/../../../../outside.md |',
      ]);
      expect(ignoredEscape.status).toBe(1);
      expect(ignoredEscape.stderr).toContain(
        'artifact resolves outside the project',
      );

      // The lexical fallback below may only answer "contained?" and
      // "ignored?": collapsing `..` onto a file that happens to exist would
      // validate a different path than the one the PR body publishes.
      const cancelledMissingDirectory = runGuard([
        '| final | code | passed | 2026-07-15 | reviews/.missing/../p01-code.md |',
      ]);
      expect(cancelledMissingDirectory.status).toBe(1);
      expect(cancelledMissingDirectory.stderr).toContain(
        'artifact file does not exist',
      );

      const nonDirectoryComponent = runGuard([
        '| final | code | passed | 2026-07-15 | reviews/p01-code.md/../p01-code.md |',
      ]);
      expect(nonDirectoryComponent.status).toBe(1);
      expect(nonDirectoryComponent.stderr).toContain(
        'artifact file does not exist',
      );

      // Archive acceptance must not inherit the lexical fallback's blind spot:
      // if `reviews/archived` is a symlink out of the project and the artifact
      // names a missing directory under it, physical resolution fails and the
      // lexical path looks contained. The deepest existing ancestor decides.
      rmSync(join(repository, projectPath, 'reviews/archived'), {
        recursive: true,
        force: true,
      });
      execFileSync(
        '/bin/bash',
        [
          '-c',
          [
            'set -eu',
            'mkdir -p outside-archive',
            `ln -s "$PWD/outside-archive" ${JSON.stringify(projectPath)}/reviews/archived`,
          ].join('\n'),
        ],
        { cwd: repository, encoding: 'utf8', env },
      );
      const escapingArchive = runGuard([
        '| final | code | passed | 2026-07-15 | reviews/archived/missing/x.md |',
      ]);
      expect(escapingArchive.status).toBe(1);
      expect(escapingArchive.stderr).toContain(
        'artifact resolves outside the project',
      );
      execFileSync(
        '/bin/bash',
        [
          '-c',
          `set -eu\nrm ${JSON.stringify(projectPath)}/reviews/archived\nmkdir -p ${JSON.stringify(projectPath)}/reviews/archived`,
        ],
        { cwd: repository, encoding: 'utf8', env },
      );

      // The excuse is for an archive location that was never materialized, so
      // it must not fire for a non-directory sitting at that path. Keying it
      // on `[ ! -d ]` accepted a regular file and a dangling symlink there and
      // re-opened the dangling row this gate exists to catch.
      const archivedRow =
        '| final | code | passed | 2026-07-15 | reviews/archived/never-materialized.md |';
      const replaceArchiveWith = (command: string): void => {
        execFileSync(
          '/bin/bash',
          [
            '-c',
            [
              'set -eu',
              `rm -rf ${JSON.stringify(projectPath)}/reviews/archived`,
              command,
            ].join('\n'),
          ],
          { cwd: repository, encoding: 'utf8', env },
        );
      };

      replaceArchiveWith(
        `printf 'not a directory\\n' > ${JSON.stringify(projectPath)}/reviews/archived`,
      );
      const archiveIsFile = runGuard([archivedRow]);
      expect(archiveIsFile.status).toBe(1);
      expect(archiveIsFile.stderr).toContain(
        'reviews/archived exists but is not a directory',
      );
      expect(archiveIsFile.stdout).toBe('');

      // `-e` alone is false for a dangling symlink, so absence is tested with
      // `-L` beside it; otherwise this shape stays excused.
      replaceArchiveWith(
        `ln -s "$PWD/no-such-archive-target" ${JSON.stringify(projectPath)}/reviews/archived`,
      );
      const archiveIsDanglingSymlink = runGuard([archivedRow]);
      expect(archiveIsDanglingSymlink.status).toBe(1);
      expect(archiveIsDanglingSymlink.stderr).toContain(
        'reviews/archived exists but is not a directory',
      );
      expect(archiveIsDanglingSymlink.stdout).toBe('');

      replaceArchiveWith(
        `mkdir -p ${JSON.stringify(projectPath)}/reviews/archived`,
      );

      // An entire `reviews/` tree that was never materialized still classifies
      // row by row instead of failing to resolve.
      rmSync(join(repository, projectPath, 'reviews'), {
        recursive: true,
        force: true,
      });
      const unmaterialized = runGuard([
        '| plan | artifact | passed | 2026-07-16 | reviews/archived/artifact-plan-review.md |',
      ]);
      expect(unmaterialized.stderr).toBe('');
      expect(unmaterialized.status).toBe(0);
      expect(unmaterialized.stdout).toContain(
        'reviews/archived/ was never materialized in this checkout',
      );
      const unmaterializedTracked = runGuard([
        '| final | code | passed | 2026-07-15 | reviews/final-code.md |',
      ]);
      expect(unmaterializedTracked.status).toBe(1);
      expect(unmaterializedTracked.stderr).toContain(
        'artifact file does not exist',
      );

      // Fail closed rather than reporting a clean ledger when it cannot be
      // read. This is behavioral, not wording: the clause stops before any
      // parsing, so no row is evaluated and awk is never reached.
      rmSync(join(repository, projectPath, 'plan.md'));
      const unreadable = spawnSync(
        '/bin/bash',
        [
          '-c',
          `set -eu\nPROJECT_PATH=${JSON.stringify(projectPath)}\n${guard}`,
        ],
        { cwd: repository, encoding: 'utf8', env },
      );
      expect(unreadable.status).toBe(1);
      expect(unreadable.stderr).toContain(
        'PRFINAL-05: cannot read the review ledger',
      );
      expect(unreadable.stderr).not.toContain('cannot parse the review ledger');
      expect(unreadable.stderr).not.toContain('awk:');
      expect(unreadable.stderr).not.toContain(
        'unresolved review-ledger artifact',
      );
      expect(unreadable.stdout).toBe('');
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('validates absent review-ledger paths in every project scope', () => {
    const prFinal = readRepoFile(
      '.agents/skills/oat-project-pr-final/SKILL.md',
    );
    const guard = extractLedgerPathGuard(prFinal);
    const { workspace, repository, env } =
      createScaffoldWorkspace(builtCliEntry());

    try {
      // `.gitignore` ignores `local`, `synced`, and `archived` projects in
      // their entirety, so "git ignores this path" excuses every absent
      // artifact there. Only `shared` is a tracked location, which is why a
      // shared-only fixture cannot see the difference.
      const setup = [
        'set -eu',
        'git init -q .',
        'git config user.email pr-final@example.invalid',
        'git config user.name "PR Final Control"',
        "printf '# scratch\\n' > README.md",
        writeIgnoreRulesCommand(),
        'git add -A',
        'git commit -q -m init',
        // A `synced` project requires a pushable origin remote, and the CLI
        // pushes from a context where a relative remote path does not resolve.
        'ORIGIN_REMOTE="$(cd .. && pwd -P)/origin.git"',
        'git init -q --bare "$ORIGIN_REMOTE"',
        'git remote add origin "$ORIGIN_REMOTE"',
        ...['shared', 'local', 'synced'].flatMap((scope) => [
          `oat config set projects.defaultScope ${scope} --shared > /dev/null`,
          `oat project new "guard-${scope}" --mode quick --json > /dev/null`,
          // No `reviews/archived` directory: the fresh-checkout shape.
          'mkdir -p "$(oat config get activeProject)/reviews"',
          `printf '%s\\n' "$(oat config get activeProject)"`,
        ]),
      ].join('\n');
      const projectPaths = execFileSync('/bin/bash', ['-c', setup], {
        cwd: repository,
        encoding: 'utf8',
        env,
      })
        .trim()
        .split('\n')
        .slice(-3);
      expect(projectPaths).toEqual([
        '.oat/projects/shared/guard-shared',
        '.oat/projects/local/guard-local',
        '.oat/projects/synced/guard-synced',
      ]);

      const runGuard = (
        projectPath: string,
        artifact: string,
      ): ReturnType<typeof spawnSync> => {
        writeFileSync(
          join(repository, projectPath, 'plan.md'),
          [
            '# Plan',
            '',
            '## Reviews',
            '',
            '| Scope | Type | Status | Date | Artifact |',
            '| --- | --- | --- | --- | --- |',
            `| final | code | passed | 2026-07-15 | ${artifact} |`,
            '',
            '## Tasks',
            '',
          ].join('\n'),
          'utf8',
        );
        return spawnSync(
          '/bin/bash',
          [
            '-c',
            `set -eu\nPROJECT_PATH=${JSON.stringify(projectPath)}\n${guard}`,
          ],
          { cwd: repository, encoding: 'utf8', env },
        );
      };

      for (const projectPath of projectPaths) {
        // `reviews/archived/` does not exist here at all — a fresh clone, a
        // remote workspace, or a lane worktree — so an absent path inside it
        // is local-only and accepted.
        const neverMaterialized = runGuard(
          projectPath,
          'reviews/archived/never-materialized.md',
        );
        expect(neverMaterialized.stderr, projectPath).toBe('');
        expect(neverMaterialized.status, projectPath).toBe(0);
        expect(neverMaterialized.stdout, projectPath).toContain(
          'reviews/archived/ was never materialized in this checkout',
        );

        // Once the archive directory exists, a file missing from it is a
        // dangling row — an archive interrupted between the reference rewrite
        // and the move — and stops like any other absent path.
        mkdirSync(join(repository, projectPath, 'reviews/archived'), {
          recursive: true,
        });
        const missingFromArchive = runGuard(
          projectPath,
          'reviews/archived/never-materialized.md',
        );
        expect(missingFromArchive.status, projectPath).toBe(1);
        expect(missingFromArchive.stderr, projectPath).toContain(
          'artifact=reviews/archived/never-materialized.md',
        );
        expect(missingFromArchive.stderr, projectPath).toContain(
          'artifact file does not exist',
        );

        // The same path resolves once the artifact is actually there.
        writeFileSync(
          join(
            repository,
            projectPath,
            'reviews/archived/never-materialized.md',
          ),
          'archived\n',
          'utf8',
        );
        const presentInArchive = runGuard(
          projectPath,
          'reviews/archived/never-materialized.md',
        );
        expect(presentInArchive.stderr, projectPath).toBe('');
        expect(presentInArchive.status, projectPath).toBe(0);

        // The regression this plan exists to stop: Step 0.5 archived the file
        // and left the row on the old top-level path.
        const dangling = runGuard(projectPath, 'reviews/final-code.md');
        expect(dangling.status, projectPath).toBe(1);
        expect(dangling.stderr, projectPath).toContain(
          'artifact file does not exist',
        );

        // Free prose in the Artifact cell is not a path.
        const prose = runGuard(projectPath, 'in-memory');
        expect(prose.status, projectPath).toBe(1);
        expect(prose.stderr, projectPath).toContain(
          'artifact file does not exist',
        );
      }
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('identifies the review-ledger table or stops rather than validating nothing', () => {
    const prFinal = readRepoFile(
      '.agents/skills/oat-project-pr-final/SKILL.md',
    );
    const guard = extractLedgerPathGuard(prFinal);
    const { workspace, repository, env } =
      createScaffoldWorkspace(builtCliEntry());

    try {
      const setup = [
        'set -eu',
        'git init -q .',
        'git config user.email pr-final@example.invalid',
        'git config user.name "PR Final Control"',
        "printf '# scratch\\n' > README.md",
        writeIgnoreRulesCommand(),
        'git add -A',
        'git commit -q -m init',
        'oat config set projects.defaultScope shared --shared > /dev/null',
        'oat project new "ledger-header" --mode quick --json > /dev/null',
        'PROJECT_PATH=$(oat config get activeProject)',
        'mkdir -p "$PROJECT_PATH/reviews/archived"',
        `printf 'active\\n' > "$PROJECT_PATH/reviews/p01-code.md"`,
        // A file whose name would be produced by stripping a trailing `_`.
        `printf 'literal\\n' > "$PROJECT_PATH/reviews/AGENTS.md"`,
        `printf '%s\\n' "$PROJECT_PATH"`,
      ].join('\n');
      const projectPath = execFileSync('/bin/bash', ['-c', setup], {
        cwd: repository,
        encoding: 'utf8',
        env,
      })
        .trim()
        .split('\n')
        .at(-1)!;

      const runGuard = (lines: readonly string[]) => {
        writeFileSync(
          join(repository, projectPath, 'plan.md'),
          ['# Plan', '', ...lines, '', '## Tasks', ''].join('\n'),
          'utf8',
        );
        return spawnSync(
          '/bin/bash',
          [
            '-c',
            `set -eu\nPROJECT_PATH=${JSON.stringify(projectPath)}\n${guard}`,
          ],
          { cwd: repository, encoding: 'utf8', env },
        );
      };
      const separator = '| --- | --- | --- | --- | --- |';
      const dangling =
        '| final | code | passed | 2026-07-15 | reviews/gone.md |';

      // Emphasis in a header cell is ordinary Markdown authoring, so the
      // ledger is still recognized and its rows are still validated.
      for (const header of [
        '| **Scope** | **Type** | **Status** | **Date** | **Artifact** |',
        '| `Scope` | `Type` | `Status` | `Date` | `Artifact` |',
      ]) {
        const emphasised = runGuard([
          '## Reviews',
          '',
          header,
          separator,
          dangling,
        ]);
        expect(emphasised.status, header).toBe(1);
        expect(emphasised.stderr, header).toContain('artifact=reviews/gone.md');
      }

      // Column order comes from the header, not from a fixed position.
      const reordered = runGuard([
        '## Reviews',
        '',
        '| Artifact | Scope | Type | Status | Date |',
        separator,
        '| reviews/gone.md | final | code | passed | 2026-07-15 |',
      ]);
      expect(reordered.status).toBe(1);
      expect(reordered.stderr).toContain(
        'scope=final type=code artifact=reviews/gone.md',
      );

      // A section with table rows but no recognizable ledger header must stop:
      // validating zero rows and exiting 0 is the silent full skip.
      const noHeader = runGuard(['## Reviews', '', separator, dangling]);
      expect(noHeader.status).toBe(1);
      expect(noHeader.stderr).toContain(
        'PRFINAL-05: unrecognized review-ledger header',
      );

      const renamedHeader = runGuard([
        '## Reviews',
        '',
        '| Phase | Kind | Status | Date | Artifact |',
        separator,
        dangling,
      ]);
      expect(renamedHeader.status).toBe(1);
      expect(renamedHeader.stderr).toContain(
        'PRFINAL-05: unrecognized review-ledger header',
      );

      // A ledger under a drifted heading left `saw_table` at 0, so the guard
      // exited 0 having validated no row at all — the same silent full skip as
      // an unrecognized header, and invisible because nothing is reported.
      for (const heading of [
        '## Review Ledger',
        '## Reviews (ledger)',
        '### Reviews',
      ]) {
        const drifted = runGuard([
          heading,
          '',
          '| Scope | Type | Status | Date | Artifact |',
          separator,
          dangling,
        ]);
        expect(drifted.status, heading).toBe(1);
        expect(drifted.stderr, heading).toContain(
          'PRFINAL-05: no ## Reviews section',
        );
        expect(drifted.stdout, heading).toBe('');
      }

      // Columns are split on `|`, so an escaped `\|` shifted
      // `artifact_column` one cell left; on the common `-` placeholder the
      // dangling row was skipped in silence and the guard exited 0.
      const escapedPipeInRow = runGuard([
        '## Reviews',
        '',
        '| Scope | Type | Status | Date | Artifact | Reviewed Head |',
        '| --- | --- | --- | --- | --- | --- |',
        '| final | code | passed \\| superseded | - | reviews/gone.md | - |',
      ]);
      expect(escapedPipeInRow.status).toBe(1);
      expect(escapedPipeInRow.stderr).toContain(
        'PRFINAL-05: unsupported review-ledger row (an escaped | cannot be assigned to a column)',
      );
      expect(escapedPipeInRow.stderr).toContain(
        '| final | code | passed \\| superseded | - | reviews/gone.md | - |',
      );

      // The row stops on the escape alone, before its artifact is read, so a
      // resolvable artifact does not excuse it either. Unescaping instead of
      // stopping would merge the two cells and read `-`, turning a row the
      // guard used to reject into one it accepts.
      const escapedPipeMergesOntoPlaceholder = runGuard([
        '## Reviews',
        '',
        '| Scope | Type | Artifact |',
        '| --- | --- | --- |',
        '| final | code \\| reviews/gone.md | - |',
      ]);
      expect(escapedPipeMergesOntoPlaceholder.status).toBe(1);
      expect(escapedPipeMergesOntoPlaceholder.stderr).toContain(
        'an escaped | cannot be assigned to a column',
      );

      // Same shape one level up: unescaping a header would merge `Note` and
      // `Scope` into one cell, the table would stop being recognized as a
      // ledger, and a second table is skipped in silence once an earlier one
      // was recognized — so the header stops before its columns are read.
      const escapedPipeInHeader = runGuard([
        '## Reviews',
        '',
        '| Scope | Type | Artifact |',
        '| --- | --- | --- |',
        '| valid | code | - |',
        '',
        '| Note \\| Scope | Type | Artifact |',
        '| --- | --- | --- | --- |',
        '| note | final | code | reviews/gone.md |',
      ]);
      expect(escapedPipeInHeader.status).toBe(1);
      expect(escapedPipeInHeader.stderr).toContain(
        'PRFINAL-05: review-ledger table header contains an escaped |',
      );

      // A non-ledger table's own rows stay skipped: the stop is scoped to the
      // ledger, not to every pipe inside `## Reviews`.
      const escapedPipeInNonLedgerRow = runGuard([
        '## Reviews',
        '',
        '| Scope | Type | Status | Date | Artifact |',
        separator,
        '| p01 | code | passed | 2026-07-16 | reviews/p01-code.md |',
        '',
        '### Artifact Review',
        '',
        '| Iteration | Reviewer | Outcome |',
        '| --- | --- | --- |',
        '| 1 | codex \\| gpt | fixes |',
      ]);
      expect(escapedPipeInNonLedgerRow.stderr).toBe('');
      expect(escapedPipeInNonLedgerRow.status).toBe(0);

      // A prose line whose only pipes are escaped is still an unsupported row
      // rather than a silent skip.
      const escapedPipeProse = runGuard([
        '## Reviews',
        '',
        '| Scope | Type | Status | Date | Artifact |',
        separator,
        '| p01 | code | passed | 2026-07-16 | reviews/p01-code.md |',
        '',
        'final \\| code \\| passed \\| reviews/gone.md',
      ]);
      expect(escapedPipeProse.status).toBe(1);
      expect(escapedPipeProse.stderr).toContain(
        'PRFINAL-05: unsupported review-ledger row (a row must start with |)',
      );
      expect(escapedPipeProse.stderr).toContain(
        'final \\| code \\| passed \\| reviews/gone.md',
      );

      // A fence that never closes must not swallow the ledger.
      const unclosedFence = runGuard([
        '```text',
        'an example that forgets its closing fence',
        '',
        '## Reviews',
        '',
        '| Scope | Type | Status | Date | Artifact |',
        separator,
        dangling,
      ]);
      expect(unclosedFence.status).toBe(1);
      expect(unclosedFence.stderr).toContain(
        'PRFINAL-05: unclosed fenced block',
      );

      // A legitimately empty ledger and a section with no table at all still
      // pass, so the backstop is not a blanket stop.
      const emptyLedger = runGuard([
        '## Reviews',
        '',
        '| Scope | Type | Status | Date | Artifact |',
        separator,
      ]);
      expect(emptyLedger.stderr).toBe('');
      expect(emptyLedger.status).toBe(0);

      const noTable = runGuard(['## Reviews', '', 'No reviews recorded yet.']);
      expect(noTable.stderr).toBe('');
      expect(noTable.status).toBe(0);

      // A non-ledger table alongside a recognized ledger is still skipped.
      const mixedTables = runGuard([
        '## Reviews',
        '',
        '| Scope | Type | Status | Date | Artifact |',
        separator,
        '| p01 | code | passed | 2026-07-16 | reviews/p01-code.md |',
        '',
        '### Artifact Review',
        '',
        '| Iteration | Reviewer | Outcome | Action |',
        '| --- | --- | --- | --- |',
        '| 1 | codex | fixes | applied |',
      ]);
      expect(mixedTables.stderr).toBe('');
      expect(mixedTables.status).toBe(0);

      // A code-span around an artifact path is authoring, not part of the name.
      const backtickedCell = runGuard([
        '## Reviews',
        '',
        '| Scope | Type | Status | Date | Artifact |',
        separator,
        '| p01 | code | passed | 2026-07-16 | `reviews/p01-code.md` |',
      ]);
      expect(backtickedCell.stderr).toBe('');
      expect(backtickedCell.status).toBe(0);

      // Only balanced wrappers come off. Stripping every leading and trailing
      // `_`/`*`/backtick turned `reviews/AGENTS.md_` into a different file
      // that happens to exist.
      const literalTrailingUnderscore = runGuard([
        '## Reviews',
        '',
        '| Scope | Type | Status | Date | Artifact |',
        separator,
        '| p01 | code | passed | 2026-07-16 | `reviews/AGENTS.md_` |',
      ]);
      expect(literalTrailingUnderscore.status).toBe(1);
      expect(literalTrailingUnderscore.stderr).toContain(
        'artifact=reviews/AGENTS.md_',
      );

      // A header may legally omit its trailing pipe.
      const noTrailingPipe = runGuard([
        '## Reviews',
        '',
        '| Scope | Type | Status | Date | Artifact',
        separator,
        '| p01 | code | passed | 2026-07-16 | reviews/p01-code.md |',
      ]);
      expect(noTrailingPipe.stderr).toBe('');
      expect(noTrailingPipe.status).toBe(0);

      // A second, ledger-shaped table with no Artifact column cannot have its
      // rows validated, so it stops instead of being silently dropped because
      // an earlier table was recognized.
      const malformedSecondLedger = runGuard([
        '## Reviews',
        '',
        '| Scope | Type | Status | Date | Artifact |',
        separator,
        '| p01 | code | passed | 2026-07-16 | reviews/p01-code.md |',
        '',
        '| Scope | Type | Status | Date | File |',
        separator,
        dangling,
      ]);
      expect(malformedSecondLedger.status).toBe(1);
      expect(malformedSecondLedger.stderr).toContain(
        'PRFINAL-05: review-ledger table has no Artifact column',
      );
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('syncs the open PR description after archive so blob links keep resolving', () => {
    const skillPath = repoFilePath(
      '.agents/skills/oat-project-complete/SKILL.md',
    );
    const content = readFileSync(skillPath, 'utf8');

    // Pre-mutation capture so Step 11.5 can branch on the original PR state.
    expect(content).toContain('WAS_PR_OPEN_AT_START');

    // Step 7 must drop archived-artifact References when SHOULD_ARCHIVE is true.
    expect(content).toContain(
      '**Archive-aware References (required when `SHOULD_ARCHIVE` is `true`):**',
    );
    expect(content).toContain(
      '`plan.md`, `implementation.md`, `discovery.md`, `spec.md`, `design.md`, `summary.md`, `references/imported-plan.md`',
    );
    expect(content).toContain(
      'Add a canonical project-record bullet** when `archive.summaryExportPath` is configured and `summary.md` exists',
    );

    // Regression guard: the project-record link must target the current/head
    // branch ({BRANCH}), not the base branch. The summary export is committed
    // on the feature branch during Step 10 and only reaches the base branch
    // after merge, so a `blob/{BASE_BRANCH}/...` link 404s the entire time
    // the PR is open — the exact failure mode this whole step exists to fix.
    expect(content).toContain(
      '{REPO_WEB}/blob/{BRANCH}/${SUMMARY_EXPORT_PATH}/${YYYYMMDD}-${PROJECT_NAME}.md',
    );
    expect(content).not.toContain(
      '{REPO_WEB}/blob/{BASE_BRANCH}/${SUMMARY_EXPORT_PATH}',
    );
    expect(content).toContain(
      'Anti-pattern: do **not** point this link at the base branch',
    );

    // Existing pr-final body must be regenerated when archiving so links stay valid.
    expect(content).toContain(
      'When `SHOULD_ARCHIVE` is `true`, regenerate it (overwrite). The existing artifact was authored by `oat-project-pr-final` before any archive intent existed',
    );

    // Step 11.5 contract.
    expect(content).toContain(
      '### Step 11.5: Sync Open-PR Description on GitHub (Conditional)',
    );
    expect(content).toContain(
      '`SHOULD_ARCHIVE="true"` or `PROJECT_SCOPE="synced"`',
    );
    expect(content).toContain(
      '`git show "$PROJECT_REF_COMMIT:$PR_DESCRIPTION_RELATIVE_PATH"` to equal the',
    );
    expect(content).toContain(
      'canonical links block is owned by\n`PROJECT_LINKS_PIN_COMMIT`',
    );
    expect(content).toContain('gh pr edit "$PR_REF" --body-file "$TMP_BODY"');
    expect(content).toContain(
      'If `gh` is missing or `gh pr edit` fails, always print the manual-update path.',
    );
    expect(content).toContain(
      'For a synced archive completion this tracked-PR update is required: stop',
    );
    expect(content).toContain(
      'before Step 12, retain the active pointer, and let the next invocation resume',
    );
  });

  it('always publishes final synced links for new and existing completion PRs', () => {
    const content = readFileSync(
      repoFilePath('.agents/skills/oat-project-complete/SKILL.md'),
      'utf8',
    );

    const finalLinksIndex = content.indexOf(
      '#### Step 8.6: Render Final Synced Project Links',
    );
    const newPrIndex = content.indexOf('### Step 11: Open PR in GitHub');
    const existingPrIndex = content.indexOf(
      '### Step 11.5: Sync Open-PR Description on GitHub',
    );

    expect(finalLinksIndex).toBeGreaterThanOrEqual(0);
    expect(newPrIndex).toBeGreaterThan(finalLinksIndex);
    expect(existingPrIndex).toBeGreaterThan(newPrIndex);
    expect(content).toMatch(
      /required even when no project recap was selected and\s+`summaryExportFile` is null/,
    );
    expect(content).toContain(
      'FINAL_LINK_ARGS=("$PROJECT_NAME" --format markdown)',
    );
    expect(content).toContain(
      'FINAL_LINK_ARGS+=(--durable-summary "$SUMMARY_EXPORT_RELATIVE")',
    );
    expect(content).toMatch(
      /WAS_PR_OPEN_AT_START="false"[\s\S]*?Step 11 creates the new PR[\s\S]*?WAS_PR_OPEN_AT_START="true"[\s\S]*?Step 11\.5 updates the already-open PR/,
    );
    expect(content).toContain(
      'Neither path depends on `projectRecapExport` or a configured',
    );
    expect(content).toContain('`archive.summaryExportPath`.');
  });

  it('routes absent-checkout synced and local-only projects through all-scope selection', () => {
    const content = readFileSync(
      repoFilePath('.agents/skills/oat-project-next/SKILL.md'),
      'utf8',
    );

    expect(content).toContain(
      'PROJECT_LIST_JSON=$(oat project list --json) || exit 1',
    );
    expect(content).not.toContain('ls -d "$PROJECTS_ROOT"/*/');
    expect(content).toMatch(
      /structured `projects` array[\s\S]*?local-only[\s\S]*?synced records whose detached checkout is absent/,
    );
    expect(content).toMatch(
      /`projects` array is empty[\s\S]*?oat-project-new[\s\S]*?STOP/,
    );
    expect(content).toMatch(
      /`projects` array is non-empty[\s\S]*?scope[\s\S]*?checkout[\s\S]*?invoke `oat-project-open`/,
    );
    expect(content).toMatch(
      /absent-checkout synced record and a local-only project both take\s+this selection route/,
    );
  });

  it('persists both dirty brainstorm fold-back choices by project scope', () => {
    const content = readFileSync(
      repoFilePath('.agents/skills/oat-brainstorm/SKILL.md'),
      'utf8',
    );
    const dirtySection = content.slice(
      content.indexOf('**Step 4 — If the artifact is dirty**'),
      content.indexOf('**Step 5 — Handoff prompt.**'),
    );

    const currentPushIndex = dirtySection.indexOf('CURRENT_ARTIFACT_PUSH=');
    const secondPushIndex = dirtySection.indexOf('FOLD_BACK_PUSH=');
    expect(currentPushIndex).toBeGreaterThanOrEqual(0);
    expect(secondPushIndex).toBeGreaterThan(currentPushIndex);
    expect(dirtySection).toContain(
      'CURRENT_ARTIFACT_COMMIT_SHA=$(parse_synced_push_receipt "$CURRENT_ARTIFACT_PUSH")',
    );
    expect(dirtySection).toContain('MIXED_FOLD_BACK_PUSH=$(oat project push');
    expect(dirtySection).toContain(
      'FOLD_BACK_COMMIT_SHA=$(parse_synced_push_receipt "$MIXED_FOLD_BACK_PUSH")',
    );
    expect(dirtySection.match(/git commit --only/g)).toHaveLength(3);
    expect(dirtySection).toContain(
      'A synced dirty branch never runs parent\n  `git add` for the project artifact.',
    );
  });

  it('checks the full synced checkout before choosing clean brainstorm fold-back', () => {
    const content = readRepoFile('.agents/skills/oat-brainstorm/SKILL.md');
    const preflight = content.slice(
      content.indexOf(
        'PROJECT_SCOPE=$(oat project scope "$ACTIVE_PROJECT" --format value)',
        content.indexOf('**Step 2 — Preflight `git status` check.**'),
      ),
      content.indexOf('```', content.indexOf('else\n  git status --porcelain')),
    );

    expect(preflight).toContain('git -C "$ACTIVE_PROJECT" status --porcelain');
    expect(preflight).not.toContain(
      'git -C "$ACTIVE_PROJECT" status --porcelain -- "$(basename "$ARTIFACT_PATH")"',
    );
    const routingHarness = `EVENTS=""
oat() {
  if [[ "$1 $2 $3 $4" == "project scope $ACTIVE_PROJECT --format" ]]; then
    printf synced
  elif [[ "$1 $2" == "project push" ]]; then
    EVENTS="\${EVENTS}push,"
  fi
}
git() {
  if [[ "$#" -eq 4 ]]; then
    printf ' M unrelated-project-file.md\\n'
  fi
}
handle_dirty_checkout() {
  EVENTS="\${EVENTS}dirty-handler,"
}
STATUS_OUTPUT=$(${preflight})
if [[ -n "$STATUS_OUTPUT" ]]; then
  handle_dirty_checkout
  if [[ "$DIRTY_HANDLER_CHOICE" == "include" ]]; then
    oat project push "$ACTIVE_PROJECT"
  fi
else
  oat project push "$ACTIVE_PROJECT"
fi
printf '%s\\n' "$EVENTS"`;
    const executeRoutingHarness = (dirtyHandlerChoice: string) =>
      execFileSync(
        '/bin/bash',
        ['-c', routingHarness, 'brainstorm-fold-back-routing'],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            ACTIVE_PROJECT: '/tmp/synced-project',
            ARTIFACT_PATH: '/tmp/synced-project/design.md',
            DIRTY_HANDLER_CHOICE: dirtyHandlerChoice,
          },
        },
      ).trim();

    expect(executeRoutingHarness('')).toBe('dirty-handler,');
    expect(executeRoutingHarness('include')).toBe('dirty-handler,push,');
  });

  it('commits new synced summary decisions durably without consuming unrelated staged state', () => {
    const content = readFileSync(
      repoFilePath('.agents/skills/oat-project-summary/SKILL.md'),
      'utf8',
    );
    const promotionStep = content.slice(
      content.indexOf('### Step 7: Promote Key Decisions'),
      content.indexOf('### Step 8: Commit'),
    );
    const commitStep = content.slice(
      content.indexOf('### Step 8: Commit'),
      content.indexOf('### Step 9: Output Summary'),
    );

    expect(content).toContain(
      'UNRELATED_STAGED_PATCH_BEFORE=$(git diff --cached --binary)',
    );
    expect(promotionStep).toContain('DECISION_CREATE=$(oat decision new');
    expect(promotionStep).toContain('--consequences "<consequences>" --json)');
    expect(promotionStep).toContain(
      'PROMOTED_DECISION_PATHS+=("$DECISION_RECORD_PATH")',
    );
    expect(commitStep).toContain(
      'PARENT_COMMIT_MESSAGE="docs: promote summary decisions for {project-name}"',
    );
    expect(commitStep).toContain(
      'git commit --only -m "$PARENT_COMMIT_MESSAGE" -- "${PARENT_OUTPUT_PATHS[@]}"',
    );
    expect(commitStep).toContain(
      'PARENT_COMMIT_PATHS=$(git diff-tree --no-commit-id --name-only -r "$PARENT_DURABILITY_COMMIT")',
    );
    expect(
      commitStep.indexOf('PARENT_DURABILITY_COMMIT=$(git rev-parse HEAD)'),
    ).toBeLessThan(commitStep.indexOf('SUMMARY_PUSH=$(oat project push'));
    expect(commitStep).toContain(
      '[ "$UNRELATED_STAGED_PATCH_AFTER" = "$UNRELATED_STAGED_PATCH_BEFORE" ]',
    );
    expect(commitStep).not.toContain('git add .oat/repo/reference/decisions/');
  });

  it('commits synced retro targets before writeback with recoverable receipts', () => {
    const content = readFileSync(
      repoFilePath(
        '.agents/skills/oat-project-retro/references/apply-procedure.md',
      ),
      'utf8',
    );
    const transaction = content.slice(
      content.indexOf('## Commit and Resume Strategy'),
    );

    expect(transaction).toMatch(
      /docs, agent-instruction, or\s+rule item lists every exact edited canonical file/,
    );
    expect(transaction).toMatch(
      /decision item lists the\s+exact generated or verified decision record[\s\S]*?managed decision\s+index only when this application changed it/,
    );
    expect(transaction).toContain(
      'UNRELATED_STAGED_PATCH_BEFORE=$(git diff --cached --binary)',
    );
    expect(transaction).toContain(
      'git commit --only -m "chore(oat): apply retro target $RP_ID" -- "${RETRO_TARGET_PATHS[@]}"',
    );
    expect(transaction).toContain(
      'RETRO_TARGET_COMMIT_PATHS=$(git diff-tree --no-commit-id --name-only -r "$RETRO_TARGET_COMMIT")',
    );
    expect(transaction).toContain(
      'APPLIED_REF="$RETRO_TARGET_COMMIT :: ${RETRO_TARGET_PATHS[*]}"',
    );
    expect(
      transaction.indexOf('RETRO_TARGET_COMMIT=$(git rev-parse HEAD)'),
    ).toBeLessThan(transaction.indexOf('RETRO_PUSH=$(oat project push'));
    expect(transaction).toContain(
      'RETRO_COMMIT_PATHS=("${RETRO_TARGET_PATHS[@]}" "$PROJECT_PATH/references/project-retro.md")',
    );
    expect(transaction).toContain(
      '[ "$UNRELATED_STAGED_PATCH_AFTER" = "$UNRELATED_STAGED_PATCH_BEFORE" ]',
    );
    expect(transaction).toMatch(
      /Before the parent target commit[\s\S]*?Do not write back or push/,
    );
    expect(transaction).toMatch(
      /Between the parent target commit and project-ref push[\s\S]*?Recover `Applied-ref`/,
    );
    expect(transaction).toMatch(
      /After both commits[\s\S]*?project-ref writeback receipt/,
    );
  });

  it('routes incomplete quick projects to quick-start from plan, progress, and next', () => {
    const plan = readRepoFile('.agents/skills/oat-project-plan/SKILL.md');
    const progress = readRepoFile(
      '.agents/skills/oat-project-progress/SKILL.md',
    );
    const next = readRepoFile('.agents/skills/oat-project-next/SKILL.md');

    // plan: the dead end is gone and both branches load their target.
    expect(plan).not.toContain(
      'Plan already produced by quick workflow. Run `oat-project-implement` to begin execution.',
    );
    // Branch association, not mere presence: swapping the two targets fails.
    const planNotReadyBranch = plan.slice(
      plan.indexOf('**Not implementation-ready**'),
      plan.indexOf('**Implementation-ready**'),
    );
    const planReadyBranch = plan.slice(
      plan.indexOf('**Implementation-ready**'),
      plan.indexOf('**Mode: `lite`**'),
    );
    expect(normalizeProse(planNotReadyBranch)).toContain(
      'Then load `oat-project-quick-start/SKILL.md` and follow its Step 0.5 resume branch.',
    );
    expect(planNotReadyBranch).not.toContain('oat-project-implement');
    expect(normalizeProse(planReadyBranch)).toContain(
      'Then load `oat-project-implement/SKILL.md` and follow it to begin execution.',
    );
    expect(planReadyBranch).not.toContain('oat-project-quick-start');
    expect(planNotReadyBranch).toContain(
      'Continue with: oat-project-quick-start',
    );
    expect(planReadyBranch).toContain('Continue with: oat-project-implement');

    // progress: the two-hop dead end row now targets quick-start.
    const progressQuick = progress.slice(
      progress.indexOf('**Quick mode'),
      progress.indexOf('**Import mode'),
    );
    expect(progressQuick).not.toMatch(
      /\|\s*plan\s*\|\s*in_progress\s*\|\s*Continue `oat-project-plan`\s*\|/,
    );
    expect(progressQuick).toMatch(
      /\|\s*plan\s*\|\s*in_progress\s*\|\s*Continue `oat-project-quick-start` when the plan is not implementation-ready/,
    );
    expect(progressQuick).toMatch(
      /\|\s*plan\s*\|\s*complete\s*\|\s*`oat-project-implement` when the plan is implementation-ready; otherwise `oat-project-quick-start`/,
    );
    const progressPlanRows = progressQuick
      .split('\n')
      .filter((line) => line.startsWith('| plan '))
      .map((line) => normalizeProse(line.split('|')[3] ?? '').trim());
    expect(progressPlanRows).toEqual([
      'Continue `oat-project-quick-start` when the plan is not implementation-ready; otherwise `oat-project-implement`',
      '`oat-project-implement` when the plan is implementation-ready; otherwise `oat-project-quick-start`',
    ]);
    expect(normalizeProse(progressQuick)).toContain(
      'load `oat-project-quick-start/SKILL.md` and follow its Step 0.5 resume branch',
    );

    // next: a readiness column, not an overloaded tier.
    const nextQuick = next.slice(
      next.indexOf('**Quick Mode:**'),
      next.indexOf('**Import Mode:**'),
    );
    const quickPlanRows = nextQuick
      .split('\n')
      .filter((line) => line.startsWith('| plan '));
    expect(nextQuick).toContain('| Quick Plan Readiness |');
    // The exact tuple set, not aggregate counts: every plan-phase boundary
    // classification Step 2 can produce — tier 3, tier 2, tier 1, and tier 1b —
    // has exactly one route, and a duplicated row cannot stand in for a missing
    // one. Tier 1b is `oat_status: complete` with a null `oat_ready_for`, which
    // readiness condition 2 can never satisfy, so it carries a single
    // always-not-ready row rather than a pair.
    expect(
      quickPlanRows.map((row) =>
        row
          .split('|')
          .slice(1, 6)
          .map((cell) => cell.trim()),
      ),
    ).toEqual([
      [
        'plan',
        'in_progress',
        'tier 3',
        'not ready',
        '`oat-project-quick-start`',
      ],
      [
        'plan',
        'in_progress',
        'tier 2',
        'not ready',
        '`oat-project-quick-start`',
      ],
      [
        'plan',
        'in_progress',
        'tier 1',
        'not ready',
        '`oat-project-quick-start`',
      ],
      ['plan', 'in_progress', 'tier 1', 'ready', '`oat-project-implement` \\*'],
      ['plan', 'complete', 'tier 1', 'not ready', '`oat-project-quick-start`'],
      ['plan', 'complete', 'tier 1', 'ready', '`oat-project-implement` \\*'],
      [
        'plan',
        'any',
        'tier 1b',
        'not ready (always)',
        '`oat-project-quick-start`',
      ],
    ]);
    // Tier 1b must not keep Step 2's own "advance to the next phase" arrow.
    expect(normalizeProse(next)).toContain(
      'Exception: in quick mode at the `plan` phase, a tier-1b artifact is evaluated against **quick plan readiness**',
    );
    expect(normalizeProse(next)).toContain(
      'readiness always fails, so it returns to the quick workflow instead of advancing to the next phase',
    );
    // The generic tier-1 rule must not silently outrank the readiness column.
    expect(normalizeProse(next)).toContain(
      "Exception: in quick mode at the `plan` phase, the Quick Mode table's `Quick Plan Readiness` column decides the target.",
    );
    expect(normalizeProse(nextQuick)).toContain(
      'load `oat-project-quick-start/SKILL.md` and follow its Step 0.5 resume branch',
    );
    // Tier semantics are preserved, not repurposed.
    expect(next).toMatch(
      /\*\*Tier 3 \(Template\/Empty\):\*\*[\s\S]{0,220}`oat_template == true`/,
    );
    expect(normalizeProse(nextQuick)).toContain(
      'applies to the `plan` phase only, and only after the boundary tier has already been classified by Step 2, so tier semantics are unchanged',
    );
  });

  it('defines quick plan readiness once and applies it in plan, progress, and next', () => {
    const quickStart = readRepoFile(
      '.agents/skills/oat-project-quick-start/SKILL.md',
    );

    // Defined exactly once, in quick-start.
    const definitionOwners = [
      '.agents/skills/oat-project-quick-start/SKILL.md',
      ...QUICK_ROUTING_SKILLS,
    ].filter((file) =>
      readRepoFile(file).includes(QUICK_PLAN_READINESS_DEFINITION),
    );
    expect(definitionOwners).toEqual([
      '.agents/skills/oat-project-quick-start/SKILL.md',
    ]);
    expect(quickStart.split(QUICK_PLAN_READINESS_DEFINITION)).toHaveLength(2);

    // The four recorded conditions plus the task condition, stated once.
    const predicate = quickStart.slice(
      quickStart.indexOf(QUICK_PLAN_READINESS_HEADING),
      quickStart.indexOf('### Step 4: Sync Project State'),
    );
    for (const condition of [
      '`oat_status: complete`',
      '`oat_ready_for: oat-project-implement`',
      '`oat_template: false`',
      'The `## Reviews` section records the Step 3.7 disposition',
      '`Plan artifact review: skipped (workflow.autoArtifactReview.plan=false)`',
      'At least one phase carries a substantive task',
    ]) {
      expect(predicate, condition).toContain(condition);
    }
    expect(predicate).toContain(
      'Substantive tasks alone never make a plan ready.',
    );

    // Referenced by name from the other three, which never restate it.
    for (const file of QUICK_ROUTING_SKILLS) {
      const content = readRepoFile(file);
      expect(content, `${file} references the predicate`).toMatch(
        /\*\*quick plan readiness\*\*/i,
      );
      expect(content, `${file} points at the definition`).toContain(
        '`oat-project-quick-start/SKILL.md`',
      );
    }
    const restatementRegions = [
      readRepoFile('.agents/skills/oat-project-plan/SKILL.md').slice(
        readRepoFile('.agents/skills/oat-project-plan/SKILL.md').indexOf(
          '**Mode: `quick`**',
        ),
        readRepoFile('.agents/skills/oat-project-plan/SKILL.md').indexOf(
          '**Mode: `lite`**',
        ),
      ),
      readRepoFile('.agents/skills/oat-project-progress/SKILL.md').slice(
        readRepoFile('.agents/skills/oat-project-progress/SKILL.md').indexOf(
          '**Quick mode',
        ),
        readRepoFile('.agents/skills/oat-project-progress/SKILL.md').indexOf(
          '**Import mode',
        ),
      ),
      readRepoFile('.agents/skills/oat-project-next/SKILL.md').slice(
        readRepoFile('.agents/skills/oat-project-next/SKILL.md').indexOf(
          '**Quick Mode:**',
        ),
        readRepoFile('.agents/skills/oat-project-next/SKILL.md').indexOf(
          '**Import Mode:**',
        ),
      ),
    ];
    for (const region of restatementRegions) {
      for (const restatement of [
        '`oat_status: complete`',
        '`oat_ready_for: oat-project-implement`',
        '`oat_template: false`',
        'Plan artifact review: skipped',
        'At least one phase carries a substantive task',
      ]) {
        expect(region, restatement).not.toContain(restatement);
      }
      expect(normalizeProse(region)).toMatch(
        /load `oat-project-quick-start\/SKILL\.md` and (?:apply|follow)/i,
      );
    }

    // The predicate classifies real plan fixtures, executed as written.
    const guard = extractQuickPlanReadinessGuard(quickStart);

    // Substantive tasks with Step 3 pre-review frontmatter: NOT ready.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: PRE_REVIEW_FRONTMATTER,
          reviews: PENDING_PLAN_ROW,
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('not-ready');

    // Reviewed completion: ready.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: PASSED_PLAN_ROW,
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('ready');

    // Explicit policy skip: ready.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: POLICY_SKIP_DISPOSITION,
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('ready');

    // Negative control: complete frontmatter and real tasks, but the Step 3.7
    // disposition was never recorded. Readiness is frontmatter plus review, so
    // this must fail even though every task is substantive.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: PENDING_PLAN_ROW,
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('not-ready');

    // Negative control: reviewed and complete, but only template placeholders.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: PASSED_PLAN_ROW,
          tasks: TEMPLATE_TASKS,
        }),
      ),
    ).toBe('not-ready');

    // Per-clause negative controls: each frontmatter field is proved
    // independently load-bearing by flipping exactly one of the three while the
    // other two, the review disposition, and the tasks all stay ready.
    for (const [field, replacement] of [
      ['oat_status', 'oat_status: in_progress'],
      ['oat_ready_for', 'oat_ready_for: null'],
      ['oat_template', 'oat_template: true'],
    ] as const) {
      expect(
        classifyQuickPlan(
          guard,
          quickPlanFixture({
            frontmatter: REVIEWED_FRONTMATTER.map((line) =>
              line.startsWith(`${field}:`) ? replacement : line,
            ),
            reviews: PASSED_PLAN_ROW,
            tasks: SUBSTANTIVE_TASKS,
          }),
        ),
        field,
      ).toBe('not-ready');
    }

    // A contradictory duplicate key is never read as ready.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: [...REVIEWED_FRONTMATTER, 'oat_template: true'],
          reviews: PASSED_PLAN_ROW,
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('not-ready');

    // An unterminated frontmatter block must not let body text satisfy the
    // readiness fields.
    expect(
      classifyQuickPlan(
        guard,
        [
          '---',
          'oat_plan_source: quick',
          '',
          '# Implementation Plan: Example',
          '',
          ...REVIEWED_FRONTMATTER,
          '',
          '## Phase 1: Example',
          '',
          ...SUBSTANTIVE_TASKS,
          '',
          '## Reviews',
          '',
          ...PASSED_PLAN_ROW,
          '',
        ].join('\n'),
      ),
    ).toBe('not-ready');

    // The skip disposition counts only as its own line, not as quoted prose.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: [
            ...PENDING_PLAN_ROW,
            '',
            'A policy skip would be recorded as `Plan artifact review: skipped (workflow.autoArtifactReview.plan=false)` here.',
          ],
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('not-ready');

    // A policy-skip line inside a fenced example does not dispose of a pending
    // review row.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: [
            ...PENDING_PLAN_ROW,
            '',
            '```text',
            'Plan artifact review: skipped (workflow.autoArtifactReview.plan=false)',
            '```',
          ],
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('not-ready');

    // Tilde fences hide example task headings too.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: PASSED_PLAN_ROW,
          tasks: [
            '~~~markdown',
            '### Task p01-t01: Example task heading in a tilde-fenced sample',
            '~~~',
          ],
        }),
      ),
    ).toBe('not-ready');

    // A task heading outside every phase does not satisfy condition 5.
    expect(
      classifyQuickPlan(
        guard,
        [
          '---',
          ...REVIEWED_FRONTMATTER,
          '---',
          '',
          '# Implementation Plan: Example',
          '',
          '## Appendix',
          '',
          ...SUBSTANTIVE_TASKS,
          '',
          '## Reviews',
          '',
          ...PASSED_PLAN_ROW,
          '',
        ].join('\n'),
      ),
    ).toBe('not-ready');

    // A title made only of placeholders and punctuation is not real text.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: PASSED_PLAN_ROW,
          tasks: ['### Task p01-t01: {Task Name} — {Details}'],
        }),
      ),
    ).toBe('not-ready');

    // A backtick fence nested inside a tilde fence stays fenced: an example
    // `passed` row after the real pending row must not dispose of it.
    const nestedFenceExample = [
      '~~~text',
      'Example of a dispositioned review section:',
      '',
      '```',
      '| plan  | artifact | passed  | 2026-09-07 | reviews/example.md |',
      '```',
      '~~~',
    ];
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: [...PENDING_PLAN_ROW, '', ...nestedFenceExample],
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('not-ready');
    // Order-independence, proved without leaning on `tail -1`: the fenced
    // `passed` row is the ONLY plan row in the document, so a parser that leaks
    // it returns ready.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: [...nestedFenceExample, '', ...REVIEW_TABLE_HEADER],
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('not-ready');

    // CommonMark nesting: an example that nests correctly (outer marker run
    // longer than the inner one) stays fenced through the inner closer.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: [
            ...PENDING_PLAN_ROW,
            '',
            '~~~~text',
            '~~~yaml',
            'nested: true',
            '~~~',
            '',
            '| plan  | artifact | passed  | 2026-09-07 | reviews/example.md |',
            '~~~~',
          ],
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('not-ready');

    // A four-space-indented example row is indented code, not the record.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: [
            ...PENDING_PLAN_ROW,
            '',
            '    | plan  | artifact | passed  | 2026-09-07 | reviews/example.md |',
          ],
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('not-ready');

    // An indented (non-fenced) code block is still an example, not the record.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: [
            ...PENDING_PLAN_ROW,
            '',
            '    Plan artifact review: skipped (workflow.autoArtifactReview.plan=false)',
          ],
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('not-ready');

    // CommonMark measures indentation in columns, so one leading tab is
    // already a four-column code indentation. A tab-indented apparent CLOSER
    // never ends the example: the `passed` row below stays fenced, and the
    // real pending row remains the only disposition. Counting the tab as a
    // single character closed the fence and published the example row.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: [
            ...PENDING_PLAN_ROW,
            '',
            '```text',
            'Example of a dispositioned review section:',
            '\t```',
            '| plan  | artifact | passed  | 2026-09-07 | reviews/example.md |',
            '```',
            '```',
          ],
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('not-ready');

    // The same column rule applies to an OPENER. A tab-indented marker is
    // indented code, not a fence, so the bare marker after it opens the
    // example that hides the `passed` row. Reading the tab as one column
    // instead desynchronized the scan: it opened on the tab and closed on the
    // bare marker, leaving the example row exposed as the record.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: [
            ...PENDING_PLAN_ROW,
            '',
            '\t```',
            '```',
            '| plan  | artifact | passed  | 2026-09-07 | reviews/example.md |',
            '```',
          ],
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('not-ready');

    // Task extraction carries the identical fence logic, so it gets the
    // identical control: a tab-indented apparent closer must not promote an
    // example task heading into the substantive-task condition.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: PASSED_PLAN_ROW,
          tasks: [
            '```markdown',
            'Example task shape:',
            '\t```',
            '### Task p01-t01: Example task heading in a fenced sample',
            '```',
            '```',
          ],
        }),
      ),
    ).toBe('not-ready');

    // `oat_template` follows the repository's absent-or-false convention, so a
    // plan that predates the field is still ready.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER.filter(
            (line) => !line.startsWith('oat_template:'),
          ),
          reviews: PASSED_PLAN_ROW,
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('ready');

    // An unpaired quote is a different scalar to YAML, and fails closed here.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER.map((line) =>
            line.startsWith('oat_status:') ? "oat_status: complete'" : line,
          ),
          reviews: PASSED_PLAN_ROW,
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('not-ready');

    // An explicit null `oat_template` is "not a template", like an absent key.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER.map((line) =>
            line.startsWith('oat_template:') ? 'oat_template:' : line,
          ),
          reviews: PASSED_PLAN_ROW,
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('ready');

    // Alternate key spellings must not smuggle a real template past the check.
    for (const templateLine of [
      'oat_template : true',
      '"oat_template": true',
      'oat_template: maybe',
    ]) {
      expect(
        classifyQuickPlan(
          guard,
          quickPlanFixture({
            frontmatter: REVIEWED_FRONTMATTER.map((line) =>
              line.startsWith('oat_template:') ? templateLine : line,
            ),
            reviews: PASSED_PLAN_ROW,
            tasks: SUBSTANTIVE_TASKS,
          }),
        ),
        templateLine,
      ).toBe('not-ready');
    }

    // Quoted YAML scalars are the same values.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: [
            "oat_status: 'complete'",
            "oat_ready_for: 'oat-project-implement'",
            'oat_plan_source: quick',
            'oat_template: "false"',
          ],
          reviews: PASSED_PLAN_ROW,
          tasks: SUBSTANTIVE_TASKS,
        }),
      ),
    ).toBe('ready');

    // A task heading that only appears inside a fenced example is not a task.
    expect(
      classifyQuickPlan(
        guard,
        quickPlanFixture({
          frontmatter: REVIEWED_FRONTMATTER,
          reviews: PASSED_PLAN_ROW,
          tasks: [
            '```markdown',
            '### Task p01-t01: Example task heading in a fenced sample',
            '```',
          ],
        }),
      ),
    ).toBe('not-ready');
  });

  it('re-resolves PROJECT_PATH after scaffolding so the absorbed consolidation fields land in the created project', () => {
    const quickStart = readRepoFile(
      '.agents/skills/oat-project-quick-start/SKILL.md',
    );
    const scaffoldBlock = extractQuickScaffoldBlock(quickStart).replace(
      '{project-name}',
      'absorbing-project',
    );
    const { workspace, repository, env } =
      createScaffoldWorkspace(builtCliEntry());

    try {
      // The skill's own block, run verbatim between a real Step 0.5 resolve and
      // a real Step 1 + consolidation frontmatter write. `retired-scaffold` is
      // the active project when quick-start starts, which is exactly the
      // consolidation case: this run absorbs it rather than continuing it.
      const driver = [
        'set -eu',
        'git init -q .',
        'git config user.email quick-start@example.invalid',
        'git config user.name "Quick Start Control"',
        "printf '# scratch\\n' > README.md",
        'git add -A',
        'git commit -q -m init',
        'oat config set projects.defaultScope shared --shared > /dev/null',
        'oat project new "retired-scaffold" --mode quick --json > /dev/null',
        'PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)',
        `printf 'step0.5:%s\\n' "$PROJECT_PATH"`,
        scaffoldBlock,
        // Step 1 and the consolidation fields, written through PROJECT_PATH
        // exactly as the skill directs. Nothing here names the project
        // directory, so the resolved variable alone decides where they land.
        `awk 'NR == 1 && /^---$/ { print; print "absorbed_projects: [retired-scaffold]"; print "absorbed_backlog_ids: [BL-260907-example]"; next } { print }' "$PROJECT_PATH/state.md" > "$PROJECT_PATH/state.md.tmp"`,
        'mv "$PROJECT_PATH/state.md.tmp" "$PROJECT_PATH/state.md"',
        `printf 'resolved:%s\\n' "$PROJECT_PATH"`,
      ].join('\n');

      const stdout = execFileSync('/bin/bash', ['-c', driver], {
        cwd: repository,
        encoding: 'utf8',
        env,
      });
      const reported = (prefix: string): string | undefined =>
        stdout
          .split('\n')
          .filter((line) => line.startsWith(prefix))
          .map((line) => line.slice(prefix.length))
          .at(-1);
      const stale = reported('step0.5:');
      const resolved = reported('resolved:');

      // Scaffolding repoints `activeProject`, so the Step 0.5 value is stale
      // from the moment `oat project new` returns.
      expect(stale).toBe('.oat/projects/shared/retired-scaffold');
      expect(resolved).toBe('.oat/projects/shared/absorbing-project');

      const created = readFileSync(
        join(repository, '.oat/projects/shared/absorbing-project/state.md'),
        'utf8',
      );
      const retired = readFileSync(
        join(repository, '.oat/projects/shared/retired-scaffold/state.md'),
        'utf8',
      );

      // Read the fields back out of the project the scaffolder actually
      // created. Completion's absorbed-project sweep reads these two fields
      // there and nowhere else.
      expect(created).toContain('absorbed_projects: [retired-scaffold]');
      expect(created).toContain('absorbed_backlog_ids: [BL-260907-example]');
      // Without the re-resolve they landed in the scaffold being retired.
      expect(retired).not.toContain('absorbed_projects:');
      expect(retired).not.toContain('absorbed_backlog_ids:');
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('stops the quick-start scaffold branch when the real scaffolder fails and leaves a valid stale PROJECT_PATH', () => {
    const quickStart = readRepoFile(
      '.agents/skills/oat-project-quick-start/SKILL.md',
    );
    // A real `oat project new` failure: the CLI rejects the name, reports
    // `status: error` with no `projectPath`, and leaves `activeProject`
    // pointing at the project that is being retired -- whose `state.md` is
    // perfectly valid, so an existence check alone would wave it through.
    const scaffoldBlock = extractQuickScaffoldBlock(quickStart).replace(
      '{project-name}',
      'bad name!',
    );
    const { workspace, repository, env } =
      createScaffoldWorkspace(builtCliEntry());

    try {
      const setup = [
        'set -eu',
        'git init -q .',
        'git config user.email quick-start@example.invalid',
        'git config user.name "Quick Start Control"',
        "printf '# scratch\\n' > README.md",
        'git add -A',
        'git commit -q -m init',
        'oat config set projects.defaultScope shared --shared > /dev/null',
        'oat project new "retired-scaffold" --mode quick --json > /dev/null',
      ].join('\n');
      execFileSync('/bin/bash', ['-c', setup], {
        cwd: repository,
        encoding: 'utf8',
        env,
      });

      const retiredState = join(
        repository,
        '.oat/projects/shared/retired-scaffold/state.md',
      );
      const before = readFileSync(retiredState, 'utf8');

      let exitCode = 0;
      try {
        execFileSync('/bin/bash', ['-c', scaffoldBlock], {
          cwd: repository,
          encoding: 'utf8',
          env,
          stdio: 'pipe',
        });
      } catch (error) {
        exitCode = (error as { status?: number }).status ?? -1;
      }

      // Falling back to `activeProject` unconditionally would resolve back to
      // the retired scaffold and let Step 1 write into it.
      expect(exitCode).toBe(1);
      expect(readFileSync(retiredState, 'utf8')).toBe(before);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('stops the quick-start scaffold branch when the reported PROJECT_PATH has no state.md', () => {
    const quickStart = readRepoFile(
      '.agents/skills/oat-project-quick-start/SKILL.md',
    );
    const scaffoldBlock = extractQuickScaffoldBlock(quickStart).replace(
      '{project-name}',
      'absorbing-project',
    );
    const workspace = mkdtempSync(join(tmpdir(), 'quick-start-validate-'));

    try {
      const binDirectory = join(workspace, 'bin');
      mkdirSync(binDirectory, { recursive: true });
      // A scaffolder that reports a path it did not create. The block must
      // stop here rather than let Step 1 and the consolidation write pick
      // some other target.
      writeFileSync(
        join(binDirectory, 'oat'),
        [
          '#!/bin/sh',
          'if [ "$1" = "project" ]; then',
          '  printf \'{\\n  "status": "ok",\\n  "projectPath": ".oat/projects/shared/never-created"\\n}\\n\'',
          '  exit 0',
          'fi',
          'exit 0',
        ].join('\n'),
        { mode: 0o755 },
      );

      let exitCode = 0;
      try {
        execFileSync('/bin/bash', ['-c', scaffoldBlock], {
          cwd: workspace,
          encoding: 'utf8',
          env: {
            ...process.env,
            HOME: workspace,
            PATH: `${binDirectory}:${process.env.PATH ?? ''}`,
          },
          stdio: 'pipe',
        });
      } catch (error) {
        exitCode = (error as { status?: number }).status ?? -1;
      }

      expect(exitCode).toBe(1);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it('explains why spec-driven planning stops and names a recoverable continuation', () => {
    const plan = readRepoFile('.agents/skills/oat-project-plan/SKILL.md');
    const planQuickBranch = plan.slice(
      plan.indexOf('**Mode: `quick`**'),
      plan.indexOf('**Mode: `lite`**'),
    );

    expect(normalizeProse(planQuickBranch)).toContain(
      'Spec-driven planning does not apply: the quick workflow owns `plan.md` from discovery through the review disposition it records at its Step 3.7',
    );
    expect(planQuickBranch).toContain('Continue with: oat-project-quick-start');
    expect(planQuickBranch).toContain('Continue with: oat-project-implement');
    expect(plan).toContain(
      '- **`quick`**: **Stop.** Spec-driven planning does not apply here: the quick workflow authors `plan.md` itself',
    );

    const progress = readRepoFile(
      '.agents/skills/oat-project-progress/SKILL.md',
    );
    expect(normalizeProse(progress)).toContain(
      'A not-ready quick plan is not a dead end and does not need spec-driven planning',
    );

    const next = readRepoFile('.agents/skills/oat-project-next/SKILL.md');
    expect(normalizeProse(next)).toContain(
      'Spec-driven planning is not the recovery path for a quick project.',
    );
  });

  it('documents quick-start resume for an existing incomplete quick project', () => {
    const quickStart = readRepoFile(
      '.agents/skills/oat-project-quick-start/SKILL.md',
    );
    const stepZeroFive = quickStart.slice(
      quickStart.indexOf('### Step 0.5: Resolve Active Project'),
      quickStart.indexOf('### Step 1: Set Quick Workflow Metadata'),
    );

    expect(stepZeroFive).toContain(
      '**Resume in place (existing incomplete quick project).**',
    );
    expect(normalizeProse(stepZeroFive)).toContain(
      'this skill resumes that project and never re-scaffolds it: `oat project new` is not re-run',
    );
    // The resume path must not let Step 3 rewrite an existing plan body.
    expect(normalizeProse(stepZeroFive)).toContain(
      'Step 3 updates the existing `plan.md` in place: it reads `.oat/templates/plan.md` only when `plan.md` is missing',
    );
    expect(normalizeProse(stepZeroFive)).toContain(
      'never replaces phases, tasks, or `## Reviews` rows that the earlier run already wrote',
    );
    expect(stepZeroFive).toContain('Evaluate **quick plan readiness**');

    // The resume branch is decided before the create-a-new-project branch.
    expect(
      stepZeroFive.indexOf('**Resume in place (existing incomplete quick'),
    ).toBeLessThan(stepZeroFive.indexOf('If no valid active project exists:'));
    // Re-scaffolding stays on the no-active-project branch only.
    expect(
      stepZeroFive.indexOf('oat project new "{project-name}" --mode quick'),
    ).toBeGreaterThan(
      stepZeroFive.indexOf('If no valid active project exists:'),
    );

    expect(quickStart).toContain(
      '- ✅ An existing incomplete quick project resumed in place against **quick plan readiness** instead of being re-scaffolded.',
    );

    // The in-place constraint must live in Step 3 itself, not only remotely in
    // Step 0.5: Step 3 is where the template would otherwise be read.
    const stepThree = quickStart.slice(
      quickStart.indexOf('### Step 3: Generate Plan Directly'),
      quickStart.indexOf(
        '### Step 3.5: Resolve Dispatch Policy Before Implementation Readiness',
      ),
    );
    expect(normalizeProse(stepThree)).toContain(
      '`.oat/templates/plan.md` is read only when `"$PROJECT_PATH/plan.md"` is missing.',
    );
    expect(normalizeProse(stepThree)).toContain(
      'never replaces phases, tasks, or `## Reviews` rows an earlier run already wrote',
    );
    expect(normalizeProse(stepThree)).toContain(
      'does not license a template rewrite of existing content',
    );
  });

  it('oat-project-next skips revision resume for a complete lifecycle and keeps it for an active one', () => {
    const next = readRepoFile('.agents/skills/oat-project-next/SKILL.md');

    // The discriminator has to be readable at Step 1, or Step 5.2 has nothing
    // to read.
    expect(next).toContain('| `oat_lifecycle`');
    expect(normalizeProse(next)).toContain(
      '`complete` is the terminal signal Step 5.2 reads',
    );

    const stepFiveTwo = next.slice(
      next.indexOf('**5.2: Incomplete revision tasks**'),
      next.indexOf('**5.3: Unprocessed reviews**'),
    );

    // Terminal branch: lifecycle complete suppresses the revision resume.
    expect(normalizeProse(stepFiveTwo)).toContain(
      'Read `oat_lifecycle` from `state.md` before grepping anything.',
    );
    expect(normalizeProse(stepFiveTwo)).toContain(
      'When `oat_lifecycle` is `complete`, revision phases are historical: skip this check and fall through to 5.3, and do not route to `oat-project-implement` even when `p-revN` tasks are still marked incomplete.',
    );
    // Lifecycle, not phase status or a null current task, is the terminal
    // signal — the same rule the control-plane recommender applies.
    expect(normalizeProse(stepFiveTwo)).toContain(
      'neither a null current task nor a `complete` or `pr_open` `oat_phase_status` is terminal',
    );
    // The guard carries no workflow-mode branch.
    expect(normalizeProse(stepFiveTwo)).toContain(
      'applies identically to `spec-driven`, `quick`, `import`, and `lite` projects',
    );

    // Active branch: the pre-existing route text survives byte for byte.
    expect(stepFiveTwo).toContain(
      'Grep plan.md for `p-revN` phases. If any `p-revN` tasks exist with status != completed in implementation.md:\n→ Route to `oat-project-implement`\n→ Announce: "Revision tasks pending — continuing implementation"',
    );
    expect(normalizeProse(stepFiveTwo)).toContain(
      'For every other `oat_lifecycle` value the check below is unchanged.',
    );

    // The guard is read before the grep, not after it.
    expect(
      stepFiveTwo.indexOf('Read `oat_lifecycle` from `state.md`'),
    ).toBeLessThan(stepFiveTwo.indexOf('Grep plan.md for `p-revN` phases'));
  });
});

/**
 * Wave-5 p09: the active project pointer survives an interrupted durable
 * archive completion.
 *
 * Every case runs the skill's own marked bash blocks rather than string
 * matching them, because the claim under test is what the guard *does* on a
 * resume, and a text-presence assertion is not evidence of recovery.
 */
describe('durable archive active-pointer deferral', () => {
  const COMPLETE_SKILL = '.agents/skills/oat-project-complete/SKILL.md';
  const RECEIPT_SCRIPT =
    '.agents/skills/oat-project-complete/scripts/validate-durable-archive-receipt.mjs';
  const SEAL_HEADING =
    '### 2026-09-08 · structural · oat-project-complete · seal';

  function extractMarkedBlock(content: string, marker: string): string {
    const start = content.indexOf(`# ${marker}:start`);
    const end = content.indexOf(`# ${marker}:end`, start);
    if (start < 0 || end <= start) {
      throw new Error(`Missing ${marker} block in ${COMPLETE_SKILL}.`);
    }
    return content.slice(start, end);
  }

  /**
   * The skill's own scope-to-durability derivation, so `local` is classified by
   * the shipped snippet instead of by a constant restated in this test.
   */
  function extractDurableDerivation(content: string): string {
    const start = content.indexOf('IS_DURABLE_PROJECT="false"');
    const end = content.indexOf('fi', start);
    if (start < 0 || end <= start) {
      throw new Error(
        `Missing IS_DURABLE_PROJECT derivation in ${COMPLETE_SKILL}.`,
      );
    }
    return content.slice(start, end + 2);
  }

  interface GuardRun {
    status: number | null;
    stdout: string;
    stderr: string;
    oatCalls: string;
  }

  /**
   * Runs a guard block with `oat` replaced by a recorder, so a pointer clear is
   * observable and no real configuration is touched.
   */
  function runGuard(options: {
    block: string;
    preamble?: string;
    epilogue?: string;
    directory: string;
  }): GuardRun {
    const oatLog = join(options.directory, 'oat-calls.log');
    const script = [
      'set -u',
      `oat() { printf '%s\\n' "$*" >> ${JSON.stringify(oatLog)}; }`,
      options.preamble ?? '',
      options.block,
      options.epilogue ?? '',
    ].join('\n');
    const result = spawnSync('/bin/bash', ['-c', script], { encoding: 'utf8' });
    return {
      status: result.status,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      oatCalls: existsSync(oatLog) ? readFileSync(oatLog, 'utf8') : '',
    };
  }

  function terminalArchivedState(): string {
    return [
      '---',
      'oat_lifecycle: complete',
      '---',
      '',
      '**Status:** Lifecycle complete; archived locally',
      '',
    ].join('\n');
  }

  /**
   * A completion fixture at a chosen interruption point: the source project
   * directory is present or already archived away, and the archived root holds
   * the given number of candidate archives.
   */
  function archiveFixture(options: {
    sourceExists: boolean;
    archives: number;
  }): {
    directory: string;
    projectPath: string;
    archivedRoot: string;
    projectName: string;
    archivePaths: string[];
  } {
    const directory = mkdtempSync(join(tmpdir(), 'p09-durable-archive-'));
    const projectName = 'demo-project';
    const projectsRoot = join(directory, '.oat', 'projects');
    const projectPath = join(projectsRoot, 'shared', projectName);
    const archivedRoot = join(projectsRoot, 'archived');
    mkdirSync(archivedRoot, { recursive: true });

    if (options.sourceExists) {
      mkdirSync(projectPath, { recursive: true });
      writeFileSync(join(projectPath, 'state.md'), terminalArchivedState());
    } else {
      mkdirSync(join(projectsRoot, 'shared'), { recursive: true });
    }

    const archivePaths: string[] = [];
    for (let index = 0; index < options.archives; index += 1) {
      const archivePath = join(
        archivedRoot,
        `2026090${index + 1}-${projectName}`,
      );
      mkdirSync(archivePath, { recursive: true });
      writeFileSync(join(archivePath, 'state.md'), terminalArchivedState());
      writeFileSync(
        join(archivePath, 'project-log.md'),
        `# Project Log\n\n## Entries\n\n${SEAL_HEADING}\n\nCompletion sealed. oat-seal:${projectName}\n`,
      );
      archivePaths.push(archivePath);
    }

    return { directory, projectPath, archivedRoot, projectName, archivePaths };
  }

  function resumePreamble(fixture: {
    projectPath: string;
    projectName: string;
  }): string {
    return [
      'PROJECT_SCOPE=shared',
      `PROJECT_PATH=${JSON.stringify(fixture.projectPath)}`,
      `PROJECT_NAME=${JSON.stringify(fixture.projectName)}`,
      `DURABLE_ARCHIVE_RECEIPT_SCRIPT=${JSON.stringify(repoFilePath(RECEIPT_SCRIPT))}`,
    ].join('\n');
  }

  const RESUME_EPILOGUE = [
    'echo "RESUME=$SHARED_ARCHIVE_RESUME"',
    'echo "PROJECT_PATH=$PROJECT_PATH"',
  ].join('\n');

  it('retains the active pointer for every archive-enabled durable scope', () => {
    const content = readRepoFile(COMPLETE_SKILL);
    const block = extractMarkedBlock(content, 'active-pointer-guard');
    const derivation = extractDurableDerivation(content);
    const directory = mkdtempSync(join(tmpdir(), 'p09-retain-'));

    try {
      for (const scope of ['shared', 'synced'] as const) {
        const run = runGuard({
          block,
          preamble: [
            `PROJECT_SCOPE=${scope}`,
            derivation,
            'SHOULD_ARCHIVE=true',
          ].join('\n'),
          directory,
        });

        expect(run.status, run.stderr).toBe(0);
        expect(
          run.stdout,
          `${scope} archive completions defer the clear`,
        ).toContain('Active project pointer retained');
        expect(
          run.oatCalls,
          `${scope} must not clear the pointer before the archive receipt validates`,
        ).toBe('');
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('clears the active pointer for local and for every non-archive completion', () => {
    const content = readRepoFile(COMPLETE_SKILL);
    const block = extractMarkedBlock(content, 'active-pointer-guard');
    const derivation = extractDurableDerivation(content);

    const cases = [
      // `local` never archives, so keying the guard on SHOULD_ARCHIVE alone
      // would strand its pointer.
      { scope: 'local', shouldArchive: 'true' },
      { scope: 'shared', shouldArchive: 'false' },
      { scope: 'synced', shouldArchive: 'false' },
      { scope: 'local', shouldArchive: 'false' },
    ] as const;

    for (const testCase of cases) {
      const directory = mkdtempSync(join(tmpdir(), 'p09-clear-'));
      try {
        const run = runGuard({
          block,
          preamble: [
            `PROJECT_SCOPE=${testCase.scope}`,
            derivation,
            `SHOULD_ARCHIVE=${testCase.shouldArchive}`,
          ].join('\n'),
          directory,
        });

        const label = `${testCase.scope}/archive=${testCase.shouldArchive}`;
        expect(run.status, run.stderr).toBe(0);
        expect(run.stdout, `${label} clears immediately`).toContain(
          'Active project pointer cleared.',
        );
        expect(run.oatCalls, `${label} clears through the CLI`).toContain(
          'config set activeProject',
        );
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    }
  });

  it('validates the durable archive receipt before the Step 12 pointer clear', () => {
    const content = readRepoFile(COMPLETE_SKILL);

    // Document order: the archive happens long before the deferred clear.
    const archiveStepIndex = content.indexOf(
      '### Step 8: Archive Project (Conditional)',
    );
    const clearBlockIndex = content.indexOf('# deferred-pointer-clear:start');
    expect(archiveStepIndex).toBeGreaterThanOrEqual(0);
    expect(clearBlockIndex).toBeGreaterThan(archiveStepIndex);

    // Guard order: the non-synced branch validates the receipt, and only then
    // clears. A clear that ran first would strand an unvalidated archive.
    const block = extractMarkedBlock(content, 'deferred-pointer-clear');
    const receiptIndex = block.indexOf('--mode receipt');
    expect(receiptIndex).toBeGreaterThanOrEqual(0);
    const clearIndex = block.indexOf(
      'oat config set activeProject ""',
      receiptIndex,
    );
    expect(
      clearIndex,
      'the durable branch clears the pointer only after its receipt validates',
    ).toBeGreaterThan(receiptIndex);

    // Executed: a valid shared receipt validates through the real script and
    // the pointer clear follows it.
    const fixture = archiveFixture({ sourceExists: true, archives: 1 });
    try {
      const archiveReport = JSON.stringify({
        status: 'ok',
        mode: 'apply',
        archivePath: fixture.archivePaths[0],
      });
      const run = runGuard({
        block,
        preamble: [
          'SHARED_ARCHIVE_RESUME=false',
          'SHOULD_ARCHIVE=true',
          'IS_DURABLE_PROJECT=true',
          'PROJECT_SCOPE=shared',
          `PROJECT_NAME=${JSON.stringify(fixture.projectName)}`,
          `ARCHIVE_OUTPUT=${JSON.stringify(archiveReport)}`,
          `DURABLE_ARCHIVE_RECEIPT_SCRIPT=${JSON.stringify(repoFilePath(RECEIPT_SCRIPT))}`,
          'SYNCED_ARCHIVE_FINALIZE_SCRIPT=/nonexistent-synced-finalizer',
        ].join('\n'),
        directory: fixture.directory,
      });

      expect(run.status, run.stderr).toBe(0);
      expect(run.stdout).toContain('Durable archive receipt verified');
      expect(run.oatCalls).toContain('config set activeProject');
    } finally {
      rmSync(fixture.directory, { recursive: true, force: true });
    }
  });

  it('does not take the resume branch after complete-state', () => {
    const block = extractMarkedBlock(
      readRepoFile(COMPLETE_SKILL),
      'shared-archive-resume',
    );
    const fixture = archiveFixture({ sourceExists: true, archives: 0 });

    try {
      const run = runGuard({
        block,
        preamble: resumePreamble(fixture),
        epilogue: RESUME_EPILOGUE,
        directory: fixture.directory,
      });

      expect(run.status, run.stderr).toBe(0);
      expect(run.stdout, 'the source directory still exists').toContain(
        'RESUME=false',
      );
      expect(run.stdout).toContain(`PROJECT_PATH=${fixture.projectPath}`);
      expect(run.oatCalls, 'the pointer is untouched here').toBe('');
    } finally {
      rmSync(fixture.directory, { recursive: true, force: true });
    }
  });

  it('does not take the resume branch after the Step 7 PR artifact', () => {
    const block = extractMarkedBlock(
      readRepoFile(COMPLETE_SKILL),
      'shared-archive-resume',
    );
    const fixture = archiveFixture({ sourceExists: true, archives: 0 });

    try {
      mkdirSync(join(fixture.projectPath, 'pr'), { recursive: true });
      writeFileSync(
        join(fixture.projectPath, 'pr', 'description.md'),
        '# PR\n\nGenerated in Step 7.\n',
      );

      const run = runGuard({
        block,
        preamble: resumePreamble(fixture),
        epilogue: RESUME_EPILOGUE,
        directory: fixture.directory,
      });

      expect(run.status, run.stderr).toBe(0);
      expect(
        run.stdout,
        'a generated PR artifact is not an archive checkpoint',
      ).toContain('RESUME=false');
      expect(run.stdout).toContain(`PROJECT_PATH=${fixture.projectPath}`);
    } finally {
      rmSync(fixture.directory, { recursive: true, force: true });
    }
  });

  it('resumes to the clear after archive succeeded without any project-log append', () => {
    const content = readRepoFile(COMPLETE_SKILL);
    const resumeBlock = extractMarkedBlock(content, 'shared-archive-resume');
    const clearBlock = extractMarkedBlock(content, 'deferred-pointer-clear');
    const fixture = archiveFixture({ sourceExists: false, archives: 1 });
    const archivePath = fixture.archivePaths[0]!;

    try {
      const run = runGuard({
        block: [resumeBlock, clearBlock].join('\n'),
        preamble: [
          resumePreamble(fixture),
          'SHOULD_ARCHIVE=true',
          'IS_DURABLE_PROJECT=true',
          'ARCHIVE_OUTPUT=',
          'SYNCED_ARCHIVE_FINALIZE_SCRIPT=/nonexistent-synced-finalizer',
        ].join('\n'),
        epilogue: RESUME_EPILOGUE,
        directory: fixture.directory,
      });

      expect(run.status, run.stderr).toBe(0);
      expect(
        run.stdout,
        'the discovered archive is the resume checkpoint',
      ).toContain('RESUME=true');
      expect(run.stdout).toContain(`PROJECT_PATH=${archivePath}`);
      expect(run.stdout).toContain('Verified discovered shared archive');
      expect(run.stdout).toContain('cleared without a second archive');
      expect(run.oatCalls, 'the retained pointer is finally cleared').toContain(
        'config set activeProject',
      );

      // The whole point of the item: the resume goes straight to Step 12, so it
      // never re-enters Step 3.7 and attempts no project-log append at all.
      // This is the assertion that carries the invariant here — a seal count
      // taken from this fixture would be true by construction, because the
      // fixture writes one seal and these bash blocks never append. The
      // capable one-seal proof is
      // `lifecycle.integration.test.ts` > `leaves exactly one seal when a
      // pre-archive interruption resumes`, which drives the real CLI and goes
      // red when the seal dedupe or the refusal is neutralized.
      expect(
        run.oatCalls,
        'a resume appends nothing to the sealed project log',
      ).not.toContain('project log append');
    } finally {
      rmSync(fixture.directory, { recursive: true, force: true });
    }
  });

  it('stops for manual recovery when the archive is not discoverable', () => {
    const block = extractMarkedBlock(
      readRepoFile(COMPLETE_SKILL),
      'shared-archive-resume',
    );

    for (const archives of [0, 2]) {
      const fixture = archiveFixture({ sourceExists: false, archives });
      try {
        const run = runGuard({
          block,
          preamble: resumePreamble(fixture),
          epilogue: RESUME_EPILOGUE,
          directory: fixture.directory,
        });

        const label = `${archives} candidate archives`;
        expect(run.status, `${label} must not resume`).toBe(1);
        expect(run.stderr, label).toContain(
          'Shared archive completion cannot resume automatically',
        );
        expect(run.stderr, label).toContain('Manual recovery:');
        expect(
          run.oatCalls,
          `${label} leaves the retained pointer untouched`,
        ).toBe('');
      } finally {
        rmSync(fixture.directory, { recursive: true, force: true });
      }
    }
  });
});

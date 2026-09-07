import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expectDispatchStampFieldContract } from '@test-support/skills/dispatch-stamp-contract';
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

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.2.3');
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

  it('requires local and remote review rails to persist native dispatch lineage', () => {
    for (const skill of [
      'oat-project-review-provide',
      'oat-project-review-provide-remote',
    ]) {
      const content = readRepoFile(`.agents/skills/${skill}/SKILL.md`);
      expect(content, skill).toContain('native dispatch lineage');
      expect(content, skill).toContain('oat project dispatch record');
      expect(content, skill).toMatch(
        /immediately[^]{0,180}accepted[^]{0,160}blocked-before-start/i,
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

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.5.1');
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

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.7.8');
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
      'the seal is detected directly, since the probe reports no seal state',
    ).toContain('The status probe above reports no seal state');
    expect(
      resumeClause,
      'detection reads a real field of the probe result',
    ).toContain('read `logPath` from `PROJECT_LOG_CHECK`');
    expect(resumeClause, 'names the detectable seal heading').toContain(
      '### <date> · structural · oat-project-complete · seal',
    );
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

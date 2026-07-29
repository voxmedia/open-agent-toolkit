import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

describe('review skill contracts', () => {
  it('keeps reviewer timestamps aligned and next-step guidance inside the artifact template', () => {
    const content = readRepoFile('.agents/agents/oat-reviewer.md');
    const templateStart = content.indexOf('````markdown\n---');
    const templateEnd = content.indexOf('````', templateStart + 4);
    const nextStep = content.indexOf('## Recommended Next Step');

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.2.0');
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

  it('runs one non-blocking implementation-tail recap before final HiLL approval', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
    );

    expect(content).toContain(
      'A fresh `project-recap` manifest for the current completed implementation deduplicates the lifecycle-tail run: reuse it and do not invoke the adapter again.',
    );
    expect(content).toContain(
      'When `OAT_AUTONOMOUS=1` and no fresh recap exists, attempt `project-recap` exactly once; missing or stale persisted intent cannot suppress this autonomous attempt.',
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
      'When a project-recap attempt exists, include exactly one concise outcome item with its recipe, outcome (`built-durable`, `built-not-durable`, or `failed`), run path, and warning or recovery note when applicable.',
    );
    expect(content).toContain(
      'Use `manifest.json` and `build-record.json` as the source of truth; refresh the existing item instead of appending a duplicate.',
    );
    expect(content).toContain(
      'Omit `Explainer Outcome` when no project-recap attempt exists.',
    );
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
    expect(commitStep).toContain('git add "$PROJECT_PATH/project-log.md"');
    expect(commitStep).toContain('PROJECT_LOG_LEDGER_APPENDED');
    expect(commitStep).toContain('git add "$PROJECT_LOG_LEDGER_PATH"');
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
      /do not run a duplicate final\s+phase-only lifecycle review/,
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

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.5.0');
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

  it('integrates interactive completion recap policy before lifecycle mutation', () => {
    const content = readRepoFile(
      '.agents/skills/oat-project-complete/SKILL.md',
    );
    const normalizedContent = content.replace(/\s+/g, ' ');

    expect(content.match(/^version:\s*(.+)$/m)?.[1]?.trim()).toBe('1.6.0');
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

    const resolveIndex = normalizedContent.indexOf(
      'Resolve `projectRecap` intent before presenting the batched completion prompt.',
    );
    const recapIndex = normalizedContent.indexOf(
      '### Step 3.6: Select Final Project Recap',
    );
    const completeStateIndex = normalizedContent.indexOf(
      '### Step 5: Set Lifecycle Complete',
    );
    expect(resolveIndex).toBeGreaterThanOrEqual(0);
    expect(recapIndex).toBeGreaterThan(resolveIndex);
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
      'For `IS_SHARED_PROJECT="false"`, never export a tracked project recap and never construct or pass `--project-recap-run`.',
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
      '**Skip if `SHOULD_ARCHIVE` is false or `IS_SHARED_PROJECT` is false.**',
    );
    expect(content).toContain(
      'Archive happens after PR description generation (so artifacts are readable at tracked paths) but before commit+push (so the archive deletion is included in the commit).',
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
      'Prefer running the `oat-project-summary` skill when skill-to-skill invocation is available in the current host/runtime.',
    );
    expect(prFinalContent).toContain(
      'Do not assume `oat-project-summary` is a shell command on `PATH`.',
    );
    expect(prFinalContent).toContain(
      'Do not ask whether to generate or refresh `summary.md` during pr-final.',
    );
    expect(completeContent).toContain(
      'Also preflight summary status using the same freshness rules as `oat-project-summary`:',
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
      '**Run only when `WAS_PR_OPEN_AT_START="true"` AND `SHOULD_ARCHIVE="true"`.**',
    );
    expect(content).toContain('gh pr edit "$PR_REF" --body-file "$TMP_BODY"');
    expect(content).toContain(
      'If `gh pr edit` fails (e.g. PR was merged between Step 2 and now',
    );
  });
});

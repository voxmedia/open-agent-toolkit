import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function repoFilePath(relativePath: string): string {
  return join(import.meta.dirname, '../../../../../../../', relativePath);
}

function readRepoFile(relativePath: string): string {
  return readFileSync(repoFilePath(relativePath), 'utf8');
}

describe('review skill contracts', () => {
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
          'oat review latest --project "$PROJECT_PATH" --json',
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

  it('defines auto-review checkpoint scope from the last passed whole-phase review', () => {
    const skillPath = repoFilePath(
      '.agents/skills/oat-project-implement/SKILL.md',
    );
    const content = readFileSync(skillPath, 'utf8');

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

    expect(content).toContain(
      'If this is the final implementation phase checkpoint, run `oat-project-review-provide code final`',
    );
    expect(content).toContain(
      'do not run a duplicate final phase-only lifecycle review',
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
      /Tier 1: dispatch the selected reviewer target[\s\S]*?```(?<scope>[\s\S]*?)```/,
    )?.groups?.scope;
    expect(reviewScopeBlock).toBeDefined();
    expect(reviewScopeBlock).toContain(
      'model_axis: { selected:<value> | inherited | not-applicable | host-auto }',
    );
    expect(reviewScopeBlock).not.toContain(
      'model_axis: {inherited | selected:<Claude model>}',
    );
    expect(implementerContent).toContain(
      'Codex materialized reviewer role selected from a model+effort target',
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

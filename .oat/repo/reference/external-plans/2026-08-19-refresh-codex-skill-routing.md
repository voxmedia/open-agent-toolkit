---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-review
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260819-refresh-codex-skill-model.md
oat_external_plan_commit: 6f443c08
oat_backlog_items:
  - BL-260819-refresh-codex-skill-model
oat_issue_url: null
created: '2026-08-20T02:37:32Z'
---

# Route codex-skill through current model guidance and preserve repository checks

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

## Outcome

The bundled `codex-skill` selects models and reasoning effort from OAT's live
Codex provider guidance instead of a stale two-model list. Normal repository
invocations retain Codex's repository check, while the bypass appears only for
an established non-repository need and remains explicitly authorized.

## Source and live evidence

- Source artifact or scope:
  `.oat/repo/pjm/backlog/items/BL-260819-refresh-codex-skill-model.md`
- Planned at: commit `6f443c08` on `2026-08-19`
- Related backlog items: `BL-260819-refresh-codex-skill-model` — Refresh
  codex-skill model routing and repository-check policy
- Verified evidence:
  - `.agents/skills/codex-skill/SKILL.md:13` offers only `gpt-5.3-codex` and
    `gpt-5.4` and line 22 requires `--skip-git-repo-check` universally.
  - `.agents/skills/codex-skill/SKILL.md:35` embeds the bypass in the resume
    example, while line 41 presents a contradictory resume without it.
  - `.agents/skills/subagent-orchestration/references/provider-codex.md:16`
    identifies GPT-5.6 as the default family for new work and lines 34–42 map
    work classes to model and effort floors.
  - Repository policy requires one frontmatter version bump for every changed
    canonical skill and lockstep public-package bumps for shipped skill assets.

## Drift check

Run before editing:

```bash
git diff --stat 6f443c08..HEAD -- .agents/skills/codex-skill .agents/skills/subagent-orchestration/references/provider-codex.md packages/cli/src/validation packages/*/package.json pnpm-lock.yaml
```

If either skill changed, reread both files completely. A changed provider
matrix supersedes the model examples recorded here and must be followed rather
than copied from this plan.

## Repository conventions

- Build: `pnpm build` → all non-docs workspace builds pass.
- Typecheck: `pnpm type-check` → all TypeScript packages pass.
- Test: `pnpm test:skills` → skill contract tests pass.
- Lint/format check: `pnpm lint && pnpm format` → canonical skills and smoke
  tooling pass their dedicated checks.
- Implementation pattern: use
  `.agents/skills/subagent-orchestration/references/provider-codex.md` as the
  dated provider authority and task classes as the stable selection interface.
- Git/PR convention: increment `codex-skill` once in the final diff and bump
  all five public package versions in lockstep; do not push or open a PR unless
  instructed.

## Scope

### In scope

- `.agents/skills/codex-skill/SKILL.md` — model/effort selection, initial-run,
  cross-directory, resume, and repository-check bypass guidance.
- `.agents/skills/codex-skill/tests/` — a focused prose contract preventing the
  stale fixed list and blanket bypass from returning.
- The five public package manifests and `pnpm-lock.yaml` — required lockstep
  release metadata for a shipped canonical-skill change.

### Out of scope

- Changing the task-class matrix or provider catalog — this skill consumes
  those authorities; it does not redefine them.
- Changing Codex CLI behavior or probing undocumented flags.
- Refactoring unrelated provider skills or general subagent orchestration.
- Editing bundled copies under `packages/cli/assets` by hand — bundle tooling
  owns generated assets.

## Current state

`codex-skill` hard-codes an older selection prompt, always lists the repository
check bypass among command options, and then mandates it. Its own error-handling
section treats the bypass as high-impact and permission-gated, creating a
contract contradiction. The current provider authority instead routes by task
class and selects among the GPT-5.6 family with explicit effort floors.

## Implementation steps

### 1. Replace the fixed model prompt with authority-based selection

Rewrite the initial selection step so the agent classifies the requested work,
reads the current Codex provider reference, and offers only currently eligible
model/effort combinations. Preserve a single compact user decision when more
than one eligible route materially changes cost or capability; do not require
a question when the user already supplied a valid model and effort.

Examples may name the live GPT-5.6 routes at the planned commit, but the
instruction must identify the provider reference—not the example list—as the
source of truth. Do not promote compatibility snapshots as defaults.

**Verify:** `rg -n "gpt-5\\.3-codex|gpt-5\\.4" .agents/skills/codex-skill`
→ no stale fixed-choice instruction remains.

### 2. Make repository-check bypass conditional and consistent

Remove `--skip-git-repo-check` from normal initial-run, cross-directory, and
resume commands. State that it is used only when the target directory is not a
Git repository or another documented Codex requirement applies, and that the
agent must explain the reason and obtain authorization before adding it.

Normalize the resume examples so flags appear in valid positions and every
example agrees on inherited configuration and repository-check policy. Retain
the existing sandbox and high-impact authorization rules.

**Verify:** `rg -n "skip-git-repo-check" .agents/skills/codex-skill/SKILL.md`
→ every remaining occurrence is conditional or an explicitly authorized
non-repository example; none says always.

### 3. Add contract coverage and perform release bookkeeping

Add a Node test under `.agents/skills/codex-skill/tests/` that reads the
canonical skill and asserts:

- it points to the current provider-selection authority;
- it does not contain the stale two-model choice or `Always use` bypass text;
- it states the non-repository condition and authorization requirement; and
- initial, `-C`, and resume examples do not include the bypass as a default.

Bump `codex-skill` from `1.2.0` once. Bump the five public packages together in
accordance with repository release policy and update `pnpm-lock.yaml` through
the package manager when required.

**Verify:**
`pnpm test:skills && pnpm run check:skill-bumps && pnpm release:check-versions`
→ contract, skill-version, and lockstep-version gates pass.

## Test plan

- Add `.agents/skills/codex-skill/tests/codex-skill-contract.test.mjs` using
  `node:test` and repository-relative file resolution, matching neighboring
  skill contract tests.
- Make assertions semantic enough to allow wording improvements while still
  rejecting a fixed obsolete model list and blanket repository bypass.
- Focused command:
  `node --test .agents/skills/codex-skill/tests/*.test.mjs` → all codex-skill
  contract cases pass.
- Full skill/release commands:
  `pnpm lint && pnpm format && pnpm test:skills && pnpm run check:skill-bumps && pnpm release:check-versions && pnpm release:validate`
  → all exit zero.
- Full repository commands:
  `pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm build:docs`
  → all exit zero.

## Done criteria

- [ ] Model and effort selection names the provider reference as authority and
      no longer offers the obsolete fixed pair.
- [ ] Normal repository commands omit `--skip-git-repo-check`.
- [ ] Every remaining bypass path has a documented need and authorization.
- [ ] Initial-run, `-C`, and resume examples are mutually consistent.
- [ ] The skill contract test, skill version gate, and lockstep release gates
      pass.
- [ ] `git status --short` contains only the skill, its focused test, and
      required release metadata.

## STOP conditions

Stop and report instead of improvising when:

- the live provider matrix no longer exposes an eligible CLI model/effort
  route for the requested classes;
- live `codex --help` contradicts the command syntax the skill currently uses;
- the change would require weakening sandbox or high-impact authorization
  policy;
- release gates require unrelated product changes rather than lockstep
  metadata; or
- a named verification gate fails twice after one bounded correction.

## Review focus

- Treat the provider reference as the load-bearing routing authority.
- Check every command example, not only the numbered instructions, for a
  reintroduced blanket bypass.
- Confirm the canonical skill version and all five public package versions
  move exactly once in the final PR diff.

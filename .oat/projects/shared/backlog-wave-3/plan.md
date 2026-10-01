---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-01
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_template: true
oat_generated: false
oat_phase_review_gate:
  enabled: true
  phases: []
  review_type: code
  exit_nonzero_on: high
---

# Implementation Plan: backlog-wave-3

> Execute this plan using `oat-project-implement`. The six phases run
> sequentially on branch `wave/2026-09-30-backlog-wave-3`.

**Goal:** Ship Wave 3 of the backlog as one PR: close fourteen backlog items
with evidence (template resolver, Fumadocs navigation, recon publication and
Codex recovery, lifecycle closeout guards, and six small fixes) and bump the
lockstep packages to 0.3.10.

**Architecture:** Five sequential phases grouped by write set: template
resolver (p01), Fumadocs nav sync (p02), recon (p03), lifecycle closeout
(p04), small CLI and docs fixes (p05), and a release fan-in (p06).

**Tech Stack:** TypeScript ESM CLI (`packages/cli`, vitest), control-plane
(`packages/control-plane`), bundled skills under `.agents/skills` with
`node --test` suites, Fumadocs docs app (`apps/oat-docs`), oxfmt and oxlint.

**Commit Convention:** `{type}({task-id}): {description}`, for example
`feat(p01-t01): share one template resolver`. Commit bodies stay within
commitlint's 100-character line limit; check `git commit`'s exit code
explicitly, never through a pipe.

**Format command (every artifact-writing task):**
`pnpm exec oxfmt --write <changed files>` for Markdown, JSON, and JS/TS files.
Do not run oxfmt on `state.md`. Generated `meta.json` must already match oxfmt
output (p02-t01).

**Worker rules (every task):**

- Tests that exercise template resolution or anything reading `~/.oat` inject
  an isolated `HOME` (`HOME=$(mktemp -d)`).
- Behavior changes get a failing-first test; negative controls get a
  neutralize-and-restore proof (disable the guard, show the test fails,
  restore). Record both in the commit body.
- Version bumps: bump a skill's `metadata.version` (or an agent role's
  `version:`) only if `git diff origin/main -- <skill dir>` does not already
  show a bump on this branch. Update any pin of that version in
  `packages/cli/src/validation/skills.test.ts` or a skill's own contract test
  in the same commit. Run `pnpm run check:skill-bumps` before committing.
- Never `rm -rf` a variable path; use `mktemp -d` scratch directories.
- Use `node packages/cli/dist/index.js` (after `pnpm build`) for branch-CLI
  probes; the `oat` on PATH is the released CLI.
- Lanes regenerate provider views with `oat sync --scope project` only.

---

## Phase 1: Template resolver

Backlog: `BL-260927-expose-a-scoped-template` (lead item;
`DR-260927-templates-resolve-repository`).

### Task p01-t01: Share one template resolver in repository, user, bundle order

**Files:**

- Create: `packages/cli/src/commands/shared/template-source.ts` and its test
- Modify: `packages/cli/src/commands/project/new/scaffold.ts`
  (`resolveTemplateSource`, around line 447) and its callers, including
  `packages/cli/src/commands/project/promote.ts` (around lines 395 and 427)
- Modify: `packages/cli/src/commands/pjm/template-source.ts`
  (`resolvePjmTemplate`) to delegate to the shared module, keeping its exported
  shape for existing callers
- Modify: `packages/cli/src/commands/project/new/scaffold.test.ts` (the test
  around line 1105, "uses a user template before a differing repo template",
  flips to repository first)

**Step 1: Failing tests first**

Add resolver tests with an isolated `HOME`: repository template overrides a
differing user template; user-only resolves the user tier; neither resolves
the bundle tier; an invalid name (path separator or `..`) is rejected; a name
found nowhere returns a not-found result naming only the three tiers, with no
package-manager path. Flip the scaffold test. Run and confirm the new and
flipped tests fail.

**Step 2: Implement**

One function returns `{ tier: 'repository' | 'user' | 'bundle', path, content }`
in the order repository (`<repo>/.oat/templates`, or a caller-supplied
templates root), user (`<home>/.oat/templates`, home from `os.homedir()`
unless injected), bundle (assets root). The scaffold and PJM resolvers use it.
Leave `cleanup/project/project.ts` (repository-or-inline) and
`project/log/append.ts` (bundle-only) unchanged, and note why in the commit
body: neither copies a lifecycle template a user-scope install lacks.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/template-source.test.ts src/commands/project src/commands/pjm`
Expected: exit 0.

**Step 4: Commit**

`feat(p01-t01): share one template resolver in repository, user, bundle order`

---

### Task p01-t02: Add `oat template resolve`

**Files:**

- Create: `packages/cli/src/commands/template/index.ts`,
  `packages/cli/src/commands/template/resolve.ts`, and tests
- Modify: `packages/cli/src/commands/index.ts` (register the group),
  `packages/cli/src/commands/help-snapshots.test.ts` (root help plus the new
  group), `apps/oat-docs/docs/reference/cli-reference.md`

**Step 1: Failing tests first**

Cover `oat template resolve <name> [--json] [--output <path>]`:

- Human and `--json` output report `name`, `found`, `tier`, and `path`. `path`
  is set only for the repository and user tiers; it is `null` for the bundle.
- `<name>` accepts `plan` or `plan.md` and rejects separators and `..`.
- `--output <path>` writes the resolved content, creates no parent
  directories, and refuses to overwrite an existing file (exit 1, clear
  message).
- A missing template exits 1 with a message naming the three tiers and no
  package-manager path.
- Integration: a temporary repository with no `.oat/templates`, an isolated
  `HOME` holding `~/.oat/templates/plan.md`, resolves the user tier and
  `--output` copies it (the user-scope-only install case); with an empty
  `HOME` it resolves the bundle tier.

**Step 2: Implement**

Use the p01-t01 module. Follow the existing command conventions for `--json`
and exit codes.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli build`,
`HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/template src/commands/help-snapshots.test.ts`,
`pnpm --filter oat-docs check`.
Expected: exit 0.

**Step 4: Commit**

`feat(p01-t02): add oat template resolve`

---

### Task p01-t03: Route lifecycle skills through the resolver

**Files:**

- Modify (template copies become `oat template resolve <name> --output <dest>`):
  `.agents/skills/oat-project-retro/SKILL.md` (around line 107),
  `oat-project-design/SKILL.md` (188, 488, 529, 543),
  `oat-project-spec/SKILL.md` (151), `oat-project-discover/SKILL.md` (201, 221),
  `oat-project-plan/SKILL.md` (240), `oat-project-summary/SKILL.md` (228),
  `oat-project-quick-start/SKILL.md` (142, 235, 469, 595-597),
  `oat-project-import-plan/SKILL.md` (193, 493),
  `oat-project-promote-spec-driven/SKILL.md` (108),
  `oat-project-implement/references/plan-and-resume.md` (339)
- Modify: `.agents/skills/oat-cursor-cloud-projects/SKILL.md` (around lines
  185-200) to repository, user, bundle order
- Modify: descriptive mentions where they state a copy source:
  `oat-project-new/SKILL.md` (14, 95), `oat-repo-improve/SKILL.md` (266),
  `oat-pjm-decision/SKILL.md` (93)
- Modify: `packages/cli/src/validation/skills.test.ts` pins on the changed
  skill text (around lines 5817 and 5828) and every pin of a bumped version
- Modify: `apps/oat-docs/docs/reference/file-locations.md` (41),
  `apps/oat-docs/docs/cli-utilities/tool-packs.md` (531),
  `apps/oat-docs/docs/reference/troubleshooting.md` (274)

**Step 1: Edit**

Each skill resolves its template with `oat template resolve <name> --output
"$PROJECT_PATH/<file>"` (or reads `--json` when it only needs to know the tier)
instead of assuming `.oat/templates/`. A skill that only fills a missing file
keeps that condition. The ideas skills already resolve scope correctly; leave
them. Bump each changed skill once per the worker rules.

**Step 2: Verify**

Run: `rg -n "\.oat/templates/" .agents/skills --glob '!**/tests/**'`; every
remaining match is descriptive (names the repository tier), not a copy source.
Run `pnpm oat:validate-skills`, `pnpm run check:skill-bumps`,
`HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/init/tools/shared`,
`node --test .agents/skills/oat-project-implement/tests/*.test.mjs`,
`pnpm --filter oat-docs check`, `pnpm exec oxlint .agents/skills`.
Expected: exit 0.

**Step 3: Commit**

`feat(p01-t03): route lifecycle skills through oat template resolve`

---

## Phase 2: Fumadocs navigation

Backlog: `BL-260718-support-fumadocs-in-oat-docs`.

### Task p02-t01: Write Fumadocs `meta.json` from Contents maps

**Files:**

- Modify: `packages/cli/src/commands/docs/nav/sync.ts` (around lines 70-90)
  and its tests; reuse `packages/cli/src/commands/docs/nav/contents.ts` (the
  Contents tree) and the framework detection used by
  `packages/cli/src/commands/docs/index-generate/index.ts` (around line 567)
  and `documentation.tooling` in `.oat/config.json`
- Create: a Fumadocs writer module beside `sync.ts` and a nested fixture

**Step 1: Failing tests first**

With a nested Fumadocs fixture (`source.config.ts`, `docs/index.md`, two
levels of folders), assert:

- each docs directory with an `index.md` gets a `meta.json`; `pages` follows
  that `index.md`'s Contents order; the root list starts with `"index"`;
  subfolders appear by folder name;
- strict output: no `"..."` entry; a page or folder the Contents map does not
  list is reported by path in human output and `--json`, not added;
- a Contents link into another folder becomes a Fumadocs link entry
  (`[Title](url)`), so no page is claimed by two folders;
- folder `title` comes from the `index.md` frontmatter `title`, else its first
  H1;
- the written JSON equals `oxfmt` output for that file, and a second run with
  no doc changes writes nothing and reports no changes;
- an MkDocs fixture still updates `mkdocs.yml` exactly as before.

**Step 2: Implement**

Detect the framework; MkDocs keeps the existing path. For Fumadocs, build the
tree once, compare semantically or byte-for-byte against oxfmt-shaped output,
and write only changed files. Fumadocs semantics follow the installed
`fumadocs-core` 16.10.2 (`source/schema.js`, the page-tree loader): pages not
listed are hidden without `"..."`, and a subfolder's `index` becomes the
folder index.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs`
Expected: exit 0.

**Step 4: Commit**

`feat(p02-t01): write Fumadocs meta.json from index.md Contents maps`

---

### Task p02-t02: Describe both frameworks in help and docs

**Files:**

- Modify: `packages/cli/src/commands/docs/nav/sync.ts` help text (around line 142) and `packages/cli/src/commands/help-snapshots.test.ts` (around line 992)
- Modify: `apps/oat-docs/docs/docs-tooling/docs-index-contract.md` (18, 49, 59,
  72, 80), `apps/oat-docs/docs/contributing/documentation.md` (65),
  `apps/oat-docs/docs/docs-tooling/commands.md` (25, 34, 184-196),
  `apps/oat-docs/docs/docs-tooling/workflows.md` (21, 69),
  `apps/oat-docs/docs/guides/add-docs-to-a-repo.md` (149, 208), and the nav
  sync entry in `apps/oat-docs/docs/reference/cli-reference.md`

**Step 1: Edit**

Replace "nav sync is MkDocs-only" guidance with the Fumadocs behavior: strict
pages, unlisted pages reported, link entries for cross-folder Contents links,
committed `meta.json`. Locate files by content if paths moved.

**Step 2: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/help-snapshots.test.ts`,
`pnpm --filter oat-docs check`.
Expected: exit 0.

**Step 3: Commit**

`docs(p02-t02): describe Fumadocs nav sync`

---

### Task p02-t03: Generate and commit `apps/oat-docs` navigation

**Files:**

- Create: `apps/oat-docs/docs/**/meta.json` (generated)
- Modify: any `index.md` Contents map the run shows is incomplete, only to list
  pages that already exist

**Step 1: Run**

`pnpm build`, then `node packages/cli/dist/index.js docs nav sync --target-dir apps/oat-docs`
(or the command's documented form). Every page should be listed (all 70 were
reachable at planning time); fix Contents maps rather than adding rest
entries. `workflows/skills/index.md`'s links into `contributing/` and
`docs-tooling/` become link entries.

**Step 2: Verify**

Run the command again and confirm it reports no changes after
`pnpm exec oxfmt --write apps/oat-docs/docs`. Run `pnpm build:docs` and
confirm the built sidebar order matches the Contents maps (inspect the
generated page tree or rendered navigation for two nested sections). Run
`pnpm --filter oat-docs check`.
Expected: exit 0, no second-run changes.

**Step 3: Commit**

`docs(p02-t03): generate Fumadocs navigation for apps/oat-docs`

---

### Task p02-t04: Update the docs skills

**Files:**

- Modify: `.agents/skills/oat-docs-apply/SKILL.md`,
  `.agents/skills/oat-docs-bootstrap/SKILL.md` (around lines 912 and 947) and
  `assets/AGENTS.md.template` (15),
  `.agents/skills/oat-docs-authoring/references/oat-fumadocs-contract.md` (63:
  `meta.json` is generated by nav sync, not hand-authored),
  `.agents/skills/oat-docs-analyze/SKILL.md` (Fumadocs nav checks around
  389-395) where its wording contradicts the new behavior

**Step 1: Edit and bump** each changed skill once.

**Step 2: Verify**

Run: `pnpm oat:validate-skills`, `pnpm run check:skill-bumps`,
`node --test .agents/skills/oat-docs-*/tests/*.test.mjs` (skip globs that
match nothing), `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation`.
Expected: exit 0.

**Step 3: Commit**

`docs(p02-t04): teach the docs skills about Fumadocs nav sync`

---

## Phase 3: Recon publication and Codex recovery

Backlog: `BL-261001-make-recon-s-packet-validator`,
`BL-261001-recover-recon-lanes-after` (GitHub issue #333). The first task bumps
`recon` 1.1.5 → 1.1.6 and updates the pin in
`.agents/skills/recon/tests/skill-contract.test.mjs` (around line 50).

### Task p03-t01: Share review-brief source binding

**Files:**

- Create: `.agents/skills/recon/scripts/lib/review-binding.mjs`
- Modify: `.agents/skills/recon/scripts/create-review-brief.mjs` (41-140),
  `.agents/skills/recon/scripts/validate-packet.mjs` (`reviewBriefBindsClaim`
  around 1321-1356; callers around 1413 and 2148),
  `.agents/skills/recon/scripts/reconcile-ledger.mjs` if it projects sources
- Modify: recon tests

**Step 1: Failing test first**

A brief created by `createReviewBrief` for two claims citing different sources
fails `validate-packet` today (`REVIEW_BRIEF_MISMATCH`). Also cover a
single-source brief whose manifest source has fields outside the projection
allowlist.

**Step 2: Implement**

One module owns source projection (the descriptor allowlist), the brief-level
source union, and the per-claim source subset. The generator and both
validator call sites use it. A brief binds when its `sources` equal the
projected union of its claims' sources, and each claim binds to its projected
subset. Briefs stay blind: no full manifest or worker provenance is added.
Edits to an immutable brief statement, evidence, locator, or descriptor still
fail.

**Step 3: Verify**

Run: `node --test .agents/skills/recon/tests/*.test.mjs`.
Expected: exit 0.

**Step 4: Commit**

`fix(p03-t01): share review-brief source binding across recon helpers`

---

### Task p03-t02: Keep the coverage downgrade, drop the per-statement gap rule

**Files:**

- Modify: `.agents/skills/recon/scripts/validate-packet.mjs` (around
  1871-1886), `.agents/skills/recon/references/packet-contract.md` (coverage
  rules), recon tests

**Step 1: Failing test first**

A coverage review that marks every statement `covered` while reporting a
material question-coverage finding naming claim IDs reconciles (claims
downgraded) and then fails publication with `MATERIAL_COVERAGE_ASSURANCE_EXCEEDED`.

**Step 2: Implement**

Publication requires that every claim named by a material coverage finding is
not `verified` (the reconciler's forced downgrade), and no longer requires the
reviewer's per-statement disposition to be `gap`. Document the rule once in
`packet-contract.md`. Negative control: a `verified` claim named by a material
finding still fails.

**Step 3: Verify**

Run: `node --test .agents/skills/recon/tests/*.test.mjs`.
Expected: exit 0.

**Step 4: Commit**

`fix(p03-t02): align recon coverage publication with reconciliation`

---

### Task p03-t03: Structure unresolved issues

**Files:**

- Modify: `.agents/skills/recon/scripts/lib/contracts.mjs` (around 2288-2297),
  `.agents/skills/recon/scripts/reconcile-ledger.mjs` (231-235, 294),
  `.agents/skills/recon/scripts/validate-packet.mjs` (around 769, 782,
  2186-2194), `.agents/skills/recon/references/packet-contract.md` (350),
  `.agents/skills/recon/references/worker-contract.md` (examples around 110,
  133, 156), recon fixtures and helpers
- Modify: the tests that currently require object entries to be rejected
  (`packet-validation.test.mjs` around 1655, `integrity-contracts.test.mjs`
  around 42)

**Step 1: Failing test first**

A semantic review that affirms most claims and marks one `uncertain` with a
claim-scoped issue fails publication today for every verified claim.

**Step 2: Implement**

`unresolvedIssues` entries become `{ text, claimIds: [...] }` or
`{ text, scope: 'global' }`. A legacy string entry is read as global.
Claim-scoped issues downgrade only those claims; a global issue blocks every
claim the review covers. Reconciliation, the routing conditions, and
publication apply the same rule. Update the contract and examples.

**Step 3: Verify**

Run: `node --test .agents/skills/recon/tests/*.test.mjs`.
Expected: exit 0.

**Step 4: Commit**

`feat(p03-t03): scope recon unresolved issues to claims`

---

### Task p03-t04: Prove the production helpers publish end to end

**Files:**

- Create: an end-to-end test under `.agents/skills/recon/tests/` and a
  synthetic two-source fixture

**Step 1: Test**

Run the production helpers (`create-review-brief`, `reconcile-ledger`,
`validate-packet`) on a two-source ledger with a partially uncertain semantic
review (claim-scoped issue) and a material coverage finding. The packet
validates; unaffected claims stay verified; affected claims are downgraded and
the gaps remain visible.

Negative controls, each failing closed: an edited brief statement, evidence,
locator, or descriptor; a fabricated excerpt (`LOCATOR_EXCERPT_MISMATCH`); a
`verified` claim named by a material coverage finding; a global semantic issue.
For each, neutralize its guard, show the bad state passes, restore, and record
the result in the commit body.

**Step 2: Verify**

Run: `node --test .agents/skills/recon/tests/*.test.mjs`.
Expected: exit 0.

**Step 3: Commit**

`test(p03-t04): prove recon helpers publish end to end`

---

### Task p03-t05: Document the Codex agent-limit gotcha and allow one bounded retry

**Files:**

- Modify: `.agents/skills/recon/SKILL.md` (Step 5 around 236-249; failure
  categories around 60-72; approval proposal around 191-199),
  `.agents/skills/recon/references/packet-contract.md` (`retryLimit` around
  112-114), `.agents/skills/recon/references/profiles.md` (81-83),
  `.agents/skills/recon/tests/skill-contract.test.mjs`
- Modify: `.agents/skills/oat-dispatch-subagents/references/provider-codex.md`
  (add the note) and bump `oat-dispatch-subagents` once

**Step 1: Edit**

- `retryLimit` means pre-acceptance admission retries per lane (the preview's
  worst-case attempt math is unchanged).
- A rejection before any child is accepted is a `provider/dispatch` failure,
  never a worker failure: the lane is recorded with a `PASS_OMITTED` gap and
  every accepted artifact is kept.
- With `retryLimit ≥ 1`, at most one admission retry after checking that
  completed agents are eligible to be unloaded. An alternate route is used only
  when already approved; otherwise the run stops partial and asks for a
  continuation amendment. No fallback changes model, effort, role behavior,
  data authority, output limits, or reviewer blindness; fresh review lanes stay
  fresh; an accepted lane is never rerun to free capacity.
- `provider-codex.md` documents Codex v2 residency: completed agents are
  unloaded only when they have no active turn, no pending mailbox items, and
  no residency lock; `interrupt_agent` (v2) does not unregister an agent, unlike
  `close_agent` (older toolsets); queue-only messages to a completed agent can
  pin it; do not archive or delete sessions to free capacity. Cite the
  openai/codex `rust-v0.159.2` sources from #333. Recon's Step 5 points to it.

**Step 2: Verify**

Run: `node --test .agents/skills/recon/tests/*.test.mjs .agents/skills/oat-dispatch-subagents/tests/*.test.mjs`
(skip a glob that matches nothing), `pnpm oat:validate-skills`,
`pnpm run check:skill-bumps`.
Expected: exit 0.

**Step 3: Commit**

`docs(p03-t05): document Codex agent-limit recovery for recon lanes`

---

## Phase 4: Lifecycle closeout guards

Backlog: `BL-261001-recompute-oat-project-next-s`,
`BL-260806-fail-closed-when-configured`,
`BL-260902-decide-test-only-freshness`
(`DR-260927-operator-waiver-for-test-only`).

### Task p04-t01: Recompute next's exit-gate fingerprint with the v2 exclusions

**Files:**

- Modify: `.agents/skills/oat-project-next/SKILL.md` (section 5.0, around
  lines 396-404)
- Modify: `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
  (or the closest existing contract test for these files)

**Step 1: Failing test first**

A contract test extracts the `effective-delta-v2` exclusion pathspecs from
`oat-project-implement/references/completion-and-closeout.md` and from
`oat-project-next/SKILL.md` and asserts they are identical; it fails today.

**Step 2: Edit**

`oat-project-next` recomputes a v2 fingerprint with the same three literal
exclusions and a v1 fingerprint with v1 rules. Bump `oat-project-next`.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`,
`pnpm run check:skill-bumps`.
Expected: exit 0.

**Step 4: Commit**

`fix(p04-t01): recompute next's exit-gate fingerprint with v2 exclusions`

---

### Task p04-t02: Add a CLI closeout check and make complete-state refuse a missing snapshot

**Files:**

- Create: `packages/cli/src/commands/project/closeout-check/` (command and
  tests), registered under `oat project`
- Modify: `packages/cli/src/commands/project/complete-state*` (refuse the same
  invariant), `packages/cli/src/commands/help-snapshots.test.ts`,
  `apps/oat-docs/docs/reference/cli-reference.md`

**Step 1: Failing tests first (transition level)**

From `state.md` fixtures:

1. Configured (or autonomous, or lite) closeout with no
   `oat_post_implement_sequence` snapshot → `incomplete`, route
   `oat-project-implement`, invariant named.
2. Snapshot persisted with steps pending → `incomplete`, next step named in
   stored order (summary, document, PR).
3. Pre-approval steps complete, approval not recorded → `incomplete` at the
   approval transition.
4. Every required step durably `complete` and approval recorded → `complete`.
5. Unconfigured, non-autonomous closeout with no snapshot → valid (control).
6. Malformed snapshot → fails closed.

`oat project complete-state` refuses cases 1-3 and 6 with the same message.
Neutralize the check and show cases 1 and 6 pass wrongly; restore.

**Step 2: Implement**

`oat project closeout-check <project-path> [--json]` is read-only. It resolves
"configured" from the project's own persisted snapshot and recorded
configuration source, not from current config, so a later config change cannot
make a valid project look wrong. It reports `status`, the missing invariant,
and the next owner.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli build`,
`HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project src/commands/help-snapshots.test.ts`,
`pnpm --filter oat-docs check`.
Expected: exit 0.

**Step 4: Commit**

`feat(p04-t02): add oat project closeout-check and guard complete-state`

---

### Task p04-t03: Route terminal closeout through the check

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
  (Steps 15 and 16, around 848-862 and 1015-1020: the snapshot is persisted
  before any sequence child is dispatched, and Step 16 runs the check),
  `.agents/skills/oat-project-next/SKILL.md` (5.1, around 421-424),
  `.agents/skills/oat-project-complete/SKILL.md` (before `complete-state`),
  `.agents/skills/oat-project-autonomous/SKILL.md` and
  `references/gate-inventory.md` (terminal routing)
- Modify: contract tests that pin these texts

**Step 1: Edit**

Each terminal consumer runs `oat project closeout-check` and routes to
`oat-project-implement` with the reported invariant when it is incomplete.
Bump `oat-project-complete` and `oat-project-autonomous`; `oat-project-implement`
and `oat-project-next` are already bumped on this branch.

**Step 2: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation`,
`node --test .agents/skills/oat-project-implement/tests/*.test.mjs`,
`pnpm oat:validate-skills`, `pnpm run check:skill-bumps`.
Expected: exit 0.

**Step 3: Commit**

`feat(p04-t03): route terminal closeout through the closeout check`

---

### Task p04-t04: Add operator-only exit-gate waivers

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
  (`oat_implement_exit_gate` schema around 314-354; freshness rules around
  573-612, both v1 and v2), `.agents/skills/oat-project-next/SKILL.md` (5.0,
  around 330-415), `.oat/templates/state.md`,
  `.agents/skills/oat-project-summary/SKILL.md`,
  `.agents/skills/oat-project-pr-final/SKILL.md` (verification section),
  `apps/oat-docs/docs/` pages that describe the exit gate (`lifecycle.md`,
  `implementation-execution.md`, `workflow-gates.md`; locate by content)
- Modify: contract tests; if p04-t02's check reads the exit-gate state,
  extend it to validate waivers

**Step 1: Failing tests first**

Contract tests (or executable checks) for: a waived test-only descendant stays
`allowed`; an unwaived one is `stale`; a waiver followed by a new substantive
commit is `stale`; a malformed waiver fails closed; a waiver issued while
`OAT_AUTONOMOUS=1` is refused.

**Step 2: Implement**

An append-only `waivers` list on the exit-gate state, each entry recording who
waived, the reason, the covered descendant range (from and to commits), and a
UTC timestamp. Prior fingerprints and `freshness_head` are never rewritten. A
waiver is written only on an explicit operator instruction; the skills never
infer or self-issue one, including under `OAT_AUTONOMOUS=1` (autonomous runs
stop and ask). A waived generation reads `allowed` only while nothing
substantive lands after the covered range. Summary and PR-final show every
waiver. Bump `oat-project-summary` and `oat-project-pr-final`.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/commands/project src/validation`,
`pnpm oat:validate-skills`, `pnpm run check:skill-bumps`,
`pnpm --filter oat-docs check`.
Expected: exit 0.

**Step 4: Commit**

`feat(p04-t04): add operator-only exit-gate waivers`

---

## Phase 5: Small fixes

Backlog: `BL-260928-keep-instructions-sync-force`,
`BL-260909-give-the-dispatch-record` (`DR-260927-dispatch-record-validates`),
`BL-260826-decide-whether-test-only-paths` (`DR-260927-test-only-paths-skip`),
`BL-260830-add-strict-yaml-validation`, `BL-260928-route-quick-mode-discovery`,
`BL-260903-verify-the-packs-inventory`.

### Task p05-t01: Keep `instructions sync --force` from overwriting a linked CLAUDE.md

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.utils.ts`
  (extract the resolves-to check used by the `none` strategy, around 196-236),
  `packages/cli/src/commands/instructions/sync/sync.ts` (plan around 289-306;
  apply around 539-557), sync tests

**Step 1: Failing test first**

`AGENTS.md -> CLAUDE.md` with real content in `CLAUDE.md`, then
`instructions sync --strategy pointer --force`: today `CLAUDE.md` becomes
`@AGENTS.md`. Add the same case for `--strategy symlink`, a symlink chain, and
a hard link.

**Step 2: Implement**

A helper decides whether any `AGENTS.md` resolves to a given `CLAUDE.md`
(device/inode and realpath). Planning skips and reports such a file under every
strategy with `--force`; apply re-checks immediately before writing. Non-linked
behavior is unchanged. Neutralize the apply-time re-check and show the test
fails; restore.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/instructions`.
Expected: exit 0.

**Step 4: Commit**

`fix(p05-t01): never overwrite a CLAUDE.md that AGENTS.md links to`

---

### Task p05-t02: Remove dispatch-record persistence

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch/record.ts` (journal
  writer around 593-700 and 721-828; fallback lineage logic only the journal
  used in `augmentDispatchRecord`), `packages/cli/src/commands/project/dispatch/index.ts`
  (`--project`, `persisted` status around 107-180), `record.test.ts`,
  `packages/cli/src/commands/help-snapshots.test.ts` (around 1137)
- Modify: `.agents/skills/oat-dispatch-subagents/SKILL.md` (178-189) and
  `references/record-schema.md` (366, 379),
  `.agents/skills/oat-project-dispatch-subagents/SKILL.md` (161-169),
  `apps/oat-docs/docs/reference/cli-reference.md` (157), and the
  implementation-execution, orchestration-model, and scope-and-surface docs
  that describe persistence (locate by content)

**Step 1: Remove**

Keep `oat project dispatch record` as a validate-only command and its schema
modules (`providers/identity/{generic-dispatch-record,oat-dispatch-record,runtime-observation}.ts`),
as the decision record requires for the managed Claude validation path. Delete
the journal writer, lock, revisions, fallback-claim publication, related-record
reads, `--project`, the `persisted` status, and the lineage logic only they
used. Move the redaction assertions that read journal bytes (around 1829 and 1873) onto the validate-only output. Prune persistence tests. Leave
`tools/smoke/evidence` alone. Bump `oat-project-dispatch-subagents`
(`oat-dispatch-subagents` is already bumped in p03-t05).

**Step 2: Verify**

Run: `pnpm build`, `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch src/commands/help-snapshots.test.ts src/validation`,
`pnpm test:smoke`, `pnpm test:skills`,
`node packages/cli/dist/index.js project dispatch record --project x` (rejected
as an unknown option), and
`rg -n "dispatch record.*--project|<project>/dispatch/" .agents apps/oat-docs/docs packages/cli/src --glob '!**/*.test.ts'`
(no persistence references remain).
Expected: exit 0 except the rejected probe.

**Step 3: Commit**

`refactor(p05-t02): make dispatch record validate-only`

---

### Task p05-t03: Let test-only changes skip the lockstep bump

**Files:**

- Modify: `packages/cli/src/release/public-package-contract.ts` (ignore
  patterns around 133-177), `public-package-contract.test.ts`,
  `tools/release/check-version-bumps.test.ts` or `release-utils.test.ts`,
  `AGENTS.md` (Package Management)

**Step 1: Failing tests first**

A contract test reads each public package's `tsconfig.json` exclude list
(minus `node_modules` and `dist`) and asserts it equals that package's
`versionPolicyIgnorePatterns` (beyond `assets/**` for the CLI). Add a case where
only `packages/cli/src/**/*.test.ts` changes (no bump required) and a negative
control where a non-test `src` file changes (bump required).

**Step 2: Implement** the patterns per `DR-260927-test-only-paths-skip` and add
one AGENTS.md paragraph stating the rule.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/release`,
`pnpm test:scripts`, and the release tooling tests that cover
`check-version-bumps`.
Expected: exit 0.

**Step 4: Commit**

`feat(p05-t03): let test-only package changes skip the lockstep bump`

---

### Task p05-t04: Report YAML errors with their location and check key types

**Files:**

- Modify: `packages/cli/src/commands/shared/frontmatter.ts` (around 369-409,
  return the parser position), `packages/cli/src/validation/skills.ts` (around
  1484-1490, 694-702, and 1564-1608), `packages/cli/src/validation/skills.test.ts`

**Step 1: Failing tests first**

A bare-colon fixture (`description: uses key: value`) fails with the file path
and line and column. Type fixtures fail for a non-string `name`, a non-boolean
`user-invocable`, and a non-object `metadata`.

**Step 2: Implement** without replacing the existing semantic checks.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation src/commands/shared`,
`pnpm oat:validate-skills` (every canonical skill still passes).
Expected: exit 0.

**Step 4: Commit**

`feat(p05-t04): report YAML errors with location and check key types`

---

### Task p05-t05: Route quick-mode discovery to quick-start

**Files:**

- Modify: `packages/control-plane/src/recommender/router.ts` (around 66-67),
  `packages/control-plane/src/recommender/router.test.ts` (254, 1040-1062),
  `packages/cli/src/commands/state/generate.ts` (around 411-414),
  `packages/cli/src/commands/state/generate.test.ts` (365-405)

**Step 1: Flip the pinned tests first** (they fail), then the routes, so quick
`discovery:in_progress` and `discovery:complete` route to
`oat-project-quick-start`, matching the `oat-project-next` and
`oat-project-progress` tables. Leave quick `plan:in_progress` routing alone
(`BL-261001-route-quick-mode-plan`).

**Step 2: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/recommender`,
`HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/state`.
Expected: exit 0.

**Step 3: Commit**

`fix(p05-t05): route quick-mode discovery to quick-start`

---

### Task p05-t06: Narrow the packs inventory redaction claim

**Files:**

- Modify: `apps/oat-docs/docs/reference/troubleshooting.md` (around 202),
  `packages/cli/src/commands/doctor/index.test.ts` (JSON redaction test),
  `.oat/repo/pjm/backlog/items/BL-260903-verify-the-packs-inventory.md` (fill
  the placeholder acceptance criteria with the two outcomes below)

**Step 1: Edit**

The docs say what the code does: project and home roots are replaced only
when that scope is part of the run, only exact prefixes are replaced, and
paths outside those roots (such as a global bundle path in an assets error)
stay absolute. Add a doctor `--json` redaction test matching the status one.

**Step 2: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/doctor`,
`pnpm --filter oat-docs check`.
Expected: exit 0.

**Step 3: Commit**

`docs(p05-t06): narrow the packs inventory redaction claim`

---

## Phase 6: Release fan-in

### Task p06-t01: Bump the lockstep public packages to 0.3.10

**Files:**

- Modify: `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`
  and any tracked version manifest the release tooling reads (follow the files
  the 0.3.9 bump changed: `git log -1 --stat 8f6d5b1d2` filtered to version
  files)

**Step 1: Verify**

Run: `git fetch origin main && pnpm release:check-versions`,
`pnpm release:validate`.
Expected: exit 0.

**Step 2: Commit**

`chore(p06-t01): bump lockstep public packages to 0.3.10`

---

### Task p06-t02: Archive the shipped backlog items

**Step 1: Archive with the branch CLI**

After `pnpm build`, run `node packages/cli/dist/index.js backlog archive <id>
--summary "<outcome>"` for each item whose criteria all pass:
`BL-260927-expose-a-scoped-template`, `BL-260718-support-fumadocs-in-oat-docs`,
`BL-261001-make-recon-s-packet-validator`, `BL-261001-recover-recon-lanes-after`,
`BL-261001-recompute-oat-project-next-s`, `BL-260806-fail-closed-when-configured`,
`BL-260902-decide-test-only-freshness`, `BL-260928-keep-instructions-sync-force`,
`BL-260909-give-the-dispatch-record`, `BL-260826-decide-whether-test-only-paths`,
`BL-260830-add-strict-yaml-validation`, `BL-260928-route-quick-mode-discovery`,
`BL-260903-verify-the-packs-inventory`. Archive
`BL-260829-order-phase-bookkeeping-before` only if `implementation.md` records
a phase whose reviewed head was its Step 7a bookkeeping commit and whose review
raised no ledger or resume-pointer finding; cite that phase in the summary and
record its relationship to `BL-260711-skip-re-review-for-bookkeeping`.

**Step 2: Index note**

Add a curated overview note to `.oat/repo/pjm/backlog/index.md`, run
`node packages/cli/dist/index.js backlog regenerate-index` and
`node packages/cli/dist/index.js pjm doctor --json` (no new warnings).

**Step 3: Record the PR requirements**

Copy the `## PR Requirements` section below into `implementation.md`'s
hand-off.

**Step 4: Commit**

`chore(p06-t02): archive the backlog items shipped in wave 3`

---

### Task p06-t03: Run the full Definition of Done

**Step 1: Run every gate with explicit exit codes**

In CI order, each captured as `pnpm <gate> > <log> 2>&1; echo "exit=$?"`:
`pnpm check`, `pnpm type-check`, `HOME=$(mktemp -d) pnpm exec turbo run test --force`,
`pnpm build`, `pnpm run check:skill-bumps`, `pnpm release:check-versions` (after
`git fetch origin main`), `pnpm release:validate`, `pnpm build:docs`; then
`pnpm test:smoke`, `pnpm test:skills`, `pnpm test:scripts`, `pnpm lint`, and
`pnpm format`. Confirm test runs were not cache replays.

**Step 2: Record** each exit code and the head SHA in `implementation.md`.

**Step 3: Commit**

`chore(p06-t03): record wave 3 definition-of-done evidence`

---

## Parallelism

The plan is fully sequential (`oat_plan_parallel_groups: []`). Every adjacent
phase pair shares a write:

- p01 and p02 both edit `packages/cli/src/commands/help-snapshots.test.ts`,
  `apps/oat-docs/docs/reference/cli-reference.md`, and skill version pins in
  `packages/cli/src/validation/skills.test.ts`.
- p02 and p03 both bump skills pinned in `packages/cli/src/validation/skills.test.ts`.
- p03 and p04 share the skill-bump state (`check:skill-bumps`) and p05 edits
  `oat-dispatch-subagents`, which p03 bumps.
- p04 and p05 both edit `help-snapshots.test.ts` and `cli-reference.md`.
- p06 is the fan-in: the lockstep bump and backlog close-out need every earlier
  phase.

Within p03 every task edits `.agents/skills/recon/**`; within p04 the tasks
edit `completion-and-closeout.md` and `oat-project-next/SKILL.md` in order.

---

## Acceptance Mapping

| Item                                       | Criterion                                                                        | Task                                  |
| ------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------- |
| `BL-260927-expose-a-scoped-template`       | One precedence order shared by scaffold, PJM, and the command; decision recorded | p01-t01 (DR-260927-templates)         |
|                                            | CLI command resolves a named template, `--json`, clear not-found                 | p01-t02                               |
|                                            | Lifecycle skills call the resolver; version bumps                                | p01-t03                               |
|                                            | Tests: repository override, user-only, bundle-only, isolated `HOME`              | p01-t01, p01-t02                      |
| `BL-260718-support-fumadocs-in-oat-docs`   | Framework detection; MkDocs unchanged                                            | p02-t01                               |
|                                            | `meta.json` per directory from Contents order; title from heading                | p02-t01                               |
|                                            | Unlisted pages reported, not dropped                                             | p02-t01                               |
|                                            | Second run writes nothing                                                        | p02-t01, p02-t03                      |
|                                            | Help and docs describe both frameworks; snapshot updated                         | p02-t02                               |
|                                            | `apps/oat-docs` sidebar matches Contents maps; files committed; `build:docs`     | p02-t03                               |
|                                            | Docs skills framework-correct; bumps                                             | p02-t04                               |
|                                            | Tests: nested fixture, unlisted, idempotence, isolated `HOME`                    | p02-t01                               |
| `BL-261001-make-recon-s-packet-validator`  | Shared projection and binding; briefs stay blind                                 | p03-t01                               |
|                                            | One coverage contract across acceptance, reconciliation, publication             | p03-t02                               |
|                                            | Structured unresolved issues, same rule everywhere                               | p03-t03                               |
|                                            | End-to-end production-helper test                                                | p03-t04                               |
|                                            | Negative controls proven by neutralization                                       | p03-t04                               |
|                                            | `recon` bump and release note                                                    | p03-t01, PR Requirements              |
| `BL-261001-recover-recon-lanes-after`      | Codex v2 residency note; `interrupt_agent` vs `close_agent`                      | p03-t05                               |
|                                            | Pre-acceptance rejection is a provider failure; accepted work kept               | p03-t05                               |
|                                            | At most one retry, declared; approved alternate only; otherwise stop             | p03-t05                               |
|                                            | No silent control changes; fresh lanes stay fresh                                | p03-t05                               |
| `BL-261001-recompute-oat-project-next-s`   | Next recomputes v2 with the same exclusions; pinned against implement            | p04-t01                               |
| `BL-260806-fail-closed-when-configured`    | Configured/autonomous closeout cannot complete without the snapshot              | p04-t02, p04-t03                      |
|                                            | Snapshot persisted before any sequence child is dispatched                       | p04-t03                               |
|                                            | Transition-level tests from configured-plus-absent through completion            | p04-t02                               |
|                                            | Unconfigured path preserved; missing snapshot diagnosed                          | p04-t02                               |
| `BL-260902-decide-test-only-freshness`     | Append-only waiver; provenance not rewritten                                     | p04-t04                               |
|                                            | Operator-only, never self-issued under autonomy                                  | p04-t04                               |
|                                            | Waived generation stale after a later substantive change (v1 and v2)             | p04-t04                               |
|                                            | Waiver shown in summary and PR verification                                      | p04-t04                               |
|                                            | Tests: waived, unwaived, waiver-then-change, malformed                           | p04-t04                               |
|                                            | Implement and next bumped                                                        | p01-t03, p04-t01                      |
| `BL-260928-keep-instructions-sync-force`   | `--force` never overwrites a linked `CLAUDE.md`, any strategy                    | p05-t01                               |
|                                            | Failing-first test and neutralize-and-restore proof                              | p05-t01                               |
| `BL-260909-give-the-dispatch-record`       | Decision recorded (validate-only)                                                | `DR-260927-dispatch-record-validates` |
|                                            | Persistence and its docs removed; validator kept for the managed Claude path     | p05-t02                               |
|                                            | No `<project>/dispatch/` written by any default path                             | p05-t02                               |
| `BL-260826-decide-whether-test-only-paths` | Ignore patterns equal tsconfig test exclusions; contract test                    | p05-t03                               |
|                                            | Test-only change passes; `src` change still requires a bump                      | p05-t03                               |
|                                            | AGENTS.md states the rule                                                        | p05-t03                               |
| `BL-260830-add-strict-yaml-validation`     | Invalid YAML fails with path and parser location                                 | p05-t04                               |
|                                            | Field types validated; semantic checks kept; bare-colon fixture; skills pass     | p05-t04                               |
| `BL-260928-route-quick-mode-discovery`     | Router and dashboard route quick discovery to quick-start; tests agree           | p05-t05                               |
| `BL-260903-verify-the-packs-inventory`     | Docs claim matches the code; doctor JSON redaction test                          | p05-t06                               |
| `BL-260829-order-phase-bookkeeping-before` | Verified against a real multi-phase run; relationship to BL-260711 recorded      | every phase review, p06-t02           |

The `BL-260909` removal criterion "no skill or doc references the command" is
superseded by `DR-260927-dispatch-record-validates`, which keeps the
validate-only command for the managed Claude path; only persistence references
are removed.

---

## PR Requirements

The release workflow publishes PR titles only in its release notes, so the
breaking changes must be named in the title:

- Title uses a Conventional Commit breaking marker, for example
  `feat!: template resolver, Fumadocs nav sync, recon publication fixes, validate-only dispatch record (wave 3, lockstep 0.3.10)`.
- The body opens with a **Behavior changes** callout:
  - project scaffolding now prefers a repository template over a user template
    (repository, user, bundle), and lifecycle skills resolve templates through
    `oat template resolve`;
  - `oat project dispatch record --project` is removed (validate-only);
  - recon `unresolvedIssues` entries may be structured; string entries are read
    as global; packets that failed only on `REVIEW_BRIEF_MISMATCH`,
    `MATERIAL_COVERAGE_ASSURANCE_EXCEEDED`, or `REVIEW_DISPOSITION_MISMATCH`
    from the production helpers now validate;
  - `oat docs nav sync` writes Fumadocs `meta.json`;
  - `oat project complete-state` refuses a configured closeout with a missing
    or incomplete snapshot; exit-gate waivers are operator-only;
  - test-only package changes no longer require the lockstep bump.
- The body lists the other user-visible changes (`--force` link guard, YAML
  error locations, quick discovery routing, packs docs).

---

## Reviews

| Scope  | Type     | Status  | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | ------- | ---- | -------- | ------------- | ---------- | ----------- |
| p01    | code     | pending | -    | -        | -             | -          | -           |
| p02    | code     | pending | -    | -        | -             | -          | -           |
| p03    | code     | pending | -    | -        | -             | -          | -           |
| p04    | code     | pending | -    | -        | -             | -          | -           |
| p05    | code     | pending | -    | -        | -             | -          | -           |
| p06    | code     | pending | -    | -        | -             | -          | -           |
| final  | code     | pending | -    | -        | -             | -          | -           |
| spec   | artifact | pending | -    | -        | -             | -          | -           |
| design | artifact | pending | -    | -        | -             | -          | -           |
| plan   | artifact | pending | -    | -        | -             | -          | -           |

For code-review events, `Reviewed Head` is the full 40-character SHA at the
head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`;
`Gate Target` is populated only for gate events. Legacy five-column rows remain
valid. Writers must preserve every existing row and every unknown trailing
cell; never truncate a widened row back to five columns.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/High)

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - Template resolver
- Phase 2: 4 tasks - Fumadocs navigation
- Phase 3: 5 tasks - Recon publication and Codex recovery
- Phase 4: 4 tasks - Lifecycle closeout guards
- Phase 5: 6 tasks - Small fixes
- Phase 6: 3 tasks - Release fan-in

**Total: 25 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Decisions: `DR-260927-templates-resolve-repository`,
  `DR-260927-dispatch-record-validates`, `DR-260927-test-only-paths-skip`,
  `DR-260927-operator-waiver-for-test-only`,
  `DR-260928-exclude-project-and-repository`
- GitHub issue #333 (recon)
- Backlog items listed in the Acceptance Mapping

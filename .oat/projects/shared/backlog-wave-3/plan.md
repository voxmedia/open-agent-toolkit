---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-10-01
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_hill_phases: ['p06']
oat_auto_review_at_hill_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_template: false
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
Do not run oxfmt on `state.md`. Generated `meta.json` is compared by meaning,
not bytes (p02-t01), so formatting it is harmless.

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

- Move: `resolvePjmTemplate` from `packages/cli/src/commands/pjm/template-source.ts`
  (already repository, user, bundle, returning `{ tier, path, content }` with
  an injectable `home`) to `packages/cli/src/commands/shared/template-source.ts`
  as the shared resolver (a rename is optional); update its callers
  (`pjm/init.ts`, `backlog/new.ts` around 232, `decision/new.ts` around 134)
  and move its existing tier tests with it. Drop "PJM" from the not-found text
  and update the pin in `pjm/init.test.ts` (around 458).
- Modify: `packages/cli/src/commands/project/new/scaffold.ts`
  (`resolveTemplateSource`, around line 447) and
  `packages/cli/src/commands/project/promote/promote.ts` (around lines 395 and 427) to call the shared resolver with `templatesRoot = <repo>/.oat/templates`
- Modify: `packages/cli/src/commands/project/new/scaffold.test.ts` (the test
  around line 1105, "uses a user template before a differing repo template",
  flips to repository first)

**Step 1: Failing test first**

Flip the scaffold test and confirm it fails. The moved tier tests (repository
override, user-only, bundle-only, injected `HOME`) already cover the resolver.

**Step 2: Implement**

Point the scaffold and promote at the shared resolver; delete
`resolveTemplateSource`. Leave `cleanup/project/project.ts`
(repository-or-inline) and `project/log/append.ts` (bundle-only) unchanged,
and note why in the commit body: neither copies a lifecycle template a
user-scope install lacks.

**Step 3: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared src/commands/project src/commands/pjm src/commands/backlog src/commands/decision`
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
- `--output <path>` writes the resolved content, replacing an existing file
  (copy semantics), and creates no parent directories.
- A missing template exits 1 with a message naming the three tiers and no
  package-manager path.
- Integration (the issue #296 case): a temporary repository with no
  `.oat/templates` and an isolated `HOME` holding `~/.oat/templates/plan.md`
  resolves the user tier, and `--output` copies it.

The tier matrix itself is covered by the p01-t01 resolver tests.

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
- Modify: `.agents/skills/oat-cursor-cloud-projects/SKILL.md` (the
  "Resolve Assets with User Scope First" step, around lines 184-204) and
  `apps/oat-docs/docs/workflows/projects/cursor-cloud.md` (around 94-99):
  templates only. Template resolution goes through `oat template resolve`
  (repository, user, bundle); skill and script resolution keep their
  user-first order, and the staleness rationale is reworded so it no longer
  covers templates
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
instead of assuming `.oat/templates/`. `--output` has copy semantics, so an
unconditional "Copy template" step becomes a straight substitution, and a
fill-if-missing step (for example quick-start's) keeps its existing condition
in prose. The pinned plan-overwrite text in
`packages/cli/src/validation/skills.test.ts` (around line 5806) moves with it. The ideas skills already resolve scope correctly; leave
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

### Task p01-t04: (review) Close p01 review findings M1, L1

Source: `reviews/archived/p01-review-2026-10-01T112852Z.md` (auto review,
passing: 0 Critical/High, 1 Medium, 2 Low). L2 (deviations not recorded in the
ledger) is root bookkeeping.

**Step 1: Fix**

- M1: add `Bash(oat template:*)` to the `allowed-tools` of
  `.agents/skills/oat-project-retro/SKILL.md` and
  `.agents/skills/oat-project-summary/SKILL.md` (plus `Bash(mkdir:*)` for the
  retro step that creates `references/`), and pin both grants in
  `packages/cli/src/validation/skills.test.ts` the way the `Bash(oat tools:*)`
  grant is pinned (around line 7828). Check every other skill p01-t03 changed
  for the same gap. No further version bumps (all are bumped on this branch).
- L1: in `apps/oat-docs/docs/cli-utilities/tool-packs.md` (around line 548),
  move the `oat template resolve` sentence so the "Useful options" list stays
  attached to `oat pjm init`.

**Step 2: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation`,
`pnpm oat:validate-skills`, `pnpm run check:skill-bumps`,
`pnpm --filter oat-docs check`.
Expected: exit 0.

**Step 3: Commit**

`fix(p01-t04): close p01 review findings`

---

### Task p01-t05: (review) Close p01 gate findings M1, L1

Source: `reviews/archived/p01-review-2026-10-01T114001Z.md` (Codex phase gate,
`ok`: 0 Critical/High, 1 Medium, 1 Low).

**Step 1: Fix**

- M1: add `Bash(oat template:*)` to the `allowed-tools` of
  `.agents/skills/oat-project-design/SKILL.md`,
  `.agents/skills/oat-project-spec/SKILL.md`, and
  `.agents/skills/oat-project-plan/SKILL.md`, and extend the p01-t04
  allowlist contract test to cover them. Re-key any prompt site in
  `.agents/docs/autonomy-contract.md` the edit changes. No further bumps.
- L1: in `apps/oat-docs/docs/reference/file-locations.md` (around 41),
  `apps/oat-docs/docs/cli-utilities/tool-packs.md` (around 531), and
  `apps/oat-docs/docs/reference/troubleshooting.md` (around 274), limit the
  precedence claim to project lifecycle and PJM templates; the ideas pack keeps
  its scope-selected templates. Do not extend the resolver to nested names.

**Step 2: Verify**

Run: `HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation`,
`pnpm oat:validate-skills`, `pnpm run check:skill-bumps`,
`pnpm --filter oat-docs check`.
Expected: exit 0.

**Step 3: Commit**

`fix(p01-t05): close p01 gate findings`

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
- a second run with no doc changes writes nothing and reports no changes,
  including after the written files are reformatted by oxfmt;
- an MkDocs fixture still updates `mkdocs.yml` exactly as before.

**Step 2: Implement**

Detect the framework; MkDocs keeps the existing path. For Fumadocs, build the
tree once, compare each existing `meta.json` by meaning (parse and deep-equal),
and write only changed files as `JSON.stringify(value, null, 2)` plus a
newline. Fumadocs semantics follow the installed
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
- Modify: `apps/oat-docs/docs/reference/docs-index-contract.md` (18, 49, 59,
  72, 80), `apps/oat-docs/docs/contributing/documentation.md` (65),
  `apps/oat-docs/docs/docs-tooling/commands.md` (25, 34, 184-196),
  `apps/oat-docs/docs/docs-tooling/workflows.md` (21, 69),
  `apps/oat-docs/docs/docs-tooling/add-docs-to-a-repo.md` (149, 208), and the nav
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
`recon` 1.1.5 → 1.1.6 and updates its pins in
`.agents/skills/recon/tests/skill-contract.test.mjs` (around line 50) and
`packages/cli/src/validation/skills.test.ts` (around line 8731).

### Task p03-t01: Share review-brief source binding

**Files:**

- Create: `.agents/skills/recon/scripts/lib/review-binding.mjs`
- Modify: `.agents/skills/recon/scripts/create-review-brief.mjs` (41-140),
  `.agents/skills/recon/scripts/validate-packet.mjs` (`reviewBriefBindsClaim`
  around 1321-1356; callers around 1413 and 2148),
  `.agents/skills/recon/scripts/reconcile-ledger.mjs` if it projects sources
- Modify: recon tests

**Step 1: Failing test first**

Create the synthetic two-source fixture under `.agents/skills/recon/tests/`
(a two-source ledger, a partially uncertain semantic review with a
claim-scoped issue, and a material coverage finding) and a focused
source-binding test on it: a brief that the production `create-review-brief`
builds from that fixture binds every claim in `validate-packet`. It fails today
with `REVIEW_BRIEF_MISMATCH`. Add a unit test for the branch the fixture does
not reach: a single-source brief whose manifest source has fields outside the
projection allowlist. The full publication assertion is activated in p03-t03,
so the whole recon suite stays green at every task boundary.

**Step 2: Implement**

One module owns source projection (the descriptor allowlist), the brief-level
source union, and the per-claim source subset. The generator and both
validator call sites use it. A brief binds when its `sources` equal the
projected union of its claims' sources, and each claim binds to its projected
subset. Briefs stay blind: no full manifest or worker provenance is added.
Edits to an immutable brief statement, evidence, locator, or descriptor still
fail.

**Step 3: Verify**

Run: `node --test .agents/skills/recon/tests/*.test.mjs`,
`HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation`,
`pnpm run check:skill-bumps`.
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

Add a focused coverage test on the p03-t01 fixture: reconciling its coverage
review (every statement `covered`, plus a material question-coverage finding)
and publishing fails today with `MATERIAL_COVERAGE_ASSURANCE_EXCEEDED`.

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
  `.agents/skills/recon/scripts/validate-packet.mjs` (around 2186-2194), `.agents/skills/recon/references/packet-contract.md` (350),
  `.agents/skills/recon/references/worker-contract.md` (examples around 110,
  133, 156), recon fixtures and helpers
- Modify: the tests that currently require object entries to be rejected
  (`packet-validation.test.mjs` around 1655, `integrity-contracts.test.mjs`
  around 42)

**Step 1: Failing test first**

Activate the end-to-end publication test on the p03-t01 fixture: run the
production helpers (`create-review-brief`, `reconcile-ledger`,
`validate-packet`) and assert the packet validates, unaffected claims stay
verified, and affected claims are downgraded with the gaps visible. It fails
today only with `REVIEW_DISPOSITION_MISMATCH`, because the semantic review's
one claim-scoped issue blocks every verified claim.
Flip the two tests that require object entries to be rejected, and add
negative cases for malformed scope: an empty `claimIds`, a non-string claim
ID, a claim ID the review does not cover, an entry with neither scope form,
and an entry with both.

**Step 2: Implement**

`unresolvedIssues` entries are a closed union: a string (legacy, read as
global), `{ text, claimIds }` with a non-empty array of claim IDs that the
review's immutable brief covers, or `{ text, scope: 'global' }`. Anything else
is rejected at artifact acceptance, never treated as no issue. Claim-scoped
issues downgrade only those claims; a global issue keeps every covered claim
below `verified`. Reconciliation and publication apply the same rule. Leave
the conditional-routing predicates (`validate-packet.mjs` around 769 and 782)
unchanged; they test only whether any issue exists. Update the contract and
examples.

**Step 3: Verify**

Run: `node --test .agents/skills/recon/tests/*.test.mjs`.
Expected: exit 0.

**Step 4: Commit**

`feat(p03-t03): scope recon unresolved issues to claims`

---

### Task p03-t04: Prove recon's negative controls against helper output

**Files:**

- Modify: the existing per-code negative tests in
  `.agents/skills/recon/tests/` (the end-to-end test is activated in p03-t03)

**Step 1: Test**

The p03-t03 end-to-end test passes. Negative controls reuse the existing
per-code tests (`packet-validation.test.mjs` around 1635-1652, 1822, 1834;
`integrity-contracts.test.mjs` around 332, 1757), changed to start from
helper-produced briefs: an edited brief statement, evidence, locator, or
descriptor; a fabricated excerpt (`LOCATOR_EXCERPT_MISMATCH`); a `verified`
claim named by a material coverage finding. Add the missing case: a global
semantic issue whose bad state keeps covered claims at `verified`. For each,
neutralize its guard once, show the bad state passes, restore, and record the
result in the commit body.

**Step 2: Verify**

Run: `node --test .agents/skills/recon/tests/*.test.mjs`.
Expected: exit 0.

**Step 3: Commit**

`test(p03-t04): prove recon negative controls against helper output`

---

### Task p03-t05: Document the Codex agent-limit gotcha and allow one bounded retry

**Files:**

- Modify: `.agents/skills/recon/SKILL.md` (Step 5 around 236-249; failure
  categories around 60-72; approval proposal around 191-199),
  `.agents/skills/recon/references/packet-contract.md` (`retryLimit` around
  112-114), `.agents/skills/recon/references/profiles.md` (81-83),
  `.agents/skills/recon/tests/skill-contract.test.mjs`
- Modify: `.agents/skills/oat-dispatch-subagents/references/provider-codex.md`
  (add the note) and bump `oat-dispatch-subagents` once, updating its pins in
  `packages/cli/src/validation/skills.test.ts` (around lines 6419 and 6578)

**Step 1: Edit**

- `retryLimit` means pre-acceptance admission retries per lane (the preview's
  worst-case attempt math is unchanged); keep the label `render-packet.mjs`
  shows for it (around line 102) consistent with that meaning.
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
`pnpm run check:skill-bumps`,
`HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation`.
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
exclusions and a v1 fingerprint with v1 rules. Repoint its algorithm reference
(around line 403, "the current `oat-project-implement/SKILL.md`") to
`oat-project-implement/references/completion-and-closeout.md` Step 14, where
the algorithm lives. Bump `oat-project-next`.

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

1. Configured (effective `workflow.postImplementSequence` set), autonomous
   (`--autonomous`), or lite (`oat_workflow_mode: lite`) closeout with no
   `oat_post_implement_sequence` snapshot → `incomplete`, route
   `oat-project-implement`, invariant named. One fixture per input.
2. Snapshot persisted with steps pending → `incomplete`, next step named in
   stored order (summary, document, PR).
3. Pre-approval steps complete, approval not recorded → `incomplete` at the
   approval transition.
4. Every required step durably `complete` and approval recorded → `complete`.
5. Config absent, not autonomous, not lite, no snapshot → valid (control).
6. Malformed snapshot → fails closed.
7. Same as case 1 with only `OAT_AUTONOMOUS=1` set in the environment (no
   flag) → `incomplete`. Neutralize the env read, show this case passes
   wrongly, then restore.

`oat project complete-state` refuses cases 1-3, 6, and 7 with the same message.
Neutralize the check and show cases 1 and 6 pass wrongly; restore.

Transition trace (one test, state on disk): start from a configured,
snapshot-absent `state.md` in a temporary project and drive it through the
writes `completion-and-closeout.md` Step 15 prescribes, reopening `state.md`
from disk and calling the command in a fresh invocation after every write.
Use a noncanonical stored order (for example document, summary, PR), so a
remembered default order cannot pass. Assert: before the snapshot write the
check names the missing snapshot; after it, the next owner is the first stored
step; after each step is recorded `complete`, the next stored step follows;
an interrupted run (a step recorded `in_progress`, then reopened) resumes at
that step; with every pre-approval step complete the check stops at the
pending approval; `complete-state` refuses at every point until the last
required step and the approval are recorded, then succeeds.

**Step 2: Implement**

`oat project closeout-check <project-path> [--autonomous] [--json]` is
read-only. Inputs: lite from `oat_workflow_mode`; configured from the
effective layered `workflow.postImplementSequence` at check time (through the
CLI config resolver); autonomous when `--autonomous` is passed or
`OAT_AUTONOMOUS=1` is set in the environment (read through an injectable env
dependency, so a caller that forgets the flag cannot fail open). Once a snapshot exists, its recorded `source` is
authoritative and current config is not consulted, so a later config change
cannot invalidate a persisted run. It reports `status`, the missing
invariant, and the next owner. `oat project complete-state` takes the same
`--autonomous` flag. A project that reached implementation before snapshots
existed recovers by running `oat-project-implement`, which persists the
snapshot at Step 15; the refusal message names that route, and the docs say
so. There is no override flag.

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
  `.agents/skills/oat-project-complete/SKILL.md` (before its first mutation,
  around Step 3.7, and before `complete-state`)
- Modify: contract tests that pin these texts

**Step 1: Edit**

Each terminal consumer runs `oat project closeout-check` (passing
`--autonomous` under `OAT_AUTONOMOUS=1`) and routes to `oat-project-implement`
with the reported invariant when it is incomplete. `oat-project-autonomous`
reaches completion only through `oat-project-implement` and
`oat-project-complete`, which both run the check, so its skill and the gate
inventory are not edited (reintroduce if autonomous gains another completion
path). The control-plane
recommender (`packages/control-plane/src/recommender/router.ts` around
305-308) and the state dashboard (`packages/cli/src/commands/state/generate.ts`
around 740) still recommend `oat-project-complete` after the PR opens; they
are out of scope here and rely on `complete-state`'s refusal (follow-up:
note it in the p06-t02 index note).
Bump `oat-project-complete`; `oat-project-implement` and `oat-project-next`
are already bumped on this branch.

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
- Modify: contract tests

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
waiver. Bump `oat-project-pr-final`; `oat-project-summary` is already bumped
in p01-t03.

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
  apply in `applySyncActions` around 310), sync tests

**Step 1: Failing test first**

`AGENTS.md -> CLAUDE.md` with real content in `CLAUDE.md`, then
`instructions sync --strategy pointer --force`: today `CLAUDE.md` becomes
`@AGENTS.md`. Add the same case for `--strategy symlink`, a symlink chain, and
a hard link.

**Step 2: Implement**

A helper decides whether any `AGENTS.md` resolves to a given `CLAUDE.md`
(device/inode and realpath), reusing the resolves-to logic the `none` strategy
already has. Planning skips such a file and reports it as kept, under every
strategy with `--force`. Non-linked behavior is unchanged. Neutralize the
planning guard and show the tests fail; restore. No separate apply-time
re-check: a link created between planning and apply inside one CLI run is not
a reported failure (reintroduce if one is).

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
- Modify (persistence descriptions): `.agents/skills/oat-dispatch-subagents/SKILL.md`
  (178-189) and `references/record-schema.md` (366, 379),
  `.agents/skills/oat-project-dispatch-subagents/SKILL.md` (161-169),
  `.agents/skills/oat-project-review-provide/SKILL.md` (around 762),
  `.agents/skills/oat-project-review-provide-remote/SKILL.md` (around 327),
  `.agents/skills/oat-project-plan-writing/SKILL.md` (around 273),
  `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md`
  (around 403-408), `apps/oat-docs/docs/reference/cli-reference.md` (157),
  `apps/oat-docs/docs/workflows/projects/evidence-layers.md` (around 81),
  `apps/oat-docs/docs/workflows/projects/orchestration-model.md` (the
  `Journal` participant in the sequence diagram around 79-87 and the
  persistence sentence around 125-131),
  `apps/oat-docs/docs/workflows/projects/implementation-execution.md` (around
  76-82), and the
  scope-and-surface doc that describes persistence (locate by content)
- Modify: `packages/cli/src/validation/skills.test.ts` (around 3008-3054),
  which today requires those files to say the record is "optional and off by
  default"; rewrite it to assert the persistence wording is absent

**Step 1: Remove**

Keep `oat project dispatch record` as a validate-only command and its schema
modules (`providers/identity/{generic-dispatch-record,oat-dispatch-record,runtime-observation}.ts`),
as the decision record requires for the managed Claude validation path. Delete
the journal writer, lock, revisions, fallback-claim publication, related-record
reads, `--project`, the `persisted` status, and the lineage logic only they
used. Move the redaction assertions that read journal bytes (around 1829 and 1873) onto the validate-only output. Prune persistence tests. Leave
`tools/smoke/evidence` alone and do not add a stale-invocation doctor entry.
Bump `oat-project-dispatch-subagents`, `oat-project-review-provide`,
`oat-project-review-provide-remote`, and `oat-project-plan-writing`
(`oat-dispatch-subagents` is already bumped in p03-t05, and
`oat-project-implement` in p01-t03).

**Step 2: Verify**

Run `pnpm build`, then
`HOME=$(mktemp -d) pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch src/commands/help-snapshots.test.ts src/validation`,
`pnpm test:smoke`, `pnpm test:skills`, and
`node packages/cli/dist/index.js project dispatch record --project x`
(rejected as an unknown option). Then run this search; the expected result is
no output (rg exits 1). Wording that says the command is validate-only and
takes no `--project` is allowed.

```bash
rg -n -U 'dispatch record[^\n]*\\\n\s*--project|per-dispatch\s+file|dispatch/. director|dispatch journal|<project>/dispatch/' \
  .agents apps/oat-docs/docs packages/cli/src --glob '!**/*.test.ts' --glob '!**/tests/**'
```

Expected: every other command exits 0.

**Step 3: Commit**

`refactor(p05-t02): make dispatch record validate-only`

---

### Task p05-t03: Let test-only changes skip the lockstep bump

**Files:**

- Modify: `packages/cli/src/release/public-package-contract.ts` (ignore
  patterns around 133-177) and
  `packages/cli/src/release/{public-package-contract,check-version-bumps,release-utils}.test.ts`,
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

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/release`.
Real probe: create a scratch worktree off `origin/main`
(`git worktree add "$(mktemp -d)/probe" origin/main`) and run
`pnpm run worktree:init` in it. Apply this task's ignore-pattern change there
uncommitted (`release:check-versions` diffs committed history but loads the
contract from the working tree). Commit only a change to one
`packages/cli/src/**/*.test.ts` file and run `pnpm release:check-versions`
(expect exit 0). Then commit a change to a non-test `src` file and run it
again (expect a failure). Record both exit codes in the commit body, then
remove the worktree with `git worktree remove --force <path>`.
Expected: exit 0 for the unit tests and the test-only probe.

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

**Step 1: Flip the pinned tests first** (they fail), then the routes. Change
exactly: router.ts `discovery:in_progress:2` and `discovery:complete:1` →
`oat-project-quick-start`; generate.ts `quick:discovery:complete` →
`oat-project-quick-start`. Keep router `discovery:in_progress:3` and the
dashboard's `quick:discovery:in_progress` (generate.ts around 407) at
`oat-project-discover`, which matches the `oat-project-next` (around 254) and
`oat-project-progress` (around 278) tables, and add tests pinning those
unchanged routes. Leave quick `plan:in_progress` routing alone
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

- Modify: `apps/oat-docs/docs/reference/troubleshooting.md` (around 202) and
  `.oat/repo/pjm/backlog/items/BL-260903-verify-the-packs-inventory.md` (fill
  the placeholder acceptance criteria with the outcome below)

**Step 1: Edit**

The docs say what the code does: project and home roots are replaced only
when that scope is part of the run, only exact prefixes are replaced, and
paths outside those roots (such as a global bundle path in an assets error)
stay absolute. Cite the code paths (`status/index.ts` around 204-240 and
708-713; `format-pack-inventory.ts` around 23-62; `doctor/index.ts` around
1098-1103 and 1186-1213) in the commit body. No new test.

**Step 2: Verify**

Run: `pnpm --filter oat-docs check`.
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
`BL-261001-recompute-oat-project-next-s`, `BL-260902-decide-test-only-freshness`, `BL-260928-keep-instructions-sync-force`,
`BL-260909-give-the-dispatch-record`, `BL-260826-decide-whether-test-only-paths`,
`BL-260830-add-strict-yaml-validation`, `BL-260928-route-quick-mode-discovery`,
`BL-260903-verify-the-packs-inventory`. The `--summary` for
`BL-260909-give-the-dispatch-record` cites `DR-260927-dispatch-record-validates`
(validate-only command kept, so its "no skill or doc references the command"
removal criterion is superseded), and the one for
`BL-261001-recover-recon-lanes-after` cites discovery Key Decision 8 (the
Codex note lives in `provider-codex.md` behind a recon pointer). Archive
`BL-260829-order-phase-bookkeeping-before` only if `implementation.md` records
a phase whose reviewed head was its Step 7a bookkeeping commit and whose review
raised no ledger or resume-pointer finding, together with the
`oat-project-implement` version and path that ran it; cite that phase in the
summary. (Its relationship to `BL-260711` was recorded in Wave 2.)

Do not archive `BL-260806-fail-closed-when-configured` here. This project's
own closeout starts from a configured-plus-absent state (autonomous, no
snapshot yet), so it is the live lifecycle evidence the item asks for. The
effective sequence is `preApproval: [summary, document, pr]`,
`postApproval: []`, so the trace is complete only after the PR child, the
approval record, and the Step 16 completion transition. Owner and boundary:
after `oat-project-implement` reports the closeout sequence `complete` and
Step 16 has marked implementation complete, and before the autonomous run's
final report, the root orchestrator appends the trace to `implementation.md`
(the snapshot-persisting commit, each child's commit in stored order, the
approval record, and the completion commit), archives the item with
`backlog archive` citing that trace, commits, pushes, and notes the archive in
the open PR's body.

**Step 2: Index note**

Add a curated overview note to `.oat/repo/pjm/backlog/index.md` (including
that the CLI recommender and dashboard still suggest completion without the
closeout check, per p04-t03), run
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

- p01 and p02 both edit `packages/cli/src/commands/help-snapshots.test.ts` and
  `apps/oat-docs/docs/reference/cli-reference.md`.
- p02 and p03 both change the branch's skill-bump state that
  `check:skill-bumps` evaluates at each phase head.
- p03 and p04 share the skill-bump state (`check:skill-bumps`) and p05 edits
  `oat-dispatch-subagents`, which p03 bumps.
- p04 and p05 both edit `help-snapshots.test.ts` and `cli-reference.md`.
- p06 is the fan-in: the lockstep bump and backlog close-out need every earlier
  phase.

Within p03 every task edits `.agents/skills/recon/**`; within p04 the tasks
edit `completion-and-closeout.md` and `oat-project-next/SKILL.md` in order.

---

## Acceptance Mapping

| Item                                       | Criterion                                                                        | Task                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `BL-260927-expose-a-scoped-template`       | One precedence order shared by scaffold, PJM, and the command; decision recorded | p01-t01 (DR-260927-templates)                            |
|                                            | CLI command resolves a named template, `--json`, clear not-found                 | p01-t02                                                  |
|                                            | Lifecycle skills call the resolver; version bumps                                | p01-t03                                                  |
|                                            | Tests: repository override, user-only, bundle-only, isolated `HOME`              | p01-t01, p01-t02                                         |
| `BL-260718-support-fumadocs-in-oat-docs`   | Framework detection; MkDocs unchanged                                            | p02-t01                                                  |
|                                            | `meta.json` per directory from Contents order; title from heading                | p02-t01                                                  |
|                                            | Unlisted pages reported, not dropped                                             | p02-t01                                                  |
|                                            | Second run writes nothing                                                        | p02-t01, p02-t03                                         |
|                                            | Help and docs describe both frameworks; snapshot updated                         | p02-t02                                                  |
|                                            | `apps/oat-docs` sidebar matches Contents maps; files committed; `build:docs`     | p02-t03                                                  |
|                                            | Docs skills framework-correct; bumps                                             | p02-t04                                                  |
|                                            | Tests: nested fixture, unlisted, idempotence, isolated `HOME`                    | p02-t01                                                  |
| `BL-261001-make-recon-s-packet-validator`  | Shared projection and binding; briefs stay blind                                 | p03-t01                                                  |
|                                            | One coverage contract across acceptance, reconciliation, publication             | p03-t02                                                  |
|                                            | Structured unresolved issues, same rule everywhere                               | p03-t03                                                  |
|                                            | End-to-end production-helper test                                                | p03-t01                                                  |
|                                            | Negative controls proven by neutralization                                       | p03-t04                                                  |
|                                            | `recon` bump and release note                                                    | p03-t01, PR Requirements                                 |
| `BL-261001-recover-recon-lanes-after`      | Codex v2 residency note; `interrupt_agent` vs `close_agent`                      | p03-t05                                                  |
|                                            | Pre-acceptance rejection is a provider failure; accepted work kept               | p03-t05                                                  |
|                                            | At most one retry, declared; approved alternate only; otherwise stop             | p03-t05                                                  |
|                                            | No silent control changes; fresh lanes stay fresh                                | p03-t05                                                  |
| `BL-261001-recompute-oat-project-next-s`   | Next recomputes v2 with the same exclusions; pinned against implement            | p04-t01                                                  |
| `BL-260806-fail-closed-when-configured`    | Configured/autonomous closeout cannot complete without the snapshot              | p04-t02, p04-t03                                         |
|                                            | Snapshot persisted before any sequence child is dispatched                       | p04-t03                                                  |
|                                            | Transition-level tests from configured-plus-absent through completion            | p04-t02 (disk trace), post-closeout live trace (p06-t02) |
|                                            | Unconfigured path preserved; missing snapshot diagnosed                          | p04-t02                                                  |
| `BL-260902-decide-test-only-freshness`     | Append-only waiver; provenance not rewritten                                     | p04-t04                                                  |
|                                            | Operator-only, never self-issued under autonomy                                  | p04-t04                                                  |
|                                            | Waived generation stale after a later substantive change (v1 and v2)             | p04-t04                                                  |
|                                            | Waiver shown in summary and PR verification                                      | p04-t04                                                  |
|                                            | Tests: waived, unwaived, waiver-then-change, malformed                           | p04-t04                                                  |
|                                            | Implement and next bumped                                                        | p01-t03, p04-t01                                         |
| `BL-260928-keep-instructions-sync-force`   | `--force` never overwrites a linked `CLAUDE.md`, any strategy                    | p05-t01                                                  |
|                                            | Failing-first test and neutralize-and-restore proof                              | p05-t01                                                  |
| `BL-260909-give-the-dispatch-record`       | Decision recorded (validate-only)                                                | `DR-260927-dispatch-record-validates`                    |
|                                            | Persistence and its docs removed; validator kept for the managed Claude path     | p05-t02                                                  |
|                                            | No `<project>/dispatch/` written by any default path                             | p05-t02                                                  |
| `BL-260826-decide-whether-test-only-paths` | Ignore patterns equal tsconfig test exclusions; contract test                    | p05-t03                                                  |
|                                            | Test-only change passes; `src` change still requires a bump                      | p05-t03                                                  |
|                                            | AGENTS.md states the rule                                                        | p05-t03                                                  |
| `BL-260830-add-strict-yaml-validation`     | Invalid YAML fails with path and parser location                                 | p05-t04                                                  |
|                                            | Field types validated; semantic checks kept; bare-colon fixture; skills pass     | p05-t04                                                  |
| `BL-260928-route-quick-mode-discovery`     | Router and dashboard route quick discovery to quick-start; tests agree           | p05-t05                                                  |
| `BL-260903-verify-the-packs-inventory`     | Docs claim matches the code (cited paths)                                        | p05-t06                                                  |
| `BL-260829-order-phase-bookkeeping-before` | Verified against a real multi-phase run; relationship to BL-260711 recorded      | every phase review, p06-t02                              |

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
- Breaking CLI grammar, per `.github/PULL_REQUEST_TEMPLATE.md` and
  `apps/oat-docs/docs/contributing/code.md`: tick the template's grammar-change
  box and include
  `BREAKING: oat project dispatch record no longer accepts --project (validate-only)`,
  Before `oat project dispatch record --event-file - --project <path> --json`,
  After `oat project dispatch record --event-file - --json`, and the migration
  action (drop `--project`; the `implementation.md` dispatch rows remain the
  record).
- The body lists the other user-visible changes (`--force` link guard, YAML
  error locations, quick discovery routing, packs docs).

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                           | Reviewed Head                            | Invocation | Gate Target       |
| ------ | -------- | --------------- | ---------- | -------------------------------------------------- | ---------------------------------------- | ---------- | ----------------- |
| p01    | code     | fixes_completed | 2026-10-01 | reviews/archived/p01-review-2026-10-01T112852Z.md  | de9c98848aeb2379f0b9a81ead945664351d1f2b | auto       | -                 |
| p02    | code     | pending         | -          | -                                                  | -                                        | -          | -                 |
| p03    | code     | pending         | -          | -                                                  | -                                        | -          | -                 |
| p04    | code     | pending         | -          | -                                                  | -                                        | -          | -                 |
| p05    | code     | pending         | -          | -                                                  | -                                        | -          | -                 |
| p06    | code     | pending         | -          | -                                                  | -                                        | -          | -                 |
| final  | code     | pending         | -          | -                                                  | -                                        | -          | -                 |
| spec   | artifact | pending         | -          | -                                                  | -                                        | -          | -                 |
| design | artifact | pending         | -          | -                                                  | -                                        | -          | -                 |
| plan   | artifact | fixes_completed | 2026-10-01 | -                                                  | -                                        | auto       | -                 |
| plan   | artifact | fixes_completed | 2026-10-01 | reviews/artifact-plan-review-2026-10-01T061917Z.md | -                                        | gate       | codex-6-sol-xhigh |
| plan   | artifact | fixes_completed | 2026-10-01 | reviews/artifact-plan-review-2026-10-01T063044Z.md | -                                        | gate       | codex-6-sol-xhigh |
| p01    | code     | fixes_added     | 2026-10-01 | reviews/archived/p01-review-2026-10-01T114001Z.md  | 91b1dde7c5f589226a852c41da4ba80fb0de012c | gate       | codex-6-sol-xhigh |

For code-review events, `Reviewed Head` is the full 40-character SHA at the
head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`;
`Gate Target` is populated only for gate events. Legacy five-column rows remain
valid. Writers must preserve every existing row and every unknown trailing
cell; never truncate a widened row back to five columns.

Plan artifact disposition: the automatic structured review (Opus 5.5 high,
exception route because the planning parent's effort was unknown) ran three
attempts within the retry bound of 2. Attempt 1 findings (H1-H3, M1-M5,
L1-L5) and attempt 2 findings (H1 search and inventory, M1 env-read
autonomy, L1 probe setup, L2 stale-invocation entry) were applied and
re-reviewed. Attempt 3's single Medium (the p05-t02 search always matched a
hash-attested fixture and missed wrapped sentences) was applied after the
bound without a further structured pass and is covered by the configured
gate.

Gate attempt 1 (`codex-6-sol-xhigh`, QS-12, `onFailure: block`,
`maxAttempts: 2`) returned H1 (no executable closeout transition proof), M1
(the p05-t01 apply-time re-check could not be shown load-bearing), and M2
(the new scoped-issue shape lacked fail-closed validation). H1 was resolved by
a disk-backed transition trace in p04-t02 plus this project's own closeout as
live evidence, with `BL-260806` archived only after that trace. M2 was
resolved by a closed union bound to the review's claims, with malformed
negatives. M1 was resolved by dropping the apply-time re-check rather than
proving it, as the complexity review recommended: a relink inside one CLI run
is unreported, and the planning guard is proven by neutralization.

Gate attempt 2 (`codex-6-sol-xhigh`) returned H1 (archiving `BL-260806`
inside the documentation child would precede the PR child, approval, and
completion it must cite) and M1 (the staged recon end-to-end test could not be
green at each task's verification). H1 was resolved by moving the archive to a
root-owned step after Step 16 and before the final report; M1 by a shared
fixture with focused per-defect tests and the full publication assertion
activated in p03-t03. The configured gate's `maxAttempts: 2` is exhausted, so
readiness waits on an operator decision (QS-12 boundary).

Operator disposition (2026-10-01): with the gate's attempts exhausted and its
last findings resolved in the plan, the operator approved proceeding to
implementation (QS-12 boundary resolved by explicit operator decision;
recorded in `implementation.md`). Phase gates and the final review still run.

Complexity review (required by `tackle-backlog`) simplifications applied:
reuse the existing PJM resolver; `--output` copies with no `--force`; trimmed
command tests; semantic `meta.json` comparison; one recon end-to-end fixture
written first, with negatives in the existing per-code tests; recon routing
predicates unchanged; no autonomous or gate-inventory wiring; no waiver clause
in the CLI check; one `--force` guard; no new doctor test. Its two
operator-gated suggestions (dropping the explicit global issue shape, and not
wiring `oat-project-next`) were not applied: both would drop an acceptance
criterion.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/High)

---

## Implementation Complete

**Summary:**

- Phase 1: 5 tasks - Template resolver
- Phase 2: 4 tasks - Fumadocs navigation
- Phase 3: 5 tasks - Recon publication and Codex recovery
- Phase 4: 4 tasks - Lifecycle closeout guards
- Phase 5: 6 tasks - Small fixes
- Phase 6: 3 tasks - Release fan-in

**Total: 27 tasks**

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

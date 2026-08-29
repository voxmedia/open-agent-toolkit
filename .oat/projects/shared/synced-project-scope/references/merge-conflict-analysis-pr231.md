---
oat_generated: true
oat_generated_at: 2026-08-29T18:10:00Z
oat_analysis_kind: merge-conflict
oat_analysis_subject: 'PR #227 (synced-project-scope) x PR #231 (portable-agent-references)'
oat_analysis_author_project: .oat/projects/shared/portable-agent-references
---

# Merge conflict analysis: PR #227 × PR #231

Written by the `portable-agent-references` session (PR #231) for whoever
resolves this merge. Analysis performed 2026-08-29 against #227 head as fetched
from `refs/pull/227/head` and #231 head `83a9ced43`.

**This file is a handoff document. It is uncommitted and untracked on purpose —
adding a commit to an in-flight PR branch was not mine to do.** Commit it,
relocate it, or delete it as you prefer.

## Bottom line

Merge **#231 first**. Then #227 needs no version rework, and the conflict set is
11 files — 8 mechanical, 3 requiring judgment. There is one failure mode that
git will not surface; it is described under "The trap" below and is the single
most important thing in this document.

## Recommended order, and why

All five lockstep public packages:

| ref                                | version  |
| ---------------------------------- | -------- |
| `origin/main` (at time of writing) | `0.2.40` |
| #231                               | `0.2.41` |
| #227                               | `0.2.44` |

`tools/release/check-version-bumps.ts` requires every public version to be
strictly greater than the version at the live `origin/main` tip.

- **#231 first** → main becomes `0.2.41`; #227's `0.2.44` still clears it.
  **Neither PR re-bumps.**
- **#227 first** → main becomes `0.2.44`; #231's `0.2.41` fails and must move to
  ≥ `0.2.45`, plus regenerate two generated files and re-run the release gates.

At the time of writing #227's CI was failing (`mergeStateStatus: UNSTABLE`)
while #231 was green and `CLEAN`, which points the same way.

Note that the conflict burden falls on whichever PR merges _second_, and it is
the same ~11 files either way. It does not scale with PR size — 618 of #227's
629 files never collide with anything.

## Conflict inventory

`git merge-tree --write-tree --name-only <231-head> <227-head>` → 11 conflicts.

### Mechanical (8)

- `packages/cli/package.json`
- `packages/control-plane/package.json`
- `packages/docs-config/package.json`
- `packages/docs-theme/package.json`
- `packages/docs-transforms/package.json`
- `packages/cli/assets/public-package-versions.json`
- `.oat/sync/manifest.json`
- `.oat/repo/pjm/current-state.md`

**Two of these must be regenerated, not hand-merged:**

- `packages/cli/assets/public-package-versions.json` is written fresh by
  `packages/cli/scripts/bundle-assets.sh` on every `pnpm --filter cli build`,
  from `BUNDLE_INPUTS.publicVersionPackages`. Hand-picking lines produces a tree
  that looks merged and is wrong.
- `.oat/sync/manifest.json`'s `oatVersion` is stamped from the **built** CLI's
  `OAT_VERSION` (`packages/cli/src/manifest/manager.ts`). Resolve the
  `package.json` versions first, then rebuild, then `oat sync --scope all`.
  Editing the value by hand leaves it inconsistent with the build that produced
  the rest of the manifest.

`.oat/repo/pjm/current-state.md` is a genuine hand-merge: both PRs make the same
`PR #226 pending merge` → `merged` edit and then insert _different_ new bullets
at the same point. Keep the shared edit once and both bullets, ordered by actual
merge chronology.

### Requiring judgment (3)

Verified with an actual 3-way `git merge-file`, not by reading diffs:

| File                                                 | Conflicting hunks | Nature                        |
| ---------------------------------------------------- | ----------------- | ----------------------------- |
| `.agents/agents/oat-phase-implementer.md`            | 1                 | the `version:` line only      |
| `.agents/skills/oat-project-review-provide/SKILL.md` | 1                 | the `version:` line only      |
| `packages/cli/src/validation/skills.test.ts`         | 6                 | shared version-literal arrays |

The bodies do not collide. #231 rewrites the dispatch-contract section of the
agent; #227 adds a "Synced-Scope Bookkeeping" section roughly 40 lines away. In
the skill, #231 rebinds the review-artifact-template reference while #227 adds
`oat project scope` / `pull` / `push` logic in three distant regions. In
`skills.test.ts`, both PRs' new test blocks merge intact.

**#227 introduces no bare repo-relative reads anywhere**, so #231's portability
ratchet is not threatened by #227's content. This was checked directly, not
assumed: the ratchet's matcher was replicated and run over the predicted merge
tree's full canonical surface (76 pack assets, 192 markdown files). Result: 6
matches, exactly equal to `PINNED_HISTORICAL_CROSS_SKILL_READS`. **Zero new
violations.** #227 also does not modify the ratchet test file at all.

## The trap

**#231 asserts exact version literals in roughly eight places in
`packages/cli/src/validation/skills.test.ts`:**

- `.agents/agents/oat-phase-implementer.md` → `1.0.12`
- `.agents/skills/oat-project-review-provide/SKILL.md` → `1.4.1`
- `.agents/agents/oat-reviewer.md` → `1.2.1`

**#227 bumps the same two files to `1.1.0` and `1.5.0`.** Because both PRs
bumped them, the correct post-merge version exists in **neither branch** — it
has to be a new number above both, e.g. `1.1.1` and `1.5.1`.

Most of those assertion lines **do not conflict**, because #227 never touches
the newly-inserted ones. So the merge completes clean, and the test suite fails
afterward, with nothing in the conflict output pointing at the cause.

**Resolution:** after settling the two frontmatter versions, grep for every
occurrence of `1.0.12`, `1.4.1`, and `1.2.1` in `skills.test.ts` and reconcile
all of them — not only the six flagged hunks.

## Suggested sequence

1. Merge #231.
2. Update #227 onto the new main. Its `0.2.44` passes the version gate unchanged.
3. Resolve the five `package.json` conflicts in #227's favour (`0.2.44`).
4. Regenerate rather than hand-merge:
   - `pnpm --filter cli build` → rewrites `public-package-versions.json`
   - `oat sync --scope all` → rewrites `.oat/sync/manifest.json` `oatVersion`
5. Hand-merge `.oat/repo/pjm/current-state.md` (keep both bullets).
6. Resolve the two skill/agent `version:` lines to a value above both sides.
7. **Sweep `skills.test.ts` for the stale version literals** per "The trap".
8. `git fetch origin main`, then re-run `pnpm release:check-versions`,
   `pnpm release:validate`, and the rest of the Definition of Done.

## Unrelated defect noticed in #227

`.oat/repo/pjm/current-state.md` on #227 says `CLI 0.2.43` while its five
`package.json` files and `public-package-versions.json` say `0.2.44`.
Pre-existing and independent of this merge; worth correcting before #227 lands
so the shipped narrative matches the shipped version.

## Things checked that are _not_ problems

- `tools/release/*`: no diff on #227 — the gate logic and lockstep package set
  are untouched.
- `pnpm-lock.yaml`: no diff on either branch. Despite 629 files, #227 introduces
  no dependency changes.
- `AGENTS.md`: #227's edit is confined to the "Essential Commands" section and
  does not touch release policy. It did not appear in the conflict list.
- The 40 shared `.codex/agents/*.toml` and `.cursor/agents/*.md` generated views
  merge cleanly despite both PRs regenerating them.

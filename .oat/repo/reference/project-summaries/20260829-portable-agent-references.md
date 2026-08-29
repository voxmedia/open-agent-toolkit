---
oat_generated: true
oat_generated_at: 2026-08-29
oat_summary_scope: project
oat_summary_last_task: p02-t02
oat_summary_revision_count: 0
oat_summary_includes_revisions: false
oat_project: .oat/projects/shared/portable-agent-references
---

# Project Summary: portable-agent-references

## Overview

Made every executable cross-skill reference shipped by a user-default pack
scope-portable, and enforced that invariant across canonical skill and agent
Markdown with a manifest-driven ratchet.

The predecessor project (`BL-260827-make-packaged-skill-references`, PR #226,
CLI `0.2.39`) fixed an identified set of cross-skill reads. It explicitly
deferred two things: the agent surface, and cross-skill `references/*.md`
coverage. This project closed that deferral and generalized the guarantee from
"the reads we found" to "the whole user-default asset surface, enforced."

## What Was Implemented

**The ratchet** (`packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`)
derives skill _and_ agent assets from `PACK_MANIFEST` rather than a hand-kept
list, and classifies cross-skill `SKILL.md` reads plus file- and directory-form
targets at or below `references/`, across backticked, plain, Markdown-link,
`./`, `../`, and repeated-parent spellings.

**Ported callers.** All nine canonical callers resolve through installed roots:

- Six skills use loaded → user → project
  (`${SKILL_DIR}/..` → `${HOME}/.agents/skills` → `<repo-root>/.agents/skills`).
- Three agents use user → project only, because no provider exposes a stable
  loaded-agent source directory. Codex materializes `.toml`, Cursor mixes
  symlinks with model variants, and Claude symlinks to canonical — so an agent
  must not invent a `${SKILL_DIR}`-style loaded root.

Each dependency binds an independent root, so a missing pack cannot silently
satisfy another dependency's read, and every miss fails closed with a
pack-specific install/update recovery command.

**Exemption removed.** The `oat-phase-implementer` bare-path exemption in
`packages/cli/src/validation/skills.test.ts` was replaced with the same positive
portable assertions its consumers use — not relaxed.

**Zero debt as an invariant.** A temporary migration inventory of 21 exact
entries was introduced and drained to zero, leaving only the six pre-existing
non-executable historical entries. `PINNED_HISTORICAL_CROSS_SKILL_READS` was
verified byte-identical across every phase commit, proving live debt was drained
rather than reclassified into the baseline.

**Documented and shipped.** The contract is documented for contributors, the
Codex and Cursor provider views were regenerated, and the five public packages
were released together as `0.2.41`.

## Key Decisions

1. **Manifest-derived surface over an enumerated list.** Deriving from
   `PACK_MANIFEST` means a newly added user-default skill or agent is covered
   automatically instead of silently unguarded.
2. **Different candidate orders for skills and agents.** Symmetry was rejected
   deliberately: there is no stable cross-provider loaded-agent path, so
   inventing one would have produced a resolver that fails on two of three
   providers.
3. **Separate migration inventory from historical baseline.** Keeping current
   debt in its own exact inventory — rather than adding it to the historical
   baseline — is what made "drained to zero" a checkable claim.
4. **Codex as the contract-gated materialization provider.** Accepted at final
   review as artifact alignment; `plan.md` and `design.md` were corrected to
   match shipped coverage rather than overstating it.

## Verification

- Full CI gate list in CI's order, uncached and HOME-isolated: `check`,
  `type-check`, `test`, `build`, `check:skill-bumps`, `release:check-versions`,
  `release:validate`, `build:docs` — all exit 0, `Cached: 0 cached, 10 total`,
  zero replay markers.
- Ratchet mutation-tested twice and independently: reverting a ported agent
  file, and injecting a bare read into `oat-codebase-mapper.md`. Each failed the
  suite with exact `source -> target` evidence; worktree restored clean.
- All tracked generated agent views scanned with the ratchet's own matcher:
  0 non-portable reads.

## Review History

Six review rounds. Phase 1 needed three (one genuine code defect — the matcher
missed `../../<skill>/…`, the natural spelling from a scanned `references/`
file — and two rounds of root-owned bookkeeping defects). Phase 2 needed two.
The final review passed at 0 Critical / 0 Important.

One `Minor` finding took two attempts and is worth remembering: a review claimed
only the `workflows` pack ships agents, a fix "verified" the cited half of that
claim (`utility` is skills-only) and wrote the precise-but-false statement into
the docs. The `research` pack also ships an agent. Confirming the cited half of
a claim is not confirming the claim.

## Deferred Work

- **`BL-260829-unified-agent-provider-root`** (high, L) — skills reading
  canonical _agent_ definitions still use bare `.agents/agents/<name>.md` paths,
  a path shape the matcher structurally cannot see. Nine sites across five
  skills in two packs, four executable. Scaffolded as project
  `agent-provider-root` with seeded discovery, because a correct fix requires
  inventing a portable agent-read convention that does not yet exist.
- Provider materialization is contract-gated for Codex only; Claude and Cursor
  views rely on manual regeneration plus the `oat sync --dry-run` drift check.
- Sibling paths outside `SKILL.md` and `references/` remain unenforced; zero
  live violations today.

## References

- Discovery: `discovery.md`
- Design: `design.md`
- Plan: `plan.md`
- Implementation: `implementation.md`

## Workflow Observations

### 2026-08-28 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:1,medium:1,minor:5 exit=1 status=blocked artifact=.oat/projects/shared/portable-agent-references/reviews/artifact-plan-review-2026-08-28T223052Z.md

### 2026-08-28 · structural · oat gate review · plan

target=claude-fable-skip-permissions threshold=important findings=critical:0,important:0,medium:1,minor:2 exit=0 status=ok artifact=.oat/projects/shared/portable-agent-references/reviews/artifact-plan-review-2026-08-28T224908Z.md

### 2026-08-29 · structural · oat-project-implement · p02

Phase p02 passed root-owned review round 2 at fa9d6e37d (0C/0I); see reviews/p02-review-2026-08-29T081859Z.md, which carries delegated-reconnaissance orchestration evidence.

### 2026-08-29 · structural · oat-project-implement · p01

Phase p01 passed root-owned review round 3 at 52745ef93 (0C/0I) after one implementer fix round; rounds 2-3 findings were root-owned bookkeeping. See reviews/p01-review-2026-08-29T074543Z.md.

### 2026-08-29 · structural · oat-project-retro · project-retro

retro artifact=.oat/projects/shared/portable-agent-references/references/project-retro.md evidence_used=lifecycle-artifacts,project-log,review-artifacts,session-transcript evidence_unavailable=oat-execution-learnings promotions=5 upstream=2 apply=declined filing=declined

### 2026-08-29 · structural · oat-project-retro · project-retro

correction of prior retro receipt: apply and filing outcomes were recorded as declined before the interactive consent step ran; no apply or filing decision had been made. Accurate outcome at that point was deferred for both. Prior entry preserved above; this entry supersedes its apply= and filing= values.

### 2026-08-29 · structural · oat-project-retro · project-retro

retro artifact=.oat/projects/shared/portable-agent-references/references/project-retro.md evidence_used=lifecycle-artifacts,project-log,review-artifacts,session-transcript evidence_unavailable=oat-execution-learnings promotions=5 upstream=2 apply=performed filing=performed

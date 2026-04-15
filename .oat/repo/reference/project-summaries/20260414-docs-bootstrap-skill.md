---
oat_status: complete
oat_ready_for: oat-project-pr-final
oat_blockers: []
oat_last_updated: 2026-04-14
oat_generated: true
oat_template: false
oat_summary_last_task: p06-t03
oat_summary_revision_count: 0
oat_summary_includes_revisions: []
---

# Summary: docs-bootstrap-skill

## Overview

Adding a documentation app to an OAT repo meant running `oat docs init` and then discovering — by trial and error — a long tail of friction: the scaffold's site title didn't flow into HTML `<head>` metadata; nested-standalone monorepos hit an "inferred workspace root" Turbopack warning; the scaffolded `docs/getting-started.md` hardcoded a Node version that rarely matched the consuming repo; `docs/contributing.md` duplicated agent guidance that belonged in a docs-app `AGENTS.md` which the scaffold never wrote; `## Contents` links were extension-less and agent-hostile despite the build pipeline supporting `.md`-suffixed form; and there was no structured conversation about what the resulting `.oat/config.json` `documentation` section meant, what `requireForProjectCompletion` does, or how the two-`index.md` model and three-agent-instruction surfaces fit together. This project ships `oat-docs-bootstrap` — a guided skill that wraps the CLI with preflight, richer inputs, capability-gated post-patches, build verification, config inspection, and an educational walkthrough — plus the supporting scaffold-template fixes and CLI registration so the skill is deliverable via `oat tools install docs`.

## What Was Implemented

**New skill: `oat-docs-bootstrap`.** A user-invocable Claude Code / Cursor skill that runs a seven-step pipeline end-to-end:

1. **Preflight Detector** — repo-shape detection (monorepo / single-package / nested-standalone), read-only scan for existing docs config / app dir / root `AGENTS.md` docs section, and default-value resolution.
2. **Input Gatherer** — one-question-at-a-time flow collecting framework, site name (distinct from package name — FP-12 workaround), package name, target dir, description, lint, format; conflict resolution contract (replace / second-app deferred / abort / repair) when Preflight surfaces conflicts; coherence check before scaffold.
3. **Scaffold Runner** — CLI invocation with capability-gated flags plus labeled, idempotent post-patches for open CLI gaps:
   - **FP-11** — Turbopack `root` for nested-standalone Fumadocs (two code paths: `createDocsConfig` passthrough when the option exists, wrapper replacement with `createMDX()` fallback otherwise with a `.pre-fp11.bak` snapshot).
   - **FP-12** — `export const metadata = { title, description }` insertion in `app/layout.tsx` (the only thing that populates HTML `<head>`), plus display-title coherence across `DocsLayout.branding`, `docs/index.md` frontmatter + H1, `docs/getting-started.md` body references, and `docs/contributing.md` H1.
   - **FP-13** — five scaffold-content fixes (empty `description:` on sibling pages, bare install/build commands without shape-aware prefixes, false `docs:lint` claim when `lint=none`, missing "do not hand-edit" header on generated `index.md` via a two-pass best-effort + backstop strategy, and Node version mismatch detected from `.nvmrc` / `engines.node`).
   - **FP-15** — writes a task-framed `<appRoot>/AGENTS.md` bridge template (runtime agent reference for the docs app) when the CLI hasn't scaffolded one; never overwrites existing files.
   - **FP-16** — rewrites `docs/index.md` `## Contents` links to `.md`-suffixed form that the `@open-agent-toolkit/docs-transforms` remark-links plugin normalizes at build time.
   - **FP-17** — trims `docs/contributing.md`'s "Agent guidance" section to a one-line pointer at the docs-app `AGENTS.md`, restoring three-surfaces separation (contributing = humans, AGENTS.md = agents, root `AGENTS.md ## Documentation` = repo-wide pointer).
   - Every patch is labeled (e.g., `<!-- FP-12 patch -->`) so it can be found and removed deterministically when the CLI fix lands upstream. Capability Detection gates each patch on both a CLI help probe and a file-shape check — the skill self-ratchets off as CLI fixes land.
4. **Build Verifier** — shape-aware install + build (monorepo `pnpm --filter`, nested-standalone `cd <appRoot> && pnpm`, single-package bare); narrow auto-fix discipline (one known case: `fumadocs-mdx: command not found` + missing `node_modules` → rerun install once then escalate); unknown-error stop rather than speculative retry.
5. **Post-Scaffold Inspector** — reads `.oat/config.json` back, verifies every `documentation.*` path against disk, handles nested-standalone dual-config without reconciliation, detects drift between patches applied and config state, and collects the `requireForProjectCompletion` opt-in. Write-once discipline: this is the only step (outside the CLI's own writes) that mutates `.oat/config.json`.
6. **Educational Walkthrough** — seven chunked sections with per-section "continue / skip to summary" pauses: (A) your `documentation` config grounded in Inspector output, (B) the two-`index.md` model with the FP-13/D footgun explicitly called out, (C) the `## Contents` contract including `.md` link discipline, (D) three agent-instruction surfaces with audience + lifetime framing, (E) Fumadocs deep dive with the "compiled theme only forwards `branding.title`" runtime insight, (F) MkDocs Minimum Contract with visible in-scope / deferred lists, (G) the OAT docs ecosystem (`oat-project-document`, `oat-docs-analyze`, `oat-docs-apply`).
7. **Optional Content Kickoff** — hands off to `oat-docs-analyze` + `oat-docs-apply` on accept; hands off with specific skill invocations on decline. Final Exit summary is a scannable block listing app, location, framework, patches applied / skipped / refused per FP, build status, inspection findings, where things live, and next-step commands.

**FP-15 bridge template and canonical example.** A task-framed `AGENTS.md.template` under the skill's `assets/` directory with 8 sections honoring the "still relevant six months after scaffold" litmus test, plus a rendered canonical example at `apps/oat-docs/AGENTS.md` adapted to this repo's actual layout.

**CLI registration for delivery.** `oat-docs-bootstrap` added to `DOCS_SKILLS` in `skill-manifest.ts` and to the bundled skills list in `bundle-assets.sh`, so `oat tools install docs` now includes the skill. Provider views auto-sync to `.claude/skills/oat-docs-bootstrap` and `.cursor/skills/oat-docs-bootstrap`.

**Scaffold template fixes at source.** Three source-level improvements to `.oat/templates/docs-app-fuma/docs/*.md` — `index.md` `## Contents` now uses `.md`-suffixed links (future-safe against FP-16), `getting-started.md` defers its Node version to the consuming repo's `.nvmrc` / `engines.node` pin, and `contributing.md` replaces its duplicative "Agent guidance" section with a pointer to the docs-app `AGENTS.md`. These survive through `bundle-assets.sh` into `packages/cli/assets/templates/` on every build.

**Discovery, design, and plan artifacts fully authored** — 17 friction points captured (FP-1..FP-10 resolved upstream via prior PR #27; FP-11..FP-17 addressed here), a seven-component design with a Conflict Resolution Contract and MkDocs Minimum Contract, and a 19-task plan authored across 6 phases (scaffolding + assets; Preflight + Input Gatherer; Scaffold Runner; Build Verifier + Inspector; Walkthrough + Content Kickoff; Finalization).

**Documentation updates.** Seven documentation surfaces refreshed to surface the new skill: `docs-tooling/add-docs-to-a-repo.md` (now leads with `/oat-docs-bootstrap` as preferred step 3, keeps raw CLI as the deterministic fallback), `docs-tooling/workflows.md` (skill listed alongside analyze/apply; typical flow updated), `docs-tooling/commands.md` (pointer note under `oat docs init`), `workflows/skills/index.md` (catalog + key-skills-by-use-case entries), `cli-utilities/tool-packs.md` (docs pack listing), `.oat/repo/reference/current-state.md` (section renamed to "Documentation Analysis & Bootstrap"), and root `AGENTS.md` (Docs Pack Workflows section).

## Key Decisions

- **Wrap the CLI, don't replace it.** The skill calls `oat docs init` non-interactively and layers value around it (preflight / inputs / patches / verification / walkthrough). This keeps the CLI as the source of truth for template rendering and lets the skill self-ratchet off as CLI fixes land.
- **Capability detection + file-shape checks gate every post-patch.** Each patch checks both a CLI help-output probe (did the CLI gain the flag?) and a file-shape probe (is the scaffold still in the unpatched form?). Drift classifies as `refused` with a `suggestedFix` rather than speculative rewrite.
- **Labeled, idempotent patches with distinct FP markers.** Every patch wraps its edit with `<!-- FP-NN patch -->` (or JS-comment equivalent in TSX). Running the skill twice is a no-op; finding the patches later is a grep.
- **Two framework paths with explicit scope discipline.** Fumadocs gets the full treatment; MkDocs gets a lean path with a visible **Minimum Contract** — in-scope items (site config, Material theme defaults, plugins in `mkdocs.yml`, Python env via `requirements.txt` + `setup-docs.sh`, shared `## Contents` contract) and deferred items (Material internals, plugin authoring, deep Python debugging, MkDocs-specific extensions beyond the shared set, deployment patterns) are clearly marked rather than silently skipped.
- **Audience discipline across three agent-instruction surfaces.** Root `AGENTS.md ## Documentation` = repo-wide pointer (where docs live). Docs-app `AGENTS.md` = agent runtime reference (how to work inside the docs app). `docs/contributing.md` = human authoring conventions. The Walkthrough's Section D makes this explicit; FP-15 scaffolds the middle surface; FP-17 removes the duplication in the right-most surface.
- **Prefer `.md` over `.mdx`.** Fumadocs compiles both; `.md` is friendlier to agents, linters, grep rules, and the `remark-links` plugin. Guidance updated across AGENTS.md bridge template, canonical example, and Walkthrough Section E to reflect this explicitly.
- **`.md`-suffixed authored links.** The `@open-agent-toolkit/docs-transforms` remark-links plugin strips `.md` and collapses `dir/index.md` → `dir` at build time for Fumadocs routing. Authoring with `.md` suffixes therefore works correctly AND keeps links agent-followable. The scaffold source now uses this form; FP-16 handles legacy extension-less scaffolds as a bridge patch.
- **Skill-name kebab-case consistency in user-facing text.** References to the docs trinity use kebab-case skill names (`oat-docs-bootstrap`, `oat-docs-analyze`, `oat-docs-apply`) — not space-separated CLI subcommands — when pointing at user entrypoints. CLI subcommands without skill wrappers (`oat docs init`, `oat docs nav sync`, `oat docs generate-index`) stay in their native form.
- **Rolling hands-on review substituted for formal auto-review.** `oat_plan_hill_phases: ['p06']` + `oat_auto_review_at_checkpoints: true` would have triggered an auto-review subagent at the final phase. The user deferred this because every commit landed with real feedback during implementation, and the smoke test's `oat-docs-analyze` findings drove two rapid fix commits. PR reviewers provide the next layer.

## Design Deltas

- **FP-13 sub-finding E (Node version mismatch) added post-design.** The original FP-13 had four sub-findings; a fifth (Node version written in scaffold doesn't match repo pin) was surfaced during the p06-t03 smoke test when Cyclone's Node 20.19.0 pin conflicted with the scaffold's hard-coded "Node.js 22+" claim.
- **FP-16 added post-design.** Extension-less `## Contents` link form was surfaced as an agent-hostile scaffold divergence during smoke testing. The `@open-agent-toolkit/docs-transforms` remark-links plugin was already doing the routing normalization that makes `.md`-suffixed authored links safe — the scaffold template just hadn't adopted it.
- **FP-17 added post-design.** Scaffold `docs/contributing.md` `## Agent guidance` section duplicates the FP-15 docs-app `AGENTS.md`, violating the three-surfaces discipline. Surfaced during the `oat-docs-analyze` run against the smoke-test sandbox.
- **FP-12 spec tightened after smoke test.** Original spec was clear but the sandbox agent defaulted to an intuitive-but-wrong approach (passing title/description to `createDocsConfig()`, which ignores them). Sub-section restructured to lead with the `layout.tsx` metadata insertion; explicit anti-pattern block added.
- **FP-13/D.2 two-pass strategy added.** Original spec relied on a `prebuild` script hook to prepend the "do not hand-edit" header. Smoke test showed the hook isn't reliable. Added a post-Build-Verifier direct-write backstop; hook remains as a nice-to-have.

## Notable Challenges

- **Sync bug discovered mid-test.** When the user installed the new skill via `oat tools install docs` in a sandbox, the auto-sync step wiped provider views for packs not in the current install (project-management, workflows). That was a pre-existing CLI scope bug, not caused by this project — triaged as a separate concern and fixed by the user upstream via PRs #49 / #50 before the smoke test continued.
- **Scaffold template source vs. bundled artifact.** Fixing the scaffold template required editing `.oat/templates/docs-app-fuma/docs/index.md` (the source) rather than `packages/cli/assets/templates/docs-app-fuma/docs/index.md` (which is regenerated from the source by `bundle-assets.sh` on every build). First edit attempt hit the bundled copy and was overwritten. Resolved by editing the source; documented in the FP-16 discovery entry.
- **Commit-message length limit.** One feat commit header exceeded commitlint's 100-character max on first attempt. Resolved by shortening the header and moving detail into the implementation log entry.

## Tradeoffs Made

- **Ship the skill without nested-standalone E2E verification (p06-t02 deferred).** FP-11 (Turbopack root) is the only nested-standalone-specific code path; the monorepo smoke test didn't exercise it. Deferred to a follow-up project rather than block the PR. Mitigation: FP-11 is capability-gated (skip when `turbopackRootFlag === true`) and file-shape-gated (refuse on drift) — worst case on a bug is a refused patch with a `suggestedFix` surfaced to the user, not a broken scaffold.
- **Defer formal auto-review in favor of rolling hands-on review.** The plan's HiLL + auto-review config was deferred because the user was deeply involved throughout implementation, triaging each commit with real feedback. PR reviewers provide the next layer. Rationale documented in `plan.md` Reviews table and implementation.md Final Summary.
- **Keep `oat docs init` / `oat docs nav sync` / `oat docs generate-index` space-separated in user-facing text.** These are CLI subcommands without skill wrappers; forcing kebab-case would misrepresent the surface. Only `oat docs analyze` / `oat docs apply` (which have `oat-docs-analyze` / `oat-docs-apply` skill wrappers) got the kebab-case treatment.

## Integration Notes

- **Skill distribution via `oat tools install docs`.** Consuming repos on CLI ≥ 0.0.37 can now install `oat-docs-bootstrap` as part of the docs pack. Older CLI versions will not include it until the package updates.
- **Canonical skill path:** `.agents/skills/oat-docs-bootstrap/SKILL.md` — contains the full 7-step pipeline specification, Mode Assertion, Progress Indicators, and Success Criteria. Provider views at `.claude/skills/oat-docs-bootstrap` and `.cursor/skills/oat-docs-bootstrap` are symlinks maintained by `oat sync`.
- **FP-15 bridge template:** `.agents/skills/oat-docs-bootstrap/assets/AGENTS.md.template` — supplies the task-framed docs-app `AGENTS.md` the skill writes when the CLI hasn't scaffolded one natively. Placeholders: `{{SITE_NAME}}`, `{{APP_DIR}}`, `{{REPO_NAME}}`, `{{GENERATE_INDEX_CMD}}`.
- **Canonical example:** `apps/oat-docs/AGENTS.md` — rendered template adapted to this repo's layout. Serves as the reference for what the FP-15 bridge produces in practice.
- **Scaffold template improvements are upstream fixes.** `.oat/templates/docs-app-fuma/docs/*.md` changes affect every future scaffold, not just those invoked through the skill. Users who run `oat docs init` directly get the template improvements too.
- **Public package versions bumped to 0.0.37 lockstep.** `@open-agent-toolkit/cli`, `@open-agent-toolkit/control-plane`, `@open-agent-toolkit/docs-config`, `@open-agent-toolkit/docs-theme`, `@open-agent-toolkit/docs-transforms`. `pnpm release:validate` passes.

## Follow-up Items

- **Nested-standalone E2E (FP-11 live verification).** Deferred from this project. A follow-up should scaffold a docs app in a real nested-standalone target, verify both FP-11 code paths (passthrough + wrapper replacement), and exercise the `.pre-fp11.bak` snapshot behavior.
- **Deep monorepo friction round.** Deferred during discovery. Currently we have one monorepo smoke-test sandbox (Cyclone) and one non-monorepo round (the original discovery feedback). Additional repos of different sizes and workspace configurations will surface more specific friction.
- **Upstream the FP-12 / FP-13 / FP-15 / FP-16 / FP-17 fixes in the CLI.** Every post-patch in this skill is a bridge until the CLI closes the corresponding gap. The FP-16 and FP-17 template fixes landed in this PR as upstream improvements; the in-layout TSX metadata export (FP-12) and the other FP-13 sub-findings remain skill-level bridges because they depend on the scaffolded app's shape rather than just template content.
- **Review cycles against real-world usage.** As users run the skill in the wild, additional findings will surface. The capability-gate + marker-comment design makes iterative upstream fixes safe — removing a patch when the CLI covers it becomes a grep-and-delete operation.

## Associated Issues

None tracked in this project's `state.md`.

---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-07-05
oat_generated: false
---

# Discovery: backlog-lifecycle-hardening

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Harden the backlog lifecycle in the `oat` CLI. Two downstream repos (orc:
`~/Code/backlog-review-july-4`; skills: `~/Code/pjm-guidance`) independently
hit the same drift: completed backlog items were closed in frontmatter and
summarized in `completed.md` but never moved to `pjm/backlog/archived/`, and
at least one item shipped without being closed at all (one carried the
invalid status `done`). A handoff document requested five changes:

1. `oat backlog archive <id>` — an atomic close-out command.
2. Backlog Lifecycle guidance baked into the `oat pjm init` instruction
   templates (both downstream repos hand-authored exemplar sections to
   upstream).
3. `oat pjm init` additions — emit a human-facing `.oat/repo/README.md`;
   surface backfill guidance when instruction files are missing.
4. Drift detection in doctor — flag closed/wont_do items still in `items/`,
   out-of-enum statuses, and (optionally) completed.md/archived
   inconsistencies.
5. Include `.oat/repo/**/AGENTS.md` in the `oat instructions sync`/`validate`
   scan (currently the whole `.oat/` tree is excluded).

The session review verified every factual claim in the handoff and added:
the bundled-skills sweep, docs coverage, and the lockstep release-policy
obligations that the handoff omitted. The user chose to run all five items
as **one quick-mode OAT project** with thorough discovery and a lightweight
design that nails down the open forks.

## Codebase Findings (verified this session)

- `oat backlog` today has only `init` and `regenerate-index`; archival is
  pure convention. `regenerate-index` stringifies frontmatter `status`
  verbatim into the generated table — invalid values like `done` pass
  through silently.
- The status enum (`open | in_progress | closed | wont_do`) exists only as a
  comment in the bundled backlog-item template. Item frontmatter includes an
  `updated` timestamp field.
- `oat pjm init` scaffolds three instruction files (`AGENTS.md`,
  `pjm/AGENTS.md`, `reference/AGENTS.md`) from bundled templates plus
  `pjm/backlog/archived/.gitkeep`. It emits no README.md and no CLAUDE.md
  shims. It already backfills missing AGENTS.md files on re-run.
- `oat pjm doctor` is structured as independent named checks (`pjm:*`), and
  the top-level `oat doctor` aggregates them — new drift checks added to pjm
  doctor surface in both commands automatically.
- The instructions scan is a per-directory BFS that prunes `.git`, `.oat`,
  and `.worktrees` at the repo root only. A surgical carve-in (enqueue
  `.oat/repo` while continuing to skip the rest of `.oat`) is cheap.
- The CLAUDE.md sync strategy (`pointer | symlink | copy`) is chosen per
  invocation via `oat instructions sync --strategy` (default `pointer`);
  there is no persisted strategy config. Sync already creates missing
  CLAUDE.md files according to the chosen strategy.
- The canonical `completed.md` scaffold documents the entry format
  `YYYY-MM-DD — BL-YYMMDD-slug — Title — one-line outcome summary` under an
  `## Entry Format` heading, with entries under `## Completed Items`,
  newest-first.
- Both downstream repos' `completed.md` files have drifted from that
  scaffold in different ways (orc: backtick-wrapped, hard-wrapped,
  multi-ID entries; skills: stale `bl-XXXX` format line and legacy
  lowercase IDs in historical entries).
- The two downstream exemplar **Backlog Lifecycle** sections are identical
  except the skills repo adds "these are the only terminal values — never
  invent variants like `done`". That variant is the one to upstream. The
  exemplar convention skips `completed.md` entries for `wont_do` items
  unless the abandonment is worth recording (the handoff prompt said
  "always append" — conflict resolved by user decision below).
- Fourteen bundled skills reference `archived/` or `completed.md` (including
  the pjm backlog skills, project-complete/document/next, wrap-up, and
  update-repo-reference); several describe the manual close-out the new
  command replaces.
- `oat cleanup` has no backlog awareness today.

## Clarifying Questions

### Question 1: CLAUDE.md shim management for `.oat/repo/**` (handoff item 5)

**Q:** Should `oat pjm init` create the shims, should the instructions scan
get a carve-in, both, or a config-gated opt-in?
**A (user):** Init creating shims is a problem — consumers choose their shim
strategy (symlink vs pointer vs hard copy). How do we solve for that?
**Decision:** Scan carve-in only. Strategy knowledge lives exclusively in
`oat instructions sync` (per-invocation `--strategy`), and sync already
creates missing CLAUDE.md files using the chosen strategy — so including
`.oat/repo/**` in the scan gives creation _and_ ongoing drift detection with
the consumer's strategy respected. `oat pjm init` stays shim-unaware and
prints a next-step hint to run `oat instructions sync`. (To be re-validated
in the design's architecture section.)

### Question 2: `completed.md` format contract for the archive command

**Q:** Canonical format vs honoring per-repo Entry Format blocks vs refusing
on nonconforming files?
**A (user):** Canonical format, structural append. Also: give me a prompt to
take back to the downstream repos' agents to bring their files into
conformance now.
**Decision:** The command emits the canonical entry format (identical to
what `oat backlog init` scaffolds), inserting newest-first under the
`## Completed Items` heading. If the heading is missing, warn and append a
scaffolded section. If `completed.md` is missing entirely, create it from
the starter scaffold first. No parsing of per-repo custom formats.
Downstream conformance is handled out-of-band via a take-back prompt
(delivered in-session; not CLI scope).

### Question 3: `wont_do` archives and `completed.md`

**Q:** The handoff prompt says always append an entry; the exemplar
lifecycle says skip `wont_do` entries unless worth recording. Which wins?
**A (user):** Entry only if `--summary` is given.
**Decision:** `closed` archives always get an entry (TODO-scaffolded when
`--summary` is absent so the gap stays visible). `wont_do` archives write an
entry only when `--summary` is provided. The upstreamed template text keeps
the exemplar convention.

## Solution Space

The overall shape was fixed by the handoff document and session review; the
genuinely open forks were the three questions above plus project structure.
The user chose a single quick-mode project over splitting into 2–3 PRs,
accepting a larger diff in exchange for one coherent lifecycle change.

### Chosen Direction

**Approach:** One quick-mode OAT project delivering all five handoff items
plus the propagation surfaces the review identified (bundled skills, docs,
lockstep release bumps), with a lightweight design settling command
semantics, check placement, and scan carve-in mechanics before planning.
**Rationale:** The items are tightly coupled — the command, the guidance
that tells agents to use it, the drift detection that catches when they
don't, and the shim management that makes the guidance reachable all ship
as one story. Requirements are clear; design risk is contained to a few
now-resolved forks.
**User validated:** Yes (explicitly requested one project with thorough
discovery + lightweight design).

## Key Decisions

1. **Project structure:** Single quick-mode project for all five handoff
   items (user decision), rather than the 2–3 way split the review floated.
2. **Archive command semantics:** Archiving is legal from any of the four
   valid statuses (`closed` in `items/` means "finish the move"); default
   terminal status `closed`, `--wont-do` for `wont_do`; out-of-enum current
   status (e.g. `done`) is a hard error with a fix hint; re-running on an
   already-archived item is a warning no-op; `--json` supported; the
   backlog index is regenerated as part of the command; `git mv` with plain
   rename fallback outside git repos.
3. **completed.md contract:** Canonical format, structural append (Q2).
4. **wont_do entries:** Only with explicit `--summary` (Q3).
5. **Shim management:** Instructions-scan carve-in for `.oat/repo/**` only;
   `oat pjm init` never writes CLAUDE.md; strategy ownership stays with
   `oat instructions sync` (Q1).
6. **Drift detection placement:** New checks live in `oat pjm doctor`
   (surfacing automatically in top-level `oat doctor`); `oat cleanup` is
   out of scope. `oat backlog regenerate-index` warns on out-of-enum
   statuses rather than failing.
7. **Template content:** Upstream the skills-repo exemplar variant
   (including the "never invent variants like `done`" clause) into
   the pjm instruction templates; reference template gets the
   source-of-truth map + deferral rule; repo template gets pointer bullets;
   `oat pjm init` additionally emits the human-facing `.oat/repo/README.md`
   modeled on the downstream exemplar.
8. **Propagation scope:** Bundled skills that describe manual close-out are
   updated to route through `oat backlog archive` (with per-skill frontmatter
   version bumps); docs coverage added; the five public packages get a
   lockstep version bump; `pnpm release:validate` must pass before done.

## Constraints

- CLI package conventions: thin command handlers, named command files,
  domain-local logic, no `../` imports, logger utilities instead of
  `console.*`, exit semantics 0/1/2, mutate-by-default with `--dry-run`
  where applicable, `--json` contract parity.
- Release policy: lockstep version bump across the five public packages;
  bundled assets (`.agents/skills`, `.oat/templates`, docs) count as
  shipped CLI functionality; PR-scoped `version:` bump per changed skill.
- The archive command must be safe in non-git contexts (plain rename
  fallback) and idempotent.
- Instructions carve-in must not pull the rest of `.oat/` (projects,
  templates, sync state) into the scan — templates contain AGENTS.md-like
  content that must never be shimmed.

## Success Criteria

- `oat backlog archive BL-XXXXXX-slug --summary "..."` performs the full
  close-out (status flip + `updated` bump, completed.md entry, file move,
  index regeneration) in one command, covered by tests: fresh archive,
  re-run no-op, `--wont-do` with and without `--summary`, missing-summary
  TODO scaffold, invalid-status rejection, non-git fallback, `--json`.
- `oat pjm init` on a fresh directory yields instruction files containing
  the Backlog Lifecycle section and a `.oat/repo/README.md`.
- `oat pjm doctor` (and therefore `oat doctor`) on a repo with a closed item
  still in `items/`, or an out-of-enum status, reports it with file paths.
- `oat instructions sync --dry-run` and `oat instructions validate` list
  `.oat/repo/**` AGENTS.md/CLAUDE.md pairs; the rest of `.oat/` stays
  excluded.
- Bundled skills that previously described manual close-out reference the
  new command; their versions are bumped.
- `pnpm release:validate`, lint, type-check, and workspace tests pass.

## Out of Scope

- Normalizing the two downstream repos' `completed.md` files (handled
  out-of-band via a take-back prompt to those repos' agents).
- Parsing or honoring per-repo custom `completed.md` entry formats.
- `oat cleanup` backlog integration.
- Auto-fixing drift (e.g. a bulk `--all-closed` archival mode) — doctor
  reports, humans/agents act.

## Deferred Ideas

- `oat backlog archive --all-closed` bulk mode — deferred until the
  single-item command proves the contract.
- `oat doctor` hint when `.oat/repo` exists but instruction files are
  missing — partially covered by existing pjm doctor canonical-file checks;
  revisit if gaps remain after this project.
- Persisted `instructions.syncStrategy` config key — would let init-time
  shim creation respect strategy, but sync-owned creation makes it
  unnecessary for this project.

## Open Questions

- **Check granularity (design):** exact set and names of new `pjm:*` doctor
  checks (closed-in-items, invalid-status, completed-vs-items cross-check,
  archived-but-open), and which are `fail` vs `warn`.
- **Archive command module placement (design):** how the command shares
  frontmatter parsing and index regeneration with `regenerate-index`
  without violating command-ownership rules.
- **Carve-in mechanics (design):** exact scan change (root-exclusion
  bypass for `.oat/repo`) and its interaction with the existing
  root-level-only exclusion semantics.

## Assumptions

- The downstream exemplar content is stable enough to upstream verbatim
  (modulo template placeholders) — both repos agreed on it independently.
- No other OAT consumers depend on `.oat/repo` being excluded from the
  instructions scan.
- `git mv` semantics via child process (or rename + `git add`) are
  acceptable; no libgit dependency exists or is wanted.

## Risks

- **Propagation misses:** the same failure mode that motivated the review
  flags — skills/templates/docs updated inconsistently.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** plan tasks enumerate every touched surface
    explicitly; final task runs the release-validation + grep sweep.
- **Scan carve-in side effects:** repos with unusual `.oat/repo` contents
  could see unexpected sync actions.
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation Ideas:** carve-in limited to `.oat/repo` subtree; dry-run
    coverage in tests; validate-only default in doctor contexts.
- **completed.md structural edge cases:** hand-evolved files missing the
  managed heading.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** warn-and-scaffold behavior decided in Q2; tests
    cover missing-file and missing-heading paths.

## Next Steps

Quick mode with lightweight design (user-selected): produce a focused
`design.md` (architecture, components, testing) settling the open design
questions above, then generate `plan.md` for `oat-project-implement`.

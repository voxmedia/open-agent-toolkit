---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-05
oat_generated: false
oat_template: false
---

# Design: oat-project-retro

Lightweight quick-mode design. Sections follow the reduced quick-start set;
spec-driven-only sections (security, performance, deployment, migration) are
omitted per quick-mode rules.

## Overview

This project adds an evidence-grounded project retrospective to the OAT
lifecycle tail. The deliverable set is: a new `oat-project-retro` workflows
skill with two entry modes (generate, apply); a companion
`oat-project-retro-file` skill that disposes retro feedback into GitHub issues
or OAT backlog items; a `project-retro.md` artifact template; CLI config
surface (`retro` as a post-implement sequence step plus a `workflow.retro`
namespace); a safety-net offer in `oat-project-complete`; and full docs.

The central design contract is the **retro artifact as a machine-scannable
interface**. The artifact carries two structured registers — a promotion
register (repo-local durable edits) and an upstream register (OAT feedback
items) — each with per-item status. Three consumers read that contract: the
completion offer (existence/state detection via frontmatter), the retro
skill's own apply mode (idempotent promotion application), and the filing
skill (item extraction and filing status writeback). Getting the register
format right decouples the three consumers from each other.

Consent flows through configuration. Nothing retro-related ever runs
unsolicited: interactive runs confirm at each disposition point, and
non-interactive runs act only on explicit config (`postApproval: [retro]`
to generate, `workflow.retro.apply: auto` to apply promotions,
`workflow.retro.filing.*` to file). Absent config, autonomous runs leave
proposals in the artifact and touch nothing else.

## Architecture

### System Context

The retro slots into the existing approval-aware post-implementation
sequencing owned by `oat-project-implement`'s completion-and-closeout
reference. Today the step vocabulary is `summary | document | pr`, each
dispatching a dedicated skill. This project adds `retro` to that vocabulary,
recommended for `postApproval` — the first moment the full run history
(including the approval/feedback tail) exists, and still before
`oat-project-complete` freezes artifacts.

**Key Components:**

- **`oat-project-retro` skill (new):** Generates `references/project-retro.md`
  from project evidence; applies its promotion register in apply mode.
- **`oat-project-retro-file` skill (new):** Files register items to
  destinations (host-repo issues/backlog, upstream OAT issues) after a
  capability preflight and approval step.
- **`project-retro.md` template (new):** Core/conditional section skeleton
  with frontmatter and register formats; installed to `.oat/templates/`.
- **CLI config (`packages/cli`):** `'retro'` added to
  `WorkflowPostImplementStep`; new `workflow.retro` namespace with
  normalization, resolution, and tests.
- **Closeout sequencing (existing, edited):** Step dispatch table gains
  `retro` → `oat-project-retro`.
- **`oat-project-complete` (existing, edited):** Retro preflight + offer,
  mirroring its summary preflight pattern.
- **Docs (`apps/oat-docs`):** Lifecycle, configuration reference, workflows
  entry.

### Component Diagram

```
oat-project-implement (closeout)
  └─ sequence snapshot: preApproval [...] → HiLL approval → postApproval [retro]
                                                               │ dispatch
                                                               ▼
                    ┌─────────────────── oat-project-retro ────────────────────┐
                    │ generate mode: evidence → references/project-retro.md    │
                    │ apply mode:    promotion register → repo edits           │
                    └──────────────┬───────────────────────────┬───────────────┘
                                   │ artifact contract         │ config consent
                                   ▼                           ▼
   oat-project-complete      references/project-retro.md   workflow.retro.*
   (offer when artifact        ├─ promotion register          (filing, apply)
    missing; skip when           │    └─ consumed by apply mode
    present)                     └─ upstream register
                                      └─ consumed by oat-project-retro-file
                                              │
                                              ├─ repo lane → host issues | host backlog
                                              └─ upstream lane → OAT issues
                                                 (collapses into repo lane when host IS OAT)
```

### Data Flow

**Generate mode:**

1. Resolve active project (or explicit `--project` path); confirm target.
2. Inventory evidence sources; classify each as available/unavailable:
   project log, `oat-execution-learnings.md`, lifecycle artifacts
   (`implementation.md`, `state.md`, `plan.md`, reviews, evidence dirs),
   session/run transcript (environment-aware: cloud tooling, local
   transcripts, or none).
3. Optional parallel recon lanes for large runs (subagent dispatch per the
   handoff methodology; lane count scales down for small projects).
4. Synthesize `references/project-retro.md` from the template: core sections
   always, conditional sections only when evidence warrants, concise by
   default with each section adding distinct information.
5. Populate both registers with status `proposed`; write frontmatter rollups
   and derive `Current State` from register fields and those rollups.
6. Interactive: offer apply-now, then offer filing skill when unfiled items
   exist. Non-interactive: apply if `workflow.retro.apply: auto`; chain to
   filing only when `workflow.retro.filing` config exists.
7. Append a project-log entry; format touched files; commit.

**Apply mode (flag, natural language, or post-generate confirmation):**

1. Locate retro artifact in active project (or explicit path). Missing
   artifact → report and stop; never regenerate implicitly.
2. Read promotion register; select items with `Disposition: apply` and status
   `proposed`/`approved` (`Disposition: file` items belong to the filing
   skill and are never mutated by apply mode).
3. Apply each per the skill's bundled apply-procedure reference (docs, AGENTS,
   rules edits, decision records via `oat decision new`).
4. Update each item's status (`applied` / `rejected` with
   `Disposition-note`), update the frontmatter rollup, and refresh
   `Current State`; commit artifact + edits together per item or as one reviewed
   batch. Proposal bodies and all other freeform narrative remain immutable.

**Filing flow (`oat-project-retro-file`):**

1. Resolve artifact (active project default, path override).
2. Before selection, validate every already-filed item by destination type.
   GitHub requires a valid issue URL and `—` local receipt fields. Local
   backlog destinations require a coherent current path, a verified full
   exact-path commit receipt, and derived `pushed | unpushed` visibility. Valid
   local recovery may retain `filed` without an external mutation; an
   unrecoverable filed state returns to `proposed`.
3. Extract eligible items: all UP items plus RP items with `Disposition: file`.
   Re-runs skip `filed` only after the integrity pass proves complete state,
   skip `rejected`, and retry newly deliverable `no-destination` items.
4. Capability preflight per destination: issues enabled? credentials valid?
   backlog initialized? Report the lane × destination matrix before showing
   items.
5. Resolve destinations: `workflow.retro.filing` config as default;
   interactive confirmation with per-run override; non-interactive uses
   config as-is, files nothing without config.
6. Present items and classify duplicate candidates as exact or merely related;
   user approves per item (interactive) or all-configured
   (non-interactive).
7. File GitHub issues and capture a validated URL. For a created or strengthened
   local backlog item, commit the destination mutation first in a commit that
   contains the destination path and excludes retro writeback. A failed
   destination commit produces no receipt and never produces `filed`.
8. For a linked local item, make no destination mutation; recover the latest
   exact-path commit, verify that commit contains the path, and verify current
   destination coherence.
9. Derive local `Remote-visibility`: `pushed` only when the receipt is reachable
   from the configured upstream; no upstream or no reachability is `unpushed`.
   Pushing is never implicit.
10. In a later retro-only writeback commit, record `Status`, `Destination`,
    `Destination-receipt`, `Remote-visibility`, `Disposition-note`, the filing
    rollup, and refreshed `Current State`. Verify the destination receipt commit
    predates this writeback. GitHub items use `—` for both local receipt fields.
11. Lanes with no available destination are reported loudly, never dropped.

## Component Design

### `oat-project-retro` skill

**Purpose:** Evidence-grounded retro generation and promotion application.

**Responsibilities:**

- Mode resolution: generate vs apply (explicit flag/wording beats inference;
  an existing artifact plus "apply" language selects apply mode).
- Evidence inventory with explicit availability honesty (unavailable sources
  are named in the artifact, never silently skipped).
- Dual-lane synthesis with confirmed-cause vs hypothesis vs inconclusive
  discipline; rejected alternatives recorded when they shaped outcomes.
- Register construction (formats below) and frontmatter rollups.
- `Current State` derivation as the only mutable freeform narrative surface;
  status prose elsewhere is generation-time evidence.
- Apply mode with idempotent, resumable register processing.
- Consent enforcement: interactive offers; config-gated non-interactive
  behavior; sanitization pass whenever upstream items will leave a private
  repo.

**Interfaces:**

- Invocation: user request, completion-path offer confirmation, `retro`
  sequence step dispatch, or apply-mode request.
- Inputs: `PROJECT_PATH`, `workflow.retro.apply`, `workflow.retro.filing`,
  `OAT_AUTONOMOUS` / `OAT_NON_INTERACTIVE`, environment session tooling.
- Output: `{PROJECT_PATH}/references/project-retro.md`; optional decision
  records; optional applied promotions; project-log entry.

**Skill package layout (progressive disclosure):**

```text
.agents/skills/oat-project-retro/
  SKILL.md                      # orient, modes, generate workflow, gates
  references/
    apply-procedure.md          # promotion classification + application steps
    evidence-and-lanes.md       # evidence reading order, recon lane guidance,
                                # transcript caveats, environment detection
    retro-quality-bar.md        # quality bar + section scaling guidance
```

**Design Decisions:**

- Skill description follows the handoff's suggested identity: explicit
  request/confirmation only; "Do NOT auto-invoke merely because
  implementation or summary completed."
- New skill starts at frontmatter `version: 1.0.0`.
- Generate mode either completes the artifact fully or cleans up the partial
  file (mirrors the summary-generation rule in `oat-project-complete`).

### `oat-project-retro-file` skill

**Purpose:** Dispose retro feedback into trackers with preflight, approval,
and status writeback.

**Responsibilities:**

- Artifact resolution (active project default; explicit path override).
- Per-lane destination routing with capability preflight matrix.
- Config-as-default destination resolution with interactive override.
- Item presentation and approval; filing execution; per-item status + link
  writeback into the artifact.
- Pre-selection filed-state integrity, local exact-path receipt recovery, and
  destination-first created/strengthened local commits.
- Loud reporting of undeliverable lanes ("4 upstream items have no
  destination here; file them as OAT issues or run from the OAT repo").
- Duplicate check before filing, per destination type: issue destinations via
  `gh search issues` (title/keywords against the target repo); backlog
  destinations by scanning the target backlog's `items/*.md` plus
  `archived/`/`completed.md` (so recently closed work isn't refiled).
  Suspected duplicates are presented alongside the item in the approval step
  with four dispositions — **strengthen** the existing one (default when
  applicable: comment on the existing issue with this run's evidence, or
  append an evidence/insight note to the existing backlog item file and
  regenerate the index), file anyway as new, skip, or just link the existing
  issue/item as the register item's `Destination`. Strengthened and linked
  items record the existing destination and get status `filed`. Nothing is
  silently dropped or silently double-filed; strengthening a public issue
  from a private source repo goes through the same sanitization pass as
  filing.
- Sanitization verification before anything posts to a public repo from a
  private source repo: no verbatim log excerpts, no internal URLs/hostnames,
  no credential-shaped strings.

**Interfaces:**

- Inputs: retro artifact path, `workflow.retro.filing`,
  `workflow.retro.upstreamRepo` (see Data Models), `gh` CLI, `oat backlog`
  CLI conventions.
- Outputs: created issues/backlog items; updated register statuses.

**Design Decisions:**

- Upstream lane collapses into the repo lane when the host repo IS the
  upstream repo (detected by comparing `git remote` origin with the resolved
  upstream repo slug).
- Backlog filing follows the `oat-pjm-add-backlog-item` conventions
  (file-per-item + `oat backlog regenerate-index`); the skill does not invent
  a parallel backlog format.
- Local backlog durability is destination-first: a destination-only mutation
  commit precedes a separate retro writeback. GitHub URLs do not use local
  receipt fields, and no filing authorization implies push authorization.
- New skill starts at frontmatter `version: 1.0.0`.

### `project-retro.md` template

Core sections (always present): Executive Summary; Evidence and Review Method;
Outcome Snapshot; Current State; What Went Well; Challenges and Struggles;
Where We Changed Course; Repo Improvements (promotion register); OAT Upstream
Feedback (upstream register — explicit "none identified" when empty);
Reflections.

`Current State` is derived from register fields and frontmatter rollups and is
the only mutable freeform narrative surface. Apply/file consumers refresh it
after status changes; proposal bodies and every other narrative section remain
immutable after generation.

Conditional sections (template includes them with include-when guidance):
Decision Register + Rejected/Superseded Alternatives; New Architecture
Patterns and Approaches; Domain Learnings; Gotchas for Humans; Gotchas for
Autonomous Agents; Remaining Boundaries and Follow-Ups.

Registered in `WORKFLOW_TEMPLATES` (`skill-manifest.ts`) so `oat init` /
tool updates install it to `.oat/templates/project-retro.md`.

### CLI config surface (`packages/cli`)

**Changes in `src/config/oat-config.ts`:**

- `WorkflowPostImplementStep` gains `'retro'`:
  `'summary' | 'document' | 'pr' | 'retro'`. `VALID_POST_IMPLEMENT_STEPS`
  updated accordingly. `retro` is a **postApproval-only** step: normalization
  rejects a structured value whose `preApproval` array contains `retro` (same
  handling as other invalid shapes), because a pre-approval retro would run
  before the approval/feedback tail exists — the discovery Question 3
  evidence boundary. Legacy string sequences are unchanged (none maps to
  retro).
- New `workflow.retro` namespace (schema in Data Models) with a
  `normalizeWorkflowRetroConfig` following the existing normalization
  patterns: unknown keys dropped, invalid values rejected to `undefined`,
  layered-config merge via existing resolve logic.

**Test surface:** `oat-config.test.ts`, `resolve.test.ts`, and the
sequencing contract test
(`commands/init/tools/shared/post-implement-sequence-contracts.test.ts`)
updated for the widened vocabulary; new normalization tests for
`workflow.retro`.

**Release consequence:** shipped CLI functionality + bundled assets change →
lockstep version bump of all five public packages; `pnpm release:validate`
before finishing.

### Closeout sequencing integration

`.agents/skills/oat-project-implement/references/completion-and-closeout.md`:

- Step dispatch sentence gains the fourth mapping: for every pending
  `retro`, dispatch `oat-project-retro` (generate mode; apply/filing behavior
  inside the skill remains config-gated).
- The autonomous lifecycle-tail default stays
  `{ preApproval: [summary, document, pr], postApproval: [] }` — retro runs
  autonomously only when explicitly configured.
- Snapshot schema is unchanged; `retro` is just a new valid array member.
  Existing snapshots without retro remain valid (additive vocabulary).

### `oat-project-complete` offer

Mirrors the existing summary preflight: detect
`{PROJECT_PATH}/references/project-retro.md`. When missing in an interactive
run, one offer: "No project retro exists. Generate one before completing?"
When present (any register state), no offer — at most a one-line note if
registers show unapplied/unfiled items.

The offer gates on **how the completion run itself executes**, not on how
implementation ran. Autonomously-implemented projects usually end their
unattended portion at the PR and get completed later by a human in an
interactive session — the offer fires normally there, so autonomous projects
are still caught by the safety net. Only a completion that itself executes
non-interactively (e.g. a wave closeout's autonomous deferral branch,
`OAT_AUTONOMOUS=1`) skips the offer; for that case, config-gated generation
via the `retro` sequence step is the consented path.

### Docs

- `apps/oat-docs/docs/workflows/projects/lifecycle.md`: post-approval step
  vocabulary + retro placement rationale.
- CLI configuration reference: `workflow.retro.*` keys and the widened
  sequence step vocabulary.
- New workflows page for the retro skill pair (generate, apply, filing);
  `oat docs generate-index` refresh; AGENTS/docs index mentions.

## Data Models

### `workflow.retro` config schema

```typescript
export type WorkflowRetroFilingDestination = 'issues' | 'backlog' | 'none';
export type WorkflowRetroApply = 'auto' | 'ask';

export interface WorkflowRetroConfig {
  filing?: {
    repo?: WorkflowRetroFilingDestination; // repo-lane default destination
    upstream?: 'issues' | 'none'; // upstream-lane default destination
  };
  apply?: WorkflowRetroApply; // default 'ask'
  upstreamRepo?: string; // owner/repo; default 'voxmedia/open-agent-toolkit'
}
```

**Validation rules:** enum membership per field; `upstreamRepo` must match
`owner/name` shape; unknown keys dropped. Absent config ⇒ interactive runs
ask, non-interactive runs propose-only. The `upstreamRepo` default lives in
skill guidance (not hardcoded in CLI config code), so non-OAT ecosystems can
repoint it.

### Retro artifact frontmatter

```yaml
---
oat_retro_project: oat-project-retro # source project slug
oat_retro_generated: '2026-08-05T22:00:00Z'
oat_retro_evidence_sources: # every source, with availability
  - source: project-log
    status: used
  - source: session-transcript
    status: unavailable
oat_retro_promotions: none # none | proposed | partial | complete
oat_retro_filing: none # none | proposed | partial | complete
oat_generated: false
---
```

Rollup fields are what the completion offer and lifecycle skills read;
consumers never parse register bodies just to answer "does a retro exist and
is it settled?"

### Register item format

Per-item heading blocks (not tables — items carry multi-line bodies). Every
repo-lane item carries an explicit **`Disposition`** that routes it to exactly
one consumer: `apply` items are repo edits owned by the retro skill's apply
mode; `file` items are tracker candidates owned by the filing skill. The
`Type` suggests a default disposition (`docs`/`agents-instruction`/`rule`/
`decision` → `apply`; `code-follow-up` → `file`), but the recorded
`Disposition` field is authoritative.

```markdown
## Repo Improvements (Promotion Register)

### RP-01: Route Playwright reliability work to reserved stack

- **Type:** agents-instruction # docs | agents-instruction | rule | decision | code-follow-up
- **Disposition:** apply # apply | file — routes to apply mode or the filing skill
- **Status:** proposed # apply items: proposed | approved | applied | rejected
- **Target:** AGENTS.md # apply items: the repo path to edit
- **Applied-ref:** — # apply items: commit/path once applied
- **Disposition-note:** — # mutable rejection, recovery, or outcome detail

{Rationale and the concrete proposed change.}

### RP-02: Track local CI credential provenance follow-up

- **Type:** code-follow-up
- **Disposition:** file # file items use the filing status vocabulary
- **Status:** proposed # file items: proposed | filed | rejected | no-destination
- **Destination:** — # file items: issue URL / backlog item id once filed
- **Destination-receipt:** — # full commit SHA for a filed local backlog destination
- **Remote-visibility:** — # pushed | unpushed for a filed local backlog destination
- **Sanitized:** no
- **Disposition-note:** —

{Tracker-ready description: problem, evidence summary, suggested direction.}

## OAT Upstream Feedback (Upstream Register)

### UP-01: Terminal-event notification contract

- **Status:** proposed # proposed | filed | rejected | no-destination
- **Destination:** — # issue URL / backlog item id once filed
- **Destination-receipt:** — # local backlog only; GitHub remains —
- **Remote-visibility:** — # local backlog only; GitHub remains —
- **Sanitized:** yes # confirms the public-destination pass ran
- **Disposition-note:** —

{Ready-to-file issue draft: problem, evidence summary, suggested direction.}
```

IDs are stable within an artifact (`RP-NN` / `UP-NN`). Apply mode may mutate
only `Status`, `Applied-ref`, `Disposition-note`, the promotions rollup, and
`Current State`. Filing mode may mutate only `Status`, `Destination`,
`Destination-receipt`, `Remote-visibility`, `Sanitized`, `Disposition-note`,
the filing rollup, and `Current State`. `Current State` is the only mutable
freeform narrative surface; item IDs, titles, types, dispositions, proposal
bodies, and all other narrative are immutable.

For `Status: filed`, the destination-type schema is exact:

- **Local backlog:** `Destination` is the canonical path,
  `Destination-receipt` is a verified full exact-path commit SHA, and
  `Remote-visibility` is `pushed | unpushed`.
- **GitHub:** `Destination` is a validated issue URL,
  `Destination-receipt: —`, and `Remote-visibility: —`.

Created and strengthened local destinations use destination-first ordering:
commit the destination mutation without retro writeback, verify the commit
contains the destination path, then record that receipt in a later retro-only
writeback commit. Linked local destinations recover the latest exact-path
commit without external mutation. Missing or invalid local receipt state cannot
remain `filed`; no configured upstream means `unpushed`, and no filing path
implicitly pushes.

**Rollup derivation:** `oat_retro_promotions` derives from RP items with
`Disposition: apply` (none | proposed | partial | complete as their statuses
progress). `oat_retro_filing` derives from the union of UP items and RP items
with `Disposition: file`. Every item therefore contributes to exactly one
rollup, and both rollups are computable from register fields alone.

### Sequence snapshot with retro

```yaml
oat_post_implement_sequence:
  status: post_approval
  source: configured
  pre_approval: [summary, document, pr]
  pre_approval_completed: [summary, document, pr]
  approval: approved
  post_approval: [retro]
  post_approval_completed: []
```

## Error Handling

- **Unavailable evidence sources:** named in Evidence and Review Method with
  `status: unavailable`; synthesis proceeds from durable artifacts; no
  session-only claims are invented (handoff honesty contract).
- **Interrupted generation:** complete fully or delete the partial artifact —
  same rule `oat-project-complete` applies to summary generation. No
  half-written retro is ever left for consumers to misread.
- **Apply failure on an item:** mark the item `rejected` with reason (or
  leave `proposed` on transient failure), continue with remaining items,
  report at the end. Register statuses make re-runs resume correctly.
- **Filing preflight failure (issues disabled, missing credentials,
  uninitialized backlog):** destination reported unavailable in the matrix;
  affected items keep `proposed`; lane reported loudly with the concrete
  unblock step (e.g. "issues disabled on voxmedia/open-agent-toolkit").
- **Filing execution failure:** item keeps `proposed`, error surfaced with
  the failed command output; a failed local destination commit creates no
  receipt and no `filed` writeback.
- **Invalid legacy filed state:** run destination-type integrity before
  skipping. A coherent local path may recover its latest exact-path commit and
  retain `filed`; failed recovery returns the item to `proposed`. GitHub filed
  state requires a valid URL and `—` local receipt fields.
- **Non-interactive with no config:** generate-only; propose everything;
  exit zero with a clear "proposals recorded, nothing applied or filed"
  report.

## Testing Strategy

Quick mode: no requirement-to-test mapping table; key levels and scenarios.

### Unit Tests (`packages/cli`)

- `oat-config.test.ts` / `resolve.test.ts`: `'retro'` accepted in
  `postApproval`; structured values containing `'retro'` in `preApproval`
  rejected; legacy strings unchanged; `workflow.retro` normalization (valid
  enums, invalid values dropped, `upstreamRepo` shape, layered merge).
- `commands/config/index.test.ts`: the four `workflow.retro.*` leaves exposed
  through `oat config get/set/list/describe` with nested writeback preserving
  sibling values at every scope.
- `post-implement-sequence-contracts.test.ts`: widened vocabulary contract.
- Manifest tests: `oat-project-retro`, `oat-project-retro-file` in
  `WORKFLOW_SKILLS`; `project-retro.md` in `WORKFLOW_TEMPLATES`.
- `retro-skill-contracts.test.ts`: mutable `Current State`, immutable proposal
  bodies, exact-versus-related duplicate classification, and table-driven local
  filing transitions for new, strengthened, linked, failed-commit, no-upstream,
  GitHub, and rerun states.

### Integration / Repo Checks

- `pnpm check`, `pnpm type-check`, `pnpm test`, `pnpm build` (CI gate order).
- `pnpm lint` + `pnpm format` (touches `.agents/skills`).
- `pnpm build:docs` (docs app touched) and `pnpm release:validate`
  (publishable packages touched).
- `oat sync --scope all` refresh for provider views of the new skills.

### Acceptance (from discovery)

- Live dogfood: run the finished `oat-project-retro` against a completed OAT
  project in this repo; judge artifact quality against the reference retro's
  guiding principles (evidence-first, dual lanes, honest inconclusives).
- Exercise apply mode on at least one promotion and the filing skill's
  preflight matrix (filing execution may target a scratch destination).

## Open Questions

- None blocking. Discussion items flagged for user review are listed in the
  design summary (sequence-array permissiveness, upstreamRepo default,
  autonomous filing chain).

## References

- Discovery: `discovery.md` (Questions 1–9 record all scope decisions)
- Handoff: `references/oat-project-retro-skill-handoff.md`
- Reference retro: `references/project-retro.example.md`
- Companion decision example:
  `references/001-long-running-verification-observability.example.md`
- Sequencing contract:
  `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
- Config surface: `packages/cli/src/config/oat-config.ts`
- Pack manifest:
  `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`

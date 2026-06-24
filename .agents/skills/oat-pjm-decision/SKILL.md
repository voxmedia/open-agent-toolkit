---
name: oat-pjm-decision
version: 1.0.0
description: Use when the user requests or confirms recording a durable repo decision — e.g. "capture that as a decision", "write an ADR for X", "record this architectural choice", or confirms a previously offered decision capture. Creates a file-per-record decision under reference/decisions/ via `oat decision new` and refreshes the generated decision index. Do NOT auto-invoke for routine choices that do not warrant durable history.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Record Repo Decision

Capture a durable decision as a file-per-record entry under `.oat/repo/reference/decisions/` using the canonical `oat decision` command group, then refresh the generated decision index.

## Mode Assertion

**OAT MODE: Repo Decision Capture**

**Purpose:** Record durable decision history as file-per-record decisions with deterministic IDs, preserved body prose, and a refreshed generated index — never by hand-editing a shared monolith.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ RECORD DECISION
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work, print short step indicators, e.g.:
  - `[1/4] Resolving decision details…`
  - `[2/4] Ensuring decision scaffold…`
  - `[3/4] Creating decision record…`
  - `[4/4] Filling body and confirming index…`

## Process

### Step 1: Resolve Inputs

Collect the decision details from the user or surrounding context:

- Title (a short noun phrase, e.g. "Adopt date+slug backlog IDs")
- Context (why the decision is needed; the forces at play)
- Decision (what was chosen)
- Consequences (trade-offs, follow-ups, what this enables or blocks)
- Optional status: `proposed` (default), `accepted`, or `superseded`

If the title is missing, ask the user.
If context is missing, ask for 1-3 sentences describing the situation.

### Step 2: Ensure Decision Scaffold

Before creating records, ensure the canonical decision scaffold and exact managed index markers exist:

```bash
oat decision init
```

This command is idempotent. The scaffold writes `reference/decisions/index.md` with the exact markers required by the CLI:

```md
<!-- OAT DECISION-INDEX -->
<!-- END OAT DECISION-INDEX -->
```

Do not hand-create or rename the managed marker block. Decisions default to `.oat/repo/reference/decisions/`; pass `--decisions-root <path>` only when an explicit override is required.

### Step 3: Create the Decision Record

Create the file-per-record decision with the canonical command:

```bash
oat decision new "<title>" --status <status> --context "<context>"
```

The CLI:

- Generates a deterministic `DR-YYMMDD-slug` ID from the creation date and title.
- Writes one record file whose filename stem equals the ID.
- Strips template frontmatter and seeds the body from `.oat/templates/decision.md`.
- Regenerates the managed decision index.

The slug is **capped at 30 characters** at the last whole-word boundary, with trailing
stop-words (`a, an, the, of, for, and, to, in, on, as, with`) trimmed. Choose a concise,
meaningful title that stays readable within that 30-character budget.

If the command reports a filename collision (same-day same-slug), use a more specific title to disambiguate rather than overwriting an existing record. Never hand-author a decision file or edit `index.md` inside the managed markers.

### Step 4: Fill the Decision Body

Open the created record at `.oat/repo/reference/decisions/<DR-YYMMDD-slug>.md` and complete the body sections that the template seeds as `TODO`:

- `## Context`
- `## Decision`
- `## Consequences`

Preserve the frontmatter (`id`, `title`, `date`, `status`, `legacy_id`). Do not change the `id` — the filename stem must keep matching it.

### Step 5: Regenerate and Verify the Index

If you edited the body only, the index already reflects the record. If you changed any indexed frontmatter field (`status` or `title`), regenerate the managed index:

```bash
oat decision regenerate-index
```

Confirm `.oat/repo/reference/decisions/index.md` lists the new record with columns `ID | Date | Status | Title | Legacy` and that the managed marker section was refreshed by the CLI, not by hand.

### Step 6: Summarize to the User

Report:

- Decision record path and generated `DR-YYMMDD-slug` ID
- Final status
- Whether the managed decision index was regenerated
- Any follow-up captured as a backlog item or roadmap note

## Notes on Taxonomy

- Durable decision history lives under `reference/decisions/`, not under `pjm/`.
- Active operational planning (`current-state.md`, `roadmap.md`, `backlog/`) lives under `pjm/`.
- Legacy `reference/decision-record.md` monoliths are migrated into file-per-record decisions with `oat decision migrate`; do not write new decisions back into a monolith.

## Success Criteria

- New decision file exists under `.oat/repo/reference/decisions/` with a `DR-YYMMDD-slug` filename matching its `id`
- Body includes Context, Decision, and Consequences
- The managed decision index was refreshed via `oat decision new`/`oat decision regenerate-index`, not hand-edited
- No new decision content was written into a legacy `decision-record.md` monolith

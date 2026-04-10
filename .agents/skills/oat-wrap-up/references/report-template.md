# Wrap-Up Report Skeleton

This is the markdown scaffold the `oat-wrap-up` skill fills in during Step 8 (Synthesize Report) and Step 9 (Write Report). It is a **reference** only — the skill reads this file for structure guidance, then produces the final report from the discovered summaries and merged PRs.

## Structure

```markdown
---
oat_wrap_up: true
oat_generated: true
window_since: YYYY-MM-DD
window_until: YYYY-MM-DD
window_label: past-week
generated_at: YYYY-MM-DDTHH:MM:SSZ
---

# Wrap-up: YYYY-MM-DD to YYYY-MM-DD

## TL;DR

{2–4 sentences describing the headline of what shipped during the window. Written fresh by the skill, not copied from any single project's overview. Mention the most important user-facing change first, then the breadth of the shipped work.}

## Features introduced

- **{Feature name}** — {1–2 sentences describing what shipped and why it matters to users}. Shipped in {project reference} via {PR links}.
- **{Another feature}** — {...}.

## Bug fixes

- **{Short description of the bug that was fixed}** — {what was broken, what now works}. {PR link}.
- **{...}**

## New user-facing capabilities

- **{Capability name}**: {what it does}. Invoke via `{command / flag / URL}`. {1 sentence on when or how users would reach for this}. {PR link}.
- **{...}**

## Shipped via OAT projects

| Project | Window date | PR   | Outcome            |
| ------- | ----------- | ---- | ------------------ |
| {name}  | YYYY-MM-DD  | #{n} | {one-line outcome} |
| {name}  | YYYY-MM-DD  | #{n} | {one-line outcome} |

## Other merged PRs

| PR   | Title   | Author  | Merged     |
| ---- | ------- | ------- | ---------- |
| #{n} | {title} | {login} | YYYY-MM-DD |
| #{n} | {title} | {login} | YYYY-MM-DD |

## Open follow-ups

- {Aggregated `Follow-up Items` entry from one of the included summaries. Dedupe near-duplicates across summaries.}
- {Another follow-up}

## Included summaries (provenance)

- `.oat/projects/shared/<project-a>/summary.md`
- `.oat/projects/archived/<project-b>/summary.md`
- `.oat/repo/reference/project-summaries/20260403-<project-c>.md`
```

## Section omission rule

Apply the same rule as `.oat/templates/summary.md`: **omit any section with no content**. Do not leave empty sections or "None" placeholders. The minimum viable wrap-up is `# Wrap-up` + `## TL;DR` + one of (`Features introduced` | `Bug fixes` | `Shipped via OAT projects` | `Other merged PRs`) + `Included summaries (provenance)`.

If the window is completely empty (no summaries, no merged PRs), still write the file (or stdout) with:

```markdown
# Wrap-up: YYYY-MM-DD to YYYY-MM-DD

## TL;DR

No OAT-tracked projects completed or merged PRs landed in this window.

## Included summaries (provenance)

- _(none)_
```

## Synthesis guidance

**Don't string-concatenate summary prose.** The report is a synthesis. Read each summary's Overview and What Was Implemented sections, and write a fresh narrative that groups related work. If two projects shipped complementary pieces of the same capability, describe them together rather than as separate bullets.

**Link everything.** Every feature, bug fix, and capability entry should link to at least one PR (or summary file) so readers can drill in. If a summary is the source of the narrative, link to the summary file in "Included summaries (provenance)" and reference PR numbers from within the narrative sections.

**Keep the TL;DR short.** Two to four sentences. If you can't summarize the window in that space, the window is probably too wide for a single report — consider running two reports over narrower windows.

**User-facing voice.** The "New user-facing capabilities" section is the most important output for release notes and stakeholder communication. Describe each capability in the voice of "what a user can now do," not "what the team shipped." For each capability, include the exact command, flag, URL, or UI affordance so the entry is directly actionable.

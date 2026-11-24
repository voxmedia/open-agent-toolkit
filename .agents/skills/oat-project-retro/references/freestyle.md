# Retrospectives on Freestyle Projects

Apply these overrides in both generate and apply mode, including every output
of `references/apply-procedure.md`. The normal evidence-quality, proposal,
content-consent, idempotence and walkthrough rules still apply. Resolve scope
with `oat project scope "$PROJECT_PATH" --format value` and stop on failure;
read the project's `AGENTS.md` and `shape.md` and require the claimed
orchestrator checkout before record writes.

## Evidence

Keep the reading order: available project log, legacy learnings if present,
then project evidence and session evidence. In the third group use
`shape.md`'s documents, `decisions.md` `## Live`, lane reports and merged
changes alongside `state.md`. No `plan.md`, `implementation.md`, summary,
closeout snapshot or review is required. Name missing evidence as unavailable
and continue; do not fabricate lifecycle artifacts. The output is still
`references/project-retro.md` with the same template and register fields.
Generate before completion synthesis, so an available open log can receive its
receipt. If the log is sealed, report the receipt in the retro instead of
appending; never rewrite a sealed log.

## Saves in generate and apply

`shape.md`'s `## Commits, PRs and merges` agreement governs every commit and
push, including the generated retro, its structural receipt, application
targets, project-log corrections and later retro writebacks. Apply consent or
`workflow.retro.apply: auto` authorizes the content change, not a commit or
publication. Unshaped, deferred or withheld commit/push permission means leave
outputs uncommitted/unpushed, name them, and do not execute the generic commit
blocks. Do not chain filing merely because a lifecycle sequence is configured;
follow the shape and separate filing consent.

- **Shared records:** commit only exact producer-owned paths when agreed.
- **Synced records:** publish with `oat project push` only when agreed; do not
  put project records on the code branch.
- **Local records:** keep them uncommitted, including `project-retro.md`, log
  corrections and writebacks. Never force-add ignored records.
- **Repository application targets:** ordinary docs, rules, instructions and
  decisions follow the shape's commit/push agreement independently of record
  scope. Use exact-path commits only when agreed; never bundle local or synced
  project records into a repository target commit.

Before applying an item, determine whether the normal procedure can record its
required durable target and writeback receipts under that agreement. If either
required commit/push is withheld, present the concrete proposal and leave the
item `proposed` or `approved` with a `Disposition-note` explaining the pending
save; do not apply it or claim `Status: applied` / `Applied-ref`. This is a
pending application, not failed completion. Once saving is permitted, use the
normal semantic recovery and exact receipt checks, keeping the target commit
before any synced writeback push. For a local project, do not execute an apply
transaction requiring a committed retro writeback: leave it proposed/approved
and report that local records stay uncommitted. An operator can adopt the
proposal separately; do not fabricate an application receipt.

Formatting, relevant checks and the final register walkthrough are required
whether saves are permitted or withheld. Report exact output paths and actual
save/publication state; never imply an unsaved artifact is durably committed.

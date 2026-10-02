---
title: Design Modes
description: 'How oat-project-design balances section-by-section collaboration, selective review, and draft-and-review.'
---

# Design Modes

`oat-project-design` can run full spec-driven design in three interaction modes:

- **Collaborative**: every design section is drafted, presented, confirmed, and then the skill moves to the next section.
- **Selective collaborative**: the skill drafts every section, but only presents sections that need live review. Routine sections are written silently and recapped at the final review gate.
- **Draft-and-review**: the skill drafts the full design up front and the user reviews the committed file once at the end.

The default recommendation is collaborative when in doubt. Draft-and-review is never the picker default unless it was selected explicitly through an argument, environment variable, or config preference.

## Collaborative

Use collaborative mode when:

- the design is small enough that confirming every section is reasonable
- discovery exposed uncertainty across most of the design
- the repo has sparse knowledge/docs grounding
- you want maximum user control over the design narrative

The agent does not write `design.md` section-by-section. It drafts sections in conversation, asks for confirmation, and writes the assembled file only after all sections are approved.

## Selective Collaborative

Selective collaborative mode sits between collaborative and draft-and-review. It keeps live review for high-risk or uncertain sections, while letting routine sections move quietly into the design document.

Before drafting, the skill runs a selective review pass and prints a **Section Review Plan**:

| Section      | Classification             | Meaning                                                           |
| ------------ | -------------------------- | ----------------------------------------------------------------- |
| `needs-eyes` | Presented for confirmation | The section has at least one risk or uncertainty signal.          |
| `routine`    | Drafted silently           | The section follows existing patterns and has adequate grounding. |

The user gets one cheap override moment before drafting: they can elevate any `routine` section to `needs-eyes`.

### Needs-eyes Signals

The selective review pass has a conservative bias: any one needs-eyes signal marks the section `needs-eyes`.

High-risk-by-default sections are always `needs-eyes`:

- Overview + Architecture
- Security Considerations
- Performance Considerations
- Error Handling
- Migration Plan

Other signals include:

- discovery open questions or user-flagged concerns touching the area
- three or more requirements concentrated in the section
- new public API, CLI, config, defaults, or workflow semantics
- cross-module boundaries not already described in repo architecture docs
- novel patterns not present in repo conventions or stack docs
- new dependencies, providers, services, storage models, permission boundaries, or integrations
- missing or thin grounding context for the section

If every section is `needs-eyes`, selective collaborative collapses into full collaborative and the skill explains why. If no section is `needs-eyes`, the skill still forces Overview + Architecture to `needs-eyes` so the user sees the framing.

### Final Review Recap

At the user-review gate, selective collaborative lists sections drafted without live confirmation:

```text
Drafted without live confirmation: Testing Strategy, Deployment Strategy.
Please review those sections especially carefully in the committed file.
```

This keeps the silent path visible without adding live prompts for low-risk sections.

## Draft-and-review

Use draft-and-review when:

- you explicitly want a full draft before reacting
- the context is non-interactive
- a persisted preference or command override selected draft mode

In draft-and-review mode, the user-review gate is the only live interaction point.

## Quick-start Parity

Selective collaborative mode is only available in full spec-driven design through `oat-project-design`.

Quick-start lightweight design keeps the smaller two-choice model:

- collaborative lightweight design
- draft-and-review lightweight design

The quick-start section set is intentionally small and already curated for relevance, so selective review rarely saves enough prompts to justify another picker branch. If a quick project is promoted to spec-driven, selective collaborative becomes available when it enters full `oat-project-design`.

## Configuration

Use `workflow.designMode` to persist a personal or repo preference:

```bash
oat config set workflow.designMode selective --user
oat config set workflow.designMode collaborative --shared
oat config set workflow.designMode draft --local
```

Valid values are `collaborative`, `selective`, and `draft`.

Runtime non-interactive signals still win over this preference. If `OAT_NON_INTERACTIVE=1` is set, design runs in draft-and-review mode so automation does not block on prompts.

## Choosing an interaction mode

The design mode decides how the agent reviews the design with you while it
writes `design.md`.

| Mode          | Choose it when                                                                  | What you give up                                                               |
| ------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Collaborative | The design is uncertain, or the repository has little documentation to build on | Time: you confirm every section before the file is written                     |
| Selective     | A spec-driven project in a repository whose architecture is well documented     | Seeing routine sections live; you review them only in the final recap          |
| Draft         | You want a complete proposal first, or nobody is available to answer prompts    | Live input: the final review of the whole file is your only chance to steer it |

If you have not set `workflow.designMode`, the design skill asks you each time
and suggests collaborative. When more than one source sets a mode, the skill
uses the first of these it finds: the `--mode` argument, the `OAT_DESIGN_MODE`
environment variable, draft for a non-interactive run (so automation never
waits on a prompt), and finally your configured preference or the prompt. Quick
projects offer only collaborative and draft; a configured `selective` behaves
as collaborative there.

- If you are trying OAT on your own and are unsure, leave the preference unset
  and pick collaborative when asked.
- If your team is still debating the architecture, choose collaborative so
  people can steer each section before the design is written.
- If a spec-driven project follows well-documented repository patterns, choose
  selective: risky sections such as security and migration are still shown to
  you live, and routine ones appear in the final recap.
- If you need a complete proposal before a scheduled review meeting, or the run
  is scripted, choose draft and set aside time to read the whole result.

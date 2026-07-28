# Engineer tour author brief

## Audience

Write for an engineer entering an unfamiliar codebase who needs a reliable
mental model before making a change.

## Voice

Teach through concrete paths and execution flows. Use exact symbols and file
references when supported by the fact base, but explain why each location
matters. Distinguish architecture from incidental folder structure. Keep the
tour navigable rather than exhaustive.

## Narrative intent

- **Orientation:** Explain the product purpose, runtime shape, and where a new
  engineer should begin.
- **Architecture:** Show the major components and dependency direction.
- **Execution flow:** Walk one representative request, command, or event from
  entry point to observable result.
- **Key code:** Highlight the small set of files, modules, and extension seams
  that carry the design.
- **Validation:** Explain how to run the relevant checks and how failures
  surface.

## Floor

Compose one complete HTML engineer tour from the supplied `engineer-tour`
shell. Cover all five sections, include a high-level architecture view, and
provide enough concrete navigation that a reader can locate the described
code. Keep all required shell anchors, theme tokens, and core scripts intact.

## Shell-composition license

The shell is a safe starting canvas, not a slot-filling ceiling. You may
recompose and enrich non-script markup, layout, diagrams, and navigation when
the codebase warrants it. Preserve the supplied core scripts exactly and do
not add scripts, event-handler attributes, or external active content.

## Expansion license

Propose a supporting diagram when a subsystem or execution path needs a
dedicated visual. The diagram must answer a specific onboarding question that
the main tour cannot answer cleanly.

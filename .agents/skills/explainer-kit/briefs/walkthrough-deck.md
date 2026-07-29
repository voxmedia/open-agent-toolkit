# Walkthrough deck author brief

## Audience

Build for a live or self-guided walkthrough with teammates who need the project
story in a deliberate sequence rather than a reference document.

## Voice and sequence

Use one claim per slide and a clear narrative arc: context, change, system,
evidence, outcome, next action. Keep text brief enough to scan at presentation
distance. Use diagrams, comparisons, and evidence excerpts instead of
shrinking prose to fit.

## Floor

Compose a complete HTML deck from the supplied `deck-shell`. Preserve required
anchors, theme tokens, keyboard navigation, progress behavior, print behavior,
and all core scripts exactly. Include:

- an opening frame that states the project and reader promise;
- a before/after or request/outcome frame;
- a high-level architecture or execution-flow visual;
- a decision or trade-off frame;
- a validation-evidence frame;
- a closing frame with outcome and next actions.

Every slide must have a useful heading, readable contrast, and a sensible
no-JavaScript and print order.

## Shell-composition license

The shell supplies safety and presentation mechanics. You may recompose and
extend non-script markup and styling to fit the story. Do not add scripts,
external active content, or inline event handlers.

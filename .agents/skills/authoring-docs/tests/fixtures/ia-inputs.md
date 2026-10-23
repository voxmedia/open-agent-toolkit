# Public synthetic IA walkthrough inputs

This fixture is invented for #367 P1/P2/G1/G6. It contains no surveyed repository
content. The implementer walks the skill procedure manually; this is not an
agent-execution harness or an expected-output snapshot.

## Fresh Markdown

A small CSV inspection CLI has `bin: {csv-inspect: ./cli.js}`, six documented
commands, a JSON output mode and no UI. Eight reader pages are expected. Users
inspect files; maintainers add commands. No independent behavior-verification
team exists. No docs surface is configured. No private guidance is supplied.

## Fresh framework

A public sample event relay exposes HTTP subscription routes, a worker and
Terraform deployment. Its UI only lists subscriptions. About 24 reader pages
are expected. API consumers integrate; maintainers operate retries and delivery.
Tests are owned by builders; no independent verification need is established.
Use Fumadocs or MkDocs without changing the IA selection. A repo guidance source
is available with the following synthetic contents:

```markdown
# Sample IA guidance

Prefer consumer tasks separate from maintainer operation when entry keys differ.

## Contents

- [Selection signals](signals.md) — Reader work contexts and entry keys.
```

The source entry is named `index.md`; `signals.md` repeats this generic signal.
It is advisory and read-only. No repo authority conflicts in the fresh case.

## Explicit adoption and existing-docs routing

A populated `docs/` tree contains `index.md`, `quickstart.md`, `commands.md`,
`configuration.md`, `contributing.md`. Existing `AGENTS.md` says: preserve the
flat layout and existing URLs until the operator approves otherwise. Existing
`contributing.md` requires dash-bullet Contents links with `.md` extensions.

Default bootstrap routes to analyze → apply for approved recommendations and
exits without invoking scaffold. Explicit additive adoption may run the IA
proposal before CLI `--adopt`; content and URLs remain intact. A conflicting
advisory pack suggesting track directories is an `ask_user` finding, not
permission to change the layout. Replacement requires a separate explicit
choice; second-app is explicitly selected only to report current CLI refusal.

---
id: DR-260927-templates-resolve-repository
title: Templates resolve repository first
date: 2026-09-27
status: accepted
legacy_id: null
---

# Templates resolve repository first

## Context

OAT generates lifecycle and PJM documents (discovery, spec, design, plan,
summary, retro, backlog items, decision records) from Markdown templates that
can live in three tiers: the repository's `.oat/templates/`, the user's
`~/.oat/templates/` (from `oat tools install --scope user`), and the templates
bundled in the CLI package. The two internal resolvers disagree:
`resolveTemplateSource` in `packages/cli/src/commands/project/new/scaffold.ts`
checks user, then repository, then bundle; `resolvePjmTemplate` in
`packages/cli/src/commands/pjm/template-source.ts` checks repository, then user,
then bundle. About nine lifecycle skills also copy `.oat/templates/<name>.md`
directly, which does not exist after a user-scope-only install. AGENTS.md
already describes a repository, user, bundle order. Tracked by
`BL-260927-expose-a-scoped-template` (GitHub #296).

## Decision

Every template lookup resolves repository, then user, then bundle: the most
specific source wins. A repository's committed templates apply to everyone
working in it; user templates fill in only where the repository has none; the
bundle is the fallback.

The scaffold resolver changes to this order, and the new template-resolver
command and the lifecycle skills that currently hard-code `.oat/templates/`
use it.

Rejected alternative: user, then repository, then bundle (today's
`oat project new`). Personal templates would override a team's committed
customizations, so two people in one repository would produce differently
shaped artifacts.

## Consequences

- `oat project new` stops preferring `~/.oat/templates/` over a repository's
  templates. A maintainer who relied on a personal override inside a repository
  that commits its own template must change the repository template instead.
- Tests that exercise the bundle tier must inject an isolated `HOME`, as they
  already should (see AGENTS.md, Definition of Done).
- `BL-260927-expose-a-scoped-template` is plan-eligible: one shared resolver,
  a `--json` resolver command, and the skill migration (with version bumps).

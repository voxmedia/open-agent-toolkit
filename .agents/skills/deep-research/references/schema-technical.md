<!-- schema-technical.md — Extended schema for technical research.
     Used by: /deep-research (when schema=technical is selected).
     Inherits: schema-base.md (Executive Summary, Methodology, Sources & References).
     Extends: Findings section with technical subsections below. -->

# Technical Research Schema

Inherits the base artifact template from `schema-base.md`. The Findings section is
extended with the following subsections.

---

## Findings

### Packages & Libraries

{Evaluated packages and libraries relevant to the research topic. For each:

- **Name** and **version** (or version range evaluated)
- **Maintenance status** — last release date, commit frequency, open issue count
- **TypeScript support** — native types, DefinitelyTyped, or none
- **License** — SPDX identifier
- **Ecosystem fit** — how well it integrates with the target stack}

### Repository Analysis

{Code quality signals and architectural observations for key repositories:

- **Architecture patterns** — module structure, dependency graph, layering approach
- **Test coverage** — testing strategy, coverage percentage if available, test quality
- **Build & CI** — build system, CI pipeline, release process
- **Code health** — linting, formatting, type strictness, documentation quality
- **Community** — contributors, responsiveness to issues, governance}

### Code Examples

{Key usage patterns and integration snippets demonstrating how the technology works
in practice. Include:

- Minimal "hello world" or quickstart example
- Pattern most relevant to the user's context
- Any non-obvious configuration or setup steps
- Error handling patterns if applicable

Use fenced code blocks with language identifiers.}

### Integration Notes

{Practical guidance for adopting the technology:

- **Compatibility** — runtime requirements, peer dependencies, browser/Node support
- **Migration path** — steps to move from the current solution (if applicable)
- **Setup requirements** — environment variables, config files, CLI tools
- **Breaking changes** — known gotchas between major versions}

### Technical Tradeoffs

{Balanced assessment of costs and benefits:

- **Performance** — runtime speed, memory footprint, startup time
- **Bundle size** — production bundle impact (tree-shakeable?)
- **Learning curve** — documentation quality, API surface complexity
- **Operational cost** — monitoring, debugging, observability support
- **Lock-in risk** — portability, standard compliance, escape hatches}

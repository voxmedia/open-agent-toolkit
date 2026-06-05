# Technical Documentation Authoring Skill

Use this skill when asked to create, migrate, audit, or improve technical documentation for a software repository.

The output should be accurate, cohesive, Markdown-first, and useful to both humans and AI agents.

## Prime directive

Write documentation that helps readers do real work safely and confidently.

Do not write generic docs. Ground every claim in the repository, its configuration, its code, its schemas, and its existing docs.

## Required behavior

Before writing or modifying docs:

1. Inspect the repository.
2. Identify the project type.
3. Inventory existing docs.
4. Identify the reader personas.
5. Determine which docs are missing, stale, duplicated, or misleading.
6. Prefer improving existing docs over creating parallel docs.
7. Use the standard documentation structure unless the repository has a strong reason to diverge.

## Never invent

Do not invent:

- commands
- package scripts
- environment variables
- API endpoints
- GraphQL fields
- event names
- deployment workflows
- ownership
- escalation paths
- security behavior
- infrastructure details
- compatibility promises
- performance guarantees

When something is unclear, say so directly in the documentation or in the handoff summary.

Acceptable placeholder:

```md
> [!NOTE]
> Ownership for this service is not documented in this repository. Confirm the owning team before publishing this page.
```

Unacceptable placeholder:

```md
The Platform team owns this service.
```

Unless that fact is grounded in source material.

## Documentation types

Use four primary documentation types:

| Type         | User need             | Good for                                                      |
| ------------ | --------------------- | ------------------------------------------------------------- |
| Tutorial     | Learn by doing        | First successful run, first request, first contribution       |
| How-to guide | Complete a task       | Deploy, add a route, rotate a secret, debug a worker          |
| Reference    | Look up exact facts   | API endpoints, CLI flags, env vars, config, errors            |
| Explanation  | Understand the system | Architecture, tradeoffs, data flow, auth model, failure modes |

A page can contain small pieces of other types, but each page must have one primary job.

## Standard repo docs structure

Use this structure as the default:

```txt
docs/
├── index.md
├── getting-started.md
├── how-to/
│   ├── local-development.md
│   ├── testing.md
│   ├── deployment.md
│   └── troubleshooting.md
├── reference/
│   ├── configuration.md
│   ├── environment-variables.md
│   ├── commands.md
│   ├── api.md
│   └── errors.md
├── concepts/
│   ├── architecture.md
│   ├── data-flow.md
│   ├── auth.md
│   └── caching.md
└── operations/
    ├── runbook.md
    ├── observability.md
    ├── alerts.md
    └── rollback.md
```

Small repos can collapse pages, but the same categories should remain recognizable.

## Required landing page answers

Every repo should have an entry page that answers:

1. What is this project?
2. Who uses it?
3. What problem does it solve?
4. What does it explicitly not do?
5. How do I run it locally?
6. How do I test it?
7. How do I deploy it?
8. Where does it run?
9. What systems does it depend on?
10. Who owns it?
11. Where should I go next?

## Writing rules

Write directly and plainly.

Prefer:

- specific nouns
- active voice
- present tense
- short paragraphs
- descriptive headings
- copyable commands
- expected output
- verification steps
- rollback steps for risky operations
- examples that match real project behavior

Avoid:

- marketing language
- vague claims
- unexplained acronyms
- “just,” “simply,” and “obviously”
- “as usual” or “standard process” without explanation
- stale roadmap language
- references to Slack, meetings, or tickets without summarizing the decision

## Markdown rules

Use plain Markdown. MDX is allowed only when the repository intentionally uses it.

Required conventions:

- One `#` heading per page.
- Do not skip heading levels.
- Use fenced code blocks with language identifiers.
- Use `sh` for shell commands.
- Use `txt` for command output.
- Do not include shell prompts unless the prompt itself matters.
- Use angle brackets for placeholders: `<environment>`.
- Explain every placeholder.
- Use descriptive link text.
- Use tables for reference data, not long prose.

## Category requirements

For APIs, include auth, permissions, examples, request and response shapes, errors, pagination, rate limits, idempotency, retries, timeouts, versioning, and deprecation behavior when applicable.

For CLIs, include install, auth, config, command reference, arguments, flags, output, JSON output, exit codes, scripting behavior, examples, troubleshooting, and safe production usage.

For services, include purpose, runtime, dependencies, configuration, local dev, testing, deployment, observability, alerts, runbooks, rollback, data flow, and failure modes.

For frontend apps, include routes, rendering model, data fetching, state management, feature flags, analytics, accessibility, performance constraints, testing, and deployment.

For libraries and frameworks, include install, quick start, core concepts, public API, examples, extension points, compatibility, migration guides, anti-patterns, and release policy.

## Definition of done

A docs change is complete when:

- The page has a clear purpose.
- The page is in the right location.
- The doc type is obvious.
- Commands and examples are accurate.
- The reader can complete the intended task.
- Reference tables include types, defaults, required fields, and constraints.
- Risky operations include verification and rollback.
- Internal-only information is not leaked into public docs.
- No secrets or sensitive data are included.
- Links are valid and useful.
- The documentation is useful without external tribal knowledge.

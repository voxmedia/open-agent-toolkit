---
title: Writing Style
description: Style rules for clear, consistent, direct technical documentation.
---

# Writing Style

Technical documentation should be plain, specific, and useful under pressure.

The reader should not have to decode tone, chase implied context, or guess whether a statement is current.

## Voice

Use a direct, practical voice.

Prefer:

```md
Run the tests before opening a pull request.
```

Avoid:

```md
It is recommended that tests are run prior to the opening of a pull request.
```

## Use active voice

Active voice makes responsibility clear.

Bad:

```md
The cache is invalidated after the migration is run.
```

Better:

```md
The migration invalidates the cache.
```

Best when the actor matters:

```md
The deploy workflow invalidates the Fastly cache after the migration finishes.
```

## Use specific nouns

Bad:

```md
Update the thing in the config.
```

Better:

```md
Update `EVENT_BUS_NAME` in `.env.local`.
```

## Avoid false ease

Avoid words that make complex tasks sound trivial:

- just
- simply
- obviously
- easy
- basically

Bad:

```md
Simply deploy the service like normal.
```

Better:

````md
Deploy the service with the production workflow:

```sh
pnpm deploy:production
```
````

## Avoid hidden tribal knowledge

Bad:

```md
Use the usual process.
```

Better:

```md
Use the production deploy workflow in GitHub Actions. Select the `production` environment and verify the deployment in Datadog after the workflow completes.
```

## Define acronyms on first use

Bad:

```md
The DWP worker publishes to the CMS bus.
```

Better:

```md
The Distributed Workflow Platform (DWP) worker publishes to the content management system (CMS) event bus.
```

If an acronym is only used once, do not introduce it.

## Prefer present tense

Bad:

```md
The service will publish an event when an article has been updated.
```

Better:

```md
The service publishes an event when an article is updated.
```

Use future tense only for future behavior that is actually planned and dated.

## Be careful with temporary language

Avoid:

- new
- old
- soon
- currently
- temporary
- eventually
- recent

These become stale fast.

Better:

```md
As of March 2026, the service uses the v2 publishing workflow. The v1 workflow is deprecated and will be removed after all consumers migrate.
```

## Prefer concrete examples

Bad:

```md
Set the required environment variables.
```

Better:

```md
Set these required environment variables:

| Name           | Example                 | Description                   |
| -------------- | ----------------------- | ----------------------------- |
| `API_BASE_URL` | `http://localhost:3000` | Base URL for API requests.    |
| `DATABASE_URL` | `postgres://...`        | PostgreSQL connection string. |
```

## Do not over-explain obvious syntax

Bad:

```md
The `cd` command changes your current directory to the directory that contains the project.
```

Better:

````md
Change into the project directory:

```sh
cd <repo>
```
````

Explain project-specific behavior, not universal shell basics.

## Use warnings for real risk

Use warnings for production impact, destructive operations, security concerns, and irreversible behavior.

```md
> [!WARNING]
> This command deletes all pending jobs in the queue. Run it only during an active incident after confirming the queue contents.
```

Do not use warning callouts for ordinary tips.

## Use notes for useful context

```md
> [!NOTE]
> Local development uses the staging API by default because the service requires production-like event payloads.
```

## Use examples with expected output

Good:

````md
Run the health check:

```sh
curl http://localhost:3000/health
```

Expected output:

```json
{
  "status": "ok"
}
```
````

Expected output helps humans verify success and helps agents reason about command behavior.

## Headings should be descriptive

Bad headings:

```md
## Stuff

## More

## Notes

## Misc
```

Better headings:

```md
## Configure environment variables

## Run database migrations

## Verify the deployment

## Roll back a failed deploy
```

## Keep paragraphs short

Most docs should use paragraphs of one to four sentences.

Long paragraphs hide actions, caveats, and constraints.

## Use lists intentionally

Use lists for:

- prerequisites
- steps
- capabilities
- non-goals
- constraints
- failure modes

Do not use lists as a substitute for structure.

## Use tables for reference data

Good table subjects:

- environment variables
- CLI flags
- API fields
- config keys
- error codes
- permissions
- event fields

Bad table subjects:

- long explanations
- nuanced tradeoffs
- multi-paragraph operational procedures

## Links should say where they go

Bad:

```md
See [here](../reference/configuration.md).
```

Better:

```md
Read the [configuration reference](../reference/configuration.md).
```

## Introduce code blocks

Do not drop commands without context.

Bad:

````md
```sh
pnpm test
```
````

Better:

````md
Run the test suite:

```sh
pnpm test
```
````

## Public docs tone

Public docs should be polished, but not fluffy.

Prefer:

- clear benefits
- complete examples
- user-safe assumptions
- support paths
- version compatibility

Avoid:

- internal nicknames
- unpublished roadmap claims
- implementation details that are not part of the public contract
- security-sensitive internals

## Internal docs tone

Internal docs can be direct and practical.

Include:

- owning team
- Slack channel
- dashboards
- runbooks
- escalation path
- internal environment names

Do not include:

- secrets
- credentials
- sensitive customer data
- private incident details that do not belong in durable docs

## AI-agent readability rules

Agents perform better when docs are explicit and structured.

Prefer:

```md
## Required environment variables

| Name           | Required | Description                                          |
| -------------- | -------: | ---------------------------------------------------- |
| `DATABASE_URL` |      Yes | PostgreSQL connection string used by the API server. |
```

Avoid:

```md
Make sure your env is set up.
```

Agents cannot safely infer missing operational details.

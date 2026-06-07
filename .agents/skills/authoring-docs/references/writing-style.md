---
title: Writing Style
description: Style rules for clear, direct, maintainable technical documentation.
---

# Writing Style

Technical documentation should be plain, specific, and useful under pressure.
The reader should not have to decode tone, chase implied context, or guess
whether a statement is current.

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

## Active Voice and Specific Nouns

Active voice makes responsibility clear. Specific nouns make actions
verifiable.

Weak:

```md
The cache is invalidated after the migration is run.
```

Stronger:

```md
The deploy workflow invalidates the Fastly cache after the migration finishes.
```

## Avoid False Ease

Avoid words that make complex tasks sound trivial:

- just
- simply
- obviously
- easy
- basically

Replace hidden assumptions with exact steps, commands, or links.

## Avoid Tribal Knowledge

Do not write "use the usual process" or "deploy normally." Name the workflow,
environment, command, approval requirement, and verification path when known.

## Define Acronyms on First Use

Define acronyms the first time they appear. If an acronym is used only once,
avoid introducing it.

## Prefer Present Tense

Use future tense only for future behavior that is planned and dated. Avoid
stale words such as `new`, `soon`, `currently`, `temporary`, `eventually`, and
`recent` without a date or issue link.

## Use Concrete Examples

Show copyable examples with expected output when possible. Expected output helps
humans verify success and helps agents reason about command behavior.

## Warn Only for Real Risk

Use warnings for production impact, destructive operations, security concerns,
and irreversible behavior.

```md
> [!WARNING]
> This command deletes all pending jobs in the queue. Run it only during an
> active incident after confirming the queue contents.
```

Use notes for useful context, not ordinary tips.

## Markdown Rules

- Use one `#` heading per page.
- Do not skip heading levels.
- Use fenced code blocks with language identifiers.
- Use `sh` for shell commands.
- Use `txt` for command output.
- Do not include shell prompts unless the prompt itself matters.
- Use angle brackets for placeholders, such as `<environment>`.
- Explain every placeholder.
- Use descriptive link text.
- Use tables for reference data, not long prose.

## Headings Should Be Descriptive

Weak headings:

```md
## Stuff

## More

## Notes

## Misc
```

Stronger headings:

```md
## Configure environment variables

## Run database migrations

## Verify the deployment

## Roll back a failed deploy
```

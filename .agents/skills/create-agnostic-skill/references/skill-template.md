# Skill Template Reference

Annotated template showing the standard structure for skills.

## Section Structure

Adjust based on complexity—not all sections are required:

1. **Title (H1)** - Skill name
2. **Brief description** - One sentence overview
3. **When to Use** - Conditions that warrant using this skill
4. **When NOT to Use** - Anti-patterns or exclusions
5. **Arguments** - Parameters parsed from `$ARGUMENTS`
6. **Prerequisites** - Required setup or context (if applicable)
7. **Workflow/Steps** - Numbered steps using "Step 1, 2, 3..." naming
8. **Quality Standards** - Checklist format for docs skills (if applicable)
9. **Examples** - Both "Basic Usage" and "Conversational" styles
10. **Reference** - Links to relevant documentation
11. **Troubleshooting** - Common issues and solutions
12. **Success Criteria** - Checklist of completion conditions

## Annotated Template

````markdown
---
# === Portable fields (work across all providers) ===
name: skill-name
# Required: kebab-case, max 64 chars, must match directory name

version: 1.0.0
# Required: semver. Start new skills at 1.0.0.

description: Use when [trigger condition]. [What it does as disambiguation keywords].
# Required: Single line, ≤ 500 chars. Lead with "when to use" — this is the routing trigger.
# Agents load ONLY name+description at startup to decide relevance.

# === Spec-optional fields (recognized by some providers) ===
# license: Apache-2.0
# compatibility: Requires Node.js 18+
# metadata:
#   author: my-org
#   version: "1.0"

# === Claude Code / Cursor extension fields (ignored by Codex, safe to include) ===
argument-hint: '[required-arg] [--optional-flag]'
# Claude Code only: Shows in autocomplete after /skill-name

disable-model-invocation: true
# Claude Code + Cursor: Set true for command-like skills users invoke explicitly

allowed-tools: Read, Write, Glob, Grep
# Claude Code only: Tools agent can use without permission prompts

user-invocable: true
# Claude Code only: Set false for helper skills that shouldn't appear in / menu

# context: fork
# Claude Code only: Uncomment to run in isolated subagent (rare)
---

# Skill Title

Brief description of what this skill does and the problem it solves.

## When to Use

Use when:

- Condition that warrants using this skill
- Another condition
- Context where this is the right choice

## When NOT to Use

Don't use when:

- The task is a one-time operation (doesn't justify a skill)
- Simpler approach would suffice
- Existing skills can be composed to achieve the goal

## Arguments

Parse from `$ARGUMENTS`:

- **required-arg**: (required) Description of what this argument does
- **--optional-flag**: (optional) Description with default value noted

## Workflow

### Step 1: First Step Title

Clear instructions in imperative form. Tell the agent what to do.

Include code blocks for commands:

```bash
example command
```
````

### Step 2: Second Step Title

Continue with next logical step. Keep steps focused on one task.

### Step 3: Verify and Complete

Final step should verify success and summarize what was accomplished.

## Examples

### Basic Usage

```
/skill-name required-arg --optional-flag
```

```
/skill-name another-example
```

### Conversational

```
Natural language request that would trigger this skill
```

```
Another way a user might ask for this
```

## Reference

- [Link to relevant documentation](path/to/docs)
- [External reference](https://example.com)

## Troubleshooting

**Common issue description:**

- First thing to check
- Second thing to try
- Solution or workaround

**Another common issue:**

- Diagnostic step
- Resolution

## Success Criteria

Successful completion means:

- ✅ First condition is met
- ✅ Second condition is met
- ✅ Artifacts created or modified as expected
- ✅ Skill can be invoked with /skill-name

```

## Detail Level Guidelines

| Skill Type | Detail Level | Examples |
|------------|--------------|----------|
| Complex workflows | Detailed | docs-new, docs-review |
| Simple command-like | Concise | update-doc-refs, create-ticket |
| Reference/standards | Detailed | repo-documentation |
| Helper (auto-invoked) | Moderate | read-relevant-docs |

## Versioning Guidance

- Include `version:` in frontmatter for every skill and use semver (`MAJOR.MINOR.PATCH`).
- Start new skills at `1.0.0`.
- Bump patch for fixes/clarifications, minor for backward-compatible behavior additions, major for breaking workflow/interface changes.

## Cross-Provider Portability Notes

**Portable baseline:** `name` + `description` are the only fields that work identically across all providers. Everything else is either spec-optional or provider-specific.

**Safe layering strategy:** Start with the portable fields, then layer provider-specific fields on top. Codex explicitly ignores unknown keys, so including Claude-specific fields (like `allowed-tools`, `user-invocable`) won't break Codex — they just won't have effect there.

**Description constraints for max portability:**
- Single line (Codex enforces this)
- ≤ 500 chars (Codex limit; spec allows 1024)
- Lead with "Use when..." or "Run this when..."
- Front-load trigger keywords in first 50 chars (may be truncated at scale)

**Skill budget awareness (Claude Code):**
- Claude Code has a ~16,000 character budget for skill descriptions at startup
- At 60+ skills, descriptions may be silently truncated
- Keep descriptions concise; the body handles detail

**Shared references:** If multiple skills need the same document, place it in `.agents/docs/` and reference via relative path (`../../docs/my-guide.md`). Don't duplicate into each skill's `references/` directory.

For the full compatibility matrix and resolved research questions, see `.agents/docs/skills-guide.md`.
```

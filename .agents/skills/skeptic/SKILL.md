---
name: skeptic
version: 0.2.0
description: Use when the user questions or suspects an agent claim is wrong. Adversarially gathers evidence to verify or refute the claim using the best sources available in the current environment.
argument-hint: '[claim to question — optional, defaults to most recent agent assertion]'
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash, WebSearch, WebFetch, AskUserQuestion, Agent, mcp__*
---

# /skeptic

Adversarially evaluates a claim made by the agent. Dispatches a Skeptical Evaluator sub-agent (or self-evaluates when unavailable) to find contradicting evidence first, then supporting evidence. Returns an inline verdict with a confidence score and cited sources.

## When to Use

Use when:

- The user questions or suspects an agent claim may be wrong
- A claim about code behavior, library versions, or documentation needs evidence backing
- You need to verify a factual assertion before proceeding

## When NOT to Use

Don't use when:

- The user is asking a new question (not doubting an existing claim)
- The claim is a matter of preference or opinion with no verifiable ground truth
- Verification would require information genuinely unavailable in any environment

## Arguments

Parse from `$ARGUMENTS`:

- **claim**: (optional) The specific claim to evaluate. If omitted, infer from the most recent agent assertion in the conversation.

## Progress Indicators (User-Facing)

Print this banner once at start:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/skeptic
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then print step indicators before beginning work:

- `[1/5] Identifying claim…`
- `[2/5] Scanning environment…`
- `[3/5] Checking sub-agent availability…`
- `[4/5] Gathering evidence…`
- `[5/5] Synthesizing verdict…`

For long-running operations (large codebase search, multiple web fetches), print a start line and a completion line:

```
  → Searching codebase for contradicting evidence…
  → Complete. (Contradicting: N · Supporting: N)
```

Keep it concise; don't print a line for every shell command.

## Workflow

### Step 1: Identify the claim

`[1/5] Identifying claim…`

If `$ARGUMENTS` is provided, use it as the claim. Otherwise, identify the most recent factual assertion made by the agent in the conversation. State the claim explicitly — evaluation must be anchored to something precise.

If the claim is ambiguous, ask the user to clarify before proceeding:

- **Claude Code**: use `AskUserQuestion`
- **Codex**: use structured user-input tooling when available in the current host/runtime
- **Fallback**: ask in plain text

The prompt should ask: _"Which claim should I evaluate? Please describe or quote it."_

---

### Step 2: Scan environment and classify claim

`[2/5] Scanning environment…`

Assess available evidence sources based on current environment:

| Environment           | Available sources                                           |
| --------------------- | ----------------------------------------------------------- |
| Claude Code (in repo) | Local files, Grep/Glob, Bash, git history, tests, lockfiles |
| Claude Code (general) | Filesystem, Bash, web search if enabled                     |
| Cursor                | Filesystem access, web search if enabled                    |
| Codex                 | Filesystem, web search if enabled                           |
| Claude.ai             | Web search if enabled, conversation context only            |

Classify the claim type to determine evidence priority:

- **code_behavior** → tests, type signatures, implementation, git history
- **library_specific** → lockfile, `package.json`, installed module source, docs MCP, npm registry
- **documentation** → docs MCP (if available), web search, official docs URL
- **factual** → web search, cited references
- **architectural** → web search, authoritative references, first-principles reasoning

---

### Step 3: Check sub-agent availability

```
[3/5] Checking sub-agent availability…
  → skeptical-evaluator: {available | not resolved} ({reason})
  → Selected: Execution Tier {1|2|3} — {Sub-agent | Self-evaluation (recommended) | Inline evaluation}
```

**Detection logic:**

- **Execution Tier 1 — Sub-agent dispatch (preferred):**
  - **Claude Code**: `Agent` tool is available → dispatch with `subagent_type: "skeptical-evaluator"`, resolved from `.agents/agents/skeptical-evaluator.md` (synced to `.claude/agents/`)
  - **Cursor**: invoke via `/skeptical-evaluator` or natural mention, resolved from `.cursor/agents/skeptical-evaluator.md` (synced from `.agents/agents/`)
  - **Codex multi-agent**: verify `[features] multi_agent = true` is enabled in active Codex config. Codex may also auto-select and spawn agents without explicit role pinning.

- **Execution Tier 2 — Self-evaluation (recommended fallback):**
  - Sub-agent dispatch not available or agent definition not resolved
  - Orchestrator performs adversarial evaluation directly with same logic and output format
  - Log: `→ skeptical-evaluator: not resolved — falling back to Execution Tier 2 self-evaluation`

- **Execution Tier 3 — Inline evaluation:**
  - User explicitly requests inline, or confirms they are already in a fresh session

---

### Step 4: Gather evidence adversarially

`[4/5] Gathering evidence…`

The evaluator (or orchestrator in Execution Tier 2/3) receives this context package:

```
CLAIM: [exact claim]
BASIS: [original reasoning/sources/assumptions]
CLAIM_TYPE: [code_behavior | library_specific | documentation | factual | architectural]
AVAILABLE_SOURCES: [what's accessible]
INSTRUCTION: Adversarial. Disprove first, then note supporting evidence.
```

Evidence priority by claim type:

- **code_behavior**: tests → type signatures → implementation → comments → git history
- **library_specific**: lockfile → `package.json` → installed module source → docs MCP → npm registry
- **documentation**: docs MCP → web search → official docs URL
- **factual**: web search → cited references
- **architectural**: web search → authoritative references → first-principles reasoning

Rules:

1. **Adversarial first** — look for contradicting evidence before supporting
2. **Cite specifically** — exact file paths + line numbers, URLs, package versions, or doc sections
3. **Source-appropriate** — only use sources verifiably accessible in the current environment; never hallucinate
4. **Note supporting evidence** only after exhausting the contradicting search

---

### Step 5: Synthesize verdict

`[5/5] Synthesizing verdict…`

Return one of four verdict frames inline. Always attempt a clear lean — only use "inconclusive" when evidence is genuinely ambiguous after thorough search.

**Holds up**

```
✅ **This holds up** *(confidence: X%)*
I adversarially reviewed this and still believe it to be accurate.
[Key supporting evidence with citations]
[Any caveats if relevant]
```

**You were right to be skeptical**

```
❌ **You were right to be skeptical** *(confidence: X%)*
The evidence contradicts this claim.
[Contradicting evidence with citations]
[Corrected or more accurate version of the claim]
```

**Nuanced**

```
⚠️ **This is nuanced** *(confidence: X%)*
[What's correct, what's incorrect, and under what conditions]
[Both contradicting and supporting evidence with citations]
```

**Genuinely inconclusive**

```
❓ **I can't determine this with confidence** *(confidence: X%)*
[What was found, what wasn't, and why a clear verdict isn't possible]
[Suggested next steps if applicable]
```

---

## Examples

### Basic usage

```
/skeptic
```

_(evaluates most recent agent assertion)_

```
/skeptic you said React 18 introduced concurrent rendering — verify that
```

```
/skeptic the claim that useCallback prevents child re-renders
```

### Conversational triggers

The skill may also be invoked when the user says things like:

```
Are you sure about that?
```

```
That doesn't sound right — can you check?
```

## Troubleshooting

**Claim is ambiguous:**

- Ask for clarification using `AskUserQuestion` (Claude Code), structured user-input tooling (Codex), or plain text (fallback)
- Do not proceed until the claim is precisely anchored

**No evidence sources available:**

- Return "Genuinely inconclusive" and explain what sources would be needed
- Never guess or hallucinate sources

**Sub-agent dispatch fails:**

- Log: `→ skeptical-evaluator: not resolved (dispatch failed) — falling back to Execution Tier 2`
- Proceed with self-evaluation; output format is identical

## Success Criteria

- Phase banner printed at start
- Step indicators printed before work begins
- Claim explicitly identified and stated before evaluation starts
- Environment scanned and claim type classified
- Sub-agent tier selected and logged with reason
- Contradicting evidence sought before supporting evidence
- All evidence cited with specific references (files/lines/URLs/versions)
- One of four verdict frames returned with confidence score
- Output is inline — no file or artifact produced
- "Inconclusive" returned honestly when evidence is genuinely ambiguous

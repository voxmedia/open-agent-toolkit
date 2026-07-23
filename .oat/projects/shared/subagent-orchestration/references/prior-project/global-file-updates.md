# Global Harness File Updates

**Date:** 2026-07-22
**Status: already applied** to the live files during this session. This
document records exactly what changed and why, for review. Every edit is a
deletion-plus-pointer; reverting means restoring the deleted block from this
document.

Shared rationale: each file previously carried its own dated model matrix.
Those matrices are now owned by the `subagent-orchestration` skill
(installed at `~/.agents/skills/subagent-orchestration/`, canonical home
upstream in OAT, synced for team distribution via `internal-skills`). Global
files keep the durable content — orchestration principles, the five task
classes, escalation boundaries, never-below-floor — and delegate volatile
model names to the skill via progressive disclosure.

---

## 1. `~/.codex/AGENTS.md`

**Kept (unchanged):** Stoa Memory Guidance; GitHub Access Preference; the
entire Subagent Orchestration section's durable content — orchestrator
principles, Model Class Routing intro ("route by task class…", never degrade
below floor), all five class definitions, Escalation Boundaries.

**Removed:** the "Codex examples as of 2026-07" block (12 lines):
Luna high for mechanical recon and Pi-class note; Terra high for intelligent
recon; Sol medium/high/xhigh/max ladder; frontier notes on avoiding Terra
xhigh/max and Luna xhigh semantics.

**Added in its place:**

> For current model, effort, and service-tier selection, read
> `~/.agents/skills/subagent-orchestration/SKILL.md` and its Codex/OpenAI
> provider reference before dispatch. That skill owns the dated provider
> ladders, qualification and refresh policy, and evidence requirements. Do not
> maintain named model examples in this file; the live catalog and the skill's
> provider references are the source of truth.

**Why:** the removed content is reproduced (and extended, with economy routes
and floor notes) in the skill's `provider-codex.md`, with verification
frontmatter the flat file lacked.

---

## 2. `~/.claude/CLAUDE.md`

**Kept (unchanged):** Stoa Memory Guidance; Superpowers Artifact Location;
GitHub Access Preference; durable Subagent Orchestration content (same as
above); **the entire "Codex Lane (`codex exec`)" section** — that is
harness-specific operational behavior (sandbox flags, stdin hang avoidance,
session resume, cross-model review policy), which belongs in the harness
file, not the shared skill.

**Removed:** the "Claude Code examples as of 2026-07" block (7 lines):
Haiku-class mechanical recon; Sonnet-class intelligent recon and default
implementation; Opus-class hard reasoning and consequential with extended
thinking.

**Added in its place:**

> For current model, effort, and extended-thinking selection, read
> `~/.agents/skills/subagent-orchestration/SKILL.md` and its Claude provider
> reference before dispatch. That skill owns the dated provider ladders
> (Haiku/Sonnet/Opus/Fable mappings and provider-native effort rules),
> qualification and refresh policy, and evidence requirements. Do not maintain
> named model examples in this file, and never normalize Claude effort labels
> against another provider's.

**Why:** same as above; additionally the old examples predated the research
(no Fable 5, no cyber-sensitive Opus exception, no effort-level guidance).
The skill's `provider-claude.md` carries all of that.

**Review note:** the research demoted Opus 4.8 from your prior
hard-reasoning/consequential default in favor of Fable 5 high, keeping Opus
as the cyber-sensitive operational default and an economy route. If your
experience disagrees, that is a legitimate review-required challenge to the
skill's Claude matrix — file it there, not here.

---

## 3. `~/.cursor/rules/subagent-orchestration.mdc` (machine-local, not version controlled)

**Kept (unchanged):** all durable orchestration content and the five class
definitions; Escalation Boundaries; the `subagent_type` guidance.

**Removed:** the "Cursor examples as of 2026-07" block (7 lines):
composer-2.5-fast-class mechanical recon; cursor-grok-4.5-high-fast-class
intelligent recon; Sol medium / Sonnet 5 thinking high default
implementation; Sol high / Opus 4.8 high hard reasoning; Sol xhigh / Opus
xhigh consequential; Sol max / Fable 5 exceptional.

**Added in its place:**

> For current Cursor model, effort, and service-tier selection, read
> `~/.agents/skills/subagent-orchestration/SKILL.md` and its Cursor provider
> reference before dispatch. That skill owns the dated Cursor aliases and
> ladders, `-fast` tier semantics (latency purchase, not capability),
> qualification and refresh policy, and evidence requirements. Do not maintain
> Cursor aliases in this rule; check the live model list before routing and
> keep `subagent_type` defaults unless routing adds value. Do not use `auto`
> for auditable or consequential dispatch.

**Why:** same pattern. Note the old rule's intelligent-recon example used a
`-fast` alias as if it marked a capability class — exactly the confusion the
service-tier rule now prevents. The corrected Grok 4.5 disposition (primary
alternative, not fast-tier specialist) lives in the skill's
`provider-cursor.md`.

---

## 4. `rules/agent-orchestration.mdc` (version controlled in internal-skills — on the `subagent-orchestration` branch diff)

**Changed:** replaced the four relative capability tiers
(economical/balanced/high/frontier) with the five named task classes so the
team rule and the skill speak the same language; added the pointer to the
`subagent-orchestration` skill (by name — it ships in the same plugin);
retained every existing safeguard (verification contract fields,
root-retains-authorization, mechanically-verifiable fallback for missing
capability metadata, frontier-child prohibition).

**Why:** this rule is the team-distributed counterpart of the three personal
files above; it previously used a different vocabulary than everything else.

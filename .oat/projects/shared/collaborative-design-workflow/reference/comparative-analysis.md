# Comparative Analysis: Obra Superpowers vs OAT Project-Lifecycle Skills

**Purpose:** Ground the collaborative-design-workflow project in a direct, evidence-based comparison between Obra Superpowers' `brainstorming` / `writing-plans` skills and OAT's `oat-project-discover` / `oat-project-spec` / `oat-project-design` / `oat-project-quick-start` / `oat-project-plan` skills. Every claim in this document is sourced from the skill files copied into this `reference/` directory from the locally-installed Superpowers `5.0.7` plugin and from `.agents/skills/*/SKILL.md` in this repo.

**Scope:** The project this analysis supports is about changing the **discovery → spec → design** portion of the OAT flow. Writing-plans / executing-plans comparison is included for context (since Superpowers' `brainstorming` terminates by invoking `writing-plans`) but OAT's plan/implement skills are **out of scope** for modification.

---

## 1. Source Material Index

Files in this `reference/` directory (all read and cited below):

| File                                            | Source                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `superpowers-brainstorming.md`                  | `.claude/plugins/cache/claude-plugins-official/superpowers/5.0.7/skills/brainstorming/SKILL.md` |
| `superpowers-brainstorming-visual-companion.md` | same dir, `visual-companion.md`                                                                 |
| `superpowers-brainstorming-spec-reviewer.md`    | same dir, `spec-document-reviewer-prompt.md`                                                    |
| `superpowers-writing-plans.md`                  | `.../skills/writing-plans/SKILL.md`                                                             |
| `superpowers-writing-plans-reviewer.md`         | same dir, `plan-document-reviewer-prompt.md`                                                    |
| `superpowers-using-superpowers.md`              | `.../skills/using-superpowers/SKILL.md`                                                         |
| `superpowers-verification-before-completion.md` | `.../skills/verification-before-completion/SKILL.md`                                            |
| `superpowers-executing-plans.md`                | `.../skills/executing-plans/SKILL.md`                                                           |
| `superpowers-subagent-driven-development.md`    | `.../skills/subagent-driven-development/SKILL.md`                                               |

OAT skills read from this repo's `.agents/skills/*/SKILL.md`:

- `oat-project-discover` (v1.3.0)
- `oat-project-spec` (v1.2.0)
- `oat-project-design` (v1.2.0)
- `oat-project-quick-start` (v1.3.3)

---

## 2. Philosophy — Two Different Cultures

### 2.1 Superpowers: "Every project goes through this process."

The brainstorming skill opens with a **`<HARD-GATE>`** tag:

> Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it. This applies to EVERY project regardless of perceived simplicity.
> (`superpowers-brainstorming.md:12-14`)

Immediately followed by an anti-pattern callout:

> **Anti-Pattern: "This Is Too Simple To Need A Design"** — Every project goes through this process. A todo list, a single-function utility, a config change — all of them. "Simple" projects are where unexamined assumptions cause the most wasted work. The design can be short (a few sentences for truly simple projects), but you MUST present it and get approval.
> (`superpowers-brainstorming.md:17-18`)

**Implication:** Superpowers treats design as non-negotiable. The _depth_ of design scales to complexity, but the _act_ of presenting and getting approval does not. The cost of skipping design is always greater than the cost of a short design.

### 2.2 OAT: Adaptive ceremony, explicit workflow tiers.

OAT offers three distinct workflow modes at the triage gate in `AGENTS.md`:

1. Full spec-driven (`oat-project-new`)
2. Quick (`oat-project-quick-start`)
3. Import / Plan-mode / No-workflow

Quick-start's `Step 2.5: Decision Point — Design Depth` contains an explicit auto-advance:

> **Auto-advance rule:** If the request was classified as **well-understood** in Step 2a and discovery surfaced no architecture decisions, component boundary questions, or unexpected complexity, skip this decision point entirely and continue directly to Step 3. This preserves the minimal-ceremony contract for straightforward requests.
> (`oat-project-quick-start/SKILL.md:172`)

**Implication:** OAT explicitly elevates ceremony-avoidance as a value for "simple" requests. This is the exact pattern Superpowers calls an anti-pattern.

### 2.3 The philosophical gap

| Question                     | Superpowers                          | OAT                                  |
| ---------------------------- | ------------------------------------ | ------------------------------------ |
| Is design always required?   | Yes (hard gate)                      | No (skippable)                       |
| What scales with complexity? | Design depth                         | Ceremony level                       |
| Default stance               | "Err toward design"                  | "Err toward velocity"                |
| Cost model                   | Skipping design ≥ doing short design | Ceremony ≥ velocity for simple tasks |

**Note for the collaborative-design-workflow project:** We are not adopting Superpowers' philosophy wholesale. The user has explicitly said the "just do it" escape hatch must remain. But the _requirements gate_ before plan generation on the straight-to-plan path (per discovery decision #4) does partially close the "unexamined assumption" hole Superpowers is worried about.

---

## 3. Flow Comparison

### 3.1 Superpowers: single-skill, linear flow (brainstorming → writing-plans)

```
┌───────────────────────────────────────────────────────────┐
│ BRAINSTORMING (single skill)                              │
│                                                           │
│  1. Explore project context                               │
│  2. Offer visual companion (if applicable)                │
│  3. Ask clarifying questions (one at a time)              │
│  4. Propose 2-3 approaches                                │
│  5. Present design SECTIONS — approve after each          │
│  6. Write design doc → commit                             │
│  7. Spec self-review (fresh eyes, inline fix)             │
│  8. USER reviews written spec                             │
│  9. Invoke writing-plans (hard terminal state)            │
└───────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│ WRITING-PLANS                                             │
│  - Scope check                                            │
│  - File structure decisions                               │
│  - Bite-sized tasks with TDD steps + commit per task      │
│  - No placeholders (explicit list of "plan failures")     │
│  - Self-review                                            │
│  - Execution handoff (subagent vs inline)                 │
└───────────────────────────────────────────────────────────┘
```

Source: `superpowers-brainstorming.md:21-64` (checklist + dot-graph), `superpowers-writing-plans.md:1-153`.

### 3.2 OAT spec-driven flow (four skills)

```
┌────────────────────┐   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│ oat-project-       │──▶│ oat-project-   │──▶│ oat-project-   │──▶│ oat-project-   │
│ discover           │   │ spec           │   │ design         │   │ plan           │
│                    │   │                │   │                │   │                │
│ • knowledge check  │   │ • validate     │   │ • validate     │   │ • pNN-tNN IDs  │
│ • gray-area multi- │   │   discovery    │   │   spec         │   │ • verification │
│   select           │   │ • FRs + NFRs   │   │ • 18-step draft│   │   per task     │
│ • one-at-a-time    │   │ • priorities   │   │   (arch, comp, │   │ • review + PR  │
│   questions        │   │ • Requirement  │   │   data, APIs,  │   │   skills       │
│ • 2-3 approaches   │   │   Index        │   │   sec, perf,   │   │                │
│   (Step 9)         │   │ • quality gate │   │   err, test,   │   │                │
│ • HiLL gate        │   │ • HiLL gate    │   │   deploy, mig, │   │                │
│                    │   │                │   │   phases, risk)│   │                │
│                    │   │                │   │ • single end-  │   │                │
│                    │   │                │   │   review       │   │                │
│                    │   │                │   │ • HiLL gate    │   │                │
└────────────────────┘   └────────────────┘   └────────────────┘   └────────────────┘
       │                       │                     │
     artifact:              artifact:             artifact:
     discovery.md           spec.md               design.md
```

Source: `oat-project-discover/SKILL.md`, `oat-project-spec/SKILL.md`, `oat-project-design/SKILL.md` (all full text read).

### 3.3 OAT quick-start flow (one skill)

```
┌─────────────────────────────────────────────────────────────────┐
│ oat-project-quick-start                                         │
│                                                                 │
│  2. Capture Discovery (Adaptive Depth)                          │
│     2a. Classify: well-understood | exploratory                 │
│     2b. If exploratory: solution-space exploration (2-3         │
│         approaches, incremental validation)                     │
│     2c. Capture decisions                                       │
│                                                                 │
│  2.5. Decision Point — Design Depth                             │
│        ┌─ AUTO-ADVANCE if well-understood (skip to 3) ─┐        │
│        │                                                │        │
│        │  Otherwise: choose                             │        │
│        │   (1) Straight to plan                         │        │
│        │   (2) Lightweight design first (→ 2.75)        │        │
│        │   (3) Promote to spec-driven                   │        │
│        └────────────────────────────────────────────────┘        │
│                                                                 │
│  2.75. Lightweight Design (Optional)                            │
│     - Required sections: Overview, Architecture,                │
│       Component Design, Testing Strategy                        │
│     - Skip: Security, Performance, Deployment, Migration        │
│     - "Present design incrementally for validation"             │
│        → architecture → components → data flow+testing          │
│        → "Does this look right, or should we adjust?"           │
│                                                                 │
│  3. Generate Plan                                               │
└─────────────────────────────────────────────────────────────────┘
```

Source: `oat-project-quick-start/SKILL.md:113-278`.

**Observation:** Quick-start 2.75 **already implements the Superpowers section-by-section pattern** — but _only_ in lightweight design mode, and _only_ when the user opts into that mode (which is itself skipped on the auto-advance path). So the pattern exists but is largely unreachable for well-understood requests.

---

## 4. Dimension-by-Dimension Comparison

| Dimension                                         | Superpowers                                                                                 | OAT                                                                                      | Gap / Insight                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Number of phases**                              | 1 skill for brainstorm+spec+design, 1 for plan                                              | 3 skills pre-plan (discover/spec/design); 1 for quick-start                              | OAT fragments a single user concern into 3 artifact-review cycles                                        |
| **Phase boundaries reset conversational context** | No — all one skill                                                                          | Yes — each phase reads the prior artifact cold                                           | OAT's phase separation is the source of the "mechanical drafting" feeling                                |
| **Divergent thinking venues**                     | Inside the brainstorming skill, at 2-3 approaches step AND at design presentation           | Only inside discovery Step 9 (project-level)                                             | OAT lacks divergent thinking at design-decision points                                                   |
| **Convergent validation style**                   | Section-by-section: "Ask after each section whether it looks right so far"                  | Single end-of-draft review: Step 18 (design), Step 10 (spec)                             | OAT batches validation; Superpowers interleaves it                                                       |
| **Scaling depth to complexity**                   | "A few sentences if straightforward, up to 200-300 words if nuanced"                        | Design skill runs 18+ numbered steps regardless; quick-start compresses via auto-advance | Superpowers scales _within_ the flow; OAT scales _by choosing which flow_                                |
| **Hard gates**                                    | `<HARD-GATE>` XML tag at top of brainstorming                                               | "BLOCKED Activities" lists + Self-Correction Protocol + HiLL gates                       | Superpowers uses prose-level strong guardrails; OAT uses structural gates                                |
| **Self-review before user review**                | Yes — spec self-review step: placeholder / consistency / scope / ambiguity (fix inline)     | Yes — spec quality gate (checklist) — but at spec, not design                            | OAT has self-review only at spec, not design                                                             |
| **Explicit user-review gate**                     | Yes — "Please review it and let me know if you want to make any changes"                    | Implied via HiLL but phrased as approval, not as "go look at the file"                   | Superpowers makes the user-reads-file step explicit                                                      |
| **Sub-project decomposition**                     | Explicit: scope check in brainstorming + writing-plans                                      | Not explicit in any pre-design skill                                                     | OAT lacks an "is this too big for one plan?" gate                                                        |
| **YAGNI**                                         | Called out explicitly: "YAGNI ruthlessly"                                                   | Implied via "out of scope" tracking, not explicit                                        | Minor gap                                                                                                |
| **One question at a time**                        | Explicit: "One question per message"                                                        | Explicit: Discovery Step 8                                                               | Aligned                                                                                                  |
| **Lead with recommendation**                      | Explicit: "Lead with your recommended option and explain why"                               | Explicit: Discovery Step 9a + Quick-start 2b                                             | Aligned                                                                                                  |
| **Multiple-choice preferred**                     | Explicit                                                                                    | Explicit                                                                                 | Aligned                                                                                                  |
| **Anti "too simple" stance**                      | Explicit hard stance                                                                        | Explicit opposite stance (auto-advance)                                                  | Philosophical disagreement                                                                               |
| **Visual companion**                              | Yes (browser-based mockups/diagrams)                                                        | None                                                                                     | Potential future enhancement; out of scope                                                               |
| **Plan format: task granularity**                 | Bite-sized 2-5min steps, TDD, commit per task, complete code in every step                  | pNN-tNN IDs, verification per task, atomic commit per task                               | Both are rigorous; Superpowers explicitly TDD, OAT more general                                          |
| **Plan format: no-placeholder rule**              | Explicit list of "plan failures"                                                            | Implicit via quality gate                                                                | Superpowers is more explicit about what _not_ to write                                                   |
| **Requirement-to-test traceability**              | Spec coverage check in writing-plans self-review                                            | `Requirement Index` in spec.md, requirement-to-test mapping in design.md Step 12a        | OAT is more structured/traceable                                                                         |
| **Independent review (pre-user)**                 | Subagent-dispatched reviewer prompts for spec + plan                                        | `oat-project-review-provide` skill                                                       | Both have independent review paths                                                                       |
| **Execution handoff (plan→impl)**                 | Subagent-driven vs inline executing-plans                                                   | `oat-project-implement` vs `oat-project-subagent-implement`                              | Structurally similar                                                                                     |
| **Skill priority system**                         | Process > implementation (using-superpowers)                                                | None explicit                                                                            | OAT relies on user choosing the right skill; Superpowers auto-routes                                     |
| **Rigid vs flexible skill types**                 | Explicitly labeled (TDD/debugging = rigid; patterns = flexible)                             | Not labeled                                                                              | Minor gap                                                                                                |
| **Terminal-state enforcement**                    | "The ONLY skill you invoke after brainstorming is writing-plans"                            | `oat_ready_for` frontmatter                                                              | Different mechanisms, same effect                                                                        |
| **Scale of "brainstorming" output**               | Design.md file in `docs/superpowers/specs/`                                                 | Spec.md + Design.md separate files                                                       | OAT preserves artifact distinction; Superpowers fuses                                                    |
| **Verification-before-completion**                | Dedicated skill with "Iron Law": "NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE" | Implicit in HiLL approval; explicit in plan.md verification steps                        | OAT's design phase doesn't call this out explicitly — possible gap for plan/implement, out of scope here |

---

## 5. Section-by-Section Deep Dive

### 5.1 "Explore project context" (Superpowers step 1)

Brainstorming: "Check out the current project state first (files, docs, recent commits)" (`superpowers-brainstorming.md:72`).

OAT discovery Step 2-3 requires the knowledge base to exist and checks its staleness (age >7 days or >20 files changed triggers a warning). OAT's version is more structured — it reads curated knowledge documents (`project-index.md`, `architecture.md`, `conventions.md`, `concerns.md`), not ad-hoc file exploration.

**OAT is ahead here.** Superpowers is looser.

### 5.2 "Ask clarifying questions" (Superpowers step 3; OAT discovery step 8)

Both say:

- One at a time (not batched)
- Multiple choice preferred
- Focus on purpose / constraints / success criteria

OAT adds:

- Gray-area multi-select upfront (Step 7) — lets the user steer _which_ topics to dig into
- Targeted per-area questions informed by knowledge base context
- Each answer updates discovery.md before next question

**OAT's gray-area framing is an improvement.** Superpowers doesn't have this — it just asks questions serially without surfacing the topic space.

### 5.3 "Propose 2-3 approaches" (Superpowers step 4; OAT discovery step 9)

Both say:

- 2-3 genuinely distinct approaches (not minor variations)
- Tradeoffs (not just pros/cons — _when_ each is better)
- Lead with recommendation

**These are essentially the same pattern.** The difference is _where_ this lives:

- Superpowers: inside brainstorming, between clarifying questions and design-section presentation
- OAT: inside discovery Step 9, before the phase handoff to spec

**Implication:** OAT's project-level divergent exploration is fine. What OAT is missing is the _second_ venue — inside design, at architectural decision points. Superpowers doesn't call this out as a separate step either, but it emerges from the "present design in sections, get approval after each section" pattern.

### 5.4 "Present design in sections" (Superpowers step 5) vs OAT design Steps 5-17

This is the **biggest divergence** and the core of the collaborative-design-workflow project.

**Superpowers (`superpowers-brainstorming.md:88-93`):**

> - Once you believe you understand what you're building, present the design
> - Scale each section to its complexity: a few sentences if straightforward, up to 200-300 words if nuanced
> - Ask after each section whether it looks right so far
> - Cover: architecture, components, data flow, error handling, testing
> - Be ready to go back and clarify if something doesn't make sense

**OAT design (`oat-project-design/SKILL.md:113-329`):**

- Step 5: Draft Architecture Overview
- Step 6: Design Components
- Step 7: Define Data Models
- Step 8: Design APIs
- Step 9: Security
- Step 10: Performance
- Step 11: Error Handling
- Step 12: Testing Strategy (+ requirement-to-test mapping)
- Step 13: Deployment
- Step 14: Migrations
- Step 15: Implementation Phases
- Step 16: Open Questions
- Step 17: Risks
- **Step 18: Review Design with User** ← single review point at the end

**The key difference:** OAT's Steps 5-17 all run before Step 18's single user review. Superpowers interleaves user review _inside_ the equivalent steps.

**Secondary difference — section coverage:**

| Section        | Superpowers | OAT design                   | OAT quick-start lightweight design |
| -------------- | ----------- | ---------------------------- | ---------------------------------- |
| Architecture   | ✓           | ✓                            | ✓                                  |
| Components     | ✓           | ✓                            | ✓                                  |
| Data flow      | ✓           | ✓ (implicit in architecture) | ✓                                  |
| Error handling | ✓           | ✓ (separate step)            | Optional                           |
| Testing        | ✓           | ✓ (with req-to-test mapping) | ✓ (simpler)                        |
| Data models    | —           | ✓                            | Optional                           |
| APIs           | —           | ✓                            | Optional                           |
| Security       | —           | ✓                            | Skipped                            |
| Performance    | —           | ✓                            | Skipped                            |
| Deployment     | —           | ✓                            | Skipped                            |
| Migrations     | —           | ✓                            | Skipped                            |
| Phases         | —           | ✓                            | —                                  |
| Risks          | —           | ✓ (with likelihood/impact)   | Captured in discovery              |

**Observation:** OAT's full design covers much more ground than Superpowers' brainstorming. Some of this breadth is genuinely valuable (security NFRs, requirement-to-test mapping, phases). Some of it (deployment, migrations) may be overkill for many projects and contributes to the "mechanical drafting" feeling.

**For the collaborative-design-workflow project:** The primary change is interaction pattern (section-by-section validation with options at decision points), not section coverage. Section coverage can remain as-is — the skill can _still_ draft all 12 sections, just present each in turn with validation, and scale section length to complexity.

### 5.5 "Write design doc" + self-review (Superpowers steps 6-7)

Superpowers: write design.md → self-review for (1) placeholder scan, (2) internal consistency, (3) scope check, (4) ambiguity check → fix inline, no re-review.

OAT spec Step 16 has an equivalent quality gate (checklist-style), but it's in spec, not design. OAT design has no equivalent self-review step.

**Gap:** If we fold spec-authoring into design, the spec-quality-gate pattern needs to travel with it — so the design skill inherits a self-review step covering the requirements section.

### 5.6 "User reviews written spec" (Superpowers step 8)

Superpowers (`superpowers-brainstorming.md:127-131`):

> "Spec written and committed to `<path>`. Please review it and let me know if you want to make any changes before we start writing out the implementation plan."
> Wait for the user's response. If they request changes, make them and re-run the spec review loop. Only proceed once the user approves.

This is a distinct step from section-by-section approval. It's "go look at the file." The value: section-by-section approval can miss integration issues that only become apparent when seen whole.

OAT has HiLL gates, which approximate this — but HiLL is framed as phase approval, not as "please go read the file and tell me what's wrong."

**Small gap:** OAT's HiLL approval prompt says "Design artifact is ready. Approve design and unlock `oat-project-plan`?" (`oat-project-design/SKILL.md:357`). This prompt could nudge the user toward reading the file, but doesn't explicitly do so.

### 5.7 Terminal-state enforcement

Superpowers: "The terminal state is invoking writing-plans. Do NOT invoke frontend-design, mcp-builder, or any other implementation skill."

OAT: `oat_ready_for: oat-project-plan` in design.md frontmatter; subsequent skills check this.

Both achieve the same thing. OAT's mechanism is slightly more durable (survives session boundaries); Superpowers' is more immediate (embedded in the skill instructions).

### 5.8 Writing-plans comparison (out-of-scope but informative)

Superpowers' writing-plans has several patterns OAT's plan skills already have (verification per task, atomic commit per task) and some distinct patterns:

- **Bite-sized 2-5min steps** (`superpowers-writing-plans.md:38-44`) — OAT tasks can be coarser
- **TDD red-green explicit in plan**: "Write the failing test" → "Run it to make sure it fails" → "Implement" → "Run tests" → "Commit" (`superpowers-writing-plans.md:40-44`)
- **Complete code in every step**: "if a step changes code, show the code" (`superpowers-writing-plans.md:117-118`)
- **No-placeholders list**: explicit patterns that are "plan failures" (`superpowers-writing-plans.md:107-114`)

These would be meaningful improvements to `oat-project-plan` / `oat-project-plan-writing` — but **out of scope for this project.**

### 5.9 Verification-before-completion (out of scope)

Superpowers has a dedicated skill with an "Iron Law": "NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE" (`superpowers-verification-before-completion.md:17-20`). It's anti-hallucination discipline for implementation claims.

OAT has verification commands in plan tasks but no equivalent skill-level enforcement. **Out of scope for this project** — would need a separate initiative, possibly touching `oat-project-implement` and `oat-project-review-provide`.

---

## 6. Patterns OAT Should Adopt (for this project)

The following are drawn directly from the source material above and map to the Key Decisions in `discovery.md`:

### 6.1 Section-by-section presentation with scaled depth

**Source:** `superpowers-brainstorming.md:88-93`

**Adapt for design skill:**

- Keep all OAT design section coverage (architecture → components → data → APIs → security → performance → error handling → testing → deployment → migrations → phases → risks)
- Present each section to the user _as it's drafted_, not in one batch at the end
- **Scale section depth to complexity**: a few sentences if straightforward, up to 200-300 words if nuanced
- After each section, ask: "Does this look right, or should we adjust before continuing?"

**Already partially done:** Quick-start 2.75 already does this for the lightweight design path (`oat-project-quick-start/SKILL.md:244-251`). The pattern exists — it just needs to propagate into the full design skill and into collaborative mode generally.

### 6.2 Divergent thinking at design-decision points (2-3 approaches _inside_ design)

**Source:** `superpowers-brainstorming.md:81-85` — applied inside design presentation, not only at top-level

**Adapt for design skill:**

- At each section where there is a _real_ design choice (architecture pattern, component boundary, data model, API style, etc.), present 2-3 approaches with tradeoffs and a recommendation
- When the choice is clear from conventions/knowledge-base, present _one_ approach and ask "does this match?" (don't invent fake alternatives to satisfy the pattern)
- Document the heuristic for "real decision point" in the skill prompt

**This is a genuine gap in current OAT.** Discovery's Step 9 does this at project level; design has no equivalent step at decision level.

### 6.3 Design self-review step

**Source:** `superpowers-brainstorming.md:116-124`

**Adapt for design skill:**

- After drafting the full design (whether collaborative or draft-and-review mode), run a fresh-eyes self-review:
  1. **Placeholder scan:** TBD, TODO, incomplete sections, vague requirements
  2. **Internal consistency:** Do sections contradict each other? Does the architecture match component descriptions?
  3. **Scope check:** Is this focused enough for a single implementation plan?
  4. **Ambiguity check:** Could any requirement be interpreted two different ways?
- Fix issues inline; no need to re-review

**OAT has this for spec** (Spec Step 16 quality gate). When we fold spec authoring into design, the quality-gate pattern travels with it.

### 6.4 Explicit user-review gate phrasing

**Source:** `superpowers-brainstorming.md:127-131`

**Adapt for design skill:**

- After the design file is committed, in addition to HiLL approval ask the user: "Design written and committed to `<path>`. Please review it and let me know if you want to make any changes before we move to planning."
- Wait for explicit response. If changes requested, make them and re-run the self-review step.

**Small but real improvement** over OAT's current HiLL prompt which is framed as approval rather than review-invitation.

### 6.5 Sub-project decomposition check — considered, deferred

**Source:** `superpowers-brainstorming.md:73-74`, `superpowers-writing-plans.md:22-23`

**Pattern in Superpowers:** If a request actually covers multiple independent subsystems, the skill flags this immediately — "this should be broken into sub-projects" — rather than produce a design covering everything.

**Initial OAT adaptation proposal:** Add a soft advisory prompt at the top of the reworked design skill, asking "does this look like one plan's worth of work, or multiple subsystems?"

**Ultimately dropped from this project's scope.** During discovery review, the user observed that multi-subsystem detection already happens organically during `oat-project-discover` — the solution-space exploration naturally surfaces when something is three loosely-related things. A redundant advisory at the top of design would mostly be noise.

**What OAT actually lacks** is not _detection_ but a _graceful hand-off mechanism_ when decomposition is the right call. That mechanism deserves its own follow-up project and has two distinct flavors:

- **Decompose-and-park:** Create N new projects, seed each with a brief discovery summary distilled from the parent conversation. User picks one now, others wait.
- **Brainstorm-broadly-execute-one:** Do rich cross-cutting discovery in the current conversation, generate full `discovery.md` per sub-project with cross-references, pick one to make active.

Natural home for the hand-off: `oat-project-discover` or a new `oat-project-split` skill. Tracked in `discovery.md` Deferred Ideas. See §9 summary table below for the final adoption decision.

### 6.6 YAGNI callout

**Source:** `superpowers-brainstorming.md:143`

**Adapt:** Add "YAGNI ruthlessly — remove unnecessary features from all designs" as a principle in the design skill. OAT discovery already tracks "Deferred Ideas" but doesn't name the principle.

**Trivial addition.**

### 6.7 Mode choice at design start (escape hatch)

**Not in Superpowers directly** — this is an OAT-specific enhancement that exists precisely because we're preserving the "draft and review holistically" workflow the user likes for some cases.

**Design decision:** At the top of the design skill, present a mode choice:

- Collaborative: section-by-section with options at decision points (default)
- Draft-and-review: generate full draft, user reviews (escape hatch)

Both modes end with the same self-review + user-review gates. Only the middle portion differs.

---

## 7. Patterns OAT Should NOT Adopt (and why)

### 7.1 "Every project goes through this process" (the anti-"simple" rule)

**Why not:** OAT's quick-start exists because users have validated that for well-understood requests, ceremony is actively counterproductive. The "auto-advance to plan for well-understood" behavior is a feature, not a bug.

**Compromise:** The new requirements-confirmation conversational gate (discovery decision #4) partially closes the "unexamined assumption" hole without imposing Superpowers' full discipline.

### 7.2 Single-skill fusion of discovery + spec + design

**Why not:** OAT's separate discovery artifact has real consumer value (it's used by reviewers, imported into tickets, referenced later). The discovery→design boundary is load-bearing. Only the spec-between-them boundary is being removed.

### 7.3 Eliminating spec.md as a distinct artifact

**Why not:** Downstream OAT skills use `Requirement Index` in spec.md for traceability (to tests, to plan tasks, to PR descriptions). Preserving the artifact without preserving the authoring phase is the right tradeoff.

### 7.4 Visual companion (browser-based mockups)

**Why not:** Out of scope for this project. Could be a separate initiative. Superpowers' implementation uses an MCP-backed browser companion; OAT would need to build or integrate similar infrastructure.

### 7.5 "The ONLY skill you invoke after brainstorming is writing-plans" (exclusive terminal state)

**Why not:** OAT's workflow is already more diverse (PR skills, review skills, import paths). Hard-coding a single terminal state would break the existing topology.

### 7.6 Subagent-dispatched spec/plan reviewers

**Why not, for now:** OAT already has `oat-project-review-provide` which serves this role. Switching to inline subagent dispatch (as Superpowers does) is a separate architectural decision.

### 7.7 Hard `<HARD-GATE>` XML tags

**Why not:** OAT uses structural gates (HiLL, frontmatter fields) that are more testable and durable than prose-level hard-gate tags. The effect is equivalent; the mechanism is more rigorous.

---

## 8. Implementation Implications for This Project

These feed directly into the design phase's decision points:

### 8.1 Mode choice mechanism — how do we present and store it?

- **Runtime prompt** via `AskUserQuestion` at top of design skill: (1) Collaborative, (2) Draft-and-review.
- **Optional skill argument** (e.g., `--mode collaborative`, `--mode draft`) for scripted/non-interactive use.
- **Default when non-interactive:** draft-and-review (safer — doesn't block on user input).

### 8.2 "Real decision point" heuristic — when to present 2-3 options inside design

Criteria for when to _present options_:

- Multiple viable architecture patterns (event-driven vs. request-response; library vs. service; etc.)
- Component boundary choices with tradeoffs (one big service vs. split; shared DB vs. per-service; etc.)
- Data-model decisions where existing conventions don't clearly dictate (single table vs. split; inline vs. reference; etc.)
- API-style decisions not dictated by existing patterns

Criteria for when to _present one path and confirm_:

- Convention-driven choices (use Go conventions, follow existing test pattern, etc.)
- Choices already made upstream in discovery
- Trivial choices (e.g., naming an internal function)

### 8.3 Spec authoring inside design — where does the requirement-index live?

- Authoring flow: in collaborative mode, after architecture is agreed, run "requirements confirmation" sub-step: formalize FRs/NFRs, acceptance criteria, Requirement Index.
- The Requirement Index feeds design's requirement-to-test mapping later (OAT design Step 12a).
- Keep spec.md as a file separate from design.md; authoring is merged, artifacts are not.

### 8.4 HiLL semantics — what happens when spec is folded?

Current `oat_hill_checkpoints` can include `"spec"` and/or `"design"`. After folding:

- If only `"spec"` is configured → treat as satisfied when design HiLL passes.
- If only `"design"` is configured → unchanged.
- If both → the design HiLL covers both (append both to `oat_hill_completed`).

No user-facing surprise; no state migration required.

### 8.5 Quick-start requirements gate — what goes on the screen?

- Before plan generation (on the straight-to-plan path), display a one-screen bullet list: "Here are the requirements I'm building against — confirm or redirect."
- No artifact; conversational only.
- If the user says "wait, also…", capture the additions, update discovery.md, and re-present.

### 8.6 Non-interactive / automation fallback

Two paths:

- `--mode draft` flag → no prompts, draft-and-review behavior.
- No flag + no TTY / non-interactive → default to draft-and-review with a note at the top: "non-interactive context detected, running in draft-and-review mode; review and approve manually."

### 8.7 Spec skill standalone positioning

- Update `oat-project-spec/SKILL.md` frontmatter description to: "Optional standalone skill for formalizing requirements when not yet ready to design. Not invoked automatically from the discovery→design pipeline."
- Update the skill's closing output to direct users to `oat-project-design` rather than implying spec is a required phase.
- Remove references to spec as a pipeline step from `AGENTS.md` workflow triage wording.
- Update `discovery.md` Next Steps template to remove the automatic "continue to `oat-project-spec`" line.

### 8.8 Version bumps + lockstep release

Per AGENTS.md:

- `oat-project-design/SKILL.md` — version bump
- `oat-project-quick-start/SKILL.md` — version bump
- `oat-project-spec/SKILL.md` — version bump (description change)
- `oat-project-discover/SKILL.md` — version bump if Next Steps template is referenced
- `.oat/templates/discovery.md` (if edited) — also counts
- Public package lockstep: bump all five public packages (`packages/cli`, `packages/control-plane`, `packages/docs-config`, `packages/docs-theme`, `packages/docs-transforms`)
- Run `pnpm release:validate` before finalizing the PR

---

## 9. Summary Table — "What Are We Actually Adopting?"

| Pattern                                                      | Source                                                                 | Adopting?               | Why                                                                                        |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| Section-by-section design presentation with validation       | Brainstorming §"Presenting the design"                                 | **Yes**                 | Core of the collaborative experience                                                       |
| Scale section depth to complexity                            | Brainstorming §"Presenting the design"                                 | **Yes**                 | Prevents collaborative mode feeling bloated for small changes                              |
| 2-3 approaches at design-decision points                     | Brainstorming §"Exploring approaches" (applied inside design)          | **Yes**                 | Fills the "divergent thinking only at project level" gap                                   |
| "Lead with recommendation"                                   | Brainstorming §"Exploring approaches"                                  | **Already aligned**     | OAT discovery Step 9a matches                                                              |
| Design self-review (placeholder/consistency/scope/ambiguity) | Brainstorming §"Spec Self-Review"                                      | **Yes**                 | Travels with spec-authoring-folded-into-design                                             |
| Explicit user-review gate phrasing                           | Brainstorming §"User Review Gate"                                      | **Yes**                 | Improves HiLL prompt language                                                              |
| Sub-project decomposition check                              | Brainstorming §"Understanding the idea" / writing-plans §"Scope Check" | **No (deferred)**       | Detection already happens in discovery; codified split-escape-hatch is a follow-up project |
| YAGNI callout                                                | Brainstorming §"Key Principles"                                        | **Yes (trivial)**       | One-line principle addition                                                                |
| Mode choice (collaborative / draft-and-review)               | OAT-specific                                                           | **Yes**                 | Preserves escape hatch                                                                     |
| Quick-start requirements conversational gate                 | OAT-specific                                                           | **Yes**                 | Partial fix for the "well-understood auto-skip" assumption hole                            |
| Spec skill as standalone utility                             | OAT-specific (decoupling)                                              | **Yes**                 | Preserves the "formalize without designing" use case                                       |
| "Every project requires design" hard gate                    | Brainstorming §HARD-GATE + anti-pattern                                | **No**                  | Breaks quick-start's reason to exist                                                       |
| Single-skill fusion (discovery+spec+design)                  | Brainstorming overall                                                  | **No**                  | Breaks artifact contract; discovery boundary is load-bearing                               |
| Visual companion                                             | Brainstorming §Visual Companion                                        | **No**                  | Separate initiative; out of scope                                                          |
| Bite-sized TDD plan format                                   | Writing-plans §Bite-Sized Task Granularity                             | **No (out of scope)**   | Would improve plan skills but not in this project                                          |
| No-placeholders explicit list                                | Writing-plans §No Placeholders                                         | **No (out of scope)**   | Plan-skill concern                                                                         |
| Verification-before-completion discipline                    | Verification-before-completion skill                                   | **No (out of scope)**   | Separate initiative                                                                        |
| Subagent-dispatched spec reviewer                            | Brainstorming spec-reviewer prompt                                     | **No**                  | OAT already has `oat-project-review-provide`                                               |
| Skill priority system (process > implementation)             | Using-superpowers                                                      | **No**                  | OAT workflow triage serves equivalent role                                                 |
| Rigid vs flexible skill labels                               | Using-superpowers                                                      | **No (trivial future)** | Nice-to-have, not essential                                                                |

---

## 10. Key Takeaways for the Design Phase

1. **The gap is interaction pattern, not section coverage.** OAT's design sections (architecture, components, data, APIs, security, performance, errors, testing, deployment, migrations, phases, risks) can remain. What changes is _how_ they're presented and validated with the user.

2. **Quick-start 2.75 already pioneers the pattern.** The section-by-section validation with "Does this look right?" already exists in OAT for lightweight design. The project is largely about (a) making it the default for the full design skill, (b) adding divergent options at decision points, (c) adding mode choice, and (d) adding the requirements-confirmation gate for the straight-to-plan path.

3. **Philosophy divergence is intentional and limited.** We keep OAT's "ceremony scales with complexity" stance for quick-start's auto-advance, but tighten it with a conversational requirements gate that catches unexamined assumptions without imposing Superpowers' full "every project gets a design" discipline.

4. **Spec skill decoupling preserves the artifact contract.** `spec.md` and `design.md` remain distinct files. Only the _authoring_ merges. This is the cheapest change that delivers the conversational-continuity win.

5. **Mode choice is an OAT-native addition.** Superpowers doesn't have it because they don't need it — they don't have the "draft first, review holistically" culture that OAT users have. Keeping the escape hatch is a user-validated decision.

6. **Several Superpowers patterns are excellent but out of scope.** Bite-sized TDD plan format, no-placeholder rules, and verification-before-completion discipline would each improve OAT plan/implement skills — but they belong to a separate initiative.

7. **Version bumps + release validate are non-negotiable.** Per AGENTS.md, any skill change triggers version bumps + lockstep public-package bumps + `pnpm release:validate` before the PR is done.

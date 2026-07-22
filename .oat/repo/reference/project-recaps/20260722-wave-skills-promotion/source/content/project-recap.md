# From Dogfood to Distribution

## The Ask

The wave skills had earned their keep inside a single repo but lived nowhere else, existing only as repo-local copies laced with local tooling assumptions. The request was to lift both into the shared toolkit as installable, first-class workflow skills, work through a parked queue of evidence-backed refinements, and scrub away the repo-specific phrasing. The hard constraint was that none of it could change a behavior the originating execution program already depended on.

## Choices That Shaped It

We moved the skills essentially intact and deferred the tempting mechanical rewrites — a dedicated wave CLI family and a compiled bootstrap command — to owned backlog rather than double the surface under test. Genericization went through neutral phrasing instead of a new config schema, keeping the original commands only as cited examples and never dropping a rule. Names stayed and version lineage continued, while later feedback pushed recap generation up to program scope and made the calling skill responsible for authoring its own prose.

## How It Fits Together

The program skill owns a durable execution-program artifact spanning a corpus of plans, while the execute skill runs each wave as a throwaway wrapper project, handing the real work to the project-implement lifecycle and worktree setup to its companion. Neither introduces new runtime code — both are prose skills that plug into the pack manifest, the bundle script, and provider sync like any other bundled skill. A gated final layer adds optional explainer close-callers and a program-recap recipe that stay inert anywhere the explainer kit is not present.

## What Got Built

The work landed as 41 tasks across six delivery phases and five follow-on revision phases, with each of the six queued changes committed in isolation for clean traceability. A 75-row behavioral-equivalence checklist — 69 prose rows plus six added for bundled assets — anchored the zero-regression claim, and the port flushed out two genuine installer bugs: mode preservation on directory copies, and a chmod pass to survive npm stripping execute bits at pack time. The five public packages advanced in lockstep from 0.1.73 to 0.2.12.

## Proof It Works

A bash-3.2 mini-wave fixture exercised the full choreography — happy path and a deliberately toggled gate failure — before any external handoff, and it turned up zero skill defects. The originating repo then ran its sixth wave on the packaged skills and returned a clean zero-regression pass across all eleven lanes, with an autonomous four-wave program serving as a fully independent second consumer. One unattended recap exposed a real gap, where raw artifact text sailed through every automated gate as finished prose, which drove the caller-owns-authoring rule and an enforced author seam upstream.

## Where It Landed

Both skills now ship from the toolkit at oat-wave-execute 1.7.1 and oat-wave-program 1.3.1, installable and syncable in any repo, hardened through three independent consumers and five rounds of revision. Every queue item, disposition, and upstream signal is accounted for, and the deferred mechanical work is filed with owners and triggers awaiting a future second consumer.

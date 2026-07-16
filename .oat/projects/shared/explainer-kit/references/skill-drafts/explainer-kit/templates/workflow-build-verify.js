// Reference Workflow script for the Voxops Explainer Set build + verify.
// Run AFTER Step 2 (a reconciled, cited FACT BASE) and Step 4 (approved Markdown drafts).
// Adapt the EDIT block, then run via the Workflow tool (inline `script`, or save + pass `scriptPath`).
// Pattern: pipeline() so each artifact flows build -> verify with no barrier; a final cohesion sweep.
//
// IMPORTANT: the heavy adversarial work belongs on the FACT BASE (Step 2), not here. By the time
// builders run, facts are already vetted — so per-artifact verify is lighter (does the artifact
// match the fact base + the draft, and is it structurally sound). Render QA — actually LOADING each
// page over a local HTTP server — is a separate step (SKILL.md Step 6), not a subagent lens.

export const meta = {
  name: 'oat-explainer-build-verify',
  description:
    'Build a visual explainer set from a reconciled fact base into the nested OAT layout, verify each artifact (fact-base match + structural), then a cohesion sweep',
  phases: [
    {
      title: 'Build',
      detail:
        'one builder per artifact, from the fact base + approved draft, into the nested OAT layout',
    },
    {
      title: 'Verify',
      detail:
        'per-artifact: matches the fact base + structurally self-contained',
    },
    { title: 'Sweep', detail: 'cross-set consistency + cohesiveness pass' },
  ],
};

// ---- EDIT per project --------------------------------------------------------
const SLUG = 'REPLACE-slug'; // kebab-case initiative slug
const FACT_BASE =
  'REPLACE: path to the reconciled, cited fact base (Step 2) — the GROUND TRUTH builders use';
const SOURCE =
  'REPLACE: the raw source paths, as BACKING for the fact base (not the primary ground truth)';
const OVERRIDES =
  'REPLACE: path to the overrides/answers file — confirmed user corrections that BEAT the source';
const DRAFTS = 'REPLACE: dir of approved Markdown content drafts (Step 4)';
const OUTROOT =
  'REPLACE: the vault project artifacts/ dir — the LOCAL MIRROR of the OAT layout';
const SHELL =
  'REPLACE: absolute path to a copy of templates/house-style.html (prose/status/explainer)';
const DECK_SHELL =
  'REPLACE: absolute path to a copy of templates/deck-shell.html (slide decks)';
const ARTIFACTS = [
  {
    key: 'hub',
    kind: 'hub',
    brief: 'landing page that orients + links everything',
  },
  {
    key: 'architecture',
    kind: 'web-diagram',
    brief: 'before/after architecture; how the pieces fit',
  },
  {
    key: 'systems-map',
    kind: 'web-diagram',
    brief: 'every system/lane, its dependencies, and status',
  },
  {
    key: 'status',
    kind: 'web-diagram',
    brief: 'the lanes side by side: what each is doing, status, next',
  },
  {
    key: 'explainer',
    kind: 'engineering-explainer',
    brief: 'the deep tour for engineers',
  },
  {
    key: 'deck',
    kind: 'slides',
    brief: "a short bird's-eye slide tour for the team",
  },
];
// -----------------------------------------------------------------------------

// nested OAT layout — builders write here so the local tree IS the publish layout (no rename/move, no drift)
const outPath = (a) =>
  ({
    hub: `${OUTROOT}/initiatives/${SLUG}/index.html`,
    'web-diagram': `${OUTROOT}/diagrams/${SLUG}/${a.key}/index.html`,
    'engineering-explainer': `${OUTROOT}/explainers/${SLUG}/index.html`,
    slides: `${OUTROOT}/decks/${SLUG}/index.html`,
  })[a.kind];
const shellFor = (a) => (a.kind === 'slides' ? DECK_SHELL : SHELL);

const NORTH_STAR = `Audience is the whole team incl. non-engineers. A reader must immediately get: (1) where we are, (2) what each lane/part is doing, (3) what's next, (4) the rollout/end-state. Clarity beats completeness; NO jargon (define unavoidable terms inline); lead with visuals; identical terminology + numbers everywhere. PLAIN LANGUAGE: a non-engineer reads once, no sentence needs re-reading; cut LLM tells (throat-clearing, hedges, em-dash pile-ups, nested parentheticals, forced triplets); enumerable content -> bullets/table; PR refs are links, not bare #589.`;

const STYLE = `Copy and build on the shell so the executive-light palette + components are identical across the set. Single self-contained .html, inline CSS/JS, NO external/CDN deps (HTML/CSS/SVG, not Mermaid), verify tag balance. Cross-artifact links must be FULL absolute https://open-agent-toolkit.voxops.net/... URLs (never root-relative /...). Repo-file links must be GitHub blob URLs. Full-bleed diagrams may use their own page layout but KEEP the :root palette + components.`;

const BUILD = {
  type: 'object',
  additionalProperties: false,
  required: ['path', 'builtSummary', 'couldNotVerify'],
  properties: {
    path: { type: 'string' },
    builtSummary: { type: 'string' },
    couldNotVerify: { type: 'array', items: { type: 'string' } },
  },
};
const FINDINGS = {
  type: 'object',
  additionalProperties: false,
  required: ['artifact', 'verdict', 'issues'],
  properties: {
    artifact: { type: 'string' },
    verdict: { type: 'string', enum: ['clean', 'needs-fixes'] },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['claim', 'problem', 'fix'],
        properties: {
          claim: { type: 'string' },
          problem: { type: 'string' },
          fix: { type: 'string' },
        },
      },
    },
  },
};
// facts already vetted on the FACT BASE — these per-artifact lenses are lighter (incl. a structural one):
const LENSES = [
  'matches-fact-base',
  'internal-consistency',
  'clarity-jargon',
  'non-engineer-misread',
  'structural-self-contained',
];

phase('Build');
const built = await pipeline(
  ARTIFACTS,
  // stage 1 — render the approved draft to HTML, into the nested layout
  (a) =>
    agent(
      `Build the "${a.key}" (${a.kind}) for the ${SLUG} explainer set — render its APPROVED DRAFT to HTML.\n` +
        `NORTH STAR: ${NORTH_STAR}\nSTYLE (shell ${shellFor(a)}): ${STYLE}\nBRIEF: ${a.brief}\n` +
        `GROUND TRUTH — the reconciled FACT BASE: ${FACT_BASE} (raw sources ${SOURCE} are BACKING only; do not re-derive facts).\n` +
        `APPROVED DRAFT: ${DRAFTS} (this artifact's draft is the content — render it, don't rewrite it).\n` +
        `Write one self-contained HTML file to ${outPath(a)}.`,
      { label: `build:${a.key}`, phase: 'Build', schema: BUILD },
    ),
  // stage 2 — light per-artifact verify (facts already vetted on the fact base)
  (_b, a) =>
    parallel(
      LENSES.map(
        (lens) => () =>
          agent(
            `Review ${outPath(a)} through the "${lens}" lens.\n` +
              `- matches-fact-base: every claim matches the FACT BASE (${FACT_BASE}); flag drift, do NOT re-derive from raw source.\n` +
              `- structural-self-contained: inline-only (no CDN/Mermaid), tag balance, absolute cross-links + GitHub blob links, ` +
              `and check INNER-container overflow (a diagram inside overflow-x:auto can hide its last step while the page looks fine).\n` +
              `IMPORTANT: confirmed user OVERRIDES (${OVERRIDES}) BEAT the source — do NOT flag an overridden fact as "contradicts source".\n` +
              `Mark verdict needs-fixes on any real issue; return findings.`,
            {
              label: `verify:${a.key}:${lens}`,
              phase: 'Verify',
              schema: FINDINGS,
              agentType: 'skeptic',
            },
          ),
      ),
    ).then((vs) => ({ artifact: a.key, findings: vs.filter(Boolean) })),
);

phase('Sweep');
const sweep = await agent(
  `Cross-set consistency + cohesiveness sweep over every artifact under ${OUTROOT} for ${SLUG}. ` +
    `Check: identical terminology + identical numbers everywhere; no deck-vs-diagram contradictions; ` +
    `every "needs confirmation" flag carried consistently; all cross-links absolute OAT-bucket URLs and repo links GitHub blob URLs. ` +
    `Return a deduped list of cross-artifact inconsistencies + an overall verdict.`,
  { label: 'consistency-sweep', phase: 'Sweep' },
);

// NEXT (not in this workflow): render QA — load each page over a local HTTP server (SKILL.md Step 6),
// review findings with the user, THEN publish (scripts/publish-to-oat.sh in mirror mode over OUTROOT).
return { built: built.filter(Boolean), sweep };

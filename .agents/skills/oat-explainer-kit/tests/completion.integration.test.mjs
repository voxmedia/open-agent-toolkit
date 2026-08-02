import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test, { afterEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { createBrowserProbeSession } from '../../explainer-kit/scripts/lib/browser-runtime.mjs';
import { runOatExplainer } from '../scripts/run.mjs';

const execFile = promisify(execFileCallback);
const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);
const SOURCE_SKILLS_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const SOURCE_ADAPTER_ROOT = join(SOURCE_SKILLS_ROOT, 'oat-explainer-kit');
const tempDirs = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
const completionSkillPath = resolve(
  repoRoot,
  '.agents/skills/oat-project-complete/SKILL.md',
);
const lifecycleContractPath = resolve(
  repoRoot,
  '.agents/skills/oat-explainer-kit/references/lifecycle-contract.md',
);
const closeoutReferencePath = resolve(
  repoRoot,
  '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
);
const adapterSkillPath = resolve(
  repoRoot,
  '.agents/skills/oat-explainer-kit/SKILL.md',
);
const authorCallbackPath = resolve(
  repoRoot,
  '.agents/skills/oat-explainer-kit/references/author-callback.md',
);
const visualReviewCallbackPath = resolve(
  repoRoot,
  '.agents/skills/oat-explainer-kit/references/visual-review-callback.md',
);
const completionSkill = await readFile(completionSkillPath, 'utf8');
const lifecycleContract = await readFile(lifecycleContractPath, 'utf8');
const closeoutReference = await readFile(closeoutReferencePath, 'utf8');
const adapterSkill = await readFile(adapterSkillPath, 'utf8');
const authorCallback = await readFile(authorCallbackPath, 'utf8');
const visualReviewCallback = await readFile(visualReviewCallbackPath, 'utf8');

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  assert.ok(startIndex >= 0, `missing section start: ${start}`);
  assert.ok(endIndex > startIndex, `missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

test('resolves recap intent before one batched completion prompt and persists either answer', () => {
  const resolveIndex = completionSkill.indexOf(
    'Resolve `projectRecap` intent before presenting the batched completion prompt.',
  );
  const questionsIndex = completionSkill.indexOf(
    '**Questions to ask (in a single prompt):**',
  );

  assert.ok(resolveIndex >= 0, 'completion must resolve projectRecap intent');
  assert.ok(
    questionsIndex > resolveIndex,
    'intent resolution must precede the one batched prompt',
  );
  assert.match(
    completionSkill,
    /When resolution returns `needsPrompt: true`, add exactly one project-recap question to that same batched prompt/,
  );
  assert.match(
    completionSkill,
    /Persist either `generate` or `skip` as the returned `interactive` record before continuing/,
  );
  assert.match(
    completionSkill,
    /A valid persisted `oat_project_recap` decision prevents another prompt/,
  );
});

test('reuses only a fresh recap or invokes the adapter once and selects the final recap', () => {
  const summaryIndex = completionSkill.indexOf('### Step 3.5: Summary Gate');
  const recapIndex = completionSkill.indexOf(
    '### Step 3.6: Select Final Project Recap',
  );
  const mutationIndex = completionSkill.indexOf(
    '### Step 5: Set Lifecycle Complete',
  );

  assert.ok(
    recapIndex > summaryIndex,
    'recap selection follows summary refresh',
  );
  assert.ok(
    mutationIndex > recapIndex,
    'recap selection precedes lifecycle mutation',
  );
  assert.match(
    completionSkill,
    /A fresh `project-recap` manifest for the current completed implementation is reused without invoking the adapter again/,
  );
  assert.match(
    completionSkill,
    /invoke `scripts\/run\.mjs#runOatExplainer` exactly once with recipe `project-recap`/,
  );
  assert.match(
    completionSkill,
    /Set `SELECTED_PROJECT_RECAP_RUN` only to the final selected `project-recap` run/,
  );
  assert.match(
    completionSkill,
    /An incomplete, stale, wrong-project, or `project-explainer` manifest is never selected as the final recap/,
  );
});

test('both lifecycle recap callers require author, critic, and unattended mode', () => {
  const callers = [
    {
      name: 'project completion',
      text: sectionBetween(
        completionSkill,
        '### Step 3.6: Select Final Project Recap',
        '### Step 3.7: Project Log Completion Gate',
      ),
    },
    {
      name: 'implementation tail',
      text: sectionBetween(
        closeoutReference,
        '**Implementation-Tail Project Recap:**',
        '**Autonomous final HiLL approval:**',
      ),
    },
  ];

  for (const { name, text } of callers) {
    assert.match(
      text,
      /brief-aware/,
      `${name} must require a brief-aware seam`,
    );
    assert.match(text, /`author`/, `${name} must name the author callback`);
    assert.match(
      text,
      /`authorModulePath`/,
      `${name} must name the author module entry point`,
    );
    assert.match(text, /`critic`/, `${name} must name the critic callback`);
    assert.match(
      text,
      /`criticModulePath`/,
      `${name} must name the critic module entry point`,
    );
    assert.match(
      text,
      /`mode: unattended`/,
      `${name} must declare unattended lifecycle mode`,
    );
  }
});

test('completion states the authored richness outcome the seam is judged on', () => {
  const recapSection = sectionBetween(
    completionSkill,
    '### Step 3.6: Select Final Project Recap',
    '### Step 3.7: Project Log Completion Gate',
  );

  assert.match(recapSection, /derive its output from the\s+request/);
  assert.match(recapSection, /`floor\.requiredNarrative`/);
  assert.match(recapSection, /ground each claim in the supplied `factBase`/);
  for (const warning of [
    'guideline-narrative-coverage-missing',
    'guideline-structured-depth-missing',
    'guideline-architecture-diagram-missing',
  ]) {
    assert.match(recapSection, new RegExp(warning), warning);
  }
});

test('author guidance carries briefs, evidence, artistic inputs, and expansion policy', () => {
  assert.match(adapterSkill, /`references\/author-callback\.md`/);
  assert.match(
    adapterSkill,
    /Construct exactly\s+one provider-neutral author seam in both modes/,
  );
  assert.match(authorCallback, /`explainer-kit\.author-request\/v2`/);
  assert.match(authorCallback, /`brief`/);
  assert.match(authorCallback, /`briefRef`/);
  assert.match(authorCallback, /`factBase`/);
  assert.match(authorCallback, /`theme`/);
  assert.match(authorCallback, /`shell`/);
  assert.match(authorCallback, /`proposedArtifacts`/);
  assert.match(authorCallback, /`plannedArtifact`/);
  assert.match(
    authorCallback,
    /Interactive invocations use the same author\s+contract/,
  );
  assert.match(
    lifecycleContract,
    /Every adapter run in both interactive and unattended modes must provide exactly\s+one provider-neutral author seam/,
  );
});

test('adapter guidance exposes first-class browser and visual-review providers', () => {
  for (const input of [
    'browserSession',
    'browserSessionModulePath',
    'visualCritic',
    'visualCriticModulePath',
  ]) {
    const pattern = new RegExp(`\`${input}\``);
    assert.match(adapterSkill, pattern);
    assert.match(lifecycleContract, pattern);
    assert.match(visualReviewCallback, pattern);
  }
  assert.match(visualReviewCallback, /canonical 320, 768, and 1440\s+widths/);
  assert.match(visualReviewCallback, /launched `Browser` instance/);
  assert.match(visualReviewCallback, /rejected by unattended\s+project-recap/);
  assert.match(
    visualReviewCallback,
    /request's exact `requestId` and `requestHash`/,
  );
  assert.match(visualReviewCallback, /produces `built-needs-review`/);
  assert.match(lifecycleContract, /distinct\s+callback identities/);
});

test('passes only the selected shared-project recap to archive and supports no-recap completion', () => {
  assert.match(completionSkill, /ARCHIVE_ARGS=\("\$PROJECT_PATH"\)/);
  assert.match(
    completionSkill,
    /ARCHIVE_ARGS\+=\("--project-recap-run" "\$SELECTED_PROJECT_RECAP_RUN"\)/,
  );
  assert.match(
    completionSkill,
    /SELECTED_PROJECT_RECAP_RUN must be project-relative/,
  );
  assert.match(
    completionSkill,
    /When recap intent resolves to `skip`, or generation produces no valid final recap, leave `SELECTED_PROJECT_RECAP_RUN` empty and complete without a recap/,
  );
  assert.match(
    completionSkill,
    /Never add `--project-recap-run` when `SELECTED_PROJECT_RECAP_RUN` is empty/,
  );
});

test('excludes project explainers from durable completion references', () => {
  assert.match(
    completionSkill,
    /`project-explainer` runs are active-project working artifacts, not durable post-completion reference products/,
  );
  assert.match(
    completionSkill,
    /Do not export, re-attest, or add archive-aware PR or summary reference links for a `project-explainer` run/,
  );
});

test('keeps local-project recaps untracked and built-not-durable without publish evidence', () => {
  assert.match(
    completionSkill,
    /For `IS_SHARED_PROJECT="false"`, never export a tracked project recap and never construct or pass `--project-recap-run`/,
  );
  assert.match(
    completionSkill,
    /A local-scope recap remains `built-not-durable` unless its manifest already contains independently verified publish evidence/,
  );
  assert.match(
    completionSkill,
    /Do not treat local filesystem presence as durability/,
  );
});

test('consumes the archive JSON export report as the final recap location', () => {
  assert.match(
    completionSkill,
    /oat project archive .*--json/,
    'archive must return its machine-readable export report',
  );
  assert.match(
    completionSkill,
    /projectRecapExport\.sourceRunRoot/,
    'completion must consume the reported source run root',
  );
  assert.match(
    completionSkill,
    /projectRecapExport\.exportRoot/,
    'completion must consume the reported tracked export root',
  );
  assert.match(
    completionSkill,
    /projectRecapExport\.manifest\.relativePath/,
    'completion must consume the reported exported manifest path',
  );
  assert.match(
    completionSkill,
    /Do not infer or reconstruct the recap export root/,
  );
});

test('uses lifecycle bookkeeping then exported recap attestation as two commits', () => {
  const archiveIndex = completionSkill.indexOf(
    '### Step 8: Archive Project (Conditional)',
  );
  const bookkeepingIndex = completionSkill.indexOf(
    '### Step 10: Commit + Push Bookkeeping (Required)',
  );
  const attestationIndex = completionSkill.indexOf(
    '### Step 10.5: Re-attest Final Project Recap',
  );
  const evidenceIndex = completionSkill.indexOf(
    '### Step 10.6: Commit Evidence + Push',
  );

  assert.ok(archiveIndex >= 0, 'archive step must exist');
  assert.ok(bookkeepingIndex > archiveIndex, 'bookkeeping follows archive');
  assert.ok(
    attestationIndex > bookkeepingIndex,
    'attestation follows bookkeeping commit',
  );
  assert.ok(
    evidenceIndex > attestationIndex,
    'evidence commit follows attestation',
  );
  assert.match(completionSkill, /commitMode: `completion-bookkeeping`/);
  assert.match(completionSkill, /relocatedFrom: `sourceRunRoot`/);
  assert.match(
    completionSkill,
    /The lifecycle bookkeeping commit is the artifact commit/,
  );
  assert.match(
    completionSkill,
    /Commit only the exported `manifest\.json` and `build-record\.json` as the evidence update/,
  );
  assert.match(completionSkill, /Push once after both commits exist/);
  assert.match(
    lifecycleContract,
    /Archive completion is exactly two commits: the lifecycle bookkeeping commit, then the exported recap evidence commit/,
  );
});

test('supersedes active-path evidence with exported immutable path evidence', () => {
  assert.match(
    completionSkill,
    /Submit only immutable paths under `projectRecapExport\.exportRoot` as commit evidence/,
  );
  assert.match(completionSkill, /supersedes the prior active-path evidence/);
  assert.match(
    completionSkill,
    /Never submit the gitignored archive path as commit evidence/,
  );
  assert.match(
    lifecycleContract,
    /The exported-path evidence supersedes the selected run's prior active-path evidence/,
  );
});

test('warns on failed exported attestation without failing completion', () => {
  assert.match(
    completionSkill,
    /A failed exported recap attestation does not fail project completion/,
  );
  assert.match(completionSkill, /report `built-not-durable`/);
  assert.match(
    completionSkill,
    /commit the warning-bearing `manifest\.json` and `build-record\.json`/,
  );
  assert.match(
    lifecycleContract,
    /Failure to verify the exported commit evidence is non-blocking/,
  );
});

// The seam is caller-owned by design: the executing agent authors, and nothing
// in the shipped core or adapter generates prose. What these tests verify is the
// outcome that premise depends on — that an author holding no prewritten recap,
// working only from the request the pipeline hands it, produces a rich recap,
// and that a thin one is caught.
test('the documented author seam turns lifecycle evidence into a rich recap', async () => {
  const built = await recapFromEvidence({
    slug: 'evidence-derived-recap',
    decisions: [
      'Checkpoint each partition so a restart resumes mid-file.',
      'Reject duplicate section IDs rather than silently merging them.',
    ],
    components: [
      ['ingest-worker', 'Streams partitions and emits checkpoints.'],
      ['index-store', 'Holds the committed offsets for every partition.'],
    ],
    checks: [
      ['pnpm test', '284 passing'],
      ['pnpm lint', 'clean'],
    ],
  });

  assert.equal(
    built.result.result.outcome,
    'built-not-durable',
    JSON.stringify(built.result.result.errors),
  );
  const reviewedSources = built.factBase.sources.filter(({ id }) =>
    ['plan', 'design', 'spec', 'implementation', 'summary'].includes(id),
  );
  assert.equal(reviewedSources.length, 5);
  for (const source of reviewedSources) {
    assert.equal(source.repository, 'acme/completion-provenance');
    assert.equal(source.revision, built.revision);
    assert.match(
      source.url,
      new RegExp(
        `^https://github\\.com/acme/completion-provenance/blob/${built.revision}/`,
      ),
    );
  }

  // Every brief-declared section is present, so coverage is earned rather than
  // waived by a warning.
  for (const id of REQUIRED_NARRATIVE) {
    assert.match(built.hub, new RegExp(`id="${id}"`), id);
  }
  assert.equal(
    built.result.result.warnings.includes(
      'guideline-narrative-coverage-missing',
    ),
    false,
    JSON.stringify(built.result.result.warnings),
  );
  assert.equal(
    built.result.result.warnings.includes('guideline-structured-depth-missing'),
    false,
  );
  assert.equal(
    built.result.result.warnings.includes(
      'guideline-architecture-diagram-missing',
    ),
    false,
  );

  // Richness means real block structure, not paragraphs of prose.
  assert.match(built.hub, /<table\b/);
  assert.match(built.hub, /<(?:ul|ol)\b/);
  assert.match(built.hub, /class="[^"]*callout/);
  assert.match(built.hub, /<svg\b[^>]*class="narrative-diagram"/);
  assert.match(built.hub, /class="[^"]*timeline/);

  // The content tracks this project's evidence rather than a stock recap.
  assert.match(built.hub, /Checkpoint each partition/);
  assert.match(built.hub, /ingest-worker/);
  assert.match(built.hub, /284 passing/);
});

test('the same author seam tracks different evidence instead of a stock recap', async () => {
  const [first, second] = await Promise.all([
    recapFromEvidence({
      slug: 'evidence-tracking-a',
      decisions: ['Cache the parsed brief for the run.'],
      components: [['brief-loader', 'Reads versioned author briefs.']],
      checks: [['pnpm build', 'succeeded']],
    }),
    recapFromEvidence({
      slug: 'evidence-tracking-b',
      decisions: ['Fail closed on an unpinned resource reference.'],
      components: [['html-safety', 'Validates authored DOM against a policy.']],
      checks: [['pnpm release:validate', '5 packages validated']],
    }),
  ]);

  assert.match(first.hub, /Cache the parsed brief/);
  assert.match(first.hub, /brief-loader/);
  assert.equal(/Fail closed/.test(first.hub), false);

  assert.match(second.hub, /Fail closed on an unpinned resource reference/);
  assert.match(second.hub, /html-safety/);
  assert.equal(/brief-loader/.test(second.hub), false);
});

test('a thin author fails the same richness check the rich one passes', async () => {
  const thin = await recapFromEvidence({
    slug: 'thin-recap',
    decisions: ['Checkpoint each partition.'],
    components: [['ingest-worker', 'Streams partitions.']],
    checks: [['pnpm test', 'passing']],
    author: thinLifecycleAuthor,
  });

  assert.equal(
    thin.result.result.outcome,
    'built-not-durable',
    JSON.stringify(thin.result.result.errors),
  );
  for (const warning of [
    'guideline-narrative-coverage-missing',
    'guideline-structured-depth-missing',
  ]) {
    assert.ok(
      thin.result.result.warnings.includes(warning),
      `${warning}: ${JSON.stringify(thin.result.result.warnings)}`,
    );
  }
  assert.equal(/<table\b/.test(thin.hub), false);
  assert.equal(/narrative-diagram/.test(thin.hub), false);
});

const REQUIRED_NARRATIVE = [
  'original-request',
  'key-agent-decisions',
  'as-built-architecture',
  'implementation-record',
  'validation-evidence',
  'outcome',
];

async function completionPlanSet({ recipe, factBase }) {
  const sourceIds = factBase.sources
    .map(({ id }) => id)
    .filter((id) => !id.startsWith('critic:'));
  return {
    schemaVersion: 'explainer-kit.set-plan/v1',
    planId: 'completion-evidence-recap',
    recipe: { id: recipe.id, version: recipe.version },
    sourceIds,
    ledger: {
      terminology: [{ term: 'project', meaning: 'The tracked project.' }],
      statuses: [{ subject: 'completion', value: 'passed' }],
      numbers: [{ subject: 'checks', value: 3, unit: 'checks' }],
    },
    portfolio: recipe.floor.map((artifact) => ({
      artifactId: artifact.id,
      artifactType: artifact.type,
      profileId: 'recipe-floor',
      required: true,
      sourceIds,
      draft: `Compose ${artifact.id} from completion evidence.`,
      visualIntent: `Use the planned ${artifact.type} medium.`,
    })),
  };
}

async function completionVisualCritic(request) {
  return {
    schemaVersion: 'explainer-kit.visual-review-result/v1',
    reviewId: 'completion-evidence-visual-review',
    requestId: request.requestId,
    requestHash: request.requestHash,
    reviewedAt: '2026-07-20T12:00:00.000Z',
    disposition: 'pass',
    artifactIds: request.renderedArtifacts.map(({ artifactId }) => artifactId),
    findings: [],
  };
}

async function thinLifecycleAuthor(request) {
  let content =
    '# Project recap\n\nThe project shipped and the tests passed.\n';
  if (request.authoring === 'html') {
    content =
      request.artifactType === 'diagram'
        ? request.shell
            .replaceAll('{{THEME_CSS}}', '')
            .replaceAll('{{TITLE}}', 'Thin architecture')
            .replaceAll('{{DESCRIPTION}}', 'One component.')
            .replaceAll('{{DIAGRAM}}', '<g data-node="worker"></g>')
            .replaceAll('{{LEGEND}}', '<span>worker</span>')
        : request.artifactType === 'deck'
          ? request.shell
              .replaceAll('{{THEME_CSS}}', '')
              .replaceAll('{{TITLE}}', 'Thin deck')
              .replaceAll('{{DESCRIPTION}}', 'One outcome.')
              .replaceAll(
                '{{SLIDES}}',
                '<section class="slide"><div class="slide__content"><h1>Project shipped</h1></div></section>',
              )
          : request.shell
              .replaceAll('{{THEME_CSS}}', '')
              .replaceAll('{{TITLE}}', 'Project recap')
              .replaceAll(
                '{{DESCRIPTION}}',
                'The project shipped and the tests passed.',
              )
              .replaceAll('{{EYEBROW}}', 'Project recap')
              .replaceAll(
                '{{NAVIGATION}}',
                '<a href="#original-request">Original request</a>',
              )
              .replaceAll(
                '{{CONTENT}}',
                '<section id="original-request"><h2>Original request</h2><p>The project shipped and the tests passed.</p></section>',
              )
              .replaceAll('{{FOOTER}}', 'Thin lifecycle recap.');
  }
  return {
    schemaVersion: 'explainer-kit.author-result/v2',
    artifactId: request.artifactId,
    content: {
      [request.authoring]: withCohesionMarker(content, request.authoring),
    },
    provenance: {
      authorId: 'thin-lifecycle-author',
      generatedAt: '2026-07-20T12:00:00.000Z',
      method: 'provider-neutral-callback',
    },
  };
}

async function recapFromEvidence({
  slug,
  decisions,
  components,
  checks,
  author = authorFromLifecycleEvidence,
}) {
  const root = await mkdtemp(join(tmpdir(), 'oat-explainer-autonomy-'));
  tempDirs.push(root);
  const repoRootFixture = join(root, 'repo');
  const projectRoot = join(
    repoRootFixture,
    '.oat',
    'projects',
    'shared',
    'demo',
  );
  await mkdir(projectRoot, { recursive: true });
  for (const [name, content] of Object.entries(
    lifecycleArtifacts({ decisions, components, checks }),
  )) {
    await writeFile(join(projectRoot, name), content);
  }
  await execFile('git', ['init', '--quiet'], { cwd: repoRootFixture });
  await execFile(
    'git',
    [
      'remote',
      'add',
      'origin',
      'https://github.com/acme/completion-provenance.git',
    ],
    { cwd: repoRootFixture },
  );
  await execFile('git', ['add', '.'], { cwd: repoRootFixture });
  await execFile('git', ['commit', '--quiet', '-m', 'fixture'], {
    cwd: repoRootFixture,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Completion Fixture',
      GIT_AUTHOR_EMAIL: 'completion@example.com',
      GIT_COMMITTER_NAME: 'Completion Fixture',
      GIT_COMMITTER_EMAIL: 'completion@example.com',
    },
  });
  const { stdout: revisionOutput } = await execFile(
    'git',
    ['rev-parse', 'HEAD'],
    { cwd: repoRootFixture },
  );
  const revision = revisionOutput.trim();

  const browserSession = await createBrowserProbeSession();
  assert.equal(
    browserSession.available,
    true,
    `installed Chromium unavailable: ${browserSession.reason}`,
  );
  try {
    const result = await runOatExplainer({
      adapterRoot: SOURCE_ADAPTER_ROOT,
      userSkillsRoot: SOURCE_SKILLS_ROOT,
      repoRoot: repoRootFixture,
      invocation: 'project',
      activeProject: '.oat/projects/shared/demo',
      recipe: 'project-recap',
      slug,
      author,
      planSet: completionPlanSet,
      critic: async () => ({
        criticId: 'autonomy-check-critic',
        executedAt: '2026-07-20T12:00:00.000Z',
        findings: [],
      }),
      browserSession,
      visualCritic: completionVisualCritic,
      getConfig: async (key) => ({
        status: 'ok',
        key,
        value:
          key === 'explainers.defaults.palette'
            ? 'neutral'
            : key === 'explainers.defaults.visualProfile'
              ? 'clean'
              : key.startsWith('workflow.')
                ? 'ask'
                : null,
        source: 'default',
      }),
      mode: 'unattended',
    });
    assert.ok(result.manifest, JSON.stringify(result.result));
    const hubPath = result.manifest.artifacts?.find(
      ({ id }) => id === 'project-recap',
    )?.renderedPath;
    assert.ok(hubPath, JSON.stringify(result.result));

    return {
      result,
      hub: await readFile(join(result.result.runRoot, hubPath), 'utf8'),
      factBase: JSON.parse(
        await readFile(
          join(result.result.runRoot, 'source', 'fact-base.json'),
          'utf8',
        ),
      ),
      revision,
    };
  } finally {
    await browserSession.close();
  }
}

function lifecycleArtifacts({ decisions, components, checks }) {
  return {
    'plan.md': `# Plan\n\n## Goal\n\nMake indexing continuous without a full rebuild.\n\n## Constraints\n\n- Restart must resume mid-file.\n- No new external service.\n`,
    'design.md': `# Design\n\n## Decisions\n\n${decisions.map((text) => `- ${text}`).join('\n')}\n\n## Components\n\n${components.map(([name, role]) => `- ${name}: ${role}`).join('\n')}\n`,
    'spec.md': `# Spec\n\n## Success criteria\n\n- A restarted run resumes from the last checkpoint.\n`,
    'implementation.md': `# Implementation\n\n## Checks\n\n${checks.map(([command, observed]) => `- ${command}: ${observed}`).join('\n')}\n`,
    'summary.md': `# Summary\n\nContinuous indexing shipped behind the existing worker.\n`,
  };
}

/**
 * Stands in for the executing agent. It holds no recap prose: every heading,
 * table row, list item, diagram node, and callout is derived from the brief and
 * fact base carried by the request it receives.
 */
async function authorFromLifecycleEvidence(request) {
  assert.equal(request.schemaVersion, 'explainer-kit.author-request/v2');
  assert.equal(request.authoring, 'html');
  assert.ok(request.brief.length > 0, 'the request must carry a brief');

  const intent = briefIntent(request.brief);
  const evidence = Object.fromEntries(
    request.factBase.claims.map(({ id, text }) => [id, text]),
  );
  const decisions = bulletsUnder(evidence.design, 'Decisions');
  const components = bulletsUnder(evidence.design, 'Components').map((line) => {
    const separator = line.indexOf(': ');
    return separator < 0
      ? { name: line, role: '' }
      : { name: line.slice(0, separator), role: line.slice(separator + 2) };
  });
  const checks = bulletsUnder(evidence.implementation, 'Checks').map((line) => {
    const separator = line.indexOf(': ');
    return {
      command: line.slice(0, separator),
      observed: line.slice(separator + 2),
    };
  });

  const sections = request.floor.requiredNarrative.map((id) => {
    const body = [
      `## ${title(id)}`,
      '',
      intent.get(id) ?? `Derived from the ${id} evidence.`,
      '',
    ];
    if (id === 'original-request') {
      body.push(
        ...bulletsUnder(evidence.plan, 'Constraints').map(
          (line) => `- ${line}`,
        ),
        '',
        '```timeline',
        ...bulletsUnder(evidence.plan, 'Goal').map(
          (line) => `Requested — ${line}`,
        ),
        `Delivered — ${firstSentence(evidence.summary)}`,
        '```',
        '',
      );
    }
    if (id === 'key-agent-decisions') {
      body.push(...decisions.map((text) => `- ${text}`), '');
    }
    if (id === 'as-built-architecture') {
      body.push(
        '```diagram',
        'graph TD',
        ...components.map(
          ({ name }, index) =>
            `  c${index}[${name}]${index + 1 < components.length ? ` --> c${index + 1}` : ''}`,
        ),
        '```',
        '',
      );
    }
    if (id === 'implementation-record') {
      body.push(
        '| Component | Change |',
        '| --- | --- |',
        ...components.map(({ name, role }) => `| ${name} | ${role} |`),
        '',
      );
    }
    if (id === 'validation-evidence') {
      body.push(
        '| Check | Observed |',
        '| --- | --- |',
        ...checks.map(
          ({ command, observed }) => `| ${command} | ${observed} |`,
        ),
        '',
      );
    }
    if (id === 'outcome') {
      body.push(
        `> [!NOTE] ${firstSentence(evidence.summary)}`,
        '',
        ...bulletsUnder(evidence.spec, 'Success criteria').map(
          (line) => `- ${line}`,
        ),
        '',
      );
    }
    return body.join('\n');
  });

  return {
    schemaVersion: 'explainer-kit.author-result/v2',
    artifactId: request.artifactId,
    content: {
      [request.authoring]: withCohesionMarker(
        request.authoring === 'markdown'
          ? `# ${title(request.artifactId)}\n\n${sections.join('\n')}`
          : lifecycleEvidenceHtml(request, {
              intent,
              evidence,
              decisions,
              components,
              checks,
            }),
        request.authoring,
      ),
    },
    provenance: {
      authorId: 'evidence-derived-lifecycle-author',
      generatedAt: '2026-07-20T12:00:00.000Z',
      method: 'provider-neutral-callback',
    },
  };
}

function withCohesionMarker(content, authoring) {
  const marker = 'project passed 3 checks';
  return authoring === 'html'
    ? content.includes('</body>')
      ? content.replace('</body>', `<p>${marker}</p></body>`)
      : `${content}<p>${marker}</p>`
    : `${content}\n\n${marker}\n`;
}

function lifecycleEvidenceHtml(
  request,
  { intent, evidence, decisions, components, checks },
) {
  if (request.artifactType === 'diagram') {
    const nodes = components
      .map(
        ({ name }, index) =>
          `<g${index === 0 ? ' id="as-built-architecture"' : ''} data-node="${name}" class="node"><rect x="60" y="${60 + index * 160}" width="260" height="80" rx="8"></rect><text x="84" y="${106 + index * 160}">${name}</text></g>`,
      )
      .join('');
    return request.shell
      .replaceAll('{{THEME_CSS}}', '')
      .replaceAll('{{TITLE}}', title(request.artifactId))
      .replaceAll('{{DESCRIPTION}}', firstSentence(evidence.summary))
      .replaceAll('{{DIAGRAM}}', nodes)
      .replaceAll(
        '{{LEGEND}}',
        components.map(({ name }) => `<span>${name}</span>`).join(''),
      );
  }
  if (request.artifactType === 'deck') {
    return request.shell
      .replaceAll('{{THEME_CSS}}', '')
      .replaceAll('{{TITLE}}', title(request.artifactId))
      .replaceAll('{{DESCRIPTION}}', firstSentence(evidence.summary))
      .replaceAll(
        '{{SLIDES}}',
        `<section class="slide"><div class="slide__content"><h1>${firstSentence(evidence.summary)}</h1><ul>${decisions.map((decision) => `<li>${decision}</li>`).join('')}</ul></div></section><section id="outcome" class="slide"><div class="slide__content"><h2>Validation evidence</h2><ul>${checks.map(({ command, observed }) => `<li>${command}: ${observed}</li>`).join('')}</ul></div></section>`,
      );
  }

  const content = REQUIRED_NARRATIVE.map((id) => {
    let structure = `<p>${intent.get(id) ?? `Derived from the ${id} evidence.`}</p>`;
    if (id === 'original-request') {
      structure += `<ul>${bulletsUnder(evidence.plan, 'Constraints')
        .map((line) => `<li>${line}</li>`)
        .join(
          '',
        )}</ul><ol class="timeline"><li>${firstSentence(evidence.plan)}</li><li>${firstSentence(evidence.summary)}</li></ol>`;
    } else if (id === 'key-agent-decisions') {
      structure += `<ul>${decisions
        .map((decision) => `<li>${decision}</li>`)
        .join('')}</ul>`;
    } else if (id === 'as-built-architecture') {
      structure += `<svg class="narrative-diagram" data-direction="TD">${components
        .map(({ name }) => `<text class="diagram-node-label">${name}</text>`)
        .join('')}</svg>`;
    } else if (id === 'implementation-record') {
      structure += `<table><thead><tr><th>Component</th><th>Change</th></tr></thead><tbody>${components
        .map(({ name, role }) => `<tr><td>${name}</td><td>${role}</td></tr>`)
        .join('')}</tbody></table>`;
    } else if (id === 'validation-evidence') {
      structure += `<table><thead><tr><th>Check</th><th>Observed</th></tr></thead><tbody>${checks
        .map(
          ({ command, observed }) =>
            `<tr><td>${command}</td><td>${observed}</td></tr>`,
        )
        .join('')}</tbody></table>`;
    } else if (id === 'outcome') {
      structure += `<aside class="callout callout--note">${firstSentence(evidence.summary)}</aside>`;
    }
    return `<section id="${id}"><h2>${title(id)}</h2>${structure}</section>`;
  }).join('');

  return request.shell
    .replaceAll('{{THEME_CSS}}', '')
    .replaceAll('{{TITLE}}', title(request.artifactId))
    .replaceAll('{{DESCRIPTION}}', firstSentence(evidence.summary))
    .replaceAll('{{EYEBROW}}', 'Project recap')
    .replaceAll(
      '{{NAVIGATION}}',
      REQUIRED_NARRATIVE.map((id) => `<a href="#${id}">${title(id)}</a>`).join(
        '',
      ),
    )
    .replaceAll('{{CONTENT}}', content)
    .replaceAll('{{FOOTER}}', 'Authored from lifecycle evidence.');
}

function briefIntent(brief) {
  return new Map(
    [
      ...brief.matchAll(/^- \*\*(.+?):\*\*\s*([\s\S]*?)(?=\n- \*\*|\n\n#|$)/gm),
    ].map(([, label, text]) => [
      label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-'),
      text.replaceAll(/\s+/g, ' ').trim(),
    ]),
  );
}

function bulletsUnder(markdown, heading) {
  const section = (markdown ?? '').split(`## ${heading}`)[1];
  if (!section) return [];
  return section
    .split(/\n(?=## )/)[0]
    .split('\n')
    .map((line) => line.match(/^- (.+)$/)?.[1])
    .filter(Boolean);
}

function firstSentence(markdown) {
  const prose = (markdown ?? '')
    .split('\n')
    .find((line) => line.trim().length > 0 && !line.startsWith('#'));
  return (prose ?? '').trim();
}

function title(id) {
  return id
    .split('-')
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

test('rewrites summary and PR recap links to the tracked export root', () => {
  assert.match(
    completionSkill,
    /Rewrite recap links in the tracked summary export and the PR description body from `projectRecapExport\.exportRoot`/,
  );
  assert.match(
    completionSkill,
    /Use the current head branch for the blob URL while the PR is open/,
  );
  assert.match(completionSkill, /Never link to `\.oat\/projects\/archived\/`/);
  assert.match(
    lifecycleContract,
    /Post-archive summary and PR recap links target `projectRecapExport\.exportRoot`/,
  );
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const skillPath = new URL('../SKILL.md', import.meta.url);
const profilesPath = new URL('../references/profiles.md', import.meta.url);
const packetContractPath = new URL(
  '../references/packet-contract.md',
  import.meta.url,
);
const workerContractPath = new URL(
  '../references/worker-contract.md',
  import.meta.url,
);
const workerPath = new URL('../../../agents/recon-worker.md', import.meta.url);
const publicDocsPath = new URL(
  '../../../../apps/oat-docs/docs/workflows/skills/recon.md',
  import.meta.url,
);

async function readContracts() {
  const [skill, profiles, packetContract, workerContract, worker, publicDocs] =
    await Promise.all([
      readFile(skillPath, 'utf8'),
      readFile(profilesPath, 'utf8'),
      readFile(packetContractPath, 'utf8'),
      readFile(workerContractPath, 'utf8'),
      readFile(workerPath, 'utf8'),
      readFile(publicDocsPath, 'utf8'),
    ]);
  return {
    skill,
    profiles,
    packetContract,
    workerContract,
    worker,
    publicDocs,
  };
}

function readModeMappings(content) {
  return [...content.matchAll(/^\| `([^`]+)`\s+\| `([^`]+)`\s+\|$/gm)].map(
    ([, manifestMode, workerMode]) => [manifestMode, workerMode],
  );
}

test('recon is a provider-neutral user-invocable skill', async () => {
  const { skill } = await readContracts();
  assert.match(skill, /^name:\s*recon$/m);
  assert.equal(readSkillVersion(skill), '1.1.2');
  assert.match(skill, /^user-invocable:\s*true$/m);
  assert.match(skill, /provider-neutral/i);
  assert.doesNotMatch(skill, /(?:must|required to) use GPT-|Claude-|Gemini-/i);
  assert.match(skill, /named\s+model examples[\s\S]{0,120}non-normative/i);
});

test('controller proposes and checks independently approved per-wave targets', async () => {
  const { skill } = await readContracts();
  assert.match(skill, /select each wave independently/i);
  assert.match(skill, /schemaVersion: 2/i);
  assert.match(
    skill,
    /taskClass[\s\S]{0,120}classFloor[\s\S]{0,160}selectionReason/i,
  );
  assert.match(skill, /scripts\/prepare-routing\.mjs --manifest/i);
  assert.match(skill, /explicit approval/i);
  assert.match(skill, /before\s+(?:any\s+)?(?:worker\s+)?launch/i);
  assert.doesNotMatch(skill, /run-wide maximum (?:model-class )?floor/i);
  assert.doesNotMatch(
    skill,
    /all waves use the same\s+approved model and effort/i,
  );
  assert.match(skill, /homogeneous wave/i);
  assert.match(skill, /generic role[\s\S]{0,220}before approval/i);
  assert.match(skill, /check-target[\s\S]{0,200}invocation intent/i);
  assert.match(
    skill,
    /approval is[\s\S]{0,40}session-local[\s\S]{0,240}resumed[\s\S]{0,160}fresh approval/i,
  );
});

test('public docs expose only the current manifest and session-local approval contract', async () => {
  const { publicDocs } = await readContracts();
  assert.match(publicDocs, /packet-manifest[^\n]*accepts version 2 only/i);
  assert.match(publicDocs, /approval is session-local/i);
  assert.match(publicDocs, /fresh preview and explicit approval/i);
  assert.match(
    publicDocs,
    /every valid packet renders[\s\S]{0,80}Intended Routing/i,
  );
  assert.doesNotMatch(publicDocs, /manifest version 1 remains supported/i);
  assert.doesNotMatch(publicDocs, /manifest-v1 packet/i);
});

test('controller keeps selection, launch, and caller judgment ownership separate', async () => {
  const { skill } = await readContracts();
  assert.match(
    skill,
    /recon[^\n]*controller[\s\S]{0,220}routing proposals[\s\S]{0,220}evidence flow/i,
  );
  assert.match(
    skill,
    /subagent-orchestration[^\n]*owns task-class and qualification guidance/i,
  );
  assert.match(
    skill,
    /oat-dispatch-subagents[^\n]*owns live target resolution and launch mechanics/i,
  );
  assert.match(
    skill,
    /calling agent owns scope[\s\S]{0,180}approval dialogue[\s\S]{0,180}sufficiency judgment[\s\S]{0,180}conclusions/i,
  );
});

test('controller binds dispatch dependencies once to one portable installed scope', async () => {
  const { skill } = await readContracts();
  assert.match(
    skill,
    /loaded skill[\s\S]{0,240}\$\{SKILL_DIR\}\/\.\.[\s\S]{0,240}\$\{HOME\}\/\.agents\/skills[\s\S]{0,240}<repo-root>\/\.agents\/skills/i,
  );
  assert.match(
    skill,
    /first candidate[\s\S]{0,260}both `oat-dispatch-subagents\/SKILL\.md` and\s+`subagent-orchestration\/SKILL\.md`[\s\S]{0,260}same scope/i,
  );
  assert.match(
    skill,
    /never (?:resolve|bind)[\s\S]{0,180}(?:independently|different|mixed) scopes/i,
  );
  assert.match(
    skill,
    /oat tools install utility --scope\s+<user\|project>[\s\S]{0,180}oat tools update --pack utility --scope\s+<user\|project>/i,
  );
});

test('profiles define adaptive bounded quick, standard, and thorough runs', async () => {
  const { packetContract, profiles } = await readContracts();
  for (const profile of ['quick', 'standard', 'thorough']) {
    assert.match(profiles, new RegExp(`^## ${profile}$`, 'm'));
  }
  assert.match(profiles, /adaptive lane/i);
  assert.match(profiles, /hard cap/i);
  assert.match(profiles, /quick[\s\S]{0,900}never `verified`/i);
  assert.match(
    profiles,
    /quick[\s\S]{0,1200}evidence packet for an intelligent consumer[\s\S]{0,180}no independent semantic pass by design/i,
  );
  assert.match(
    profiles,
    /standard[\s\S]{0,900}semantic verification[\s\S]{0,900}adversarial[\s\S]{0,900}coverage/i,
  );
  assert.match(profiles, /thorough[\s\S]{0,1100}redundant/i);
  assert.match(
    profiles,
    /exactly one mandatory[\s\S]{0,120}terminal reconciliation/i,
  );
  assert.match(packetContract, /4\/10\/20 adaptive-lane cap/i);
  assert.match(packetContract, /fixed at exactly one lane/i);
  assert.match(packetContract, /total lane maxima are 6\/13\/23/i);
  assert.match(profiles, /hard cap 4[\s\S]*hard cap 10[\s\S]*hard cap 20/i);
  for (const total of [6, 13, 23]) {
    assert.match(
      profiles,
      new RegExp(`total\\s+maximum\\s+is ${total} lanes`, 'i'),
    );
  }
});

test('thorough keeps redundant work required and contradiction resolution conditional', async () => {
  const { profiles } = await readContracts();
  const thorough = profiles.slice(
    profiles.indexOf('## thorough'),
    profiles.indexOf('## Planning Rules'),
  );
  const required = thorough.slice(
    thorough.indexOf('- Required:'),
    thorough.indexOf('- Adaptive evidence lanes:'),
  );
  const conditional = thorough.slice(thorough.indexOf('- Conditional work:'));

  assert.match(required, /redundant independent gathering/i);
  assert.match(required, /redundant verification/i);
  assert.doesNotMatch(required, /contradiction-resolution/i);
  assert.match(conditional, /optionally predeclare/i);
  assert.match(conditional, /condition-bound/i);
  assert.match(conditional, /`contradiction-resolution`/i);
  assert.match(conditional, /approved predicate triggers/i);
});

test('controller maps ten wave modes onto the closed worker vocabulary', async () => {
  const { skill, workerContract, worker } = await readContracts();
  const expected = [
    ['map', 'map'],
    ['gather', 'gather'],
    ['compile', 'compile'],
    ['semantic-verification', 'verify'],
    ['adversarial', 'adversary'],
    ['coverage', 'coverage'],
    ['reconciliation', 'reconcile'],
    ['redundant-gather', 'gather'],
    ['redundant-verification', 'verify'],
    ['contradiction-resolution', 'adversary'],
  ];

  assert.deepEqual(readModeMappings(workerContract), expected);
  assert.deepEqual(readModeMappings(worker), expected);
  assert.match(skill, /only `reconciliation`[\s\S]{0,40}`reconcile`/i);
  assert.match(
    workerContract,
    /contradiction-resolution[\s\S]{0,220}discriminating evidence/i,
  );
  assert.match(
    worker,
    /contradiction-resolution[\s\S]{0,1800}discriminating evidence/i,
  );
});

test('worker documents distinguish assignment concepts and use closed output fields', async () => {
  const { workerContract, worker } = await readContracts();
  const contractEnvelope = workerContract.slice(
    workerContract.indexOf('## Required Assignment Envelope'),
    workerContract.indexOf('## Modes'),
  );
  const contractOutput = workerContract.slice(
    workerContract.indexOf('## Output Contract'),
    workerContract.indexOf('## Invariants'),
  );
  const workerGate = worker.slice(
    worker.indexOf('## Assignment Gate'),
    worker.indexOf('## Universal Invariants'),
  );
  const workerOutput = worker.slice(
    worker.indexOf('## Output'),
    worker.indexOf('## Critical Rules'),
  );

  for (const section of [contractEnvelope, workerGate]) {
    assert.match(section, /approved manifest wave\s+mode/i);
    assert.match(section, /worker assignment\s+mode/i);
  }

  for (const section of [contractOutput, workerOutput]) {
    assert.match(section, /recon\.raw-dossier[\s\S]{0,240}`waveId`/i);
    assert.match(section, /recon\.raw-dossier[\s\S]{0,240}`mode`/i);
    assert.match(section, /recon\.review-result[\s\S]{0,240}`reviewerLane`/i);
    assert.match(section, /recon\.review-result[\s\S]{0,240}`reviewKind`/i);
    assert.match(section, /controller[\s\S]{0,200}approved manifest wave/i);
    assert.match(
      section,
      /do not add[\s\S]{0,80}(?:second mode|unknown) field/i,
    );
  }
});

test('controller preserves single-terminal and renewed-approval boundaries', async () => {
  const { skill } = await readContracts();
  assert.match(skill, /exactly one terminal `reconciliation` wave/i);
  assert.match(skill, /reconciliation-needs-judgment/i);
  assert.match(
    skill,
    /unresolved, out-of-envelope gap[\s\S]{0,180}renewed approval or a new run/i,
  );
  assert.match(
    skill,
    /never mutate the target[\s\S]{0,120}second reconciliation/i,
  );
});

test('controller preserves selective blindness and the context firewall', async () => {
  const { skill, workerContract } = await readContracts();
  const contract = `${skill}\n${workerContract}`;
  assert.match(contract, /selective(?:ly)? blind/i);
  assert.match(contract, /context firewall/i);
  assert.match(
    contract,
    /raw dossier[\s\S]{0,260}(?:must not|never|do not)[\s\S]{0,260}(?:parent|consumer|review brief)/i,
  );
  assert.match(skill, /return only[\s\S]{0,180}packet directory/i);
});

test('controller publishes honest partials and never retries or substitutes silently', async () => {
  const { skill } = await readContracts();
  assert.match(skill, /honest partial/i);
  assert.match(skill, /requested profile/i);
  assert.match(skill, /achieved profile/i);
  assert.match(
    skill,
    /after\s+(?:launch\s+)?acceptance[\s\S]{0,300}(?:no|never)[\s\S]{0,180}(?:replacement|substitution|alternate route)/i,
  );
  assert.match(skill, /no silent retry/i);
  assert.match(skill, /structural failure[\s\S]{0,240}no `packet\.md`/i);
});

test('packet contract pins exact lane outcome contradictions and same-run errors', async () => {
  const { skill, packetContract } = await readContracts();
  assert.match(
    skill,
    /`PASS_FAILED` gap[\s\S]{0,100}exact[\s\S]{0,80}`waveId`[\s\S]{0,40}`laneId`[\s\S]{0,120}conditional and non-conditional lanes alike/i,
  );
  assert.match(
    packetContract,
    /Evidence from another run fails with\s+`CONDITION_EVIDENCE_RUN_MISMATCH`/i,
  );
  assert.match(
    packetContract,
    /legacy mode-only gap is accepted only when that mode\s+unambiguously identifies one wave containing exactly one lane/i,
  );
  assert.match(
    packetContract,
    /complete\s+artifact contradicts material failed or omitted outcome evidence only when both\s+identify the same exact wave and lane[\s\S]*?`CONTRADICTORY_PASS_OUTCOME`/i,
  );
  assert.match(
    packetContract,
    /Complete evidence from one lane and exact material\s+failure evidence from another lane preserve the achieved pass while making the\s+run an honest partial/i,
  );
});

test('worker exposes only the declared non-interactive leaf modes', async () => {
  const { worker, workerContract } = await readContracts();
  for (const mode of [
    'map',
    'gather',
    'compile',
    'verify',
    'adversary',
    'coverage',
    'reconcile',
  ]) {
    assert.match(worker, new RegExp(`\\b${mode}\\b`, 'i'));
  }
  assert.match(worker, /never interact with the user/i);
  assert.match(worker, /never dispatch/i);
  assert.match(worker, /write only[\s\S]{0,120}assigned artifact/i);
  assert.match(worker, /read only[\s\S]{0,160}allowed inputs/i);
  assert.match(workerContract, /source-read authority/i);
  assert.match(workerContract, /excluded inputs/i);
  assert.match(workerContract, /uncertainty/i);
  assert.match(workerContract, /contradiction/i);
});

/**
 * Read the version a canonical skill declares: `metadata.version` first, the
 * deprecated top-level `version` as the fallback.
 *
 * A `node --test` file cannot import the TypeScript resolver in
 * `packages/cli/src/commands/shared/frontmatter.ts`, so it reads the two
 * positions directly. Only the opening frontmatter block is scanned, and only
 * direct children of `metadata:`, so a `metadata:` example in the skill's own
 * prose can never override the declaration. Comment lines carry no structure in
 * YAML, so they are skipped rather than allowed to end a block or set its
 * indentation, and a repeated declaration reads as none at all. The pinned
 * value below is what this assertion is about; the shape it is written in is
 * not.
 */
function readSkillVersion(content) {
  const lines = content.split('\n');
  const end = lines[0] === '---' ? lines.indexOf('---', 1) : -1;
  let inMetadata = false;
  let seenMetadata = false;
  let childIndent = null;
  let duplicated = false;
  let topLevel;
  let metadata;

  for (let index = 1; index < end; index += 1) {
    const line = lines[index];
    if (line.trim() === '' || line.trimStart().startsWith('#')) {
      continue;
    }
    if (/^\S/.test(line)) {
      inMetadata = /^metadata:[ \t]*(?:#.*)?$/.test(line);
      duplicated ||= inMetadata && seenMetadata;
      seenMetadata ||= inMetadata;
      childIndent = null;
      const declared = line.match(/^version:[ \t]+([^\s#]+)/)?.[1];
      if (declared !== undefined) {
        duplicated ||= topLevel !== undefined;
        topLevel = declared;
      }
      continue;
    }
    if (!inMetadata) {
      continue;
    }
    const indent = line.length - line.trimStart().length;
    childIndent ??= indent;
    if (indent !== childIndent) {
      continue;
    }
    const declared = line.trimStart().match(/^version:[ \t]+([^\s#]+)/)?.[1];
    if (declared !== undefined) {
      duplicated ||= metadata !== undefined;
      metadata = declared;
    }
  }

  return duplicated ? undefined : (metadata ?? topLevel);
}

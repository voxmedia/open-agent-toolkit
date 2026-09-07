import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const skillPath = new URL('../SKILL.md', import.meta.url);
const profilesPath = new URL('../references/profiles.md', import.meta.url);
const workerContractPath = new URL(
  '../references/worker-contract.md',
  import.meta.url,
);
const workerPath = new URL('../../../agents/recon-worker.md', import.meta.url);

async function readContracts() {
  const [skill, profiles, workerContract, worker] = await Promise.all([
    readFile(skillPath, 'utf8'),
    readFile(profilesPath, 'utf8'),
    readFile(workerContractPath, 'utf8'),
    readFile(workerPath, 'utf8'),
  ]);
  return { skill, profiles, workerContract, worker };
}

test('recon is a provider-neutral user-invocable skill', async () => {
  const { skill } = await readContracts();
  assert.match(skill, /^name:\s*recon$/m);
  assert.match(skill, /^version:\s*1\.1\.0$/m);
  assert.match(skill, /^user-invocable:\s*true$/m);
  assert.match(skill, /provider-neutral/i);
  assert.doesNotMatch(skill, /(?:must|required to) use GPT-|Claude-|Gemini-/i);
  assert.match(skill, /named\s+model examples[\s\S]{0,120}non-normative/i);
});

test('controller binds one approved exact target to every wave', async () => {
  const { skill } = await readContracts();
  assert.match(skill, /exact provider, model and effort/i);
  assert.match(skill, /explicit approval/i);
  assert.match(skill, /before\s+(?:any\s+)?(?:worker\s+)?launch/i);
  assert.match(skill, /run-wide maximum (?:model-class )?floor/i);
  assert.match(skill, /all waves use the same\s+approved model and effort/i);
  assert.match(skill, /homogeneous wave/i);
  assert.match(skill, /generic role[\s\S]{0,220}before approval/i);
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
  const { profiles } = await readContracts();
  for (const profile of ['quick', 'standard', 'thorough']) {
    assert.match(profiles, new RegExp(`^## ${profile}$`, 'm'));
  }
  assert.match(profiles, /adaptive lane/i);
  assert.match(profiles, /hard cap/i);
  assert.match(profiles, /quick[\s\S]{0,900}never `verified`/i);
  assert.match(
    profiles,
    /standard[\s\S]{0,900}semantic verification[\s\S]{0,900}adversarial[\s\S]{0,900}coverage/i,
  );
  assert.match(profiles, /thorough[\s\S]{0,1100}redundant/i);
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

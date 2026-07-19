#!/usr/bin/env node
// Personal-wrapper acceptance harness. Node >= 22, node builtins only.
//
// Runs the six-test matrix (vault, Google Docs, presets, personal
// destinations, manifest consumption, rollback) sequentially, continues past
// failures, and writes a sanitized private-wrapper-result.json. RC identifier
// fields come from the config `finalRc` block (placeholders until the
// post-p06 final RC freezes).

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = join(SKILL_ROOT, 'config.json');

const MANIFEST_REQUIRED_KEYS = [
  'schemaVersion',
  'runId',
  'slug',
  'recipe',
  'createdAt',
  'source',
  'theme',
  'artifacts',
  'immutableHashes',
  'outcome',
  'buildRecord',
  'warnings',
];

// Required keys of explainer-kit.publish-request/v1 (frozen RC f212d630).
const PUBLISH_REQUEST_REQUIRED_KEYS = [
  'schemaVersion',
  'provider',
  's3Uri',
  'publicBaseUrl',
  'awsRegion',
  'siteRoot',
  'manifestPath',
];

// --- sanitization -----------------------------------------------------------

/** Collect every string seam value from the config, keyed by dotted path. */
function collectSeams(value, path, seams) {
  if (typeof value === 'string' && value.length >= 4 && !path.startsWith('_notes')) {
    seams.push({ path, value });
  } else if (Array.isArray(value)) {
    value.forEach((entry, i) => collectSeams(entry, `${path}[${i}]`, seams));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === '_notes') continue;
      collectSeams(child, path ? `${path}.${key}` : key, seams);
    }
  }
  return seams;
}

function makeSanitizer(config) {
  const seams = collectSeams(config, '', []).sort((a, b) => b.value.length - a.value.length);
  const home = process.env.HOME || '';
  return function sanitize(text) {
    let out = String(text);
    for (const seam of seams) {
      out = out.split(seam.value).join(`<seam:${seam.path}>`);
    }
    if (home) out = out.split(home).join('<home>');
    // Belt-and-braces: redact any remaining absolute path segments.
    out = out.replace(/\/(?:Users|home)\/[^\s"']+/g, '<redacted-path>');
    return out;
  };
}

// --- helpers ----------------------------------------------------------------

function sha256File(path) {
  return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
}

function runArgv(argv, opts = {}) {
  const [cmd, ...args] = argv;
  const res = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return {
    status: res.status,
    stdout: (res.stdout || '').slice(0, 2000),
    stderr: (res.stderr || '').slice(0, 2000),
    error: res.error ? String(res.error) : undefined,
  };
}

function copyTree(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else copyFileSync(from, to);
  }
}

function requireKeys(obj, keys, label) {
  const missing = keys.filter((k) => !(k in obj));
  if (missing.length > 0) {
    throw new Error(`${label} missing required keys: ${missing.join(', ')}`);
  }
}

// --- shared run (feeds tests 1 and 5) ---------------------------------------

let sharedRun = null;

function ensureSharedRun(config) {
  if (sharedRun) return sharedRun;
  const outputRoot = mkdtempSync(join(tmpdir(), 'personal-explainer-acceptance-'));
  const slug = 'acceptance-run';
  const request = {
    schemaVersion: 'explainer-kit.run-request/v1',
    recipe: { id: config.acceptance.recipe.id, version: config.acceptance.recipe.version },
    slug,
    outputRoot,
    factBase: {
      mode: 'supplied',
      freshnessPolicy: 'live-wins',
      path: config.acceptance.factBasePath,
    },
    mode: 'unattended',
  };
  const requestPath = join(outputRoot, 'request.json');
  writeFileSync(requestPath, `${JSON.stringify(request, null, 2)}\n`);
  const invocation = runArgv([
    process.execPath,
    join(config.packagedSkillRoot, 'scripts', 'run.mjs'),
    '--request',
    requestPath,
  ]);
  if (invocation.status !== 0) {
    throw new Error(
      `packaged run failed (exit ${invocation.status}): ${invocation.stderr || invocation.error}`,
    );
  }
  let manifestPath = join(outputRoot, slug, 'manifest.json');
  if (!existsSync(manifestPath)) {
    const direct = join(outputRoot, 'manifest.json');
    if (existsSync(direct)) manifestPath = direct;
  }
  if (!existsSync(manifestPath)) throw new Error('run completed but no manifest.json found');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  sharedRun = { outputRoot, slug, manifestPath, manifest, runRoot: dirname(manifestPath) };
  return sharedRun;
}

// --- test matrix -------------------------------------------------------------

function testVaultDestination(config) {
  const run = ensureSharedRun(config);
  const vaultTarget = join(config.vaultRoot, 'explainers', run.slug);
  copyTree(run.runRoot, vaultTarget);
  const copiedManifest = join(vaultTarget, 'manifest.json');
  if (sha256File(copiedManifest) !== sha256File(run.manifestPath)) {
    throw new Error('vault copy manifest hash mismatch');
  }
  return `run ${run.manifest.runId} copied under vault explainers root; manifest hash verified`;
}

function testGoogleDocs(config) {
  const run = ensureSharedRun(config);
  const invocation = runArgv([...config.googleDocs.exportCommand, run.manifestPath]);
  if (invocation.status !== 0) {
    throw new Error(
      `gdocs export exited ${invocation.status}: ${invocation.stderr || invocation.error}`,
    );
  }
  return `gdocs export wiring exited 0 for run ${run.manifest.runId}`;
}

function testPresets(config) {
  const presets = config.publish.presets;
  if (!Array.isArray(presets) || presets.length === 0) {
    throw new Error('publish.presets seam is empty');
  }
  for (const preset of presets) {
    requireKeys(preset, ['id', 's3Uri', 'publicBaseUrl'], `preset ${preset.id || '?'}`);
    if (!/^s3:\/\//.test(preset.s3Uri)) throw new Error(`preset ${preset.id}: s3Uri not s3://`);
    if (!/^https:\/\//.test(preset.publicBaseUrl)) {
      throw new Error(`preset ${preset.id}: publicBaseUrl not https`);
    }
  }
  return `${presets.length} preset(s) structurally valid (id, corresponding s3Uri/publicBaseUrl roots)`;
}

function testPersonalDestinations(config) {
  if (config.acceptance.allowPublish !== true) {
    return {
      status: 'skipped',
      evidence:
        'publishing is human-gated; set acceptance.allowPublish=true to run the end-to-end leg',
    };
  }
  const run = ensureSharedRun(config);
  const preset = config.publish.presets[0];
  const publishRequest = {
    schemaVersion: 'explainer-kit.publish-request/v1',
    provider: 's3-static',
    s3Uri: preset.s3Uri,
    publicBaseUrl: preset.publicBaseUrl,
    awsRegion: config.publish.awsRegion,
    siteRoot: join(run.runRoot, 'site'),
    manifestPath: run.manifestPath,
  };
  requireKeys(publishRequest, PUBLISH_REQUEST_REQUIRED_KEYS, 'publish request');
  const requestPath = join(run.outputRoot, 'publish-request.json');
  const receiptPath = join(run.outputRoot, 'publish-receipt.json');
  writeFileSync(requestPath, `${JSON.stringify(publishRequest, null, 2)}\n`);
  const invocation = runArgv([
    process.execPath,
    join(config.packagedSkillRoot, 'scripts', 'publish.mjs'),
    '--request',
    requestPath,
    '--receipt',
    receiptPath,
    '--confirm-publish',
  ]);
  if (invocation.status !== 0) {
    throw new Error(
      `publish exited ${invocation.status}: ${invocation.stderr || invocation.error}`,
    );
  }
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  return `publish receipt written (${receipt.schemaVersion}); artifacts verified at public root`;
}

function testManifestConsumption(config) {
  const run = ensureSharedRun(config);
  requireKeys(run.manifest, MANIFEST_REQUIRED_KEYS, 'manifest');
  const entries = Object.entries(run.manifest.immutableHashes);
  if (entries.length === 0) throw new Error('manifest immutableHashes is empty');
  for (const [relPath, expected] of entries) {
    if (isAbsolute(relPath) || relPath.split('/').includes('..')) {
      throw new Error(`unsafe immutableHashes path: ${relPath}`);
    }
    const actual = sha256File(join(run.runRoot, relPath));
    if (actual !== expected) {
      throw new Error(`immutable hash mismatch for ${relPath}`);
    }
  }
  return `all ${MANIFEST_REQUIRED_KEYS.length} schema-required keys present; ${entries.length} immutable hash(es) verified; runId=${run.manifest.runId} outcome=${run.manifest.outcome}`;
}

function testRollback(config) {
  const backup = config.backupPath;
  if (!existsSync(backup) || !statSync(backup).isDirectory()) {
    throw new Error('backup path missing or not a directory');
  }
  const restoreTarget = mkdtempSync(join(tmpdir(), 'personal-explainer-rollback-'));
  try {
    copyTree(backup, restoreTarget);
    const restoredSkill = join(restoreTarget, 'SKILL.md');
    if (!existsSync(restoredSkill)) {
      throw new Error('restored backup tree lacks SKILL.md');
    }
    if (sha256File(restoredSkill) !== sha256File(join(backup, 'SKILL.md'))) {
      throw new Error('restored SKILL.md hash differs from backup');
    }
    return 'backup tree restores cleanly to a scratch target; restored SKILL.md byte-matches the backup';
  } finally {
    rmSync(restoreTarget, { recursive: true, force: true });
  }
}

// --- main --------------------------------------------------------------------

function main() {
  const startedAt = new Date().toISOString();
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  const sanitize = makeSanitizer(config);
  requireKeys(config, ['packagedSkillRoot', 'vaultRoot', 'googleDocs', 'publish', 'backupPath', 'acceptance', 'finalRc'], 'config');
  requireKeys(config.finalRc, ['rcId', 'commit', 'subtreeSha256'], 'config.finalRc');

  const matrix = [
    ['vault-destination', testVaultDestination],
    ['google-docs-destination', testGoogleDocs],
    ['presets', testPresets],
    ['personal-destinations-e2e', testPersonalDestinations],
    ['manifest-consumption', testManifestConsumption],
    ['rollback', testRollback],
  ];

  const results = [];
  for (const [name, fn] of matrix) {
    try {
      const outcome = fn(config);
      if (outcome && typeof outcome === 'object') {
        results.push({ name, status: outcome.status, evidence: sanitize(outcome.evidence) });
      } else {
        results.push({ name, status: 'pass', evidence: sanitize(outcome) });
      }
    } catch (err) {
      results.push({ name, status: 'fail', evidence: sanitize(err && err.message ? err.message : err) });
    }
  }

  const overall = results.some((r) => r.status === 'fail') ? 'fail' : 'pass';
  const record = {
    rcId: config.finalRc.rcId,
    commit: config.finalRc.commit,
    startedAt,
    finishedAt: new Date().toISOString(),
    results,
    overall,
  };
  const resultPath = join(SKILL_ROOT, 'private-wrapper-result.json');
  writeFileSync(resultPath, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify(record, null, 2));
  console.log(`overall: ${overall}`);
  process.exitCode = overall === 'pass' ? 0 : 1;
}

main();

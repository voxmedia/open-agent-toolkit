#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { writeSync } from 'node:fs';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const prompt = process.argv.at(-1) ?? '';
const delayMs = Number(process.env.FAKE_GATE_DELAY_MS ?? '0');
const exitCode = Number(process.env.FAKE_GATE_EXIT_CODE ?? '0');
const artifactMode = process.env.FAKE_GATE_ARTIFACT ?? 'none';
const transcriptIntervalMs = Number(
  process.env.FAKE_GATE_TRANSCRIPT_INTERVAL_MS ?? '0',
);

function promptValue(key) {
  return prompt.match(new RegExp(`^${key}: (.+)$`, 'm'))?.[1] ?? 'unknown';
}

function projectPath() {
  return (
    prompt.match(/^Resolved OAT project path: (.+)\. Run the review/m)?.[1] ??
    '.oat/projects/shared/demo'
  );
}

async function writeTranscript() {
  const encodedCwd = process.cwd().split(/[/.]/u).filter(Boolean).join('-');
  const transcriptRoot =
    process.env.FAKE_GATE_TRANSCRIPT_DIR ??
    join(
      process.env.HOME ?? '',
      '.cursor',
      'projects',
      encodedCwd,
      'agent-transcripts',
    );
  const transcript = join(transcriptRoot, 'fake-session', 'fake-session.jsonl');
  await mkdir(join(transcript, '..'), { recursive: true });
  await appendFile(transcript, `${Date.now()}\n`);
}

async function writeArtifact() {
  const runId =
    artifactMode === 'wrong-run'
      ? 'wrong-run-id'
      : promptValue('oat_gate_run_id');
  const project = projectPath();
  const reviewsDir = join(process.cwd(), project, 'reviews');
  await mkdir(reviewsDir, { recursive: true });
  await writeFile(
    join(reviewsDir, `fake-review-${Date.now()}.md`),
    [
      '---',
      'oat_generated: true',
      `oat_generated_at: ${new Date().toISOString()}`,
      `oat_review_type: ${prompt.match(/^Review type: (.+)\.$/m)?.[1] ?? 'code'}`,
      `oat_review_scope: ${prompt.match(/^Review scope: (.+)\.$/m)?.[1] ?? 'final'}`,
      'oat_review_invocation: gate',
      `oat_project: ${project}`,
      `oat_gate_run_id: ${runId}`,
      `oat_gate_target: ${promptValue('oat_gate_target')}`,
      `oat_gate_runtime: ${promptValue('oat_gate_runtime')}`,
      `oat_invocation_model: ${promptValue('oat_invocation_model')}`,
      `oat_invocation_reasoning_effort: ${promptValue('oat_invocation_reasoning_effort')}`,
      `oat_invocation_source: ${promptValue('oat_invocation_source')}`,
      'oat_review_critical_count: 0',
      'oat_review_important_count: 0',
      'oat_review_medium_count: 0',
      'oat_review_minor_count: 0',
      '---',
      '',
      '# Fake runtime review',
      '',
      '## Findings',
      '',
      '### Critical',
      '',
      'None',
      '',
      '### Important',
      '',
      'None',
      '',
      '### Medium',
      '',
      'None',
      '',
      '### Minor',
      '',
      'None',
      '',
    ].join('\n'),
  );
}

if (process.env.FAKE_GATE_REQUIRE_HEADLESS === '1') {
  if (
    process.env.OAT_GATE_HEADLESS !== '1' ||
    process.env.OAT_NON_INTERACTIVE !== '1' ||
    !process.env.OAT_GATE_RUN_ID
  ) {
    process.stdout.write(
      'OAT_GATE_REFUSAL: fake runtime did not receive headless context\n',
    );
    process.exit(9);
  }
}

if (
  process.env.FAKE_GATE_WRITE_ROUTE_RECEIPT_RUNTIME &&
  !process.env.FAKE_GATE_REQUIRE_ROUTE_RUNTIME
) {
  await writeFile(
    process.env.OAT_GATE_ROUTE_RECEIPT_PATH,
    JSON.stringify({
      route: 'inline',
      reason: 'deterministic fake route receipt',
      cliRoot: process.env.OAT_GATE_CLI_ROOT,
      runtime: process.env.FAKE_GATE_WRITE_ROUTE_RECEIPT_RUNTIME,
    }),
  );
}

if (process.env.FAKE_GATE_REQUIRE_ROUTE_RUNTIME) {
  const cliPath = process.env.OAT_GATE_CLI_PATH;
  const cliRoot = process.env.OAT_GATE_CLI_ROOT;
  const configuredRuntime = process.env.FAKE_GATE_REQUIRE_ROUTE_RUNTIME;
  const runtime = process.env.OAT_GATE_RUNTIME;
  const model = process.env.OAT_INVOCATION_MODEL;
  const promptRuntime = promptValue('oat_gate_runtime');
  const promptModel = promptValue('oat_invocation_model');
  if (
    !runtime ||
    !model ||
    runtime !== configuredRuntime ||
    runtime !== promptRuntime ||
    model !== promptModel
  ) {
    writeSync(
      1,
      `FAKE_GATE_ROUTE_INPUT_ERROR:${String(runtime)}:${String(model)}:${configuredRuntime}:${promptRuntime}:${promptModel}\n`,
    );
    process.stdout.write(
      'OAT_GATE_REFUSAL: canonical gate route inputs were absent or inconsistent\n',
    );
    process.exit(10);
  }
  const marker =
    runtime === 'claude'
      ? { CLAUDECODE: '1' }
      : runtime === 'cursor'
        ? { CURSOR_AGENT: '1' }
        : { CODEX_SESSION_ID: 'fake-session' };
  const result = cliPath
    ? spawnSync(
        cliPath,
        [
          'gate',
          'route',
          '--json',
          '--expect-runtime',
          runtime,
          '--expect-model',
          model,
          '--can-await',
          'false',
        ],
        {
          encoding: 'utf8',
          env: { ...process.env, ...marker },
        },
      )
    : undefined;
  let route;
  try {
    route = result?.status === 0 ? JSON.parse(result.stdout) : undefined;
  } catch {
    route = undefined;
  }
  if (
    route?.route !== 'inline' ||
    route?.cliRoot !== cliRoot ||
    typeof route?.reason !== 'string'
  ) {
    writeSync(
      1,
      `FAKE_GATE_ROUTE_ERROR:${result?.status ?? 'absent'}:${JSON.stringify(result?.stdout ?? '')}:${JSON.stringify(result?.stderr ?? '')}:${String(route?.cliRoot)}:${String(cliRoot)}\n`,
    );
    process.stdout.write(
      'OAT_GATE_REFUSAL: branch-local gate route was unavailable or invalid\n',
    );
    process.exit(10);
  }
  if (process.env.FAKE_GATE_REPORT_ROUTE === '1') {
    process.stdout.write(
      `FAKE_GATE_ROUTE:${route.route}:${runtime}:${model}:${route.cliRoot}\n`,
    );
  }
}

if (process.env.FAKE_GATE_STDOUT) {
  process.stdout.write(`${process.env.FAKE_GATE_STDOUT}\n`);
}
if (process.env.FAKE_GATE_REFUSAL) {
  process.stdout.write(`OAT_GATE_REFUSAL: ${process.env.FAKE_GATE_REFUSAL}\n`);
}

let transcriptTimer;
if (transcriptIntervalMs > 0) {
  await writeTranscript();
  transcriptTimer = setInterval(() => {
    void writeTranscript();
  }, transcriptIntervalMs);
}

await new Promise((resolve) => setTimeout(resolve, delayMs));
if (transcriptTimer) clearInterval(transcriptTimer);
if (artifactMode === 'correlated' || artifactMode === 'wrong-run') {
  await writeArtifact();
}
process.exit(exitCode);

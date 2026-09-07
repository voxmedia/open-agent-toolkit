import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { normalizeWorkflowPostImplementSequence } from '@config/oat-config';
import { describe, expect, it } from 'vitest';

function readImplementSkill(): string {
  const root = join(
    import.meta.dirname,
    '../../../../../../../.agents/skills/oat-project-implement',
  );
  const entry = readFileSync(join(root, 'SKILL.md'), 'utf8');
  const successIndex = entry.indexOf('## Success Criteria');
  const references = [
    'dispatch-and-dry-run.md',
    'plan-and-resume.md',
    'phase-execution.md',
    'completion-and-closeout.md',
  ].map((path) => readFileSync(join(root, 'references', path), 'utf8'));
  return [
    entry.slice(0, successIndex),
    ...references,
    entry.slice(successIndex),
  ].join('\n\n');
}

function readNextSkill(): string {
  return readFileSync(
    join(
      import.meta.dirname,
      '../../../../../../../.agents/skills/oat-project-next/SKILL.md',
    ),
    'utf8',
  );
}

function readLifecycleGateSkill(skillName: string): string {
  return readFileSync(
    join(
      import.meta.dirname,
      '../../../../../../../.agents/skills',
      skillName,
      'SKILL.md',
    ),
    'utf8',
  );
}

function readStateTemplate(): string {
  return readFileSync(
    join(import.meta.dirname, '../../../../../../../.oat/templates/state.md'),
    'utf8',
  );
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function lastGateExecutionSection(skill: string): string {
  const heading = [...skill.matchAll(/^###.*Gate Execution.*$/gm)].at(-1);
  if (heading?.index === undefined) {
    throw new Error('Missing Gate Execution heading');
  }
  return skill.slice(heading.index);
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, LC_ALL: 'C' },
  }).trim();
}

function effectiveDeltaFingerprint(
  cwd: string,
  baseRef: string,
  head: string,
  stateCarrier = '.oat/project/state.md',
): string {
  const mergeBases = git(cwd, 'merge-base', '--all', baseRef, head)
    .split('\n')
    .filter(Boolean);
  if (mergeBases.length !== 1) {
    throw new Error(`expected one merge base, got ${mergeBases.length}`);
  }

  const raw = execFileSync(
    'git',
    [
      'diff',
      '--raw',
      '-z',
      '--no-renames',
      '--no-abbrev',
      mergeBases[0],
      head,
      '--',
      '.',
      `:(exclude,literal)${stateCarrier}`,
    ],
    {
      cwd,
      encoding: 'buffer',
      env: { ...process.env, LC_ALL: 'C' },
    },
  );

  return createHash('sha256')
    .update(Buffer.from('effective-delta-v1\0'))
    .update(raw)
    .digest('hex');
}

function expectMarkersInOrder(
  content: string,
  markers: readonly string[],
): void {
  const indices = markers.map((marker) => {
    const index = content.indexOf(marker);
    if (index < 0) {
      throw new Error(`Missing required marker: ${marker}`);
    }
    return index;
  });

  for (let index = 1; index < indices.length; index += 1) {
    if (indices[index]! <= indices[index - 1]!) {
      throw new Error(
        `Out-of-order marker: ${markers[index]} must follow ${markers[index - 1]}`,
      );
    }
  }
}

function requiredSlice(content: string, start: string, end: string): string {
  const startIndex = content.indexOf(start);
  if (startIndex < 0) {
    throw new Error(`Missing required marker: ${start}`);
  }
  const endIndex = content.indexOf(end, startIndex + start.length);
  if (endIndex < 0) {
    throw new Error(`Missing required marker: ${end}`);
  }
  return content.slice(startIndex, endIndex);
}

describe('post-implementation sequence contracts', () => {
  it('accepts retro only after approval in structured sequences', () => {
    expect(
      normalizeWorkflowPostImplementSequence({
        preApproval: ['summary', 'pr'],
        postApproval: ['retro'],
      }),
    ).toEqual({
      preApproval: ['summary', 'pr'],
      postApproval: ['retro'],
    });
    expect(
      normalizeWorkflowPostImplementSequence({
        preApproval: ['retro'],
        postApproval: [],
      }),
    ).toBeUndefined();
  });

  it('keeps non-final checkpoints and root-owned phase execution intact', () => {
    const skill = readImplementSkill();
    const normalized = normalizeWhitespace(skill);

    expect(normalized).toContain(
      'Example: `["p01", "p04"]` → pause after p01 completes and after p04 completes; skip p02, p03.',
    );
    expect(skill).toContain('After each phase or parallel group');
    expect(skill).toContain('exactly one phase implementer');
    expect(skill).toContain('directly executes every task');
    expect(skill).toContain('root workflow owns implementation review');
    expect(skill).toContain('Optional third-tier readiness is not');
  });

  it('defers only the final checkpoint until final review and pre-approval work finish', () => {
    const skill = readImplementSkill();
    const normalized = normalizeWhitespace(skill);

    expect(skill).toContain('### Step 15: Final HiLL Closeout Sequence');
    expect(normalized).toContain(
      'Defer only a checkpoint on the final implementation phase; non-final checkpoint behavior remains unchanged.',
    );
    expect(normalized).toContain(
      'If this is the final implementation phase checkpoint, run `oat-project-review-provide code final`',
    );

    const closeout = skill.slice(
      skill.indexOf('### Step 15: Final HiLL Closeout Sequence'),
    );
    expectMarkersInOrder(closeout, [
      'Run final verification (Step 12).',
      'Final review must be `passed`',
      'Persist this immutable state',
    ]);
    expect(closeout).toContain('`oat_post_implement_sequence`');
    expect(closeout).toContain('`pre_approval`');
    expect(closeout).toContain('awaiting_approval');
  });

  it('enforces the configured implementation exit gate before every completion boundary', () => {
    const skill = readImplementSkill();
    const normalized = normalizeWhitespace(skill);
    const markers = [
      '### Step 12: Final Verification',
      '### Step 13: Trigger Final Review',
      '### Step 14: Gate Execution',
      '### Step 15: Final HiLL Closeout Sequence',
      '### Step 16: Mark Implementation Complete',
      '### Step 17: Prompt for Next Steps',
      '### Step 18: Output Summary',
    ] as const;
    expectMarkersInOrder(skill, markers);

    const outputIndex = skill.indexOf('### Step 18: Output Summary');
    expect(normalized).toContain(
      'The configured implementation exit gate is independent from the optional `oat_phase_review_gate`',
    );
    expect(normalized).toContain(
      'A missing, disabled, or unconfigured phase gate never disables or satisfies this configured exit gate.',
    );
    expect(skill.slice(outputIndex)).not.toContain('### Gate Execution');
  });

  it('fails ordering validation when any required marker is absent', () => {
    expect(() =>
      expectMarkersInOrder('first marker\nthird marker', [
        'first marker',
        'second marker',
        'third marker',
      ]),
    ).toThrowError('Missing required marker: second marker');
  });

  it('persists every implementation exit-gate outcome and resumes without duplicate work', () => {
    const skill = readImplementSkill();
    const normalized = normalizeWhitespace(skill);
    const gate = requiredSlice(
      skill,
      '### Step 14: Gate Execution',
      '### Step 15: Final HiLL Closeout Sequence',
    );
    const state = requiredSlice(
      gate,
      '```yaml\noat_implement_exit_gate:',
      '\n```',
    );

    for (const field of [
      'status',
      'resolution',
      'disposition',
      'config_fingerprint',
      'resolved_command',
      'resolved_description',
      'project_override',
      'on_failure',
      'max_attempts',
      'attempts_completed',
      'reviewed_head',
      'implementation_base_ref',
      'implementation_fingerprint',
      'freshness_head',
      'freshness_fingerprint',
      'launch_state',
      'launch_attempt_id',
      'launch_started_at',
      'launch_result_receipt',
      'gate_run_marker',
      'gate_run_id',
      'envelope_status',
      'artifact',
      'handoff',
      'receive_state',
      'receive_correlation',
      'receive_source_artifact',
      'receive_archived_artifact',
      'receive_event_identity',
      'receive_pre_head',
      'receive_commit',
      'receive_eligible',
      'receive_completed',
      'failure',
      'updated_at',
    ]) {
      expect(state, `persisted gate field ${field}`).toMatch(
        new RegExp(`^  ${field}:`, 'm'),
      );
    }
    expect(normalized).toContain(
      'A `not_configured` resolution persists `allowed/no_gate` with `disposition: no_gate`',
    );
    // A null or unrecognized resolver result must never be read as no-gate
    // success now that closeout always resolves with project context.
    expect(normalized).toContain(
      'a null, missing, malformed, or unrecognized resolver result is an operational failure that fails closed as unresolved and never as no gate',
    );
    expect(normalized).toContain(
      '`block` outcomes consume remediation attempts only after a valid configured gate result',
    );
    expect(normalized).toContain(
      'At `maxAttempts`, persist `blocked` and stop without another gate launch.',
    );
    expect(normalized).toContain(
      'Launch failures, missing CLIs, unavailable runtimes, and transport failures do not increment `attempts_completed`.',
    );
    expect(normalized).toContain(
      'An explicit prompt continuation persists `allowed/prompt_approved`; defer or no response persists `blocked` and stops.',
    );
    expect(normalized).toContain(
      'A warn continuation persists `allowed/warned` before closeout proceeds.',
    );
    expect(normalized).toContain(
      'Resume `pending` or `blocked` from the persisted transition without replacing its generation.',
    );
    expect(normalized).toContain(
      'A fresh `allowed` result resumes after the gate without executing the gate or receive a second time.',
    );
  });

  it('ships the complete implementation exit-gate state scaffold', () => {
    const template = readStateTemplate();

    for (const field of [
      'status',
      'resolution',
      'disposition',
      'config_fingerprint',
      'resolved_command',
      'resolved_description',
      'project_override',
      'on_failure',
      'max_attempts',
      'attempts_completed',
      'reviewed_head',
      'implementation_base_ref',
      'implementation_fingerprint',
      'freshness_head',
      'freshness_fingerprint',
      'launch_state',
      'launch_attempt_id',
      'launch_started_at',
      'launch_result_receipt',
      'gate_run_marker',
      'gate_run_id',
      'envelope_status',
      'artifact',
      'handoff',
      'receive_state',
      'receive_correlation',
      'receive_source_artifact',
      'receive_archived_artifact',
      'receive_event_identity',
      'receive_pre_head',
      'receive_commit',
      'receive_eligible',
      'receive_completed',
      'failure',
      'updated_at',
    ]) {
      expect(template, `scaffolded gate field ${field}`).toMatch(
        new RegExp(`^#   ${field}:`, 'm'),
      );
    }
  });

  it('never applies configured failure policy to operational gate failures', () => {
    const gate = normalizeWhitespace(
      requiredSlice(
        readImplementSkill(),
        '### Step 14: Gate Execution',
        '### Step 15: Final HiLL Closeout Sequence',
      ),
    );

    expect(gate).toContain(
      'Apply persisted `on_failure` and `max_attempts` only after Step 4 validates a receive-eligible `blocked` envelope and its eligible receive is durably completed.',
    );
    expect(gate).toContain('`warn` plus `review_failed` remains `blocked`');
    expect(gate).toContain(
      '`warn` plus an invalid, malformed, or contradictory envelope remains `blocked`',
    );
    expect(gate).toContain(
      'Launch failures, missing CLIs, unavailable runtimes, transport failures, validation or correlation failures, and receive failures cannot continue to sequencing, final HiLL, completion, or success output regardless of `on_failure`.',
    );
  });

  it('requires canonical JSON review commands before any configured launch', () => {
    const skill = readImplementSkill();
    const gate = skill.slice(
      skill.indexOf('### Step 14: Gate Execution'),
      skill.indexOf('### Step 15: Final HiLL Closeout Sequence'),
    );
    const normalized = normalizeWhitespace(gate);

    expect(gate).toContain(
      '`oat --json gate review --project "$PROJECT_PATH" ...`',
    );
    expect(normalized).toContain(
      'Reject `oat gate review ...` without the global `--json` flag before launch',
    );
    expect(normalized).toContain(
      'migrate the stored declaration before execution; never rewrite user or local configuration during closeout',
    );
    expect(gate).not.toContain(
      'A valid reusable shape is\n   `oat gate review --project "$PROJECT_PATH" ...`',
    );
  });

  it('keeps planning lifecycle gate commands canonical and configuration-only', () => {
    for (const skillName of [
      'oat-project-discover',
      'oat-project-design',
      'oat-project-plan',
      'oat-project-quick-start',
      'oat-project-lite',
      'oat-project-import-plan',
    ]) {
      const skill = readLifecycleGateSkill(skillName);
      const gate = lastGateExecutionSection(skill);
      const normalized = normalizeWhitespace(gate);

      expect(gate, `${skillName} canonical command`).toContain(
        'oat --json gate review --project "$PROJECT_PATH" ...',
      );
      expect(normalized, `${skillName} global placement`).toContain(
        'global `--json` before `gate review`',
      );
      expect(normalized, `${skillName} legacy rejection`).toContain(
        'Reject `oat gate review ...`',
      );
      expect(normalized, `${skillName} no argv injection`).toContain(
        'never inject or append execution-time argv',
      );
      expect(normalized, `${skillName} target neutrality`).toMatch(
        /must not (?:contain|include|add) `?--target(?:\s|<)/i,
      );
    }
  });

  it('persists a project-disabled exit gate without launching anything', () => {
    const gate = normalizeWhitespace(
      requiredSlice(
        readImplementSkill(),
        '### Step 14: Gate Execution',
        '### Step 15: Final HiLL Closeout Sequence',
      ),
    );

    // Distinct disposition, retained configured resolution, zero launch.
    expect(gate).toContain(
      'A `configured_disabled_by_project` resolution persists `allowed/configured` with `disposition: project_disabled`.',
    );
    expect(gate).toContain(
      'It sets `resolved_command` to the configured command as evidence that is never executed',
    );
    expect(gate).toContain(
      'keeps null gate-run, artifact, and receive provenance because nothing launched',
    );
    expect(gate).toContain('keeps `launch_state: not_started`');
    expect(gate).toContain(
      'records a `project_override` sub-record with `value: disabled` and `source: state.md:oat_skill_gate_overrides`',
    );
    expect(gate).toContain(
      'A project-disabled gate must never enter the passed, missing, or failed branches.',
    );
    // Completion stays allowed because the operator chose the override.
    expect(gate).toContain(
      'Completion stays allowed because the operator chose the project override; every other closeout freshness and snapshot rule is unchanged.',
    );
    // The resolve call is project-aware and branches on all three values.
    expect(gate).toContain(
      'oat gate resolve oat-project-implement --project "$PROJECT_PATH" --json',
    );
    expect(gate).toContain('handle all three `resolution` values explicitly');
    expect(gate).toContain(
      '`configured_disabled_by_project`: persist the allowed project-disabled transition described above without launching any process',
    );
    // The unchanged no-gate and configured paths must survive.
    expect(gate).toContain(
      '`not_configured`: persist the allowed no-gate transition; no gate is configured',
    );
    expect(gate).toContain(
      '`configured`: continue with the launch steps below.',
    );
  });

  it('covers the resolved override in the closeout configuration fingerprint', () => {
    const gate = normalizeWhitespace(
      requiredSlice(
        readImplementSkill(),
        '### Step 14: Gate Execution',
        '### Step 15: Final HiLL Closeout Sequence',
      ),
    );

    expect(gate).toContain(
      'Canonically serialize the resolved command, description, `onFailure`, `maxAttempts`, and the resolved project override state to derive `config_fingerprint`',
    );
    expect(gate).toContain(
      'Because `config_fingerprint` covers the resolved override state as well as the configured declaration, removing the override from `state.md` changes the fingerprint.',
    );
    expect(gate).toContain(
      'can never be reused as a fresh `allowed` result once the gate is re-enabled',
    );
    // The stored fingerprint alone proves nothing: the override lives in the
    // one file the implementation fingerprint excludes, so reuse must
    // re-resolve the gate rather than reproduce persisted inputs.
    expect(gate).toContain(
      'Re-resolve the gate with project context, recompute `config_fingerprint` from that current resolution',
    );
    expect(gate).toContain(
      'require both that the current resolution is still `configured_disabled_by_project` and that the recomputed fingerprint equals the persisted one',
    );
    expect(gate).toContain(
      'Reproducing the fingerprint from the persisted inputs alone never satisfies this check.',
    );
  });

  it('keeps the reuse preconditions on the fresh-allowed bullet', () => {
    // Regression guard: inserting the project_disabled revalidation bullet once
    // severed this sentence onto the new bullet, where "complete
    // configured-gate provenance when configured" contradicts that bullet's
    // required-null provenance and left the general rule with no preconditions.
    const freshness = requiredSlice(
      readImplementSkill(),
      '**Interruption, resume, and freshness:**',
      '\n\nBefore approval-aware sequencing',
    );
    // Membership must be structural. Splitting on the bullet marker alone
    // would still pass if the sentence became an unindented paragraph sitting
    // between the two bullets, which is not part of either bullet.
    const bullets: string[] = [];
    let current: string[] | null = null;
    const flush = (): void => {
      if (current) bullets.push(normalizeWhitespace(current.join(' ')));
      current = null;
    };
    for (const line of freshness.split('\n')) {
      if (line.startsWith('- ')) {
        flush();
        current = [line.slice(2)];
        continue;
      }
      if (current && /^ {2}\S/.test(line)) {
        current.push(line.trim());
        continue;
      }
      flush();
    }
    flush();

    const freshAllowed = bullets.find((bullet) =>
      bullet.startsWith('A fresh `allowed` result resumes'),
    );
    const projectDisabled = bullets.find((bullet) =>
      bullet.startsWith(
        'An `allowed/configured` result carrying `disposition: project_disabled`',
      ),
    );

    expect(freshAllowed, 'fresh allowed bullet is present').toBeDefined();
    expect(projectDisabled, 'project_disabled bullet is present').toBeDefined();

    const preconditions =
      'Reuse requires a valid disposition, complete configured-gate provenance when configured, an unchanged immutable implementation fingerprint, a valid rolling freshness checkpoint, and any eligible receive marked complete.';

    expect(freshAllowed).toContain(preconditions);
    expect(projectDisabled).not.toContain('Reuse requires a valid disposition');
    expect(projectDisabled).not.toContain(
      'complete configured-gate provenance when configured',
    );
    expect(projectDisabled?.endsWith('never satisfies this check.')).toBe(true);
  });

  it('routes a project-disabled closeout forward and a re-enabled one as stale', () => {
    const next = normalizeWhitespace(readNextSkill());

    expect(next).toContain(
      '`allowed/configured` with `disposition: project_disabled` is the third valid combination.',
    );
    // Null launch provenance is required, not merely tolerated.
    expect(next).toContain(
      'Null gate-run and artifact provenance is required here, not merely tolerated',
    );
    expect(next).toContain(
      'any non-null launch provenance is contradictory and fails closed',
    );
    expect(next).toContain(
      'requires a matching `config_fingerprint`, `reviewed_head`, and `implementation_fingerprint`',
    );
    expect(next).toContain(
      'the same rolling-freshness rules as every other allowed result',
    );
    // enabled -> disabled -> enabled must route as stale.
    expect(next).toContain(
      'A re-enabled gate changes the resolution and the fingerprint, so an override-era transition routes as stale and a fresh configured run is required',
    );
    expect(next).toContain(
      'Every other combination keeps its current fail-closed routing.',
    );
    // The exact accepted shape, so contradictory launch or receive provenance
    // cannot slip through a broad "null provenance" reading.
    expect(next).toContain('`launch_state: not_started`');
    expect(next).toContain('`receive_state: not_started`');
    expect(next).toContain('`receive_completed: false`');
    expect(next).toContain('`attempts_completed: 0`');
    expect(next).toContain('`failure: null`');
    expect(next).toContain(
      'Any populated launch, receive, attempt, or failure field contradicts a gate that never ran and fails closed.',
    );
    expect(next).toContain(
      'a persisted `project_disabled` result is never accepted on its stored value alone',
    );
    expect(next).toContain(
      'require that the current resolution is still `configured_disabled_by_project`',
    );
    // The pre-existing valid combinations must be unchanged.
    expect(next).toContain(
      '`allowed/no_gate` is valid only with `disposition: no_gate`',
    );
    expect(next).toContain(
      '`allowed/configured` is valid only with `disposition: passed`, `warned`, or `prompt_approved`',
    );
  });

  it('persists launch acceptance markers and reconciles before relaunch', () => {
    const gate = requiredSlice(
      readImplementSkill(),
      '### Step 14: Gate Execution',
      '### Step 15: Final HiLL Closeout Sequence',
    );
    const state = requiredSlice(
      gate,
      '```yaml\noat_implement_exit_gate:',
      '\n```',
    );
    const launch = normalizeWhitespace(
      requiredSlice(
        gate,
        '**Launch acceptance and reconciliation:**',
        'Persist and commit every state transition',
      ),
    );

    expect(state).toMatch(
      /^  launch_state: not_started # not_started \| intent_persisted \| accepted \| result_persisted \| not_accepted$/m,
    );
    expect(launch).toContain(
      '`not_started` → `intent_persisted` → `accepted` → `result_persisted`',
    );
    expect(launch).toContain(
      'persist `launch_attempt_id`, `launch_started_at`, and `launch_result_receipt` before invoking the command',
    );
    expect(launch).toContain(
      'the gate CLI run marker is acceptance evidence established before its reviewer child launch',
    );
    expect(launch).toContain(
      'reconcile the exact `gate_run_marker`, durable result receipt, and run-correlated active or archived artifact',
    );
    expect(launch).toContain(
      'Relaunch only after durable `not_accepted` evidence proves that no gate process or reviewer child was accepted',
    );
    expect(launch).toContain(
      'Absent or ambiguous evidence persists `blocked/launch_reconciliation_required` and never relaunches automatically.',
    );
  });

  it('reconciles receive side effects after a post-commit interruption', () => {
    const gate = requiredSlice(
      readImplementSkill(),
      '### Step 14: Gate Execution',
      '### Step 15: Final HiLL Closeout Sequence',
    );
    const state = requiredSlice(
      gate,
      '```yaml\noat_implement_exit_gate:',
      '\n```',
    );
    const receive = normalizeWhitespace(
      requiredSlice(
        gate,
        '**Receive intent and reconciliation:**',
        '- After successful receive',
      ),
    );

    expect(state).toMatch(
      /^  receive_state: not_started # not_started \| intent_persisted \| completed \| reconciliation_required$/m,
    );
    expect(receive).toContain(
      '`not_started` → `intent_persisted` → `completed` or `reconciliation_required`',
    );
    expect(receive).toContain(
      'persist the receive correlation, source and expected archived artifact paths, exact Reviews event identity, and `receive_pre_head` before invoking receive',
    );
    expect(receive).toContain(
      'the exact archived artifact, the bound Reviews event, and the receive bookkeeping commit',
    );
    expect(receive).toContain(
      'set `receive_completed: true` from that corroborated durable receipt without invoking receive again',
    );
    expect(receive).toContain(
      'persist `blocked/receive_reconciliation_required` and stop with the recovery command `oat-project-review-receive`',
    );
  });

  it('enforces structured receive provenance and fail-closed freshness', () => {
    const skill = readImplementSkill();
    const next = readNextSkill();
    const normalized = normalizeWhitespace(skill);
    const normalizedNext = normalizeWhitespace(next);

    expect(normalized).toContain(
      'Receive is eligible only for `ok` or `blocked` with `receiveEligible: true` and a corroborated non-null `handoff`.',
    );
    expect(normalized).toContain(
      'An already-completed receive is idempotent and must not run again.',
    );
    expect(normalized).toContain(
      'A receive failure persists `blocked` and cannot become an allowed disposition.',
    );
    expect(normalized).toContain(
      'Manual review provenance is rejected: only `oat_review_invocation: gate` with the matching `oat_gate_run_id` may satisfy the configured gate.',
    );
    expect(normalized).toContain(
      'Closeout-only descendants include configured gate artifacts and receipts, project tracking, `project-log.md` appends, summary/documentation/PR sequence outputs, final HiLL bookkeeping, and completion bookkeeping.',
    );
    expect(normalized).toContain(
      'An unknown changed path fails closed as substantive implementation change.',
    );
    expect(normalized).toContain(
      'Implementation, test, skill, template, or workflow configuration changes make the prior result `stale`.',
    );
    expect(normalized).toContain(
      'An in-flight `pending` or `blocked` generation reuses its persisted resolved configuration and never re-resolves it.',
    );
    expect(normalized).toContain(
      'If the persisted resolved configuration does not reproduce `config_fingerprint`, mark the generation `stale` and fail closed.',
    );
    expect(normalizedNext).toContain(
      'Recognized closeout-only descendants preserve a fresh allowed result; unknown paths and substantive changes route as stale.',
    );
    expect(normalizedNext).toContain(
      'Pending and blocked generations resume their persisted configuration; configuration-fingerprint mismatch fails closed.',
    );
  });

  it('preserves a fresh gate across unchanged effective-delta base updates', () => {
    const skill = normalizeWhitespace(readImplementSkill());
    const next = normalizeWhitespace(readNextSkill());

    expect(skill).toContain(
      'New generations persist `implementation_fingerprint` as `sha256:effective-delta-v1:<digest>`.',
    );
    expect(skill).toContain(
      'Persist the logical base ref as `implementation_base_ref`; require exactly one merge base between that ref and each compared HEAD.',
    );
    expect(skill).toContain(
      'Hash the exact NUL-delimited byte stream from Git `--raw -z --no-renames --no-abbrev` output, which includes both base and final modes and full object IDs for blobs, symlinks, deletions, and gitlinks.',
    );
    expect(skill).toContain(
      'Set `freshness_head` to `reviewed_head` and `freshness_fingerprint` to `implementation_fingerprint` when the generation starts.',
    );
    expect(skill).toContain(
      'Exclude only the exact `$PROJECT_PATH/state.md` checkpoint carrier to avoid a self-referential digest.',
    );
    expect(skill).toContain(
      'After a corroborated closeout-only transition, hash the complete current effective delta and persist the rolling freshness checkpoint.',
    );
    expect(skill).toContain(
      'A merge, rebase, or base update is not substantive by itself.',
    );
    expect(skill).toContain(
      'When it matches the rolling fingerprint, preserve the allowed generation and persist an advanced rolling checkpoint without rerunning gate or receive.',
    );
    expect(skill).toContain(
      'Conflict resolution or branch-owned implementation, test, skill, template, or workflow changes that alter the effective delta are substantive.',
    );
    expect(skill).toContain(
      'Legacy unqualified `sha256:<digest>` values keep the descendant-path policy and are never reinterpreted or migrated in place.',
    );
    expect(next).toContain(
      'For qualified state, require `implementation_base_ref`, `freshness_head`, and a valid `freshness_fingerprint`.',
    );
    expect(next).toContain(
      'An unchanged qualified fingerprint preserves freshness across a merge, rebase, or base update but routes to `oat-project-implement` to persist the advanced rolling checkpoint; a mismatch routes as stale.',
    );
    expect(next).toContain(
      'Legacy unqualified fingerprints retain the closeout-only descendant-path check.',
    );
  });

  it('fingerprints effective tree deltas instead of merge history', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'oat-effective-delta-'));

    try {
      git(cwd, 'init', '-b', 'main');
      git(cwd, 'config', 'user.name', 'OAT Test');
      git(cwd, 'config', 'user.email', 'oat-test@example.com');
      writeFileSync(join(cwd, 'app.txt'), 'base\n');
      writeFileSync(join(cwd, 'unrelated.txt'), 'one\n');
      git(cwd, 'add', '.');
      git(cwd, 'commit', '-m', 'base');

      git(cwd, 'checkout', '-b', 'feature');
      writeFileSync(join(cwd, 'app.txt'), 'feature\n');
      git(cwd, 'add', 'app.txt');
      git(cwd, 'commit', '-m', 'feature');
      const reviewedHead = git(cwd, 'rev-parse', 'HEAD');
      const reviewedFingerprint = effectiveDeltaFingerprint(
        cwd,
        'main',
        reviewedHead,
      );

      mkdirSync(join(cwd, '.oat/project'), { recursive: true });
      writeFileSync(join(cwd, '.oat/project/state.md'), 'closeout\n');
      writeFileSync(join(cwd, '.oat/project/summary.md'), 'summary\n');
      git(cwd, 'add', '.oat/project');
      git(cwd, 'commit', '-m', 'closeout bookkeeping');
      const closeoutFingerprint = effectiveDeltaFingerprint(
        cwd,
        'main',
        'HEAD',
      );
      expect(closeoutFingerprint).not.toBe(reviewedFingerprint);

      writeFileSync(join(cwd, '.oat/project/state.md'), 'checkpoint\n');
      git(cwd, 'add', '.oat/project/state.md');
      git(cwd, 'commit', '-m', 'persist freshness checkpoint');
      expect(effectiveDeltaFingerprint(cwd, 'main', 'HEAD')).toBe(
        closeoutFingerprint,
      );

      git(cwd, 'checkout', 'main');
      writeFileSync(join(cwd, 'unrelated.txt'), 'two\n');
      git(cwd, 'add', 'unrelated.txt');
      git(cwd, 'commit', '-m', 'base-only update');
      git(cwd, 'checkout', 'feature');
      git(cwd, 'merge', 'main', '--no-edit');
      expect(effectiveDeltaFingerprint(cwd, 'main', 'HEAD')).toBe(
        closeoutFingerprint,
      );

      writeFileSync(join(cwd, 'app.txt'), 'feature-v2\n');
      git(cwd, 'add', 'app.txt');
      git(cwd, 'commit', '-m', 'change implementation');
      expect(effectiveDeltaFingerprint(cwd, 'main', 'HEAD')).not.toBe(
        closeoutFingerprint,
      );

      writeFileSync(join(cwd, 'app.txt'), 'feature\n');
      git(cwd, 'add', 'app.txt');
      git(cwd, 'commit', '-m', 'restore reviewed implementation');
      expect(effectiveDeltaFingerprint(cwd, 'main', 'HEAD')).toBe(
        closeoutFingerprint,
      );

      git(cwd, 'checkout', 'main');
      writeFileSync(join(cwd, 'app.txt'), 'changed-base\n');
      git(cwd, 'add', 'app.txt');
      git(cwd, 'commit', '-m', 'change implementation base');
      git(cwd, 'checkout', 'feature');
      expect(() => git(cwd, 'merge', 'main', '--no-edit')).toThrow();
      writeFileSync(join(cwd, 'app.txt'), 'feature\n');
      git(cwd, 'add', 'app.txt');
      git(cwd, 'commit', '-m', 'resolve with reviewed implementation');
      expect(readFileSync(join(cwd, 'app.txt'), 'utf8')).toBe('feature\n');
      expect(effectiveDeltaFingerprint(cwd, 'main', 'HEAD')).not.toBe(
        closeoutFingerprint,
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it('uses one immutable snapshot and its stored order across every closeout boundary', () => {
    const skill = readImplementSkill();
    const normalized = normalizeWhitespace(skill);

    expect(normalized).toContain(
      'legacy or structured preference, normalize legacy values before snapshotting: `wait` → `{ preApproval: [], postApproval: [] }`, `summary` → `{ preApproval: ["summary"], postApproval: [] }`, `pr` → `{ preApproval: ["summary", "pr"], postApproval: [] }`, and `docs-pr` → `{ preApproval: ["summary", "document", "pr"], postApproval: [] }`.',
    );
    expect(normalized).toContain(
      'The snapshot is immutable for this closeout: never re-resolve `workflow.postImplementSequence` while it is incomplete.',
    );
    expect(normalized).toContain(
      'Iterate `pre_approval` and `post_approval` in their stored array order; do not sort or substitute a vocabulary order.',
    );
    expect(normalized).toContain(
      'Resume from the first incomplete stored step, including a partially completed noncanonical order.',
    );
    expect(normalized).toContain(
      'Every `summary`, `document`, `pr`, and `retro` child receives the authoritative snapshot',
    );
    expect(normalized).toContain(
      'merge state updates without replacing `oat_post_implement_sequence`',
    );
    expect(normalized).toContain(
      'Re-read and verify the snapshot after every child returns before recording step success',
    );
    const persistedSnapshot = requiredSlice(
      skill,
      '```yaml\noat_post_implement_sequence:',
      '\n```',
    );
    expect(persistedSnapshot).toContain(
      'post_approval: [] # exact resolved array; add retro only when explicitly configured',
    );
    expect(persistedSnapshot).not.toContain('post_approval: [retro]');
    expect(normalized).toContain(
      'Never add `retro` unless the configured `postApproval` array explicitly contains it',
    );
  });

  it('persists approval and failure boundaries without implicitly crossing them', () => {
    const skill = readImplementSkill();
    const normalized = normalizeWhitespace(skill);

    expect(normalized).toContain(
      'Commit each completed step before dispatching the next step.',
    );
    expect(normalized).toContain(
      'When they succeed and a final checkpoint exists, commit `status: awaiting_approval` with `approval: pending` before asking for final HiLL approval.',
    );
    expect(normalized).toContain(
      'Record explicit approval as `approval: approved` and `status: post_approval` before any post-approval dispatch.',
    );
    expect(normalized).toContain(
      'A decline or defer keeps `status: awaiting_approval` and `approval: pending`; record neither approval nor failure and run no post-approval step.',
    );
    expect(normalized).toContain(
      '`approval: not_required` is valid only when no final checkpoint exists.',
    );
    expect(normalized).toContain(
      'A pre-approval failure leaves `approval: pending`; a post-approval failure retains `approval: approved`.',
    );
    expect(normalized).toContain(
      'Fail fast with the boundary, failed step, and exact resume command: `oat-project-implement`.',
    );
  });

  it('keeps the unset preference prompt until after final approval', () => {
    const skill = readImplementSkill();
    const normalized = normalizeWhitespace(skill);

    expect(normalized).toContain(
      'For non-lite workflows, if the preference is unset and autonomy is inactive, do not create a sequence snapshot. Retain the existing next-step prompt only after final approval when a final checkpoint is configured.',
    );
  });

  it('preserves incomplete sequence routing and PR state integration', () => {
    const next = readNextSkill();
    const prFinal = readFileSync(
      join(
        import.meta.dirname,
        '../../../../../../../.agents/skills/oat-project-pr-final/SKILL.md',
      ),
      'utf8',
    );
    expect(next).toContain(
      'Incomplete approval-aware post-implementation sequence',
    );
    expect(next).toContain('route to\n`oat-project-implement`');
    expect(prFinal).toContain('Reuse a\ncompleted `summary` step');
    expect(prFinal).toContain('merge with, never replace');
  });

  it('routes unresolved implementation exit gates before every normal closeout route', () => {
    const next = readNextSkill();
    const normalized = normalizeWhitespace(next);
    const gateCheckIndex = next.indexOf(
      '**5.0: Unresolved implementation exit gate**',
    );
    const sequenceIndex = next.indexOf(
      '**5.1: Incomplete approval-aware post-implementation sequence**',
    );

    expect(gateCheckIndex).toBeGreaterThanOrEqual(0);
    expect(sequenceIndex).toBeGreaterThan(gateCheckIndex);
    expect(gateCheckIndex).toBeLessThan(
      next.indexOf('**5.5: Summary not done**'),
    );
    expect(gateCheckIndex).toBeLessThan(
      next.indexOf('**5.6: PR not created**'),
    );
    expect(gateCheckIndex).toBeLessThan(next.indexOf('**5.7: PR is open**'));
    expect(normalized).toContain(
      '`oat_implement_exit_gate` is absent, `pending`, `blocked`, `stale`, malformed, or not fresh',
    );
    expect(normalized).toContain(
      'This override applies even when `oat_phase_status` is `complete` or `pr_open`, and before the summary, document, PR, or `oat-project-complete` routes.',
    );
    expect(normalized).toContain(
      'Implementation exit gate unresolved or stale — resume with `oat-project-implement` before post-implementation routing.',
    );
    expect(normalized).toContain(
      'Only an `allowed` and fresh exit-gate disposition falls through',
    );
  });

  describe('project-log write timing and commit ownership', () => {
    it('never appends to the project log while a child owns the worktree', () => {
      const skill = readImplementSkill();
      const normalized = normalizeWhitespace(skill);

      expect(normalized).toContain(
        'Never append while a dispatched child owns the worktree',
      );
      expect(normalized).toContain(
        "Do not write the project log at acceptance; append it with the phase-outcome entry after the child's report returns.",
      );
    });

    it('keeps the acceptance-time dispatch record that logging no longer carries', () => {
      const normalized = normalizeWhitespace(readImplementSkill());

      expect(normalized).toContain(
        'record the acceptance in the generic dispatch record at `$PROJECT_PATH/implementation.md#<run-anchor>`',
      );
      expect(normalized).toContain('never mirror that record');
    });

    it('defers review-orchestration appends to a terminal phase outcome', () => {
      const normalized = normalizeWhitespace(readImplementSkill());

      expect(normalized).toContain(
        'Defer that append to the terminal phase outcome; appending when the reviewer returns dirties the tree before a fix child is dispatched into it.',
      );
    });

    it('keeps the executable review route from appending before a fix dispatch', () => {
      // The entry file states the contract, but `phase-execution.md` is the
      // route that runs. Asserting only the entry is how the immediate append
      // survived the first pass.
      const route = normalizeWhitespace(
        readFileSync(
          join(
            import.meta.dirname,
            '../../../../../../../.agents/skills/oat-project-implement/references/phase-execution.md',
          ),
          'utf8',
        ),
      );

      expect(route).not.toMatch(
        /After successful validation, append exactly once/i,
      );
      expect(route).toContain('do not append it here');
      expect(route).toContain(
        'No project-log write happens anywhere between a reviewer returning and a fix child being dispatched.',
      );
    });

    it('stages the project log conditionally in all three bookkeeping blocks', () => {
      const skill = readImplementSkill();
      const staging = skill.match(
        /\[ -f .*project-log\.md.*\] && git add .*project-log\.md/g,
      );

      expect(staging).toHaveLength(3);
      expect(normalizeWhitespace(skill)).toContain(
        'Stage it only when it exists; logging can be disabled.',
      );
    });

    it('makes every append site responsible for committing on terminal paths', () => {
      const normalized = normalizeWhitespace(readImplementSkill());

      expect(normalized).toContain(
        '**Any step that appends to the project log owns committing it** before it returns, parks, or stops',
      );
      expect(normalized).toContain(
        'STOP and park returns, validation failure, invalid-run aborts, and retry exhaustion all bypass this phase boundary',
      );
    });

    it('leaves the phase implementer clean-worktree requirement unconditional', () => {
      const implementer = readFileSync(
        join(
          import.meta.dirname,
          '../../../../../../../.agents/agents/oat-phase-implementer.md',
        ),
        'utf8',
      );
      const normalized = normalizeWhitespace(implementer);

      expect(normalized).toContain('Confirm the current worktree is clean');
      expect(normalized).toContain('the worktree is clean');
      // The fix keeps the log out of child-owned windows rather than carving
      // an exemption into the child's check.
      expect(normalized).not.toMatch(/project-log/i);
    });
  });

  describe('cross-cutting option call-site sweeps', () => {
    function readPhaseImplementerAgent(): string {
      return readFileSync(
        join(
          import.meta.dirname,
          '../../../../../../../.agents/agents/oat-phase-implementer.md',
        ),
        'utf8',
      );
    }

    // Semantic slice: the task-execution section, never a prose line number.
    function taskExecutionContract(agent: string): string {
      return normalizeWhitespace(
        requiredSlice(
          agent,
          '### 2. Execute Tasks in Plan Order',
          '### 3. Phase-Wide Self-Review',
        ),
      );
    }

    function assertSweepContract(section: string): void {
      // Property 1: the trigger is the nature of the interface change --
      // an option consumed across a module boundary -- not a named symbol.
      expect(section).toContain(
        'adds, renames, retypes, or changes the default or meaning of an option, argument, flag, configuration field, schema property, or policy value consumed outside the module that defines it',
      );
      expect(section).toContain(
        'A value that is defined, read, and written only inside its own module does not trigger this rule.',
      );

      // Property 2: the inventory is repository-wide and reaches
      // non-production callers and serialization boundaries.
      expect(section).toContain('inventory that symbol repository-wide');
      expect(section).toContain(
        'The inventory is repository-wide. It is never limited to the declared file boundary and never limited to production source:',
      );
      expect(section).toContain('serializers and deserializers');
      expect(section).toContain('fixtures, mocks, snapshots, and tests');
      expect(section).toContain('no single tool is proof of completeness');

      // Property 3: a declared file list is review scope, not a correctness
      // scope.
      expect(section).toContain(
        'A declared file list is review scope, not a correctness boundary.',
      );

      // Property 4: widen only mechanically, only inside the declared
      // outcome, and only when no sibling or parallel lane owns the file.
      expect(section).toContain('**Widen mechanically and proceed**');
      // The ownership half alone is not the precondition. Without this
      // clause the rule degrades to "widen into any unowned file", which is
      // the exact fail-open the sweep exists to close.
      expect(section).toContain(
        'every discovered file is already required by the declared task outcome, the edit to it is mechanical propagation of the same value',
      );
      expect(section).toContain('no sibling or active parallel task owns it');
      expect(section).toContain(
        '- **Stop and report** the exact discovered file set and the ownership conflict when the expansion would change the declared task outcome, cross sibling or parallel-lane ownership, invalidate a plan-declared parallel group, or require a new design, architecture, or public-behavior decision.',
      );

      // An allowed expansion is reported, never silent, and never written
      // back into the plan.
      expect(section).toContain(
        'Record every addition in the Task Outcomes `Files` cell and in Self-Review Observations, and never edit `plan.md` to match.',
      );

      // The pre-edit rule aligns with post-commit recovery widening instead
      // of relaxing the standing no-scope-expansion rule.
      expect(section).toContain(
        'never relaxes the standing rule against scope expansion beyond the phase',
      );

      // Every assertion above is presence-only, so required prose can survive
      // verbatim beside an added escape hatch that negates it. This is a
      // bounded deny-list over softeners of the stop-and-report duty, scoped
      // to the sweep subsection, with a negation lookbehind so that
      // *strengthening* the duty ("never treat the stop branch as advisory")
      // does not trip it. It is not a general fix for substring-contract
      // vacuity: a novel synonym still evades it.
      const sweepSubsection = requiredSlice(
        section,
        '#### Cross-Cutting Option Sweep',
        'For every task:',
      );
      expect(sweepSubsection).not.toMatch(
        /(?<!never |not |do not |cannot )(?:treat the stop branch as advisory|treat the sweep as advisory|stopping is optional|the stop branch is optional|continue without reporting|widen without reporting)/i,
      );

      // The post-commit verify step has to accept the boundary the
      // widen-and-proceed path creates. A verify step that still demands
      // "only declared task files" makes that path unusable.
      expect(section).toContain(
        'the commit changes only files in the effective task boundary, which is the declared task files plus any mechanical additions permitted by, and reported under, the cross-cutting option sweep;',
      );
    }

    // A probe that silently matches nothing would make every negative case
    // vacuous, so both the anchor and the resulting change are checked.
    function probe(
      section: string,
      target: string,
      replacement: string,
    ): string {
      if (!section.includes(target)) {
        throw new Error(`Negative probe anchor missing: ${target}`);
      }
      const mutated = section.replace(target, replacement);
      if (mutated === section) {
        throw new Error(`Negative probe mutation was a no-op: ${target}`);
      }
      return mutated;
    }

    it('requires a repo-wide caller inventory before editing a cross-module option', () => {
      const agent = readPhaseImplementerAgent();
      const section = taskExecutionContract(agent);

      assertSweepContract(section);

      // The sweep is a pre-edit obligation: it precedes the per-task loop.
      expect(
        section.indexOf('#### Cross-Cutting Option Sweep'),
      ).toBeGreaterThanOrEqual(0);
      expect(section.indexOf('#### Cross-Cutting Option Sweep')).toBeLessThan(
        section.indexOf('For every task:'),
      );

      // The report surfaces the rule routes an allowed expansion through
      // have to exist in the same contract.
      expect(agent).toContain('### Task Outcomes');
      expect(agent).toContain('### Self-Review Observations');
    });

    it('rejects a local-only sweep behind generic call-site prose', () => {
      const localOnly = probe(
        taskExecutionContract(readPhaseImplementerAgent()),
        'The inventory is repository-wide. It is never limited to the declared file boundary and never limited to production source:',
        'Search the call sites in the declared files:',
      );

      expect(() => assertSweepContract(localOnly)).toThrow();
    });

    it('rejects a trigger that degrades to generic search-call-sites wording', () => {
      const generic = probe(
        taskExecutionContract(readPhaseImplementerAgent()),
        'Before the first edit of a task that adds, renames, retypes, or changes the default or meaning of an option, argument, flag, configuration field, schema property, or policy value consumed outside the module that defines it,',
        'Before editing, search call sites for anything you change and',
      );

      expect(() => assertSweepContract(generic)).toThrow();
    });

    it('rejects boundary widening with the ownership stop removed', () => {
      const noStop = probe(
        taskExecutionContract(readPhaseImplementerAgent()),
        '- **Stop and report** the exact discovered file set and the ownership conflict when the expansion would change the declared task outcome, cross sibling or parallel-lane ownership, invalidate a plan-declared parallel group, or require a new design, architecture, or public-behavior decision.',
        '- Widen the boundary to whatever the search found and continue.',
      );

      expect(() => assertSweepContract(noStop)).toThrow();
    });

    it('rejects a silent boundary expansion that is never reported', () => {
      const silent = probe(
        taskExecutionContract(readPhaseImplementerAgent()),
        'Record every addition in the Task Outcomes `Files` cell and in Self-Review Observations, and never edit `plan.md` to match.',
        'Continue with the widened boundary.',
      );

      expect(() => assertSweepContract(silent)).toThrow();
    });

    // The agent may widen the boundary, but the root workflow is what accepts
    // the resulting report. Asserting only the agent side is exactly how the
    // end-to-end break survived p01 and its first fix round.
    function readPhaseExecutionRoute(): string {
      return normalizeWhitespace(
        readFileSync(
          join(
            import.meta.dirname,
            '../../../../../../../.agents/skills/oat-project-implement/references/phase-execution.md',
          ),
          'utf8',
        ),
      );
    }

    function assertRootAcceptanceBoundary(route: string): void {
      const clause = requiredSlice(
        route,
        'only for a Phase Implementation Report, verify each planned task commit is',
        'never require a Phase Recovery Continuation Report',
      );

      expect(clause).toContain(
        'changes only declared or mechanically derived in-phase files',
      );
      expect(clause).toContain(
        "the task's declared files plus the mechanical additions permitted by, and reported under, the phase implementer's cross-cutting option sweep",
      );
      expect(clause).toContain(
        'a plan-list-only file set is not the acceptance boundary',
      );
      // The specific regression guarded here is the original plan-list-only
      // wording returning to the acceptance clause.
      expect(clause).not.toMatch(/changes only declared files/i);
    }

    it('accepts a mechanically widened task commit at root report acceptance', () => {
      const route = readPhaseExecutionRoute();

      assertRootAcceptanceBoundary(route);

      // Root acceptance and the implementer's own verify step must name the
      // same boundary, or one of them rejects what the other permits.
      expect(taskExecutionContract(readPhaseImplementerAgent())).toContain(
        'permitted by, and reported under, the cross-cutting option sweep',
      );

      // Converged wording: the acceptance clause reuses the phrase the
      // recover-scope and continuation-block rules already use.
      expect(route).toContain(
        'declared or mechanically derived in-phase files',
      );
      expect(route).toContain('declared/mechanically derived phase boundary');
    });

    it('rejects a root acceptance clause that regresses to plan-list-only files', () => {
      const regressed = probe(
        readPhaseExecutionRoute(),
        "exactly one append-only commit in plan order, changes only declared or mechanically derived in-phase files, meaning the task's declared files plus the mechanical additions permitted by, and reported under, the phase implementer's cross-cutting option sweep, and has passing task verification; a plan-list-only file set is not the acceptance boundary;",
        'exactly one append-only commit in plan order, changes only declared files, and has passing task verification;',
      );

      expect(() => assertRootAcceptanceBoundary(regressed)).toThrow();
    });

    it('rejects a widen branch stripped of its mechanical precondition', () => {
      const unbounded = probe(
        taskExecutionContract(readPhaseImplementerAgent()),
        '- **Widen mechanically and proceed** when every discovered file is already required by the declared task outcome, the edit to it is mechanical propagation of the same value, and no sibling or active parallel task owns it.',
        '- **Widen mechanically and proceed** whenever no sibling or active parallel task owns it.',
      );

      expect(() => assertSweepContract(unbounded)).toThrow();
    });

    it('rejects an advisory escape hatch appended beside the stop branch', () => {
      const softened = probe(
        taskExecutionContract(readPhaseImplementerAgent()),
        'Threading an already-agreed option through four call sites',
        'When stopping would cost time, treat the stop branch as advisory, widen to whatever the sweep found, and continue without reporting. Threading an already-agreed option through four call sites',
      );

      expect(() => assertSweepContract(softened)).toThrow();
    });

    it('rejects a verify step that contradicts the effective task boundary', () => {
      const contradicted = probe(
        taskExecutionContract(readPhaseImplementerAgent()),
        'the commit changes only files in the effective task boundary, which is the declared task files plus any mechanical additions permitted by, and reported under, the cross-cutting option sweep;',
        'the commit changes only declared task files;',
      );

      expect(() => assertSweepContract(contradicted)).toThrow();
    });
  });
});

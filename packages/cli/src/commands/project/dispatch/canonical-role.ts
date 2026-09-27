import { isAbsolute, join, resolve } from 'node:path';

import {
  resolveCanonicalRole,
  type CanonicalRoleEvidence,
} from '@agents/canonical';
import type { CommandContext, GlobalOptions } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { dirExists, fileExists } from '@fs/io';
import { safeParseOatDispatchEvidenceEvent } from '@providers/identity/oat-dispatch-record';
import { Command } from 'commander';

import { redactDispatchMessage } from './record';

/** The pack that ships the canonical OAT dispatch roles. */
export const CANONICAL_ROLE_DEPENDENCY = 'workflows';

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const ROLE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export interface CanonicalRoleCommandDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
}

interface CanonicalRoleCommandOptions {
  role: string;
  requestId: string;
  skillDir: string;
}

export interface CanonicalRoleResolutionEvent {
  kind: 'canonical-role-resolution';
  requestId: string;
  source: 'canonical-role-resolver';
  evidence: CanonicalRoleEvidence;
}

async function loadedSkillDir(cwd: string, skillDir: string): Promise<string> {
  const candidate = isAbsolute(skillDir) ? skillDir : resolve(cwd, skillDir);
  if (
    !(await dirExists(candidate)) ||
    !(await fileExists(join(candidate, 'SKILL.md')))
  ) {
    throw new Error(
      `--skill-dir must name a loaded skill directory containing SKILL.md (got ${skillDir}); the loaded tier is derived from it.`,
    );
  }
  return candidate;
}

/**
 * Produce `canonical-role-resolution` evidence from the resolver itself, so a
 * caller never hand-assembles redacted paths or a content digest. Read-only:
 * it inspects the loaded, user, and project `.agents` roots and writes
 * nothing. The emitted event is checked against the recorder's own event
 * schema before it is printed, so `oat project dispatch record` accepts it
 * unchanged.
 */
export async function produceCanonicalRoleEvent(input: {
  role: string;
  requestId: string;
  skillDir: string;
  cwd: string;
  home: string;
  repoRoot: string;
}): Promise<CanonicalRoleResolutionEvent> {
  if (!ROLE_NAME_PATTERN.test(input.role)) {
    throw new Error(
      '--role must be a canonical role name: expected [a-z0-9] followed by [a-z0-9_-].',
    );
  }
  if (!REQUEST_ID_PATTERN.test(input.requestId)) {
    throw new Error(
      '--request-id must be a stable contained identifier: expected [a-zA-Z0-9] followed by up to 127 of [a-zA-Z0-9._-].',
    );
  }
  const skillDir = await loadedSkillDir(input.cwd, input.skillDir);
  const event: CanonicalRoleResolutionEvent = {
    kind: 'canonical-role-resolution',
    requestId: input.requestId,
    source: 'canonical-role-resolver',
    evidence: resolveCanonicalRole({
      dependency: CANONICAL_ROLE_DEPENDENCY,
      canonicalRole: input.role,
      skillDir,
      userCanonicalRoot: join(input.home, '.agents'),
      projectCanonicalRoot: join(input.repoRoot, '.agents'),
    }),
  };
  const checked = safeParseOatDispatchEvidenceEvent(event);
  if (!checked.success) {
    throw new Error(
      `Canonical role evidence failed the dispatch-record event schema: ${checked.error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; ')}`,
    );
  }
  return event;
}

function summaryLines(event: CanonicalRoleResolutionEvent): string[] {
  const { evidence } = event;
  if (evidence.status === 'resolved') {
    return [
      `Canonical role ${evidence.canonicalRole} resolved from the ${evidence.tier} tier (${evidence.validation}, version ${evidence.roleVersion}).`,
    ];
  }
  return [
    `Canonical role ${evidence.canonicalRole} was not found in the loaded, user, or project tier.`,
    ...evidence.recovery.map(({ command }) => `Recovery: ${command}`),
  ];
}

async function runCanonicalRoleCommand(
  options: CanonicalRoleCommandOptions,
  context: CommandContext,
  dependencies: CanonicalRoleCommandDependencies,
): Promise<void> {
  let repoRoot: string | null = null;
  try {
    repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const event = await produceCanonicalRoleEvent({
      role: options.role,
      requestId: options.requestId,
      skillDir: options.skillDir,
      cwd: context.cwd,
      home: context.home,
      repoRoot,
    });
    if (context.json) {
      context.logger.json(event);
    } else {
      for (const line of summaryLines(event)) {
        context.logger.info(line);
      }
      context.logger.info(JSON.stringify(event, null, 2));
    }
    process.exitCode = 0;
  } catch (error) {
    // The same single redaction boundary as `dispatch record`: a skill
    // directory or root that reaches a message is labelled or scrubbed.
    const message = redactDispatchMessage(
      error instanceof Error ? error.message : String(error),
      { repo: repoRoot, home: context.home },
    );
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
  }
}

export function createCanonicalRoleCommand(
  dependencies: CanonicalRoleCommandDependencies,
): Command {
  return new Command('canonical-role')
    .description(
      'Print canonical-role-resolution evidence for a dispatch record (read-only)',
    )
    .requiredOption('--role <name>', 'Canonical role name, e.g. oat-reviewer')
    .requiredOption(
      '--request-id <id>',
      'Request ID of the dispatch record the evidence belongs to',
    )
    .requiredOption(
      '--skill-dir <dir>',
      'Directory of the loaded skill (contains SKILL.md); the loaded tier is derived from it',
    )
    .action(
      async (
        options: CanonicalRoleCommandOptions,
        command: Command,
      ): Promise<void> => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runCanonicalRoleCommand(options, context, dependencies);
      },
    );
}

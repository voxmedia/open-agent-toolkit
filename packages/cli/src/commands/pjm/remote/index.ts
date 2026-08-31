import { resolve } from 'node:path';

import { buildCommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import { resolvePjmAdoption } from '../adoption';
import { renderRemoteCommand, type RemoteCommandEnvelope } from './output';

export type RemoteLifecycleOperation =
  | 'intake'
  | 'publish'
  | 'refresh'
  | 'reconcile'
  | 'storage-transition'
  | 'operation-continue';

export interface RemoteCommandRequest {
  operation: RemoteLifecycleOperation;
  projectRoot: string;
  bindingId?: string;
  providerRef?: string;
  backlogId?: string;
  observationStdin?: boolean;
  storage?: {
    repositoryFingerprint: string;
    configTarget: string;
    currentMode: 'local' | 'shared';
    proposedPaths: string[];
    apply: boolean;
  };
  authority?:
    | { kind: 'explicit-instruction'; digest: string }
    | { kind: 'fresh-approval'; digest: string }
    | { kind: 'active-workflow'; workflowId: string; revision: string };
}

export interface PjmRemoteCommandDependencies {
  resolveProjectRoot(cwd: string): Promise<string>;
  checkAdoption(
    projectRoot: string,
  ): Promise<'complete' | 'partial' | 'absent'>;
  run(request: RemoteCommandRequest): Promise<RemoteCommandEnvelope>;
}

const DEFAULT_DEPENDENCIES: PjmRemoteCommandDependencies = {
  resolveProjectRoot,
  async checkAdoption(projectRoot) {
    const adoption = await resolvePjmAdoption({
      projectRoot,
      repoRoot: resolve(projectRoot, '.oat', 'repo'),
    });
    return adoption.state === 'declared' || adoption.state === 'inferred-legacy'
      ? 'complete'
      : adoption.state === 'partial-initialization'
        ? 'partial'
        : 'absent';
  },
  async run(request) {
    return {
      schemaVersion: 1,
      status: 'pending',
      operation: request.operation,
      projectRoot: request.projectRoot,
      persisted: true,
      results: [],
      externalAction: null,
      recovery: [
        {
          code: 'host-capability-required',
          instruction: 'Continue through the oat-pjm-remote host workflow.',
        },
      ],
    };
  },
};

export function createPjmRemoteCommand(
  overrides: Partial<PjmRemoteCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  const remote = new Command('remote').description(
    'Manage explicit provider-neutral remote project lifecycle operations',
  );

  remote
    .command('intake <provider-ref>')
    .description('Intake a remote issue into a local backlog target')
    .requiredOption('--to-backlog <id>', 'Local backlog item ID')
    .action(
      async (
        providerRef: string,
        options: { toBacklog: string },
        command: Command,
      ) => {
        await execute(
          { operation: 'intake', providerRef, backlogId: options.toBacklog },
          command,
          dependencies,
        );
      },
    );

  addBindingCommand(
    remote,
    'publish',
    'Publish one selected remote binding',
    dependencies,
    true,
  );
  addBindingCommand(
    remote,
    'refresh',
    'Refresh one remote binding without mutation',
    dependencies,
    false,
  );
  addBindingCommand(
    remote,
    'reconcile',
    'Reconcile one remote binding',
    dependencies,
    true,
  );

  remote
    .command('storage')
    .description('Preview or apply shared operational storage')
    .command('shared')
    .requiredOption('--repository-fingerprint <digest>')
    .requiredOption('--config-target <path>')
    .requiredOption('--current-mode <mode>')
    .requiredOption('--proposed-path <paths...>')
    .option('--apply')
    .option('--approval-digest <digest>')
    .action(
      async (
        options: {
          repositoryFingerprint: string;
          configTarget: string;
          currentMode: 'local' | 'shared';
          proposedPath: string[];
          apply?: boolean;
          approvalDigest?: string;
        },
        command: Command,
      ) => {
        if (options.apply && !options.approvalDigest) {
          throw new Error(
            'Applying shared storage requires preview approval evidence.',
          );
        }
        await execute(
          {
            operation: 'storage-transition',
            storage: {
              repositoryFingerprint: options.repositoryFingerprint,
              configTarget: options.configTarget,
              currentMode: options.currentMode,
              proposedPaths: options.proposedPath,
              apply: options.apply ?? false,
            },
            authority: options.approvalDigest
              ? { kind: 'fresh-approval', digest: options.approvalDigest }
              : undefined,
          },
          command,
          dependencies,
        );
      },
    );

  remote
    .command('operation')
    .description('Continue a durable remote operation')
    .command('continue')
    .requiredOption('--operation <id>', 'Operation ID')
    .requiredOption(
      '--observation-stdin',
      'Read one sanitized observation from stdin',
    )
    .action(
      async (
        options: { operation: string; observationStdin: boolean },
        command: Command,
      ) => {
        await execute(
          {
            operation: 'operation-continue',
            bindingId: options.operation,
            observationStdin: options.observationStdin,
          },
          command,
          dependencies,
        );
      },
    );

  return remote;
}

function addBindingCommand(
  parent: Command,
  name: 'publish' | 'refresh' | 'reconcile',
  description: string,
  dependencies: PjmRemoteCommandDependencies,
  mutation: boolean,
): void {
  const command = parent
    .command(name)
    .description(description)
    .requiredOption('--binding <id>', 'Remote binding ID');
  if (mutation) {
    command
      .option(
        '--instruction-digest <digest>',
        'Exact user-instruction evidence',
      )
      .option('--approval-digest <digest>', 'Fresh preview-approval evidence')
      .option('--workflow-id <id>', 'Active workflow ID')
      .option('--workflow-revision <revision>', 'Active workflow revision');
  }
  command.action(
    async (options: Record<string, string>, commander: Command) => {
      const request: Omit<RemoteCommandRequest, 'projectRoot'> = {
        operation: name,
        bindingId: options.binding,
      };
      if (mutation) request.authority = parseAuthority(options);
      await execute(request, commander, dependencies);
    },
  );
}

function parseAuthority(
  options: Record<string, string>,
): RemoteCommandRequest['authority'] {
  const candidates = [
    options.instructionDigest,
    options.approvalDigest,
    options.workflowId,
  ].filter(Boolean);
  if (candidates.length !== 1) {
    throw new Error(
      'Remote mutation requires exactly one caller authority evidence source.',
    );
  }
  if (options.instructionDigest)
    return { kind: 'explicit-instruction', digest: options.instructionDigest };
  if (options.approvalDigest)
    return { kind: 'fresh-approval', digest: options.approvalDigest };
  if (!options.workflowRevision)
    throw new Error('Active workflow authority requires a workflow revision.');
  return {
    kind: 'active-workflow',
    workflowId: options.workflowId!,
    revision: options.workflowRevision,
  };
}

async function execute(
  request: Omit<RemoteCommandRequest, 'projectRoot'>,
  command: Command,
  dependencies: PjmRemoteCommandDependencies,
): Promise<void> {
  const context = buildCommandContext(readGlobalOptions(command));
  try {
    const projectRoot = await dependencies.resolveProjectRoot(context.cwd);
    const adoption = await dependencies.checkAdoption(projectRoot);
    if (adoption !== 'complete') {
      throw new Error(
        `PJM adoption is ${adoption}; run oat pjm init before remote operations.`,
      );
    }
    const envelope = await dependencies.run({ ...request, projectRoot });
    const rendered = renderRemoteCommand(envelope, { json: context.json });
    if (rendered.stdout) process.stdout.write(rendered.stdout);
    if (rendered.stderr) process.stderr.write(rendered.stderr);
    process.exitCode = rendered.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) context.logger.json({ status: 'failed', message });
    else context.logger.error(message);
    process.exitCode = 2;
  }
}

import { resolve } from 'node:path';

import { buildCommandContext } from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import { resolvePjmAdoption } from '../adoption';
import { renderRemoteCommand, type RemoteCommandEnvelope } from './output';
import { createProductionRemoteRunner } from './service';

export type RemoteLifecycleOperation =
  | 'intake'
  | 'publish'
  | 'refresh'
  | 'reconcile'
  | 'closeout'
  | 'discussion'
  | 'resolve'
  | 'storage-transition'
  | 'operation-continue';

export interface RemoteCommandRequest {
  operation: RemoteLifecycleOperation;
  projectRoot: string;
  bindingId?: string;
  operationId?: string;
  previewOperationId?: string;
  providerRef?: string;
  backlogId?: string;
  projectPath?: string;
  discussionLimit?: number;
  resolutionKind?: 'relink' | 'detach' | 'recreate';
  createTarget?: {
    provider: string;
    localKind: 'backlog' | 'project';
    localId: string;
    publicationFile?: string;
  };
  observationStdin?: boolean;
  capabilityEvidenceStdin?: boolean;
  authorityEvidenceFile?: string;
  storage?: {
    repositoryFingerprint: string;
    configTarget: string;
    currentMode: 'local' | 'shared';
    proposedPaths: string[];
    apply: boolean;
  };
  storageApprovalDigest?: string;
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
  run: createProductionRemoteRunner(),
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
    .option(
      '--capability-evidence-stdin',
      'Read one sanitized live capability evidence object from stdin',
    )
    .action(
      async (
        providerRef: string,
        options: { toBacklog: string; capabilityEvidenceStdin: boolean },
        command: Command,
      ) => {
        await execute(
          {
            operation: 'intake',
            providerRef,
            backlogId: options.toBacklog,
            capabilityEvidenceStdin: options.capabilityEvidenceStdin,
          },
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
  );

  remote
    .command('closeout')
    .description('Review and close out every eligible binding for one project')
    .requiredOption('--project <path>', 'Local OAT project path')
    .action(async (options: { project: string }, command: Command) => {
      await execute(
        { operation: 'closeout', projectPath: options.project },
        command,
        dependencies,
      );
    });

  remote
    .command('discussion')
    .description('Read bounded remote discussion as non-persisted evidence')
    .requiredOption('--binding <id>', 'Remote binding ID')
    .requiredOption('--limit <count>', 'Maximum evidence items', parseCount)
    .action(
      async (options: { binding: string; limit: number }, command: Command) => {
        await execute(
          {
            operation: 'discussion',
            bindingId: options.binding,
            discussionLimit: options.limit,
          },
          command,
          dependencies,
        );
      },
    );

  const resolveCommand = remote
    .command('resolve')
    .description('Resolve a remote binding anomaly with fresh approval');
  resolveCommand
    .command('relink <provider-ref>')
    .requiredOption('--binding <id>', 'Remote binding ID')
    .option('--apply-preview <operation-id>', 'Apply an exact approved preview')
    .action(
      async (
        providerRef: string,
        options: { binding: string; applyPreview?: string },
        command: Command,
      ) => {
        await execute(
          {
            operation: 'resolve',
            resolutionKind: 'relink',
            bindingId: options.binding,
            providerRef,
            previewOperationId: options.applyPreview,
          },
          command,
          dependencies,
        );
      },
    );
  resolveCommand
    .command('detach')
    .requiredOption('--binding <id>', 'Remote binding ID')
    .option('--apply-preview <operation-id>', 'Apply an exact approved preview')
    .action(
      async (
        options: { binding: string; applyPreview?: string },
        command: Command,
      ) => {
        await execute(
          {
            operation: 'resolve',
            resolutionKind: 'detach',
            bindingId: options.binding,
            previewOperationId: options.applyPreview,
          },
          command,
          dependencies,
        );
      },
    );
  addBindingCommand(
    remote,
    'refresh',
    'Refresh one remote binding without mutation',
    dependencies,
  );
  addBindingCommand(
    remote,
    'reconcile',
    'Reconcile one remote binding',
    dependencies,
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
            storageApprovalDigest: options.approvalDigest,
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
    .option(
      '--observation-stdin',
      'Read one sanitized observation from stdin; omit only to resume a durable create-action handoff',
    )
    .option(
      '--authority-evidence-file <path>',
      'Re-read one bounded caller-owned mutation authority record',
    )
    .action(
      async (
        options: {
          operation: string;
          observationStdin: boolean;
          authorityEvidenceFile?: string;
        },
        command: Command,
      ) => {
        await execute(
          {
            operation: 'operation-continue',
            operationId: options.operation,
            observationStdin: Boolean(options.observationStdin),
            authorityEvidenceFile: options.authorityEvidenceFile,
          },
          command,
          dependencies,
        );
      },
    );

  return remote;
}

function parseCount(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error('Expected an integer from 1 to 100.');
  }
  return parsed;
}

function addBindingCommand(
  parent: Command,
  name: 'publish' | 'refresh' | 'reconcile',
  description: string,
  dependencies: PjmRemoteCommandDependencies,
): void {
  const command = parent.command(name).description(description);
  if (name === 'publish') {
    command
      .option('--binding <id>', 'Existing remote binding ID')
      .option('--provider <provider>', 'Provider for a new remote issue')
      .option('--to-backlog <id>', 'Local backlog item to publish')
      .option('--to-project <id>', 'Local project to publish')
      .option(
        '--project-publication-file <path>',
        'Explicit normalized project publication JSON',
      );
  } else {
    command.requiredOption('--binding <id>', 'Remote binding ID');
  }
  command.option(
    '--capability-evidence-stdin',
    'Read one sanitized live capability evidence object from stdin',
  );
  if (name !== 'refresh') {
    command.option(
      '--authority-evidence-file <path>',
      'Read one bounded caller-owned mutation authority record',
    );
    command.option(
      '--apply-preview <operation-id>',
      'Apply one exact persisted user-approved preview',
    );
  }
  command.action(
    async (options: Record<string, string>, commander: Command) => {
      const createTargets = [options.toBacklog, options.toProject].filter(
        Boolean,
      );
      if (name === 'publish') {
        const usesBinding = Boolean(options.binding);
        const usesCreateTarget = createTargets.length > 0;
        if (usesBinding === usesCreateTarget || createTargets.length > 1) {
          throw new Error(
            'Publish requires exactly one existing binding or one local create target.',
          );
        }
        if (usesCreateTarget && !options.provider) {
          throw new Error('Publishing an unbound target requires a provider.');
        }
        if (usesBinding && options.provider) {
          throw new Error(
            'Provider is only valid for an unbound publish target.',
          );
        }
        if (options.toProject && !options.projectPublicationFile) {
          throw new Error(
            'Publishing a project requires --project-publication-file.',
          );
        }
        if (!options.toProject && options.projectPublicationFile) {
          throw new Error(
            '--project-publication-file is only valid with --to-project.',
          );
        }
      }
      const request: Omit<RemoteCommandRequest, 'projectRoot'> = {
        operation: name,
        bindingId: options.binding,
        capabilityEvidenceStdin: Boolean(options.capabilityEvidenceStdin),
        authorityEvidenceFile: options.authorityEvidenceFile,
        previewOperationId: options.applyPreview,
      };
      if (options.toBacklog || options.toProject) {
        request.createTarget = {
          provider: options.provider!,
          localKind: options.toBacklog ? 'backlog' : 'project',
          localId: (options.toBacklog ?? options.toProject)!,
          publicationFile: options.projectPublicationFile,
        };
      }
      await execute(request, commander, dependencies);
    },
  );
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

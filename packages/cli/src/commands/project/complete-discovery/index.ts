import {
  readFile as defaultReadFile,
  writeFile as defaultWriteFile,
} from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { CliError } from '@errors/cli-error';
import { dirExists, fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { assertValidProjectStateFilesystemContent } from '@validation/project-state';
import { Command } from 'commander';
import YAML from 'yaml';

interface ProjectCompleteDiscoveryOptions {
  readyFor?: string;
}

interface ProjectCompleteDiscoveryDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readFile: typeof defaultReadFile;
  writeFile: typeof defaultWriteFile;
  dirExists: typeof dirExists;
  fileExists: typeof fileExists;
  now: () => Date;
}

const DEFAULT_DEPENDENCIES: ProjectCompleteDiscoveryDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  readFile: defaultReadFile,
  writeFile: defaultWriteFile,
  dirExists,
  fileExists,
  now: () => new Date(),
};

function resolveTargetProjectPath(
  repoRoot: string,
  projectPath: string,
): string {
  return isAbsolute(projectPath) ? projectPath : join(repoRoot, projectPath);
}

function parseFrontmatterObject(
  content: string,
  filePath: string,
): Record<string, unknown> {
  const frontmatter = getFrontmatterBlock(content);
  if (!frontmatter) {
    throw new CliError(`${filePath} is missing frontmatter`, 1);
  }

  const parsed: unknown = YAML.parse(frontmatter);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CliError(`${filePath} frontmatter must be a YAML object`, 1);
  }

  return parsed as Record<string, unknown>;
}

function renderDiscoveryComplete(
  content: string,
  filePath: string,
  options: { readyFor: string; today: string },
): string {
  const frontmatter = parseFrontmatterObject(content, filePath);
  frontmatter['oat_status'] = 'complete';
  frontmatter['oat_ready_for'] = options.readyFor;
  frontmatter['oat_last_updated'] = options.today;

  const renderedFrontmatter = YAML.stringify(frontmatter).trimEnd();
  return content.replace(
    /^---\n[\s\S]*?\n---/,
    `---\n${renderedFrontmatter}\n---`,
  );
}

function renderFrontmatterDocument(
  frontmatter: Record<string, unknown>,
): string {
  return `---\n${YAML.stringify(frontmatter).trimEnd()}\n---\n`;
}

async function buildDiscoveryValidationContent(
  content: string,
  options: {
    discoveryPath: string;
    projectPath: string;
    dependencies: ProjectCompleteDiscoveryDependencies;
  },
): Promise<string> {
  const discoveryFrontmatter = parseFrontmatterObject(
    content,
    options.discoveryPath,
  );
  const statePath = join(options.projectPath, 'state.md');
  if (!(await options.dependencies.fileExists(statePath))) {
    return content;
  }

  const stateContent = await options.dependencies.readFile(statePath, 'utf8');
  const stateFrontmatter = parseFrontmatterObject(stateContent, statePath);
  return renderFrontmatterDocument({
    ...stateFrontmatter,
    ...discoveryFrontmatter,
  });
}

async function runProjectCompleteDiscovery(
  projectPath: string,
  options: ProjectCompleteDiscoveryOptions,
  context: CommandContext,
  dependencies: ProjectCompleteDiscoveryDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const targetProjectPath = resolveTargetProjectPath(repoRoot, projectPath);

    if (!(await dependencies.dirExists(targetProjectPath))) {
      throw new CliError(`Project not found: ${projectPath}`, 1);
    }

    const discoveryPath = join(targetProjectPath, 'discovery.md');
    if (!(await dependencies.fileExists(discoveryPath))) {
      throw new CliError(`Project discovery.md not found: ${discoveryPath}`, 1);
    }

    const now = dependencies.now();
    const content = await dependencies.readFile(discoveryPath, 'utf8');
    const updatedContent = renderDiscoveryComplete(content, discoveryPath, {
      readyFor: options.readyFor ?? 'oat-project-design',
      today: now.toISOString().slice(0, 10),
    });
    const validationContent = await buildDiscoveryValidationContent(
      updatedContent,
      {
        discoveryPath,
        projectPath: targetProjectPath,
        dependencies,
      },
    );
    await assertValidProjectStateFilesystemContent(validationContent, {
      filePath: discoveryPath,
      projectPath: targetProjectPath,
    });
    await dependencies.writeFile(discoveryPath, updatedContent, 'utf8');

    if (context.json) {
      context.logger.json({
        status: 'ok',
        projectPath,
        discoveryPath,
        readyFor: options.readyFor ?? 'oat-project-design',
      });
    } else {
      context.logger.info(`Completed project discovery: ${projectPath}`);
    }

    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = error instanceof CliError ? error.exitCode : 1;
  }
}

export function createProjectCompleteDiscoveryCommand(
  overrides: Partial<ProjectCompleteDiscoveryDependencies> = {},
): Command {
  const dependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('complete-discovery')
    .description('Validate and mark a project discovery.md complete')
    .argument('<project-path>', 'Project path to update')
    .option(
      '--ready-for <skill>',
      'Value to write to discovery.md oat_ready_for',
      'oat-project-design',
    )
    .action(
      async (
        projectPath: string,
        options: ProjectCompleteDiscoveryOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        await runProjectCompleteDiscovery(
          projectPath,
          options,
          context,
          dependencies,
        );
      },
    );
}

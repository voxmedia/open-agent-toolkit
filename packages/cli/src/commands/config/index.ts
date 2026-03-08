import { buildCommandContext, type CommandContext } from '@app/command-context';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  type OatConfig,
  type OatLocalConfig,
  readOatConfig,
  readOatLocalConfig,
  writeOatConfig,
  writeOatLocalConfig,
} from '@config/oat-config';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

type ConfigKey =
  | 'activeProject'
  | 'lastPausedProject'
  | 'documentation.config'
  | 'documentation.requireForProjectCompletion'
  | 'documentation.root'
  | 'documentation.tooling'
  | 'projects.root'
  | 'worktrees.root';

interface ConfigValue {
  key: ConfigKey;
  value: string | null;
  source: string;
}

interface ConfigCommandDependencies {
  buildCommandContext: (
    options: Parameters<typeof buildCommandContext>[0],
  ) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readOatConfig: (repoRoot: string) => Promise<OatConfig>;
  writeOatConfig: (repoRoot: string, config: OatConfig) => Promise<void>;
  readOatLocalConfig: (repoRoot: string) => Promise<OatLocalConfig>;
  writeOatLocalConfig: (
    repoRoot: string,
    config: OatLocalConfig,
  ) => Promise<void>;
  resolveProjectsRoot: (
    repoRoot: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<string>;
  processEnv: NodeJS.ProcessEnv;
}

const KEY_ORDER: ConfigKey[] = [
  'activeProject',
  'lastPausedProject',
  'documentation.root',
  'documentation.tooling',
  'documentation.config',
  'documentation.requireForProjectCompletion',
  'projects.root',
  'worktrees.root',
];

const DEFAULT_DEPENDENCIES: ConfigCommandDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  readOatConfig,
  writeOatConfig,
  readOatLocalConfig,
  writeOatLocalConfig,
  resolveProjectsRoot,
  processEnv: process.env,
};

function isConfigKey(value: string): value is ConfigKey {
  return KEY_ORDER.includes(value as ConfigKey);
}

function normalizeSharedRoot(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Shared config values cannot be empty.');
  }
  return trimmed.replace(/\/+$/, '');
}

async function resolveProjectsRootWithSource(
  repoRoot: string,
  dependencies: ConfigCommandDependencies,
): Promise<ConfigValue> {
  const envRoot = dependencies.processEnv.OAT_PROJECTS_ROOT?.trim();
  if (envRoot) {
    return {
      key: 'projects.root',
      value: envRoot.replace(/\/+$/, ''),
      source: 'env',
    };
  }

  const config = await dependencies.readOatConfig(repoRoot);
  const configRoot = config.projects?.root?.trim();
  if (configRoot) {
    return {
      key: 'projects.root',
      value: configRoot.replace(/\/+$/, ''),
      source: 'config.json',
    };
  }

  const value = await dependencies.resolveProjectsRoot(
    repoRoot,
    dependencies.processEnv,
  );
  return {
    key: 'projects.root',
    value,
    source: 'default',
  };
}

async function getConfigValue(
  repoRoot: string,
  key: ConfigKey,
  dependencies: ConfigCommandDependencies,
): Promise<ConfigValue> {
  if (key === 'projects.root') {
    return resolveProjectsRootWithSource(repoRoot, dependencies);
  }

  if (key.startsWith('documentation.')) {
    const config = await dependencies.readOatConfig(repoRoot);
    const doc = config.documentation;
    let value: string | null = null;

    if (key === 'documentation.root') {
      value = doc?.root ?? null;
    } else if (key === 'documentation.tooling') {
      value = doc?.tooling ?? null;
    } else if (key === 'documentation.config') {
      value = doc?.config ?? null;
    } else if (key === 'documentation.requireForProjectCompletion') {
      value =
        doc?.requireForProjectCompletion != null
          ? String(doc.requireForProjectCompletion)
          : 'false';
    }

    return {
      key,
      value,
      source: doc ? 'config.json' : 'default',
    };
  }

  if (key === 'worktrees.root') {
    const envRoot = dependencies.processEnv.OAT_WORKTREES_ROOT?.trim();
    if (envRoot) {
      return {
        key,
        value: envRoot.replace(/\/+$/, ''),
        source: 'env',
      };
    }

    const config = await dependencies.readOatConfig(repoRoot);
    const value = config.worktrees?.root?.trim();
    if (value) {
      return {
        key,
        value: value.replace(/\/+$/, ''),
        source: 'config.json',
      };
    }

    return {
      key,
      value: '.worktrees',
      source: 'default',
    };
  }

  const localConfig = await dependencies.readOatLocalConfig(repoRoot);
  const localKey = key as keyof OatLocalConfig;
  const hasKey = Object.hasOwn(localConfig, localKey);
  const value = (localConfig[localKey] as string | null | undefined) ?? null;
  return {
    key,
    value,
    source: hasKey ? 'config.local.json' : 'default',
  };
}

async function setConfigValue(
  repoRoot: string,
  key: ConfigKey,
  rawValue: string,
  dependencies: ConfigCommandDependencies,
): Promise<ConfigValue> {
  if (key === 'activeProject' || key === 'lastPausedProject') {
    const localConfig = await dependencies.readOatLocalConfig(repoRoot);
    const nextValue = rawValue === '' ? null : rawValue;
    await dependencies.writeOatLocalConfig(repoRoot, {
      ...localConfig,
      [key]: nextValue,
    });
    return {
      key,
      value: nextValue,
      source: 'config.local.json',
    };
  }

  const config = await dependencies.readOatConfig(repoRoot);

  if (key.startsWith('documentation.')) {
    const doc = { ...config.documentation };

    if (key === 'documentation.root') {
      doc.root = normalizeSharedRoot(rawValue);
    } else if (key === 'documentation.tooling') {
      doc.tooling = rawValue.trim();
    } else if (key === 'documentation.config') {
      doc.config = normalizeSharedRoot(rawValue);
    } else if (key === 'documentation.requireForProjectCompletion') {
      doc.requireForProjectCompletion =
        rawValue.trim().toLowerCase() === 'true';
    }

    await dependencies.writeOatConfig(repoRoot, {
      ...config,
      documentation: doc,
    });

    const resultValue =
      key === 'documentation.requireForProjectCompletion'
        ? String(doc.requireForProjectCompletion ?? false)
        : ((doc[
            key.replace('documentation.', '') as keyof typeof doc
          ] as string) ?? null);

    return {
      key,
      value: resultValue,
      source: 'config.json',
    };
  }

  const normalizedValue = normalizeSharedRoot(rawValue);

  if (key === 'projects.root') {
    await dependencies.writeOatConfig(repoRoot, {
      ...config,
      projects: { root: normalizedValue },
    });
  } else {
    await dependencies.writeOatConfig(repoRoot, {
      ...config,
      worktrees: { root: normalizedValue },
    });
  }

  return {
    key,
    value: normalizedValue,
    source: 'config.json',
  };
}

function formatList(values: ConfigValue[]): string {
  const keyWidth = Math.max(
    'Key'.length,
    ...values.map((item) => item.key.length),
  );
  const sourceWidth = Math.max(
    'Source'.length,
    ...values.map((item) => item.source.length),
  );

  const lines = [
    `${'Key'.padEnd(keyWidth)}  Value  ${'Source'.padEnd(sourceWidth)}`,
    `${'-'.repeat(keyWidth)}  -----  ${'-'.repeat(sourceWidth)}`,
  ];

  for (const item of values) {
    lines.push(
      `${item.key.padEnd(keyWidth)}  ${item.value ?? ''}  ${item.source.padEnd(
        sourceWidth,
      )}`,
    );
  }

  return lines.join('\n');
}

async function runGet(
  keyArg: string,
  context: CommandContext,
  dependencies: ConfigCommandDependencies,
): Promise<void> {
  try {
    if (!isConfigKey(keyArg)) {
      throw new Error(`Unknown config key: ${keyArg}`);
    }

    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const value = await getConfigValue(repoRoot, keyArg, dependencies);
    if (context.json) {
      context.logger.json({
        status: 'ok',
        ...value,
      });
    } else {
      context.logger.info(value.value ?? '');
    }
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
  }
}

async function runSet(
  keyArg: string,
  rawValue: string,
  context: CommandContext,
  dependencies: ConfigCommandDependencies,
): Promise<void> {
  try {
    if (!isConfigKey(keyArg)) {
      throw new Error(`Unknown config key: ${keyArg}`);
    }

    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const result = await setConfigValue(
      repoRoot,
      keyArg,
      rawValue,
      dependencies,
    );
    if (context.json) {
      context.logger.json({
        status: 'ok',
        ...result,
      });
    } else {
      context.logger.info(`${result.key}=${result.value ?? ''}`);
    }
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
  }
}

async function runList(
  context: CommandContext,
  dependencies: ConfigCommandDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const values: ConfigValue[] = [];
    for (const key of KEY_ORDER) {
      values.push(await getConfigValue(repoRoot, key, dependencies));
    }

    if (context.json) {
      context.logger.json({
        status: 'ok',
        values,
      });
    } else {
      context.logger.info(formatList(values));
    }
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
  }
}

export function createConfigCommand(
  overrides: Partial<ConfigCommandDependencies> = {},
): Command {
  const dependencies: ConfigCommandDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('config')
    .description('Read and write OAT config values')
    .addCommand(
      new Command('get')
        .description('Get a resolved OAT config value')
        .argument('<key>', 'Config key')
        .action(async (key: string, _options: unknown, command: Command) => {
          const context = dependencies.buildCommandContext(
            readGlobalOptions(command),
          );
          await runGet(key, context, dependencies);
        }),
    )
    .addCommand(
      new Command('set')
        .description('Set an OAT config value')
        .argument('<key>', 'Config key')
        .argument('<value>', 'Config value')
        .action(
          async (
            key: string,
            value: string,
            _options: unknown,
            command: Command,
          ) => {
            const context = dependencies.buildCommandContext(
              readGlobalOptions(command),
            );
            await runSet(key, value, context, dependencies);
          },
        ),
    )
    .addCommand(
      new Command('list')
        .description('List resolved OAT config values with sources')
        .action(async (_options: unknown, command: Command) => {
          const context = dependencies.buildCommandContext(
            readGlobalOptions(command),
          );
          await runList(context, dependencies);
        }),
    );
}

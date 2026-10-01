import { join, resolve } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  type UpsertSectionResult,
  formatAgentsMdGuidanceResult,
  formatAgentsMdMutationFailure,
  upsertAgentsMdSection,
} from '@commands/shared/agents-md';
import {
  confirmAction,
  inputWithDefault,
  type PromptContext,
  type SelectChoice,
  selectWithAbort,
} from '@commands/shared/shared.prompts';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  type OatConfig,
  readOatConfig,
  writeOatConfig,
} from '@config/oat-config';
import { resolveAssetsRoot } from '@fs/assets';
import { Command, Option } from 'commander';

import { buildDocsCommands } from './docs-commands';
import {
  DEFAULT_DOCS_REPO_SHAPE_DEPENDENCIES,
  type DocsFormatMode,
  type DocsFramework,
  type DocsInitResolvedOptions,
  type DocsLintMode,
  detectDocsRepoShape,
  getDefaultDocsAppName,
  resolveDocsInitOptions,
} from './resolve-options';
import {
  patchRootPackageJson,
  type RootPackagePatchResult,
} from './root-package';
import { scaffoldDocsApp, validateMarkdownTarget } from './scaffold';

interface DocsInitCommandOptions {
  framework?: DocsFramework;
  appName?: string;
  siteName?: string;
  targetDir?: string;
  description?: string;
  lint?: DocsLintMode;
  format?: DocsFormatMode;
  rootPatch?: boolean;
  yes?: boolean;
  adopt?: boolean;
}

interface DocsInitExecutionResult {
  createdFiles: string[];
  appRoot: string;
  rootPackagePatch?: RootPackagePatchResult;
}

interface DocsInitDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveAssetsRoot: () => Promise<string>;
  detectRepoShape: (repoRoot: string) => Promise<'monorepo' | 'single-package'>;
  inputWithDefault: (
    message: string,
    defaultValue: string,
    ctx: PromptContext,
  ) => Promise<string | null>;
  selectWithAbort: <T extends string>(
    message: string,
    choices: SelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T | null>;
  runDocsInit: (
    context: CommandContext,
    options: DocsInitResolvedOptions,
    assetsRoot: string,
  ) => Promise<DocsInitExecutionResult | void>;
  upsertAgentsMdSection: (
    repoRoot: string,
    key: string,
    body: string,
  ) => Promise<UpsertSectionResult>;
  readOatConfig: (repoRoot: string) => Promise<OatConfig>;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
}

function logRootPackagePatch(
  context: CommandContext,
  result: RootPackagePatchResult,
): void {
  if (result.status === 'disabled') {
    context.logger.info('Skipped root package.json patch (--no-root-patch).');
    return;
  }

  if (result.diff) {
    context.logger.info('');
    context.logger.info('Root package.json diff:');
    context.logger.info(result.diff);
  }

  if (result.status === 'applied') {
    context.logger.info(
      'Updated the root Turbo build scripts to exclude the docs app from the default build and added `build:docs`.',
    );
  } else if (result.status === 'dry-run') {
    context.logger.info(
      'Dry run: the root Turbo build script patch was previewed but not written.',
    );
    context.logger.info('Run without --dry-run to apply these changes.');
  } else if (result.status === 'already-configured') {
    context.logger.info(
      'Root package.json already excludes the docs app from the default Turbo build and exposes `build:docs`.',
    );
  } else if (result.status === 'skipped') {
    for (const warning of result.warnings) {
      context.logger.warn(warning);
    }

    if (result.manualSnippet) {
      context.logger.info('');
      context.logger.info(
        'Recommended manual Turbo script snippet for the repo root:',
      );
      context.logger.info(result.manualSnippet);
    }
    return;
  }

  for (const warning of result.warnings) {
    context.logger.warn(warning);
  }
}

const DEFAULT_DEPENDENCIES: DocsInitDependencies = {
  buildCommandContext,
  resolveAssetsRoot,
  detectRepoShape: (repoRoot: string) =>
    detectDocsRepoShape(repoRoot, DEFAULT_DOCS_REPO_SHAPE_DEPENDENCIES),
  inputWithDefault,
  selectWithAbort,
  runDocsInit: async (context, options, assetsRoot) => {
    const result = await scaffoldDocsApp({
      assetsRoot,
      ...options,
    });
    const rootPackagePatch =
      options.framework === 'markdown'
        ? undefined
        : await patchRootPackageJson({
            repoRoot: context.cwd,
            appName: options.appName,
            dryRun: context.dryRun,
            enabled: options.rootPatch,
          });

    const config = await readOatConfig(context.cwd);
    config.documentation = {
      ...config.documentation,
      ...result.documentationConfig,
    };
    await writeOatConfig(context.cwd, config);

    if (!context.json) {
      context.logger.info(
        `Scaffolded ${options.framework === 'markdown' ? 'Markdown documentation' : 'docs app'} at ${options.targetDir}`,
      );
      context.logger.info(`  Framework: ${options.framework}`);
      if (options.framework !== 'markdown') {
        context.logger.info(`  Repo shape: ${options.repoShape}`);
        context.logger.info(`  App name: ${options.appName}`);
      }
      context.logger.info(`  Lint: ${options.lint}`);
      context.logger.info(`  Format: ${options.format}`);
      if (rootPackagePatch) logRootPackagePatch(context, rootPackagePatch);
    }
    return {
      createdFiles: result.createdFiles,
      appRoot: result.appRoot,
      rootPackagePatch,
    };
  },
  upsertAgentsMdSection,
  readOatConfig,
  confirmAction,
};

const FRAMEWORK_LABELS: Record<DocsFramework, string> = {
  fumadocs: 'Fumadocs (Next.js + MDX)',
  mkdocs: 'MkDocs (Python)',
  markdown: 'Markdown',
};

/**
 * The AGENTS.md `## Documentation` section for a freshly scaffolded app.
 *
 * Each bullet names the file that owns one role, matching what
 * `buildDocumentationConfig` seeds into `documentation.*`. A Fumadocs app has
 * two index files -- the authored source page under `docs/` and the app-root
 * manifest `oat docs generate-index` writes -- and `documentation.index` names
 * the second, so a single "Index file" bullet pointing at the first documented
 * a file the config does not name. MkDocs has no generated manifest: its
 * `documentation.index` is the nav YAML the Config bullet already names.
 */
export function buildDocsSectionBody(options: DocsInitResolvedOptions): string {
  if (options.framework === 'markdown') {
    return [
      '## Documentation',
      '',
      `- **Docs root:** \`${options.targetDir}\``,
      '- **Tooling:** Markdown',
      `- **Authored index:** \`${options.targetDir}/index.md\``,
      `- **Contributing:** \`${options.targetDir}/contributing.md\``,
      '',
      'Keep authored context, title/description metadata, and Contents maps with relative Markdown links current. Preserve local instructions; asset-only directories are exempt from indexes.',
      'Use `oat-docs-analyze` to audit gaps and `oat-docs-apply` for approved repairs. Optional generated inventories belong outside the content tree and do not replace the authored index.',
    ].join('\n');
  }
  const lines = [
    '## Documentation',
    '',
    `- **Docs root:** \`${options.targetDir}\``,
    `- **Framework:** ${FRAMEWORK_LABELS[options.framework]}`,
    `- **Docs source index:** \`${options.targetDir}/docs/index.md\``,
  ];

  if (options.framework === 'fumadocs') {
    // Derived exactly like the `documentation.index` seed in `./scaffold`, so
    // the printed path and the recorded path cannot drift apart.
    lines.push(
      `- **Generated index:** \`${join(options.targetDir, 'index.md')}\` — ` +
        'regenerated by `oat docs generate-index`; do not hand-edit.',
    );
  }

  if (options.framework === 'mkdocs') {
    lines.push(`- **Config:** \`${options.targetDir}/mkdocs.yml\``);
  }

  return lines.join('\n');
}

async function runDocsInitCommand(
  context: CommandContext,
  options: DocsInitCommandOptions,
  dependencies: DocsInitDependencies,
): Promise<void> {
  try {
    const repoShape = await dependencies.detectRepoShape(context.cwd);
    const resolved = await resolveDocsInitOptions({
      repoRoot: context.cwd,
      repoShape,
      interactive: context.interactive,
      acceptDefaults: options.yes ?? false,
      providedFramework: options.framework,
      providedAppName: options.appName,
      providedSiteName: options.siteName,
      providedTargetDir: options.targetDir,
      providedSiteDescription: options.description,
      providedLint: options.lint,
      providedFormat: options.format,
      providedRootPatch: options.rootPatch,
      inputWithDefault: dependencies.inputWithDefault,
      selectWithAbort: dependencies.selectWithAbort,
    });

    if (!resolved) {
      if (!context.json) {
        context.logger.info('Docs init cancelled.');
      }
      process.exitCode = 0;
      return;
    }

    if (options.adopt && resolved.framework !== 'markdown') {
      throw new Error('--adopt applies only to --framework markdown.');
    }
    const inapplicableOptions: string[] = [];
    const existingConfig = await dependencies.readOatConfig(context.cwd);
    if (resolved.framework === 'markdown') {
      resolved.targetDir = await validateMarkdownTarget(
        context.cwd,
        resolved.targetDir,
      );
      const declared = existingConfig.documentation;
      if (
        (declared?.tooling &&
          declared.tooling.trim().toLowerCase() !== 'markdown') ||
        (declared?.root &&
          resolve(context.cwd, declared.root) !==
            resolve(context.cwd, resolved.targetDir)) ||
        (declared?.index &&
          resolve(context.cwd, declared.index) !==
            resolve(context.cwd, resolved.targetDir, 'index.md')) ||
        declared?.config
      ) {
        throw new Error(
          'Existing documentation config is incompatible with Markdown setup. Preserve it and choose adoption or framework replacement explicitly.',
        );
      }
      if (options.appName !== undefined) inapplicableOptions.push('--app-name');
      if (options.rootPatch === false)
        inapplicableOptions.push('--no-root-patch');
      if (context.dryRun)
        throw new Error(
          'Markdown dry-run is not available yet. No changes were made.',
        );
      if (!context.json && inapplicableOptions.length)
        context.logger.warn(
          `Inapplicable to Markdown: ${inapplicableOptions.join(', ')}. No app or package changes will be made.`,
        );
    } else if (existingConfig.documentation?.root) {
      const configDesc = `root: ${existingConfig.documentation.root}, tooling: ${existingConfig.documentation.tooling ?? 'unknown'}`;
      if (context.json) {
        // JSON mode: include warning in output, proceed only with --yes
        if (!options.yes) {
          context.logger.json({
            status: 'error',
            message: `Existing docs config found (${configDesc}). Use --yes to replace.`,
          });
          process.exitCode = 1;
          return;
        }
      } else {
        context.logger.warn(
          `Existing docs config detected (${configDesc}). This will replace the current setup.`,
        );
        if (!options.yes) {
          const proceed = await dependencies.confirmAction(
            'Replace existing docs setup?',
            { interactive: context.interactive },
          );
          if (!proceed) {
            context.logger.info('Docs init cancelled.');
            process.exitCode = 1;
            return;
          }
        }
      }
    }

    const assetsRoot = await dependencies.resolveAssetsRoot();
    const scaffold = await dependencies.runDocsInit(
      context,
      resolved,
      assetsRoot,
    );

    const sectionBody = buildDocsSectionBody(resolved);
    let sectionResult: UpsertSectionResult;
    try {
      sectionResult = await dependencies.upsertAgentsMdSection(
        context.cwd,
        'docs',
        sectionBody,
      );
    } catch (error) {
      throw new Error(formatAgentsMdMutationFailure(error), { cause: error });
    }
    if (
      sectionResult.action === 'manual-required' ||
      sectionResult.action === 'blocked'
    ) {
      if (context.json) {
        context.logger.json({
          status: 'partial',
          scaffold: {
            status: 'complete',
            targetDir: resolved.targetDir,
            framework: resolved.framework,
          },
          guidance: sectionResult,
        });
      } else {
        context.logger.warn(
          `Docs scaffold completed; AGENTS.md guidance is ${sectionResult.action}.`,
        );
        for (const line of formatAgentsMdGuidanceResult(sectionResult)) {
          context.logger.info(line);
        }
      }
      process.exitCode = 1;
      return;
    }
    if (context.json) {
      context.logger.json({
        status: 'ok',
        ...resolved,
        ...scaffold,
        guidance: sectionResult,
        ...(resolved.framework === 'markdown' ? { inapplicableOptions } : {}),
      });
    } else if (sectionResult.action !== 'no-change') {
      context.logger.info(`AGENTS.md docs section ${sectionResult.action}.`);
    }

    if (!context.json) {
      context.logger.info('');
      context.logger.info('Next steps:');
      if (resolved.framework === 'markdown') {
        context.logger.info(
          `  Read ${resolved.targetDir}/index.md and ${resolved.targetDir}/contributing.md.`,
        );
        context.logger.info(
          '  Use oat-docs-analyze to audit documentation and oat-docs-apply for approved repairs.',
        );
        process.exitCode = 0;
        return;
      }
      const commands = buildDocsCommands(
        resolved.repoShape,
        resolved.targetDir,
        resolved.appName,
      );
      context.logger.info(`  ${commands.install}`);
      context.logger.info(`  ${commands.dev}`);
      context.logger.info(`  ${commands.build}`);

      if (resolved.repoShape === 'monorepo') {
        const defaultName = getDefaultDocsAppName(
          context.cwd,
          resolved.repoShape,
        );
        if (resolved.appName !== defaultName) {
          context.logger.info('');
          context.logger.info(
            `Note: Your docs app is named "${resolved.appName}" — if you have root scripts or CI filters referencing "${defaultName}", update them to match.`,
          );
        }
      }
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

export function createDocsInitCommand(
  overrides: Partial<DocsInitDependencies> = {},
): Command {
  const dependencies: DocsInitDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('init')
    .description('Bootstrap an OAT docs app or authored Markdown documentation')
    .addOption(
      new Option('--framework <framework>', 'Documentation framework').choices([
        'fumadocs',
        'mkdocs',
        'markdown',
      ]),
    )
    .addOption(
      new Option(
        '--app-name <name>',
        'Docs app name (inapplicable to Markdown)',
      ),
    )
    .addOption(
      new Option(
        '--site-name <name>',
        'Site display title or Markdown documentation title',
      ),
    )
    .addOption(
      new Option(
        '--target-dir <path>',
        'Docs directory (Markdown defaults to docs; requires a dedicated directory)',
      ),
    )
    .addOption(new Option('--description <text>', 'Documentation description'))
    .addOption(
      new Option('--lint <mode>', 'Markdown lint mode').choices([
        'none',
        'markdownlint-cli2',
      ]),
    )
    .addOption(
      new Option('--format <mode>', 'Markdown format mode').choices([
        'oxfmt',
        'none',
      ]),
    )
    .option(
      '--no-root-patch',
      'Skip root package.json patch (inapplicable to Markdown)',
    )
    .option(
      '--adopt',
      'Add missing baseline files to existing Markdown docs; preserve authored content (Markdown only)',
    )
    .option('--yes', 'Accept defaults without prompting')
    .action(async (options: DocsInitCommandOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runDocsInitCommand(context, options, dependencies);
    });
}

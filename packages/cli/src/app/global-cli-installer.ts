import { readFileSync } from 'node:fs';
import { join, win32 } from 'node:path';

export type GlobalCliPackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface GlobalCliInstallerOptions {
  argv: string[];
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  nodeExecutable: string;
  fileExists: (path: string) => boolean;
  readFile?: (path: string) => string;
}

export interface GlobalCliInstallerInvocation {
  file: string;
  args: string[];
}

function normalizePathForDetection(path: string): string {
  return path.replaceAll('\\', '/').toLowerCase().replace(/\/+$/, '');
}

function isUnderNormalizedPath(
  normalizedCandidate: string,
  normalizedHome: string,
): boolean {
  return (
    normalizedCandidate === normalizedHome ||
    normalizedCandidate.startsWith(`${normalizedHome}/`)
  );
}

function detectFromPath(
  normalizedPath: string,
): GlobalCliPackageManager | null {
  if (normalizedPath.includes('/pnpm/') || normalizedPath.includes('/.pnpm/')) {
    return 'pnpm';
  }
  if (
    normalizedPath.includes('/.bun/') ||
    normalizedPath.includes('/bun/install/')
  ) {
    return 'bun';
  }
  if (
    normalizedPath.includes('/.yarn/') ||
    normalizedPath.includes('/yarn/global/')
  ) {
    return 'yarn';
  }
  return null;
}

export function detectGlobalCliPackageManager(
  argv: string[],
  env: NodeJS.ProcessEnv,
): GlobalCliPackageManager {
  const candidates = argv.slice(0, 2).filter(Boolean);
  for (const candidate of candidates) {
    const detected = detectFromPath(normalizePathForDetection(candidate));
    if (detected) {
      return detected;
    }
  }

  const pnpmHome = env.PNPM_HOME?.trim();
  if (pnpmHome) {
    const normalizedHome = normalizePathForDetection(pnpmHome);
    for (const candidate of candidates) {
      if (
        isUnderNormalizedPath(
          normalizePathForDetection(candidate),
          normalizedHome,
        )
      ) {
        return 'pnpm';
      }
    }
  }

  return 'npm';
}

function readPnpmStoreDir(
  argv: string[],
  env: NodeJS.ProcessEnv,
  fileExists: (path: string) => boolean,
  readFile: (path: string) => string,
): string | null {
  const modulesYamlPath = resolvePnpmGlobalModulesYamlPath(
    argv,
    env,
    fileExists,
  );
  if (!modulesYamlPath) {
    return null;
  }

  try {
    const match = readFile(modulesYamlPath).match(/^storeDir:\s*(.+)$/m);
    return match?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

function resolvePnpmGlobalModulesYamlPath(
  argv: string[],
  env: NodeJS.ProcessEnv,
  fileExists: (path: string) => boolean,
): string | null {
  for (const arg of argv.slice(0, 3)) {
    const normalized = arg.replaceAll('\\', '/');
    const match = normalized.match(/^(.*\/global\/\d+)\//);
    if (match?.[1]) {
      const candidate = `${match[1]}/node_modules/.modules.yaml`;
      if (fileExists(candidate)) {
        return candidate;
      }
    }
  }

  const pnpmHome = env.PNPM_HOME?.trim();
  if (pnpmHome) {
    const candidate = join(
      pnpmHome,
      'global',
      '5',
      'node_modules',
      '.modules.yaml',
    );
    if (fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolvePnpmInstallContext(
  argv: string[],
  env: NodeJS.ProcessEnv,
  fileExists: (path: string) => boolean,
  readFile?: (path: string) => string,
): { storeDir: string | null } {
  const read = readFile ?? ((path: string) => readFileSync(path, 'utf8'));
  return {
    storeDir: readPnpmStoreDir(argv, env, fileExists, read),
  };
}

function installArgsForManager(
  manager: GlobalCliPackageManager,
  packageSpec: string,
  pnpmStoreDir?: string | null,
): string[] {
  switch (manager) {
    case 'npm':
      return ['install', '--global', packageSpec];
    case 'pnpm': {
      const args = ['add', '-g', packageSpec];
      if (pnpmStoreDir) {
        args.push('--store-dir', pnpmStoreDir);
      }
      return args;
    }
    case 'yarn':
      return ['global', 'add', packageSpec];
    case 'bun':
      return ['install', '-g', packageSpec];
  }
}

function executableForManager(manager: GlobalCliPackageManager): string {
  return manager;
}

function resolveWindowsManagerInvocation(
  manager: GlobalCliPackageManager,
  packageSpec: string,
  options: GlobalCliInstallerOptions,
): GlobalCliInstallerInvocation | null {
  if (manager === 'npm') {
    return resolveNpmWindowsInvocation(packageSpec, options);
  }

  const pnpmStoreDir =
    manager === 'pnpm'
      ? resolvePnpmInstallContext(
          options.argv,
          options.env,
          options.fileExists,
          options.readFile,
        ).storeDir
      : null;
  const comspec = options.env.ComSpec?.trim() || 'cmd.exe';
  return {
    file: comspec,
    args: [
      '/d',
      '/s',
      '/c',
      manager,
      ...installArgsForManager(manager, packageSpec, pnpmStoreDir),
    ],
  };
}

function resolveNpmWindowsInvocation(
  packageSpec: string,
  options: GlobalCliInstallerOptions,
): GlobalCliInstallerInvocation | null {
  const npmArgs = installArgsForManager('npm', packageSpec);
  const environmentPath = options.env.npm_execpath?.trim();
  const standardPath = win32.join(
    win32.dirname(options.nodeExecutable),
    'node_modules',
    'npm',
    'bin',
    'npm-cli.js',
  );
  const npmCliPath = [environmentPath, standardPath].find(
    (candidate) =>
      candidate !== undefined &&
      win32.isAbsolute(candidate) &&
      win32.basename(candidate).toLowerCase() === 'npm-cli.js' &&
      options.fileExists(candidate),
  );
  if (!npmCliPath) {
    return null;
  }

  return {
    file: options.nodeExecutable,
    args: [npmCliPath, ...npmArgs],
  };
}

export function formatGlobalCliInstallCommand(
  packageSpec: string,
  argv: string[],
  env: NodeJS.ProcessEnv,
  fileExists: (path: string) => boolean = () => false,
  readFile?: (path: string) => string,
): string {
  const manager = detectGlobalCliPackageManager(argv, env);
  const pnpmStoreDir =
    manager === 'pnpm'
      ? resolvePnpmInstallContext(argv, env, fileExists, readFile).storeDir
      : null;
  const pnpmStoreFlag =
    pnpmStoreDir === null ? '' : ` --store-dir ${quoteShellWord(pnpmStoreDir)}`;

  switch (manager) {
    case 'npm':
      return `npm install --global ${packageSpec}`;
    case 'pnpm':
      return `pnpm add -g ${packageSpec}${pnpmStoreFlag}`;
    case 'yarn':
      return `yarn global add ${packageSpec}`;
    case 'bun':
      return `bun install -g ${packageSpec}`;
  }
}

function quoteShellWord(value: string): string {
  return /[\s"'`$\\]/.test(value)
    ? `'${value.replaceAll("'", `'"'"'`)}'`
    : value;
}

export function resolveGlobalCliInstallerInvocation(
  packageSpec: string,
  options: GlobalCliInstallerOptions,
): GlobalCliInstallerInvocation | null {
  const manager = detectGlobalCliPackageManager(options.argv, options.env);
  const pnpmStoreDir =
    manager === 'pnpm'
      ? resolvePnpmInstallContext(
          options.argv,
          options.env,
          options.fileExists,
          options.readFile,
        ).storeDir
      : null;
  if (options.platform === 'win32') {
    return resolveWindowsManagerInvocation(manager, packageSpec, options);
  }

  return {
    file: executableForManager(manager),
    args: installArgsForManager(manager, packageSpec, pnpmStoreDir),
  };
}

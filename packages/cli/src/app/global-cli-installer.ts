import { win32 } from 'node:path';

export type GlobalCliPackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface GlobalCliInstallerOptions {
  argv: string[];
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  nodeExecutable: string;
  fileExists: (path: string) => boolean;
}

export interface GlobalCliInstallerInvocation {
  file: string;
  args: string[];
}

function normalizePathForDetection(path: string): string {
  return path.replaceAll('\\', '/').toLowerCase();
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
      if (normalizePathForDetection(candidate).startsWith(normalizedHome)) {
        return 'pnpm';
      }
    }
  }

  return 'npm';
}

function installArgsForManager(
  manager: GlobalCliPackageManager,
  packageSpec: string,
): string[] {
  switch (manager) {
    case 'npm':
      return ['install', '--global', packageSpec];
    case 'pnpm':
      return ['add', '-g', packageSpec];
    case 'yarn':
      return ['global', 'add', packageSpec];
    case 'bun':
      return ['install', '-g', packageSpec];
  }
}

function executableForManager(
  manager: GlobalCliPackageManager,
  platform: NodeJS.Platform,
): string {
  if (platform === 'win32') {
    return `${manager}.cmd`;
  }
  return manager;
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
): string {
  const manager = detectGlobalCliPackageManager(argv, env);
  switch (manager) {
    case 'npm':
      return `npm install --global ${packageSpec}`;
    case 'pnpm':
      return `pnpm add -g ${packageSpec}`;
    case 'yarn':
      return `yarn global add ${packageSpec}`;
    case 'bun':
      return `bun install -g ${packageSpec}`;
  }
}

export function resolveGlobalCliInstallerInvocation(
  packageSpec: string,
  options: GlobalCliInstallerOptions,
): GlobalCliInstallerInvocation | null {
  const manager = detectGlobalCliPackageManager(options.argv, options.env);
  if (manager === 'npm' && options.platform === 'win32') {
    return resolveNpmWindowsInvocation(packageSpec, options);
  }

  return {
    file: executableForManager(manager, options.platform),
    args: installArgsForManager(manager, packageSpec),
  };
}

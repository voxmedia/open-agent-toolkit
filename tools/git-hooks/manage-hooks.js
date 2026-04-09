#!/usr/bin/env node
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const hooks = ['commit-msg', 'pre-commit', 'pre-push', 'post-checkout'];
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const hooksSourceDir = path.join(repoRoot, 'tools', 'git-hooks');
const MANAGED_HOOK_MARKER = '# open-agent-toolkit managed hook';

function resolveGitPath(...segments) {
  return execFileSync('git', ['rev-parse', '--git-path', ...segments], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
}

const gitHooksDir = resolveGitPath('hooks');
const disabledHooksFile = path.join(gitHooksDir, '.disabled-hooks');

function showUsage() {
  console.log(`
Usage: node tools/git-hooks/manage-hooks.js <action> [hook-name]

Actions:
  setup               Setup Git hooks (respects intentionally disabled hooks)
  enable-all          Enable all Git hooks (force)
  disable-all         Disable all Git hooks
  enable <hook>       Enable specific hook
  disable <hook>      Disable specific hook
  status              Show status of all hooks

Available hooks: ${hooks.join(', ')}

Examples:
  node tools/git-hooks/manage-hooks.js disable-all
  node tools/git-hooks/manage-hooks.js enable pre-commit
  node tools/git-hooks/manage-hooks.js disable commit-msg
  node tools/git-hooks/manage-hooks.js status
`);
}

function getDisabledHooks() {
  if (!fs.existsSync(disabledHooksFile)) {
    return new Set();
  }
  const content = fs.readFileSync(disabledHooksFile, 'utf-8');
  return new Set(content.split('\n').filter((line) => line.trim()));
}

function markHookAsDisabled(hookName) {
  const disabled = getDisabledHooks();
  disabled.add(hookName);
  fs.writeFileSync(disabledHooksFile, `${Array.from(disabled).join('\n')}\n`);
}

function unmarkHookAsDisabled(hookName) {
  const disabled = getDisabledHooks();
  disabled.delete(hookName);
  if (disabled.size > 0) {
    fs.writeFileSync(disabledHooksFile, `${Array.from(disabled).join('\n')}\n`);
  } else if (fs.existsSync(disabledHooksFile)) {
    fs.unlinkSync(disabledHooksFile);
  }
}

function isHookDisabled(hookName) {
  return getDisabledHooks().has(hookName);
}

function getHookPath(hookName) {
  return path.join(gitHooksDir, hookName);
}

function getHookState(hookName) {
  const hookPath = getHookPath(hookName);

  try {
    const linkStats = fs.lstatSync(hookPath);

    if (linkStats.isSymbolicLink()) {
      const target = fs.readlinkSync(hookPath);
      return target.includes('tools/git-hooks') ? 'legacy-managed' : 'custom';
    }

    if (!linkStats.isFile()) {
      return 'missing';
    }

    const content = fs.readFileSync(hookPath, 'utf8');
    return content.includes(MANAGED_HOOK_MARKER) ? 'managed' : 'custom';
  } catch {
    return 'missing';
  }
}

function createManagedHookContents(hookName) {
  return `#!/bin/sh
${MANAGED_HOOK_MARKER}
set -eu

repo_root=$(git rev-parse --show-toplevel)
hook_script="$repo_root/tools/git-hooks/${hookName}"

if [ ! -x "$hook_script" ]; then
  echo "❌ Hook file $hook_script not found or not executable" >&2
  exit 1
fi

exec "$hook_script" "$@"
`;
}

/**
 * Enable a Git hook by creating a symlink to the source hook file
 * @param {string} hookName - The name of the hook to enable
 */
function enableHook(hookName) {
  const sourcePath = path.join(hooksSourceDir, hookName);
  const hookPath = getHookPath(hookName);

  if (fs.existsSync(sourcePath)) {
    const state = getHookState(hookName);
    if (state === 'custom') {
      console.log(`⏭️  Skipped ${hookName} hook (custom hook already exists)`);
      return;
    }

    if (
      fs.existsSync(hookPath) ||
      fs.lstatSync(hookPath, { throwIfNoEntry: false })
    ) {
      fs.unlinkSync(hookPath);
    }

    fs.mkdirSync(gitHooksDir, { recursive: true });
    fs.writeFileSync(hookPath, createManagedHookContents(hookName), 'utf8');
    fs.chmodSync(hookPath, 0o755);

    unmarkHookAsDisabled(hookName);
    console.log(`✅ Enabled ${hookName} hook`);
  } else {
    console.log(`❌ Hook file ${sourcePath} not found`);
  }
}

function disableHook(hookName) {
  const hookPath = getHookPath(hookName);
  if (fs.existsSync(hookPath)) {
    fs.unlinkSync(hookPath);
    markHookAsDisabled(hookName);
    console.log(`🚫 Disabled ${hookName} hook`);
  } else {
    console.log(`❌ Hook file ${hookPath} not found`);
  }
}

function showStatus() {
  console.log('\n📋 Git Hooks Status:');
  console.log('===================');

  hooks.forEach((hook) => {
    const state = getHookState(hook);
    const enabled = state === 'managed';
    const disabled = isHookDisabled(hook);
    let status;
    if (enabled) {
      status = '✅ Enabled';
    } else if (disabled) {
      status = '🚫 Disabled (intentional)';
    } else if (state === 'custom') {
      status = '⚪ Custom hook present';
    } else if (state === 'legacy-managed') {
      status = '⚠️ Legacy managed hook';
    } else {
      status = '⚪ Not installed';
    }
    console.log(`${hook.padEnd(15)} ${status}`);
  });
  console.log();
}

const [action, hookName] = process.argv.slice(2);

if (!action) {
  showUsage();
  process.exit(1);
}

switch (action) {
  case 'enable-all':
    try {
      execSync('git config --unset core.hooksPath', { stdio: 'ignore' });
    } catch {
      // Ignore unset errors when Git is already using its default hooks path.
    }
    hooks.forEach(enableHook);
    console.log('✅ All hooks enabled');
    break;

  case 'setup': {
    try {
      execSync('git config --unset core.hooksPath', { stdio: 'ignore' });
    } catch {
      // Ignore unset errors when Git is already using its default hooks path.
    }

    const allHooksReady = hooks.every(
      (hook) =>
        isHookDisabled(hook) ||
        getHookState(hook) === 'managed' ||
        getHookState(hook) === 'custom',
    );

    if (allHooksReady) {
      console.log('✅ Git hooks already configured');
      process.exit(0);
    }

    hooks.forEach((hook) => {
      const state = getHookState(hook);
      if (isHookDisabled(hook)) {
        console.log(`⏭️  Skipped ${hook} hook (intentionally disabled)`);
      } else if (state === 'custom') {
        console.log(`⏭️  Skipped ${hook} hook (custom hook already exists)`);
      } else if (state !== 'managed') {
        enableHook(hook);
      } else {
        console.log(`⏭️  Skipped ${hook} hook (already exists)`);
      }
    });
    console.log('✅ Git hooks setup complete');
    break;
  }

  case 'disable-all':
    hooks.forEach(disableHook);
    console.log('🚫 All hooks disabled');
    break;

  case 'enable':
    if (!hookName || !hooks.includes(hookName)) {
      console.log(`❌ Please specify a valid hook: ${hooks.join(', ')}`);
      process.exit(1);
    }
    enableHook(hookName);
    break;

  case 'disable':
    if (!hookName || !hooks.includes(hookName)) {
      console.log(`❌ Please specify a valid hook: ${hooks.join(', ')}`);
      process.exit(1);
    }
    disableHook(hookName);
    break;

  case 'status':
    showStatus();
    break;

  default:
    console.log(`❌ Unknown action: ${action}`);
    showUsage();
    process.exit(1);
}

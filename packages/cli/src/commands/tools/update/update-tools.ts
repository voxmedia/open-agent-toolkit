import { join } from 'node:path';

import type { CopyStatus } from '@commands/init/tools/shared/copy-helpers';
import {
  CORE_SKILLS,
  DOCS_SKILLS,
  IDEA_SKILLS,
  PROJECT_MANAGEMENT_SKILLS,
  RESEARCH_AGENTS,
  RESEARCH_SKILLS,
  UTILITY_SKILLS,
  WORKFLOW_AGENTS,
  WORKFLOW_SKILLS,
} from '@commands/init/tools/shared/skill-manifest';
import type { ScanToolsOptions } from '@commands/tools/shared/scan-tools';
import type { PackName, ToolInfo } from '@commands/tools/shared/types';
import type { ConcreteScope } from '@shared/types';

export type UpdateTarget =
  | { kind: 'name'; name: string }
  | { kind: 'pack'; pack: PackName }
  | { kind: 'all' };

export interface UpdateResult {
  updated: ToolInfo[];
  current: ToolInfo[];
  newer: ToolInfo[];
  notInstalled: string[];
  notBundled: ToolInfo[];
}

export interface UpdateToolsDependencies {
  scanTools: (options: ScanToolsOptions) => Promise<ToolInfo[]>;
  resolveScopeRoot: (
    scope: ConcreteScope,
    cwd: string,
    home: string,
  ) => Promise<string>;
  resolveAssetsRoot: () => Promise<string>;
  copyDirWithStatus: (
    source: string,
    destination: string,
    force: boolean,
  ) => Promise<CopyStatus>;
  copyFileWithStatus: (
    source: string,
    destination: string,
    force: boolean,
  ) => Promise<CopyStatus>;
}

interface ToolEntry {
  tool: ToolInfo;
  scopeRoot: string;
}

interface BundledPackMember {
  name: string;
  type: 'skill' | 'agent';
}

const BUNDLED_PACK_MEMBERS: Record<PackName, BundledPackMember[]> = {
  core: CORE_SKILLS.map((name) => ({ name, type: 'skill' })),
  ideas: IDEA_SKILLS.map((name) => ({ name, type: 'skill' })),
  docs: DOCS_SKILLS.map((name) => ({ name, type: 'skill' })),
  workflows: [
    ...WORKFLOW_SKILLS.map((name) => ({ name, type: 'skill' as const })),
    ...WORKFLOW_AGENTS.map((name) => ({
      name: name.replace(/\.md$/, ''),
      type: 'agent' as const,
    })),
  ],
  utility: UTILITY_SKILLS.map((name) => ({ name, type: 'skill' })),
  'project-management': PROJECT_MANAGEMENT_SKILLS.map((name) => ({
    name,
    type: 'skill',
  })),
  research: [
    ...RESEARCH_SKILLS.map((name) => ({ name, type: 'skill' as const })),
    ...RESEARCH_AGENTS.map((name) => ({
      name: name.replace(/\.md$/, ''),
      type: 'agent' as const,
    })),
  ],
};

export async function updateTools(
  target: UpdateTarget,
  scopes: ConcreteScope[],
  cwd: string,
  home: string,
  dryRun: boolean,
  dependencies: UpdateToolsDependencies,
): Promise<UpdateResult> {
  const assetsRoot = await dependencies.resolveAssetsRoot();
  const result: UpdateResult = {
    updated: [],
    current: [],
    newer: [],
    notInstalled: [],
    notBundled: [],
  };

  const allTools: ToolEntry[] = [];

  for (const scope of scopes) {
    const scopeRoot = await dependencies.resolveScopeRoot(scope, cwd, home);
    const tools = await dependencies.scanTools({
      scope,
      scopeRoot,
      assetsRoot,
    });
    for (const tool of tools) {
      allTools.push({ tool, scopeRoot });
    }
  }

  const targetEntries =
    target.kind === 'name'
      ? allTools
      : expandInstalledPackEntries(target, allTools);
  const targets = resolveTargets(
    target,
    targetEntries.map((t) => t.tool),
  );

  if (target.kind === 'name' && targets.length === 0) {
    result.notInstalled.push(target.name);
    return result;
  }

  for (const targetTool of targets) {
    const entry = targetEntries.find((t) => t.tool === targetTool);
    if (!entry) continue;

    const { tool, scopeRoot } = entry;

    if (tool.status === 'not-bundled') {
      result.notBundled.push(tool);
      continue;
    }

    if (tool.status === 'current') {
      result.current.push(tool);
      continue;
    }

    if (tool.status === 'newer') {
      result.newer.push(tool);
      continue;
    }

    // outdated — perform update
    if (!dryRun) {
      if (tool.type === 'skill') {
        const source = join(assetsRoot, 'skills', tool.name);
        const destination = join(scopeRoot, '.agents', 'skills', tool.name);
        await dependencies.copyDirWithStatus(source, destination, true);
      } else {
        const filename = `${tool.name}.md`;
        const source = join(assetsRoot, 'agents', filename);
        const destination = join(scopeRoot, '.agents', 'agents', filename);
        await dependencies.copyFileWithStatus(source, destination, true);
      }
    }

    result.updated.push(tool);
  }

  return result;
}

function expandInstalledPackEntries(
  target: Exclude<UpdateTarget, { kind: 'name' }>,
  installedEntries: ToolEntry[],
): ToolEntry[] {
  const entries = [...installedEntries];
  const seen = new Set(
    installedEntries.map((entry) => buildEntryKey(entry.tool)),
  );
  const entriesByScope = new Map<ConcreteScope, ToolEntry[]>();

  for (const entry of installedEntries) {
    const scopeEntries = entriesByScope.get(entry.tool.scope) ?? [];
    scopeEntries.push(entry);
    entriesByScope.set(entry.tool.scope, scopeEntries);
  }

  for (const [scope, scopeEntries] of entriesByScope) {
    const scopeRoot = scopeEntries[0]?.scopeRoot;
    if (!scopeRoot) continue;

    const installedPacks = new Set(
      scopeEntries
        .map((entry) => entry.tool.pack)
        .filter((pack): pack is PackName => pack !== 'custom'),
    );
    const packsToExpand =
      target.kind === 'pack'
        ? installedPacks.has(target.pack)
          ? [target.pack]
          : []
        : [...installedPacks];

    for (const pack of packsToExpand) {
      for (const member of getBundledPackMembers(pack, scope)) {
        const tool: ToolInfo = {
          name: member.name,
          type: member.type,
          scope,
          version: null,
          bundledVersion: null,
          pack,
          status: 'outdated',
        };
        const key = buildEntryKey(tool);
        if (seen.has(key)) continue;
        entries.push({ tool, scopeRoot });
        seen.add(key);
      }
    }
  }

  return entries;
}

function getBundledPackMembers(
  pack: PackName,
  scope: ConcreteScope,
): BundledPackMember[] {
  return BUNDLED_PACK_MEMBERS[pack].filter(
    (member) => scope === 'project' || member.type === 'skill',
  );
}

function buildEntryKey(tool: ToolInfo): string {
  return [tool.scope, tool.type, tool.name].join(':');
}

function resolveTargets(target: UpdateTarget, tools: ToolInfo[]): ToolInfo[] {
  switch (target.kind) {
    case 'name':
      return tools.filter((t) => t.name === target.name);
    case 'pack':
      return tools.filter((t) => t.pack === target.pack);
    case 'all':
      return tools;
  }
}

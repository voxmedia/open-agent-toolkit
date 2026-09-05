import { isAbsolute, posix } from 'node:path';

import type { ConcreteScope } from '@shared/types';

import type {
  PackAssetDefinition,
  PackAssetGeneration,
  PackAssetKind,
  PackAssetOwnership,
  PackDependencyDefinition,
  PackDefinition,
  PackName,
} from './types';

export type {
  PackAssetDefinition,
  PackAssetGeneration,
  PackAssetKind,
  PackAssetOwnership,
  PackDependencyDefinition,
  PackDefinition,
};

export const PACK_NAMES = [
  'core',
  'ideas',
  'docs',
  'workflows',
  'utility',
  'project-management',
  'research',
  'brainstorm',
] as const satisfies readonly PackName[];

export function isPackName(value: string): value is PackName {
  return (PACK_NAMES as readonly string[]).includes(value);
}

const BOTH_SCOPES = ['project', 'user'] as const;
const BOTH_MANAGED = { project: 'managed', user: 'managed' } as const;
const TEMPLATE_OWNERSHIP = {
  project: 'seed-if-missing',
  user: 'managed',
} as const;

function skill(
  name: string,
  scopes: readonly ConcreteScope[] = BOTH_SCOPES,
): PackAssetDefinition {
  return {
    id: `skill:${name}`,
    kind: 'skill',
    source: `skills/${name}`,
    destination: `.agents/skills/${name}`,
    scopes,
    ownership: scopes.length === 1 ? { user: 'managed' } : BOTH_MANAGED,
  };
}

function agent(
  name: string,
  options: { userMaterializable?: boolean } = {},
): PackAssetDefinition {
  return {
    id: `agent:${name}`,
    kind: 'agent',
    source: `agents/${name}`,
    destination: `.agents/agents/${name}`,
    scopes: BOTH_SCOPES,
    ownership: BOTH_MANAGED,
    ...options,
  };
}

function template(
  name: string,
  kind: 'template' | 'directory' = 'template',
): PackAssetDefinition {
  return {
    id: `template:${name}`,
    kind,
    source: `templates/${name}`,
    destination: `.oat/templates/${name}`,
    scopes: BOTH_SCOPES,
    ownership: TEMPLATE_OWNERSHIP,
  };
}

function script(name: string, sharedOwner?: string): PackAssetDefinition {
  return {
    id: `script:${name}`,
    kind: 'script',
    source: `scripts/${name}`,
    destination: `.oat/scripts/${name}`,
    scopes: BOTH_SCOPES,
    ownership: BOTH_MANAGED,
    executable: true,
    sharedOwner,
  };
}

function seed(
  id: string,
  destination: string,
  options: {
    source?: string;
    generation?: PackAssetGeneration;
    scopes?: readonly ConcreteScope[];
  },
): PackAssetDefinition {
  const scopes = options.scopes ?? BOTH_SCOPES;
  return {
    id: `seed:${id}`,
    kind: 'seed',
    source: options.source,
    generation: options.generation,
    destination,
    scopes,
    ownership: Object.fromEntries(
      scopes.map((scope) => [scope, 'seed-if-missing']),
    ),
  };
}

const WORKFLOW_SKILL_NAMES = [
  'oat-cursor-cloud-projects',
  'oat-explainer-kit',
  'oat-project-autonomous',
  'oat-project-capture',
  'oat-project-clear-active',
  'oat-project-complete',
  'oat-project-design',
  'oat-project-dispatch-subagents',
  'oat-project-discover',
  'oat-project-document',
  'oat-project-implement',
  'oat-project-import-plan',
  'oat-project-lite',
  'oat-project-new',
  'oat-project-next',
  'oat-project-open',
  'oat-project-plan',
  'oat-project-plan-writing',
  'oat-project-pr-final',
  'oat-project-pr-progress',
  'oat-project-progress',
  'oat-project-promote-spec-driven',
  'oat-project-quick-start',
  'oat-project-reconcile',
  'oat-project-retro',
  'oat-project-retro-file',
  'oat-project-revise',
  'oat-project-review-provide',
  'oat-project-review-provide-remote',
  'oat-project-review-receive',
  'oat-project-review-receive-remote',
  'oat-project-spec',
  'oat-project-split',
  'oat-project-summary',
  'oat-repo-knowledge-index',
  'oat-worktree-bootstrap',
  'oat-worktree-bootstrap-auto',
  'oat-wave-execute',
  'oat-wave-program',
  'oat-wrap-up',
] as const;

export const PACK_MANIFEST: readonly PackDefinition[] = [
  {
    name: 'core',
    allowedScopes: ['user'],
    defaultScope: 'user',
    assets: [
      skill('oat-docs', ['user']),
      skill('oat-doctor', ['user']),
      {
        id: 'directory:docs',
        kind: 'directory',
        source: 'docs',
        destination: '.oat/docs',
        scopes: ['user'],
        ownership: { user: 'managed' },
      },
    ],
  },
  {
    name: 'ideas',
    allowedScopes: BOTH_SCOPES,
    defaultScope: 'user',
    assets: [
      ...[
        'oat-idea-new',
        'oat-idea-ideate',
        'oat-idea-summarize',
        'oat-idea-scratchpad',
      ].map((name) => skill(name)),
      seed('ideas-backlog', '.oat/ideas/backlog.md', {
        source: 'templates/ideas/ideas-backlog.md',
      }),
      seed('ideas-scratchpad', '.oat/ideas/scratchpad.md', {
        source: 'templates/ideas/ideas-scratchpad.md',
      }),
      template('ideas/idea-discovery.md'),
      template('ideas/idea-summary.md'),
    ],
  },
  {
    name: 'docs',
    allowedScopes: BOTH_SCOPES,
    defaultScope: 'user',
    assets: [
      ...[
        'authoring-docs',
        'oat-agent-instructions-analyze',
        'oat-agent-instructions-apply',
        'oat-docs-analyze',
        'oat-docs-apply',
        'oat-docs-authoring',
        'oat-docs-bootstrap',
      ].map((name) => skill(name)),
      template('docs-app-mkdocs', 'directory'),
      template('docs-app-fuma', 'directory'),
      script('resolve-tracking.sh', 'resolve-tracking'),
    ],
  },
  {
    name: 'workflows',
    allowedScopes: BOTH_SCOPES,
    defaultScope: 'user',
    assets: [
      ...WORKFLOW_SKILL_NAMES.map((name) => skill(name)),
      ...[
        'oat-codebase-mapper.md',
        'oat-phase-implementer.md',
        'oat-reviewer.md',
      ].map((name) => agent(name)),
      ...[
        'state.md',
        'discovery.md',
        'spec.md',
        'design.md',
        'plan.md',
        'plan-lite.md',
        'implementation.md',
        'summary.md',
        'project-log.md',
        'project-retro.md',
      ].map((name) => template(name)),
      ...[
        'generate-oat-state.sh',
        'generate-thin-index.sh',
        'resolve-tracking.sh',
      ].map((name) =>
        script(
          name,
          name === 'resolve-tracking.sh' ? 'resolve-tracking' : undefined,
        ),
      ),
      seed('projects-root', '.oat/projects-root', {
        generation: 'projects-root-default',
        scopes: ['project'],
      }),
      seed('projects-config', '.oat/config.json', {
        generation: 'projects-config-default',
        scopes: ['project'],
      }),
      seed('projects-local-gitkeep', '.oat/projects/local/.gitkeep', {
        generation: 'empty-file',
        scopes: ['project'],
      }),
      seed('projects-archived-gitkeep', '.oat/projects/archived/.gitkeep', {
        generation: 'empty-file',
        scopes: ['project'],
      }),
    ],
  },
  {
    name: 'utility',
    allowedScopes: BOTH_SCOPES,
    defaultScope: 'user',
    assets: [
      ...[
        'create-agnostic-skill',
        'explainer-kit',
        'oat-dispatch-subagents',
        'subagent-orchestration',
        'oat-repo-improve',
        'oat-repo-maintainability-review',
        'oat-review-provide',
        'oat-review-provide-remote',
        'oat-review-receive',
        'oat-review-receive-remote',
      ].map((name) => skill(name)),
    ],
  },
  {
    name: 'project-management',
    allowedScopes: BOTH_SCOPES,
    defaultScope: 'user',
    assets: [
      ...[
        'oat-pjm-add-backlog-item',
        'oat-pjm-decision',
        'oat-pjm-update-repo-reference',
        'oat-pjm-review-backlog',
      ].map((name) => skill(name)),
      ...[
        'backlog-item.md',
        'roadmap.md',
        'current-state.md',
        'decision.md',
        'repo-agents.md',
        'pjm-agents.md',
        'reference-agents.md',
        'repo-readme.md',
        'pjm-handoffs-readme.md',
      ].map((name) => template(name)),
    ],
  },
  {
    name: 'research',
    allowedScopes: BOTH_SCOPES,
    defaultScope: 'user',
    assets: [
      ...[
        'analyze',
        'compare',
        'deep-research',
        'recon',
        'skeptic',
        'synthesize',
      ].map((name) => skill(name)),
      agent('skeptical-evaluator.md'),
      agent('recon-worker.md', { userMaterializable: true }),
    ],
    dependencies: [
      {
        pack: 'utility',
        scope: 'same',
        assets: [
          'skill:oat-dispatch-subagents',
          'skill:subagent-orchestration',
        ],
      },
    ],
  },
  {
    name: 'brainstorm',
    allowedScopes: BOTH_SCOPES,
    defaultScope: 'user',
    assets: [skill('oat-brainstorm')],
  },
];

export function getPackDefinition(pack: PackName): PackDefinition {
  const definition = PACK_MANIFEST.find(({ name }) => name === pack);
  if (!definition) {
    throw new Error(`Unknown pack: ${pack}`);
  }
  return definition;
}

export function getPackAssets(
  pack: PackName,
  kind?: PackAssetKind,
): readonly PackAssetDefinition[] {
  const assets = getPackDefinition(pack).assets;
  return kind ? assets.filter((asset) => asset.kind === kind) : assets;
}

export function getPackMemberNames(
  pack: PackName,
  kind: 'skill' | 'agent' | 'template' | 'script',
): string[] {
  return getPackAssets(pack, kind).map(({ source }) => {
    if (!source) {
      throw new Error(`Pack ${pack} ${kind} asset has no materialized source`);
    }
    const prefix = `${kind === 'template' ? 'templates' : `${kind}s`}/`;
    return source.slice(prefix.length);
  });
}

export function getCanonicalProviderPaths(pack: PackName): string[] {
  return getPackDefinition(pack)
    .assets.filter(({ kind }) => kind === 'skill' || kind === 'agent')
    .map(({ destination }) => destination);
}

function validateRelativePath(
  pack: PackName,
  asset: PackAssetDefinition,
  field: 'source' | 'destination',
): void {
  const value = asset[field];
  if (value === undefined) return;
  const segments = value.replaceAll('\\', '/').split('/');
  if (
    value.length === 0 ||
    isAbsolute(value) ||
    /^[A-Za-z]:[\\/]/.test(value) ||
    segments.includes('..') ||
    posix.normalize(value).startsWith('../')
  ) {
    throw new Error(
      `Pack ${pack} asset ${asset.id} ${field} must be relative to its scope and contain no parent traversal: ${value}`,
    );
  }
}

function validateAsset(pack: PackDefinition, asset: PackAssetDefinition): void {
  if ((asset.source === undefined) === (asset.generation === undefined)) {
    throw new Error(
      `Pack ${pack.name} asset ${asset.id} must declare exactly one source or generation contract`,
    );
  }
  validateRelativePath(pack.name, asset, 'source');
  validateRelativePath(pack.name, asset, 'destination');

  if (asset.scopes.length === 0) {
    throw new Error(`Pack ${pack.name} asset ${asset.id} has no scopes`);
  }

  for (const scope of asset.scopes) {
    if (!pack.allowedScopes.includes(scope)) {
      throw new Error(
        `Pack ${pack.name} asset ${asset.id} uses disallowed scope ${scope}`,
      );
    }
    if (!asset.ownership[scope]) {
      throw new Error(
        `Pack ${pack.name} asset ${asset.id} has no ownership for ${scope}`,
      );
    }
  }

  for (const scope of Object.keys(asset.ownership) as ConcreteScope[]) {
    if (!asset.scopes.includes(scope)) {
      throw new Error(
        `Pack ${pack.name} asset ${asset.id} declares ownership outside scope ${scope}`,
      );
    }
  }

  if (asset.userMaterializable) {
    if (asset.kind !== 'agent') {
      throw new Error(
        `Pack ${pack.name} user materializable asset ${asset.id} must be an agent`,
      );
    }
    if (!asset.scopes.includes('user') || asset.ownership.user !== 'managed') {
      throw new Error(
        `Pack ${pack.name} user materializable agent ${asset.id} must support user scope with managed ownership`,
      );
    }
  }
}

function validateDependencies(
  manifest: readonly PackDefinition[],
  packs: ReadonlyMap<PackName, PackDefinition>,
): void {
  const graph = new Map<PackName, Set<PackName>>();

  for (const pack of manifest) {
    const edges = new Set<string>();
    for (const dependency of pack.dependencies ?? []) {
      if (dependency.scope !== 'same') {
        throw new Error(
          `Pack ${pack.name} dependency on ${dependency.pack} must use same scope`,
        );
      }
      const owner = packs.get(dependency.pack);
      if (!owner) {
        throw new Error(
          `Pack ${pack.name} declares unknown dependency pack ${dependency.pack}`,
        );
      }
      if (dependency.assets.length === 0) {
        throw new Error(
          `Pack ${pack.name} dependency on ${dependency.pack} selects no assets`,
        );
      }
      for (const scope of pack.allowedScopes) {
        if (!owner.allowedScopes.includes(scope)) {
          throw new Error(
            `Pack ${pack.name} dependency on ${dependency.pack} cannot resolve at same scope ${scope}`,
          );
        }
      }
      for (const assetId of dependency.assets) {
        const edge = `${dependency.pack}:${assetId}`;
        if (edges.has(edge)) {
          throw new Error(
            `Pack ${pack.name} has duplicate dependency edge ${edge}`,
          );
        }
        edges.add(edge);
        const asset = owner.assets.find(({ id }) => id === assetId);
        if (!asset) {
          throw new Error(
            `Pack ${pack.name} declares unknown dependency asset ${dependency.pack}/${assetId}`,
          );
        }
        for (const scope of pack.allowedScopes) {
          if (!asset.scopes.includes(scope)) {
            throw new Error(
              `Pack ${pack.name} dependency asset ${dependency.pack}/${assetId} does not support same scope ${scope}`,
            );
          }
        }
      }
      const targets = graph.get(pack.name) ?? new Set<PackName>();
      targets.add(dependency.pack);
      graph.set(pack.name, targets);
    }
  }

  const visiting = new Set<PackName>();
  const visited = new Set<PackName>();
  const visit = (pack: PackName, path: PackName[]): void => {
    if (visiting.has(pack)) {
      throw new Error(`Pack dependency cycle: ${[...path, pack].join(' -> ')}`);
    }
    if (visited.has(pack)) return;
    visiting.add(pack);
    for (const dependency of graph.get(pack) ?? []) {
      visit(dependency, [...path, pack]);
    }
    visiting.delete(pack);
    visited.add(pack);
  };
  for (const pack of packs.keys()) visit(pack, []);
}

export function validatePackManifest(
  manifest: readonly PackDefinition[] = PACK_MANIFEST,
): void {
  const packNames = new Set<PackName>();
  const packs = new Map<PackName, PackDefinition>();
  const destinations = new Map<
    string,
    Array<{ pack: PackName; asset: PackAssetDefinition }>
  >();

  for (const pack of manifest) {
    if (packNames.has(pack.name)) {
      throw new Error(`Duplicate pack name: ${pack.name}`);
    }
    packNames.add(pack.name);
    packs.set(pack.name, pack);

    if (!pack.allowedScopes.includes(pack.defaultScope)) {
      throw new Error(
        `Pack ${pack.name} default scope ${pack.defaultScope} is not allowed`,
      );
    }

    const assetIds = new Set<string>();
    for (const asset of pack.assets) {
      if (assetIds.has(asset.id)) {
        throw new Error(`Duplicate asset ID in pack ${pack.name}: ${asset.id}`);
      }
      assetIds.add(asset.id);
      validateAsset(pack, asset);
      for (const scope of asset.scopes) {
        const key = `${scope}:${asset.destination}`;
        const entries = destinations.get(key) ?? [];
        entries.push({ pack: pack.name, asset });
        destinations.set(key, entries);
      }
    }
  }

  validateDependencies(manifest, packs);

  for (const [destination, entries] of destinations) {
    if (entries.length < 2) continue;
    const [first, ...rest] = entries;
    const compatible =
      first!.asset.sharedOwner !== undefined &&
      rest.every(
        ({ asset }) =>
          asset.sharedOwner === first!.asset.sharedOwner &&
          asset.source === first!.asset.source &&
          asset.kind === first!.asset.kind,
      );
    if (!compatible) {
      throw new Error(
        `Pack assets collide at ${destination} without a compatible shared owner: ${entries.map(({ pack, asset }) => `${pack}/${asset.id}`).join(', ')}`,
      );
    }
  }

  if (manifest === PACK_MANIFEST) {
    const missing = PACK_NAMES.filter((name) => !packNames.has(name));
    if (missing.length > 0 || packNames.size !== PACK_NAMES.length) {
      throw new Error(
        `Pack manifest must cover every PackName exactly once; missing: ${missing.join(', ') || 'none'}`,
      );
    }
  }
}

validatePackManifest();

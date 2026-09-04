#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

export const BUNDLE_INPUTS = Object.freeze({
  skills: Object.freeze([
    'authoring-docs',
    'create-agnostic-skill',
    'explainer-kit',
    'oat-dispatch-subagents',
    'subagent-orchestration',
    'oat-agent-instructions-analyze',
    'oat-agent-instructions-apply',
    'oat-brainstorm',
    'oat-docs',
    'oat-docs-analyze',
    'oat-docs-apply',
    'oat-docs-authoring',
    'oat-docs-bootstrap',
    'oat-doctor',
    'oat-explainer-kit',
    'oat-repo-improve',
    'oat-repo-maintainability-review',
    'oat-idea-ideate',
    'oat-idea-new',
    'oat-idea-scratchpad',
    'oat-idea-summarize',
    'oat-pjm-add-backlog-item',
    'oat-pjm-decision',
    'oat-pjm-review-backlog',
    'oat-pjm-update-repo-reference',
    'oat-cursor-cloud-projects',
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
    'oat-review-provide',
    'oat-review-provide-remote',
    'oat-review-receive',
    'oat-review-receive-remote',
    'oat-worktree-bootstrap',
    'oat-worktree-bootstrap-auto',
    'oat-wave-execute',
    'oat-wave-program',
    'oat-wrap-up',
    'analyze',
    'compare',
    'deep-research',
    'recon',
    'skeptic',
    'synthesize',
  ]),
  agents: Object.freeze([
    'oat-codebase-mapper.md',
    'oat-phase-implementer.md',
    'oat-reviewer.md',
    'recon-worker.md',
    'skeptical-evaluator.md',
  ]),
  templateFiles: Object.freeze([
    'backlog-item.md',
    'roadmap.md',
    'current-state.md',
    'decision.md',
    'repo-agents.md',
    'pjm-agents.md',
    'reference-agents.md',
    'repo-readme.md',
    'pjm-handoffs-readme.md',
    'state.md',
    'discovery.md',
    'spec.md',
    'design.md',
    'plan.md',
    'implementation.md',
    'summary.md',
    'project-log.md',
    'project-retro.md',
  ]),
  templateDirectories: Object.freeze([
    'ideas',
    'docs-app-mkdocs',
    'docs-app-fuma',
  ]),
  oatScripts: Object.freeze([
    'generate-oat-state.sh',
    'generate-thin-index.sh',
    'resolve-tracking.sh',
  ]),
  linkedFiles: Object.freeze([
    '.agents/docs/agent-instruction.md',
    '.agents/docs/autonomy-contract.md',
    '.agents/docs/cursor-rules-files.md',
    '.agents/docs/provider-reference.md',
    '.agents/docs/rules-files.md',
    '.agents/docs/skills-guide.md',
  ]),
  publicVersionPackages: Object.freeze([
    'cli',
    'docs-config',
    'docs-theme',
    'docs-transforms',
  ]),
  packageDirectories: Object.freeze([
    'packages/cli',
    'packages/control-plane',
    'packages/docs-config',
    'packages/docs-theme',
    'packages/docs-transforms',
  ]),
  rootBuildFiles: Object.freeze([
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'tsconfig.json',
    'turbo.json',
  ]),
  docsRoot: 'apps/oat-docs/docs',
  migrationPrompt: 'packages/cli/config/pjm-restructure.md',
  dispatchMatrix: 'packages/cli/config/dispatch-matrix-recommendation.json',
});

export function releaseCandidatePathspecGroups() {
  return [
    [
      ...BUNDLE_INPUTS.packageDirectories,
      ':(exclude)packages/cli/assets',
      ':(exclude)packages/*/dist',
      ':(exclude)packages/*/tsconfig.tsbuildinfo',
    ],
    [
      ...BUNDLE_INPUTS.rootBuildFiles,
      ...BUNDLE_INPUTS.skills.map((name) => `.agents/skills/${name}`),
      ...BUNDLE_INPUTS.agents.map((name) => `.agents/agents/${name}`),
      ...BUNDLE_INPUTS.templateFiles.map((name) => `.oat/templates/${name}`),
      ...BUNDLE_INPUTS.templateDirectories.map(
        (name) => `.oat/templates/${name}`,
      ),
      ...BUNDLE_INPUTS.oatScripts.map((name) => `.oat/scripts/${name}`),
      ...BUNDLE_INPUTS.linkedFiles,
      BUNDLE_INPUTS.docsRoot,
      BUNDLE_INPUTS.migrationPrompt,
      BUNDLE_INPUTS.dispatchMatrix,
    ],
  ];
}

function printList(name) {
  const values = BUNDLE_INPUTS[name];
  if (!Array.isArray(values)) {
    throw new Error(`Unknown bundle inventory list: ${name}.`);
  }
  process.stdout.write(`${values.join('\n')}\n`);
}

function printValue(name) {
  const value = BUNDLE_INPUTS[name];
  if (typeof value !== 'string') {
    throw new Error(`Unknown bundle inventory value: ${name}.`);
  }
  process.stdout.write(`${value}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [command, name] = process.argv.slice(2);
  if (command === '--json' && name === undefined) {
    process.stdout.write(`${JSON.stringify(BUNDLE_INPUTS)}\n`);
  } else if (command === '--list' && name) {
    printList(name);
  } else if (command === '--get' && name) {
    printValue(name);
  } else {
    process.stderr.write(
      'Usage: bundle-inputs.mjs --json | --list <inventory-key> | --get <inventory-key>\n',
    );
    process.exitCode = 1;
  }
}

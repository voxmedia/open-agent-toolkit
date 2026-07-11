import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(fixtureRoot, "project");

function frontmatter(source) {
  const match = source.match(/^---\n(?<content>[\s\S]*?)\n---/);

  assert.ok(match, "fixture artifact must have YAML frontmatter");
  return match.groups.content;
}

test("fixture plan preserves the canonical format contract", () => {
  const plan = readFileSync(path.join(projectRoot, "plan.md"), "utf8");
  const yaml = frontmatter(plan);

  for (const [key, value] of [
    ["oat_plan_source", "quick"],
    ["oat_status", "in_progress"],
    ["oat_ready_for", "null"],
    ["oat_template", "true"],
  ]) {
    assert.match(
      yaml,
      new RegExp(`^${key}: ${value}$`, "m"),
      `plan frontmatter must declare ${key}`,
    );
  }

  const taskHeadings = [...plan.matchAll(/^### Task (p\d{2}-t\d{2}): .+$/gm)];
  assert.equal(taskHeadings.length, 9, "fixture must have nine task headings");
  assert.deepEqual(
    taskHeadings.map((match) => match[1]),
    [
      "p01-t01",
      "p01-t02",
      "p01-t03",
      "p02-t01",
      "p02-t02",
      "p02-t03",
      "p03-t01",
      "p03-t02",
      "p03-t03",
    ],
    "task headings must retain stable pNN-tNN identifiers",
  );

  assert.match(
    plan,
    /^\| Scope\s+\| Type\s+\| Status\s+\| Date\s+\| Artifact \|$/m,
    "reviews table must include the canonical Date column",
  );
  for (const [scope, type] of [
    ["p01", "code"],
    ["p02", "code"],
    ["p03", "code"],
    ["final", "code"],
    ["spec", "artifact"],
    ["design", "artifact"],
    ["plan", "artifact"],
  ]) {
    assert.match(
      plan,
      new RegExp(
        `^\\|\\s*${scope}\\s*\\|\\s*${type}\\s*\\|\\s*pending\\s*\\|\\s*-\\s*\\|\\s*-\\s*\\|$`,
        "m",
      ),
      `missing required review row for ${scope}`,
    );
  }
});

test("fixture state preserves quick-mode lifecycle and sparse dispatch policy", () => {
  const state = readFileSync(path.join(projectRoot, "state.md"), "utf8");
  const yaml = frontmatter(state);

  for (const [key, value] of [
    ["oat_current_task", "null"],
    ["oat_status", "in_progress"],
    ["oat_ready_for", "null"],
    ["oat_template", "true"],
    ["oat_kind", "implementation"],
    ["oat_phase", "plan"],
    ["oat_phase_status", "in_progress"],
    ["oat_workflow_mode", "quick"],
    ["oat_workflow_origin", "native"],
    ["oat_generated", "false"],
  ]) {
    assert.match(
      yaml,
      new RegExp(`^${key}: ${value}$`, "m"),
      `state frontmatter must declare ${key}`,
    );
  }
  assert.match(yaml, /^oat_dispatch_policy:\n/m);
  assert.match(yaml, /^  mode: managed$/m);
  assert.match(yaml, /^  policy: high$/m);
  assert.match(yaml, /^  source: project-state$/m);
  for (const [provider, candidate] of [
    ["codex", "gpt-5.6-terra"],
    ["claude", "sonnet"],
    ["cursor", "fixture-cursor-opaque-medium"],
  ]) {
    assert.match(
      yaml,
      new RegExp(
        `^    ${provider}:\\n      high:\\n        candidates:\\n[\\s\\S]*?${candidate}`,
        "m",
      ),
      `state must retain the ${provider} sparse high-tier candidate`,
    );
  }
  assert.doesNotMatch(
    yaml,
    /^\s*(?:selection|requestedCandidate|resolved|dispatchArgs|target):/m,
    "state must not persist compiled selection or dispatch results",
  );
});

test("completed fixture discovery and design are durable artifacts", () => {
  for (const artifact of ["discovery.md", "design.md"]) {
    const yaml = frontmatter(
      readFileSync(path.join(projectRoot, artifact), "utf8"),
    );

    assert.match(yaml, /^oat_status: complete$/m);
    assert.match(yaml, /^oat_template: false$/m);
  }
});

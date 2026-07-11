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

  for (const [scope, type] of [
    ["p01", "code"],
    ["p02", "code"],
    ["p03", "code"],
    ["spec", "artifact"],
    ["design", "artifact"],
    ["plan", "artifact"],
  ]) {
    assert.match(
      plan,
      new RegExp(
        `^\\|\\s*${scope}\\s*\\|\\s*${type}\\s*\\|\\s*pending\\s*\\|\\s*-\\s*\\|$`,
        "m",
      ),
      `missing required review row for ${scope}`,
    );
  }
});

test("fixture state keeps only a named dispatch ceiling", () => {
  const state = readFileSync(path.join(projectRoot, "state.md"), "utf8");
  const yaml = frontmatter(state);

  assert.match(yaml, /^oat_dispatch_policy:\n/m);
  assert.match(yaml, /^  mode: managed$/m);
  assert.match(yaml, /^  policy: high$/m);
  assert.match(yaml, /^  source: project-state$/m);
  assert.doesNotMatch(
    yaml,
    /^\s*(?:matrix|providers|candidates|model|effort|target):/m,
    "state must not persist compiled provider targets",
  );
});

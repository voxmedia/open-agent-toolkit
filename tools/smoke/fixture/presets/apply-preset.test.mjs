import assert from "node:assert/strict";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const presetsRoot = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.dirname(presetsRoot);
const fixtureProjectRoot = path.join(fixtureRoot, "project");
const applierPath = path.join(presetsRoot, "apply-preset.mjs");

function createFixtureCopy() {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "oat-fixture-"));
  const projectRoot = path.join(temporaryRoot, "project");

  cpSync(fixtureProjectRoot, projectRoot, { recursive: true });

  return { projectRoot, temporaryRoot };
}

function runPreset(presetName, projectRoot) {
  return spawnSync(process.execPath, [applierPath, presetName, projectRoot], {
    encoding: "utf8",
  });
}

test("implementation-ready produces implementation-ready frontmatter", (t) => {
  const { projectRoot, temporaryRoot } = createFixtureCopy();
  t.after(() => rmSync(temporaryRoot, { force: true, recursive: true }));

  const result = runPreset("implementation-ready", projectRoot);

  assert.equal(result.status, 0, result.stderr);
  const plan = readFileSync(path.join(projectRoot, "plan.md"), "utf8");
  const implementation = readFileSync(
    path.join(projectRoot, "implementation.md"),
    "utf8",
  );
  assert.match(plan, /^oat_status: complete$/m);
  assert.match(plan, /^oat_ready_for: oat-project-implement$/m);
  assert.match(plan, /^oat_template: false$/m);
  assert.match(plan, /^\| plan\s+\| artifact \| passed\s+\| -\s+\|$/m);
  assert.match(implementation, /^oat_current_task_id: p01-t01$/m);
});

test("pre-review restores the canonical fixture shape", (t) => {
  const { projectRoot, temporaryRoot } = createFixtureCopy();
  t.after(() => rmSync(temporaryRoot, { force: true, recursive: true }));

  assert.equal(runPreset("implementation-ready", projectRoot).status, 0);
  assert.equal(runPreset("pre-review", projectRoot).status, 0);

  for (const artifact of ["plan.md", "implementation.md"]) {
    assert.equal(
      readFileSync(path.join(projectRoot, artifact), "utf8"),
      readFileSync(path.join(fixtureProjectRoot, artifact), "utf8"),
      `${artifact} must match the canonical fixture after reset`,
    );
  }
});

test("unknown presets fail closed without changing the fixture copy", (t) => {
  const { projectRoot, temporaryRoot } = createFixtureCopy();
  t.after(() => rmSync(temporaryRoot, { force: true, recursive: true }));

  const planPath = path.join(projectRoot, "plan.md");
  const implementationPath = path.join(projectRoot, "implementation.md");
  const beforePlan = readFileSync(planPath, "utf8");
  const beforeImplementation = readFileSync(implementationPath, "utf8");
  const result = runPreset("unknown-preset", projectRoot);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown preset/i);
  assert.equal(readFileSync(planPath, "utf8"), beforePlan);
  assert.equal(readFileSync(implementationPath, "utf8"), beforeImplementation);
});

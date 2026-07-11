import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const presetsRoot = path.dirname(fileURLToPath(import.meta.url));

function applyFrontmatter(source, overlay) {
  const match = source.match(/^(---\n)([\s\S]*?)(\n---\n)/);

  if (!match) {
    throw new Error("artifact is missing YAML frontmatter");
  }

  let frontmatter = match[2];
  for (const [key, value] of Object.entries(overlay)) {
    const line = new RegExp(`^${key}:.*$`, "m");

    frontmatter = line.test(frontmatter)
      ? frontmatter.replace(line, `${key}: ${value}`)
      : `${frontmatter}\n${key}: ${value}`;
  }

  return `${match[1]}${frontmatter}${match[3]}${source.slice(match[0].length)}`;
}

function applyPlanReviewRow(source, row) {
  const reviewRow = /^\| plan\s+\| artifact \| [^|]+ \| [^|]+\|$/m;

  if (!reviewRow.test(source)) {
    throw new Error("plan is missing its review row");
  }

  return source.replace(reviewRow, row);
}

export function applyPreset(artifacts, preset) {
  if (!preset?.plan?.frontmatter || !preset?.implementation?.frontmatter) {
    throw new Error("invalid preset");
  }

  return {
    implementation: applyFrontmatter(
      artifacts.implementation,
      preset.implementation.frontmatter,
    ),
    plan: applyPlanReviewRow(
      applyFrontmatter(artifacts.plan, preset.plan.frontmatter),
      preset.plan.planReviewRow,
    ),
  };
}

function readPreset(name) {
  const presetPath = path.join(presetsRoot, `${name}.json`);

  try {
    const preset = JSON.parse(readFileSync(presetPath, "utf8"));

    if (preset.name !== name) {
      throw new Error("preset name does not match its filename");
    }

    return preset;
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`unknown preset: ${name}`);
    }

    throw error;
  }
}

function applyPresetToFixture(name, projectRoot) {
  const preset = readPreset(name);
  const planPath = path.join(projectRoot, "plan.md");
  const implementationPath = path.join(projectRoot, "implementation.md");
  const updated = applyPreset(
    {
      implementation: readFileSync(implementationPath, "utf8"),
      plan: readFileSync(planPath, "utf8"),
    },
    preset,
  );

  writeFileSync(planPath, updated.plan);
  writeFileSync(implementationPath, updated.implementation);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , presetName, projectRoot] = process.argv;

  if (!presetName || !projectRoot) {
    console.error("usage: node apply-preset.mjs <preset-name> <fixture-project>");
    process.exitCode = 1;
  } else {
    try {
      applyPresetToFixture(presetName, path.resolve(projectRoot));
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}

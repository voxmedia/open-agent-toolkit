import {
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const presetsRoot = path.dirname(fileURLToPath(import.meta.url));
const artifactFiles = {
  implementation: "implementation.md",
  plan: "plan.md",
  state: "state.md",
};
const defaultFileSystem = {
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
};

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
  const reviewRow =
    /^\| plan\s+\| artifact \| [^|\n]+ \| [^|\n]+ \| [^|\n]+ \|$/m;

  if (!reviewRow.test(source)) {
    throw new Error("plan is missing its review row");
  }

  return source.replace(reviewRow, row);
}

export function applyPreset(artifacts, preset) {
  if (
    !preset?.state?.frontmatter ||
    !preset?.plan?.frontmatter ||
    !preset?.implementation?.frontmatter
  ) {
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
    state: applyFrontmatter(artifacts.state, preset.state.frontmatter),
  };
}

function readPreset(name, fileSystem) {
  const presetPath = path.join(presetsRoot, `${name}.json`);

  try {
    const preset = JSON.parse(fileSystem.readFileSync(presetPath, "utf8"));

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

function publishArtifacts(
  projectRoot,
  originals,
  updated,
  fileSystem,
  transactionId,
) {
  const transaction = Object.entries(artifactFiles).map(
    ([artifact, filename]) => {
      const artifactPath = path.join(projectRoot, filename);

      return {
        artifact,
        artifactPath,
        temporaryPath: `${artifactPath}.preset-${transactionId}.tmp`,
      };
    },
  );

  try {
    for (const { artifact, temporaryPath } of transaction) {
      fileSystem.writeFileSync(temporaryPath, updated[artifact]);
    }

    try {
      for (const { artifactPath, temporaryPath } of transaction) {
        fileSystem.renameSync(temporaryPath, artifactPath);
      }
    } catch (publishError) {
      const rollbackErrors = [];

      for (const { artifact, artifactPath } of transaction) {
        try {
          fileSystem.writeFileSync(artifactPath, originals[artifact]);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }

      if (rollbackErrors.length > 0) {
        throw new AggregateError(
          [publishError, ...rollbackErrors],
          "preset publish failed and rollback was incomplete",
        );
      }

      throw publishError;
    }
  } finally {
    for (const { temporaryPath } of transaction) {
      fileSystem.rmSync(temporaryPath, { force: true });
    }
  }
}

export function applyPresetToFixture(
  name,
  projectRoot,
  {
    fileSystem = defaultFileSystem,
    transactionId = `${process.pid}-${randomUUID()}`,
  } = {},
) {
  const preset = readPreset(name, fileSystem);
  const originals = Object.fromEntries(
    Object.entries(artifactFiles).map(([artifact, filename]) => [
      artifact,
      fileSystem.readFileSync(path.join(projectRoot, filename), "utf8"),
    ]),
  );
  const updated = applyPreset(originals, preset);

  publishArtifacts(
    projectRoot,
    originals,
    updated,
    fileSystem,
    transactionId,
  );
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

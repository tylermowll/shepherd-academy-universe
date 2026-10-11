import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function versionParts(version) {
  if (typeof version !== "string" || !stableVersionPattern.test(version)) {
    throw new Error(
      `Invalid version ${JSON.stringify(version)}; expected a stable major.minor.patch release.`,
    );
  }
  const parts = version.split(".").map(Number);
  if (!parts.every(Number.isSafeInteger)) {
    throw new Error(`Invalid version ${JSON.stringify(version)}.`);
  }
  return parts;
}

export function minimumVersion(requirement) {
  if (typeof requirement !== "string" || !requirement.startsWith(">=")) {
    throw new Error(
      `Invalid minimum requirement ${JSON.stringify(requirement)}; expected >=major.minor.patch.`,
    );
  }
  const minimum = requirement.slice(2).trim();
  versionParts(minimum);
  return minimum;
}

export function meetsMinimum(version, requirement) {
  const expected = versionParts(minimumVersion(requirement));
  const actual = versionParts(version);
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) {
      return actual[index] > expected[index];
    }
  }
  return true;
}

function requireMinimum(name, version, requirement) {
  const minimum = minimumVersion(requirement);
  try {
    if (meetsMinimum(version, requirement)) return;
  } catch (error) {
    throw new Error(`${name}: ${error.message}`, { cause: error });
  }
  throw new Error(`Use ${name} ${minimum} or newer; found ${version}.`);
}

function checkToolchain() {
  const root = new URL("../", import.meta.url);
  const manifest = JSON.parse(
    readFileSync(new URL("package.json", root), "utf8"),
  );
  const nodeRequirement = manifest.engines?.node;
  const pnpmRequirement = manifest.engines?.pnpm;
  const pnpmMinimum = minimumVersion(pnpmRequirement);
  const actualNode = process.versions.node;
  requireMinimum("Node.js", actualNode, nodeRequirement);

  const pnpm = spawnSync("pnpm", ["--version"], { encoding: "utf8" });
  if (pnpm.error || pnpm.status !== 0) {
    throw new Error(
      `Unable to run pnpm --version. Install pnpm ${pnpmMinimum} or newer: npm install --global pnpm@${pnpmMinimum}`,
    );
  }
  const actualPnpm = pnpm.stdout.trim();
  requireMinimum("pnpm", actualPnpm, pnpmRequirement);
  console.log(`Toolchain: Node.js ${actualNode}, pnpm ${actualPnpm}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    checkToolchain();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

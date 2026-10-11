import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { meetsMinimum, minimumVersion } from "./check-toolchain.mjs";

test("minimum versions accept equality and every newer release", () => {
  for (const version of ["26.1.0", "26.1.1", "26.2.0", "27.0.0"]) {
    assert.equal(meetsMinimum(version, ">=26.1.0"), true, version);
  }
  for (const version of ["25.99.99", "26.0.99"]) {
    assert.equal(meetsMinimum(version, ">=26.1.0"), false, version);
  }
});

test("only stable versions and a single minimum requirement are accepted", () => {
  for (const version of [
    "26.1",
    "v26.1.0",
    "26.1.0-rc.1",
    "26.1.0+build",
    "026.1.0",
    "9007199254740992.1.0",
    "",
  ]) {
    assert.throws(() => meetsMinimum(version, ">=26.1.0"), /Invalid version/);
  }
  for (const requirement of [
    "26.1.0",
    ">=26.1.0 <27",
    ">=26.1.0-rc.1",
    ">=26.1",
    undefined,
  ]) {
    assert.throws(() => minimumVersion(requirement), /Invalid/);
  }
});

function runFixture(
  t,
  { node = "26.1.0", pnpm = "12.10.1", pnpmExit = 0 } = {},
) {
  const root = mkdtempSync(join(tmpdir(), "shepherd-toolchain-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const scripts = join(root, "scripts");
  const bin = join(root, "bin");
  mkdirSync(scripts);
  mkdirSync(bin);
  const script = join(scripts, "check-toolchain.mjs");
  copyFileSync(new URL("./check-toolchain.mjs", import.meta.url), script);
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      engines: { node: ">=26.1.0", pnpm: ">=12.10.1" },
      packageManager: "pnpm@12.10.1",
    }),
  );
  // Installer baselines must not override the manifest's supported minimums.
  writeFileSync(join(root, ".node-version"), "26.0.0\n");
  const preload = join(root, "node-version.mjs");
  writeFileSync(
    preload,
    `Object.defineProperty(process.versions, "node", { value: ${JSON.stringify(node)} });\n`,
  );
  if (pnpm !== null) {
    const pnpmCommand = join(bin, "pnpm");
    writeFileSync(
      pnpmCommand,
      `#!/bin/sh\nprintf '%s\\n' '${pnpm}'\nexit ${pnpmExit}\n`,
    );
    chmodSync(pnpmCommand, 0o755);
  }
  return spawnSync(process.execPath, ["--import", preload, script], {
    encoding: "utf8",
    env: { ...process.env, PATH: bin },
  });
}

test("the command accepts floor versions", (t) => {
  const result = runFixture(t);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Toolchain: Node.js 26\.1\.0, pnpm 12\.10\.1/);
});

test("the command accepts newer Node and pnpm majors", (t) => {
  const result = runFixture(t, { node: "27.0.0", pnpm: "13.0.0" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Toolchain: Node.js 27\.0\.0, pnpm 13\.0\.0/);
});

test("the command rejects a Node version below the manifest floor", (t) => {
  const result = runFixture(t, { node: "26.0.0" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Use Node.js 26\.1\.0 or newer; found 26\.0\.0/);
});

test("the command rejects malformed and prerelease Node versions", (t) => {
  for (const node of ["26.1", "27.0.0-rc.1"]) {
    const result = runFixture(t, { node });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Node.js: Invalid version.*stable/);
  }
});

test("the command rejects pnpm below its floor", (t) => {
  const result = runFixture(t, { pnpm: "12.10.0" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Use pnpm 12\.10\.1 or newer; found 12\.10\.0/);
});

test("the command rejects malformed and prerelease pnpm versions", (t) => {
  for (const pnpm of ["unexpected output", "13.0.0-rc.1"]) {
    const result = runFixture(t, { pnpm });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /pnpm: Invalid version.*stable/);
  }
});

test("the command explains missing pnpm", (t) => {
  const result = runFixture(t, { pnpm: null });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unable to run pnpm --version/);
  assert.match(result.stderr, /npm install --global pnpm@12\.10\.1/);
});

test("the command rejects a failed pnpm version command", (t) => {
  const result = runFixture(t, { pnpmExit: 1 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unable to run pnpm --version/);
});

test("workspace policy preserves the installed pnpm despite an installer pin", (t) => {
  const root = mkdtempSync(join(tmpdir(), "shepherd-pnpm-policy-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  copyFileSync(
    new URL("../pnpm-workspace.yaml", import.meta.url),
    join(root, "pnpm-workspace.yaml"),
  );
  const env = {
    ...process.env,
    PNPM_HOME: join(root, "pnpm-home"),
    XDG_CONFIG_HOME: join(root, "config"),
    npm_config_userconfig: join(root, "empty.npmrc"),
  };
  writeFileSync(env.npm_config_userconfig, "");
  // Exercise the checked-in policy without a caller overriding its behavior.
  for (const name of Object.keys(env)) {
    if (/^pnpm_config_pm_on_fail$/i.test(name)) delete env[name];
  }
  const version = () => {
    const result = spawnSync("pnpm", ["--version"], {
      cwd: root,
      env,
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/);
    return result.stdout.trim();
  };
  const installed = version();
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "synthetic-pnpm-policy-test",
      private: true,
      packageManager: "pnpm@0.0.0",
    }),
  );
  assert.equal(version(), installed);
});

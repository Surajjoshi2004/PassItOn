import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";

const testFiles = readdirSync(new URL(".", import.meta.url))
  .filter((file) => file.endsWith(".test.js"))
  .map((file) => `test/${file}`);

const result = spawnSync(process.execPath, [
  "--experimental-test-module-mocks",
  "--test",
  ...testFiles,
], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "test" },
});

process.exit(result.status ?? 1);

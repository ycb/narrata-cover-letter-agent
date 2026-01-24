const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const gitDir = path.join(repoRoot, ".git");

if (!fs.existsSync(gitDir)) {
  console.log("install-githooks: .git not found, skipping.");
  process.exit(0);
}

try {
  execSync("git rev-parse --git-dir", { cwd: repoRoot, stdio: "ignore" });
} catch (error) {
  console.log("install-githooks: git not available, skipping.");
  process.exit(0);
}

const hooksPath = path.join(repoRoot, ".githooks");
fs.mkdirSync(hooksPath, { recursive: true });

const prePushHook = path.join(hooksPath, "pre-push");
if (fs.existsSync(prePushHook)) {
  fs.chmodSync(prePushHook, 0o755);
} else {
  console.log("install-githooks: .githooks/pre-push missing.");
}

execSync("git config core.hooksPath .githooks", { cwd: repoRoot });
console.log("install-githooks: core.hooksPath set to .githooks.");

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const COVERAGE_FILE = path.join(ROOT, 'coverage-core', 'coverage-final.json');
const MIN_COVERAGE = Number.parseFloat(process.env.DIFF_COVERAGE_MIN || '80');

const CORE_PATHS = [
  'src/services',
  'src/hooks',
  'src/lib',
  'src/pages/api',
  'src/utils',
];

const IGNORED_PATH_PATTERNS = [
  /__tests__/,
  /\.test\./,
  /\.spec\./,
  /^src\/test\//,
];

const resolveBaseRef = () => {
  const candidates = [];
  if (process.env.GITHUB_BASE_REF) {
    candidates.push(`origin/${process.env.GITHUB_BASE_REF}`);
  }
  candidates.push('origin/main', 'HEAD~1');

  for (const ref of candidates) {
    try {
      execSync(`git rev-parse ${ref}`, { stdio: 'ignore' });
      return ref;
    } catch (error) {
      continue;
    }
  }
  return null;
};

const getDiffOutput = (baseRef) => {
  const diffCmd = `git diff --unified=0 ${baseRef}...HEAD -- ${CORE_PATHS.join(' ')}`;
  try {
    return execSync(diffCmd, { encoding: 'utf8' });
  } catch (error) {
    const stdout = error && error.stdout ? String(error.stdout) : '';
    if (stdout) return stdout;
    throw error;
  }
};

const shouldIgnorePath = (filePath) =>
  IGNORED_PATH_PATTERNS.some((pattern) => pattern.test(filePath));

const parseDiff = (diffOutput) => {
  const changedLines = new Map();
  let currentFile = null;
  let newLine = null;

  for (const rawLine of diffOutput.split('\n')) {
    if (rawLine.startsWith('diff --git')) {
      currentFile = null;
      newLine = null;
      continue;
    }
    if (rawLine.startsWith('+++ ')) {
      if (rawLine.includes('/dev/null')) {
        currentFile = null;
        continue;
      }
      currentFile = rawLine.slice(4).replace(/^b\//, '');
      if (shouldIgnorePath(currentFile)) {
        currentFile = null;
      }
      continue;
    }
    if (rawLine.startsWith('@@')) {
      const match = rawLine.match(/\+(\d+)(?:,(\d+))?/);
      if (match) {
        newLine = Number.parseInt(match[1], 10);
      }
      continue;
    }
    if (!currentFile || newLine === null) {
      continue;
    }
    if (rawLine.startsWith('+') && !rawLine.startsWith('+++')) {
      const lines = changedLines.get(currentFile) || new Set();
      lines.add(newLine);
      changedLines.set(currentFile, lines);
      newLine += 1;
      continue;
    }
    if (rawLine.startsWith(' ')) {
      newLine += 1;
      continue;
    }
    if (rawLine.startsWith('-') && !rawLine.startsWith('---')) {
      continue;
    }
    if (rawLine.startsWith('\\')) {
      continue;
    }
  }

  return changedLines;
};

const findCoverageEntry = (coverage, filePath) => {
  const absPath = path.resolve(ROOT, filePath);
  if (coverage[absPath]) return coverage[absPath];
  if (coverage[filePath]) return coverage[filePath];
  const normalizedTarget = path.normalize(filePath);
  const matchKey = Object.keys(coverage).find((key) =>
    path.normalize(key).endsWith(normalizedTarget),
  );
  return matchKey ? coverage[matchKey] : null;
};

const formatLineList = (lines) => lines.sort((a, b) => a - b).join(', ');

const main = () => {
  if (!fs.existsSync(COVERAGE_FILE)) {
    console.error(`[diff-coverage] Missing coverage file at ${COVERAGE_FILE}`);
    process.exit(1);
  }

  const baseRef = resolveBaseRef();
  if (!baseRef) {
    console.log('[diff-coverage] No base ref found; skipping.');
    process.exit(0);
  }

  const diffOutput = getDiffOutput(baseRef);
  if (!diffOutput.trim()) {
    console.log('[diff-coverage] No core-scope changes detected.');
    process.exit(0);
  }

  const changedLines = parseDiff(diffOutput);
  if (changedLines.size === 0) {
    console.log('[diff-coverage] No executable core changes detected.');
    process.exit(0);
  }

  const coverage = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));
  let total = 0;
  let covered = 0;
  const uncoveredByFile = new Map();

  for (const [filePath, lines] of changedLines.entries()) {
    const entry = findCoverageEntry(coverage, filePath);
    const lineMap = entry && entry.l ? entry.l : null;

    for (const line of lines) {
      if (!lineMap) {
        total += 1;
        const missing = uncoveredByFile.get(filePath) || new Set();
        missing.add(line);
        uncoveredByFile.set(filePath, missing);
        continue;
      }
      const hits = lineMap[String(line)];
      if (hits === undefined) {
        continue;
      }
      total += 1;
      if (hits > 0) {
        covered += 1;
      } else {
        const missing = uncoveredByFile.get(filePath) || new Set();
        missing.add(line);
        uncoveredByFile.set(filePath, missing);
      }
    }
  }

  if (total === 0) {
    console.log('[diff-coverage] No coverable changed lines detected.');
    process.exit(0);
  }

  const percent = (covered / total) * 100;
  const summary = `[diff-coverage] ${covered}/${total} lines covered (${percent.toFixed(2)}%)`;

  if (percent < MIN_COVERAGE) {
    console.error(summary);
    console.error(`[diff-coverage] Minimum required: ${MIN_COVERAGE}%`);
    for (const [filePath, lines] of uncoveredByFile.entries()) {
      const list = formatLineList([...lines]);
      console.error(`[diff-coverage] Uncovered: ${filePath}:${list}`);
    }
    process.exit(1);
  }

  console.log(summary);
  process.exit(0);
};

main();

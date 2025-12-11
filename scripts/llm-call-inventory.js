/**
 * Quick helper to list LLM call sites from the codebase.
 * Uses ripgrep to find `callOpenAI` and `streamText` occurrences in src/ and supabase/.
 *
 * Usage: node scripts/llm-call-inventory.js
 */
import { execSync } from 'node:child_process';

const patterns = ['callOpenAI', 'streamText'];
const roots = ['src', 'supabase'];

function runRg(pattern) {
  const cmd = `rg --no-heading -g"*.ts" "${pattern}" ${roots.join(' ')}`;
  try {
    const output = execSync(cmd, { encoding: 'utf8' });
    const lines = output.trim().split('\n').filter(Boolean);
    const files = new Set(lines.map((line) => line.split(':')[0]));
    return { count: lines.length, files: Array.from(files).sort() };
  } catch (err) {
    if (err.stdout) {
      const lines = err.stdout.trim().split('\n').filter(Boolean);
      const files = new Set(lines.map((line) => line.split(':')[0]));
      return { count: lines.length, files: Array.from(files).sort() };
    }
    console.error(`Failed to run rg for pattern "${pattern}". Is ripgrep installed?`);
    return { count: 0, files: [] };
  }
}

function main() {
  console.log('LLM Call Inventory (callOpenAI / streamText)');
  console.log('===========================================\n');

  patterns.forEach((pattern) => {
    const { count, files } = runRg(pattern);
    console.log(`${pattern}: ${count} hits across ${files.length} files`);
    files.forEach((f) => console.log(`  - ${f}`));
    console.log('');
  });
}

main();

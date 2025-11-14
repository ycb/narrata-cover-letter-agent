/**
 * Real data pipeline runner
 * Usage examples:
 *  - tsx scripts/run-real-data-pipeline.ts --data-root /Users/admin/narrata/data
 *  - tsx scripts/run-real-data-pipeline.ts --config ./real-data.config.json --dry-run
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RealDataPipeline, buildSourceConfigs, type SourceConfig, type PipelineRunOptions } from '@/services/realDataPipeline';

type ParsedArgs = Record<string, string | boolean | string[]>;

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {};
  let i = 0;
  while (i < argv.length) {
    const token = argv[i]!;
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
        i += 1;
      } else {
        if (args[key]) {
          const existing = Array.isArray(args[key]) ? (args[key] as string[]) : [String(args[key])];
          args[key] = [...existing, next];
        } else {
          args[key] = next;
        }
        i += 2;
      }
    } else {
      i += 1;
    }
  }
  return args;
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

async function loadEnvFile(relativePath: string): Promise<Record<string, string>> {
  if (!existsSync(relativePath)) return {};
  const content = await readFile(relativePath, 'utf-8');
  const envVars: Record<string, string> = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key) {
      envVars[key] = value;
      if (typeof process.env[key] === 'undefined') {
        process.env[key] = value;
      }
    }
  });
  return envVars;
}

async function loadPipelineConfig(configPath: string): Promise<SourceConfig[]> {
  const absolutePath = resolve(configPath);
  const content = await readFile(absolutePath, 'utf-8');
  const parsed = JSON.parse(content) as { sources?: SourceConfig[] };
  if (!parsed.sources || !Array.isArray(parsed.sources)) {
    throw new Error('Invalid config: expected { "sources": [...] } structure');
  }
  return parsed.sources;
}

function filterSources(sources: SourceConfig[], filter: string[] = []): SourceConfig[] {
  if (!filter.length) return sources;
  const ids = new Set(filter);
  return sources.filter(source => ids.has(source.id));
}

function parseTargetDistribution(input: string): PipelineRunOptions['targetDistribution'] {
  const defaults = { early: 2, mid: 6, leader: 2 };
  const parts = input.split(',');
  parts.forEach(part => {
    const [key, value] = part.split('=');
    if (!key || !value) return;
    const normalizedKey = key.trim() as keyof typeof defaults;
    if (normalizedKey in defaults) {
      const numericValue = Number(value);
      if (Number.isFinite(numericValue)) {
        defaults[normalizedKey] = numericValue;
      }
    }
  });
  return defaults;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = resolve(__filename, '..');

  // Load environment configuration
  const projectRoot = resolve(__dirname, '..');
  const envPaths = [
    join(projectRoot, '.env.local'),
    join(projectRoot, '.env')
  ];
  for (const envPath of envPaths) {
    await loadEnvFile(envPath);
  }

  const dataRootArg = args['data-root'] ?? process.env.REAL_DATA_ROOT ?? join(projectRoot, 'data');
  const dataRoot = resolve(String(dataRootArg));

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  const supabaseBucket = process.env.REAL_DATA_SUPABASE_BUCKET ?? 'datasets';
  const supabaseFolder = process.env.REAL_DATA_SUPABASE_FOLDER ?? 'pm-resumes';

  const pipeline = new RealDataPipeline({
    dataRoot,
    supabase: supabaseUrl && supabaseKey ? {
      url: supabaseUrl,
      key: supabaseKey,
      bucket: supabaseBucket,
      folder: supabaseFolder
    } : undefined,
    skipSupabaseUpload: Boolean(args['skip-upload'] || args['dry-run']),
    logger: {
      info: (message, context) => console.log(`ℹ️  ${message}`, context ? JSON.stringify(context, null, 2) : ''),
      warn: (message, context) => console.warn(`⚠️  ${message}`, context ? JSON.stringify(context, null, 2) : ''),
      error: (message, context) => console.error(`❌ ${message}`, context ? JSON.stringify(context, null, 2) : '')
    }
  });

  let sourceConfigs = buildSourceConfigs();

  if (args.config) {
    const configs = Array.isArray(args.config) ? args.config[0] : args.config;
    sourceConfigs = await loadPipelineConfig(String(configs));
  }

  const sourceFilters = Array.isArray(args.source) ? args.source : args.source ? [String(args.source)] : [];
  const enabledSources = filterSources(sourceConfigs, sourceFilters);

  const runOptions: PipelineRunOptions = {
    dryRun: Boolean(args['dry-run']),
    skipLinkedInLookup: Boolean(args['skip-linkedin']),
    targetDistribution: typeof args.target === 'string' ? parseTargetDistribution(args.target) : undefined,
    maxTotal: coerceNumber(args['max-total'])
  };

  const startedAt = Date.now();
  console.log('🚀 Starting real data pipeline', {
    dataRoot,
    dryRun: runOptions.dryRun ?? false,
    skipLinkedInLookup: runOptions.skipLinkedInLookup ?? false,
    maxTotal: runOptions.maxTotal,
    sources: enabledSources.map(source => source.id)
  });

  const summary = await pipeline.run(enabledSources, runOptions);
  const durationMs = Date.now() - startedAt;

  console.log('\n✅ Real data pipeline complete');
  console.table({
    originals: summary.originalsCount,
    anonymized: summary.anonymizedCount,
    uploaded: summary.uploadedCount,
    durationSeconds: (durationMs / 1000).toFixed(2)
  });

  console.log('\nDistribution:', summary.distribution);
  console.log('\nNext steps:');
  console.log('  - Review `/docs/compliance/PM_RESUME_SOURCE_COMPLIANCE.md` and update legal approvals.');
  console.log('  - Inspect anonymized files at:', join(dataRoot, 'anonymized'));
  console.log('  - Validate Supabase uploads (if enabled) in bucket:', supabaseBucket, '/', supabaseFolder);
}

if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('run-real-data-pipeline.ts')) {
  main().catch(error => {
    console.error('❌ Pipeline failed', error);
    process.exitCode = 1;
  });
}


#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { normalizeTemplateSectionsForDraft } from '../src/lib/coverLetterTemplateSections.ts';
import type { CoverLetterSection } from '../src/types/workHistory.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const KNOWN_TEMPLATE_ID = 'ef2ef62c-07d0-4a28-bff2-8d4ecfeeadde';
const KNOWN_DRAFT_ID = '26194000-c4fa-4276-ac24-31df8433141d';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const scanAll = args.includes('--scan-all');

const getArgValue = (flag: string, fallback: string): string => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const templateId = getArgValue('--template-id', KNOWN_TEMPLATE_ID);
const draftId = getArgValue('--draft-id', KNOWN_DRAFT_ID);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type TemplateRow = {
  id: string;
  user_id: string;
  name: string | null;
  updated_at: string;
  sections: CoverLetterSection[] | null;
};

function summarizeTemplate(row: TemplateRow) {
  const rawSections = Array.isArray(row.sections) ? row.sections : [];
  const normalizedSections = normalizeTemplateSectionsForDraft(rawSections);
  const changed = rawSections.length !== normalizedSections.length ||
    rawSections.some((section, index) => normalizedSections[index]?.id !== section.id);

  return {
    ...row,
    rawCount: rawSections.length,
    normalizedCount: normalizedSections.length,
    changed,
    rawSections,
    normalizedSections,
  };
}

async function loadTemplates(): Promise<TemplateRow[]> {
  const query = supabase
    .from('cover_letter_templates')
    .select('id, user_id, name, updated_at, sections');

  const { data, error } = scanAll
    ? await query.order('updated_at', { ascending: false })
    : await query.eq('id', templateId);

  if (error) {
    throw error;
  }

  return (data ?? []) as TemplateRow[];
}

async function inspectDraft(templateIds: string[]) {
  const { data, error } = await supabase
    .from('cover_letters')
    .select('id, template_id, updated_at, sections')
    .eq('id', draftId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    console.log(`Draft ${draftId} not found.`);
    return;
  }

  const sections = Array.isArray(data.sections) ? data.sections : [];
  console.log('\nDraft inspection');
  console.log(`- draftId: ${data.id}`);
  console.log(`- templateId: ${data.template_id}`);
  console.log(`- updatedAt: ${data.updated_at}`);
  console.log(`- sectionCount: ${sections.length}`);
  if (templateIds.includes(data.template_id)) {
    console.log('- action: regenerate this draft after repairing the template and deploying the code fixes');
  }
}

async function main() {
  const templates = await loadTemplates();
  const suspicious = templates
    .map(summarizeTemplate)
    .filter((row) => row.changed);

  if (suspicious.length === 0) {
    console.log('No suspicious templates found.');
    await inspectDraft([]);
    return;
  }

  console.log(`Found ${suspicious.length} suspicious template(s).`);
  for (const row of suspicious) {
    console.log(`\nTemplate ${row.id}`);
    console.log(`- name: ${row.name ?? 'Untitled'}`);
    console.log(`- updatedAt: ${row.updated_at}`);
    console.log(`- rawCount: ${row.rawCount}`);
    console.log(`- normalizedCount: ${row.normalizedCount}`);
    console.log(`- tailIds: ${row.rawSections.slice(-5).map((section) => section.id).join(', ')}`);
  }

  if (apply) {
    for (const row of suspicious) {
      const { error } = await supabase
        .from('cover_letter_templates')
        .update({
          sections: row.normalizedSections as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      if (error) {
        throw error;
      }
      console.log(`Repaired template ${row.id}: ${row.rawCount} -> ${row.normalizedCount} sections`);
    }
  } else {
    console.log('\nDry run only. Re-run with --apply to persist normalized template sections.');
  }

  await inspectDraft(suspicious.map((row) => row.id));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

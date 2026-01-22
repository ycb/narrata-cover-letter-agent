#!/usr/bin/env ts-node

/**
 * Regenerate saved sections + cover letter template from raw text for a user.
 * 
 * Usage:
 *   tsx scripts/regenerate-cover-letter-sections.ts <user_id> <source_id> [--reset] [--dedupe-sources]
 * 
 * Example:
 *   tsx scripts/regenerate-cover-letter-sections.ts d3937780-28ec-4221-8bfb-2bb0f670fd52 5a4e4bf9-4d98-408a-8259-808273d233d4
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function archiveRows(userId: string, sourceTable: string, rows: Array<Record<string, any>>) {
  if (rows.length === 0) return;

  const payload = rows.map(row => ({
    user_id: userId,
    source_table: sourceTable,
    source_id: String(row.id),
    source_data: row,
    deleted_by: null
  }));

  const { error } = await supabase
    .from('deleted_records')
    .insert(payload);

  if (error) {
    console.error(`❌ Error archiving ${sourceTable} rows:`, error);
    process.exit(1);
  }
}

async function regenerateCoverLetterSections(userId: string, sourceId: string, options: { reset: boolean; dedupeSources: boolean }) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔄 Regenerate Cover Letter Sections Script');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`User ID:   ${userId}`);
  console.log(`Source ID: ${sourceId}`);
  if (options.reset || options.dedupeSources) {
    console.log(`Cleanup:   ${options.reset ? 'reset sections' : 'no reset'}, ${options.dedupeSources ? 'dedupe sources' : 'keep sources'}`);
  }
  console.log('');

  // Step 0: Optional cleanup
  if (options.reset) {
    console.log('🧹 Step 0: Resetting existing cover letter sections...');
    const { data: existingSections, error: existingSectionsError } = await supabase
      .from('saved_sections')
      .select('*')
      .eq('user_id', userId)
      .eq('source_type', 'cover_letter');

    if (existingSectionsError) {
      console.error('❌ Error fetching existing sections:', existingSectionsError);
      process.exit(1);
    }

    await archiveRows(userId, 'saved_sections', existingSections || []);

    const { error: deleteSectionsError } = await supabase
      .from('saved_sections')
      .delete()
      .eq('user_id', userId)
      .eq('source_type', 'cover_letter');

    if (deleteSectionsError) {
      console.error('❌ Error deleting existing sections:', deleteSectionsError);
      process.exit(1);
    }

    console.log(`✅ Cleared ${existingSections?.length || 0} saved sections`);
    console.log('');
  }

  if (options.dedupeSources) {
    console.log('🧹 Step 0b: Removing duplicate cover letter sources...');
    const { data: duplicateSources, error: duplicateSourcesError } = await supabase
      .from('sources')
      .select('*')
      .eq('user_id', userId)
      .eq('source_type', 'cover_letter')
      .neq('id', sourceId);

    if (duplicateSourcesError) {
      console.error('❌ Error fetching duplicate sources:', duplicateSourcesError);
      process.exit(1);
    }

    await archiveRows(userId, 'sources', duplicateSources || []);

    const duplicateIds = (duplicateSources || []).map(source => source.id);
    if (duplicateIds.length > 0) {
      const { error: deleteSourcesError } = await supabase
        .from('sources')
        .delete()
        .in('id', duplicateIds);

      if (deleteSourcesError) {
        console.error('❌ Error deleting duplicate sources:', deleteSourcesError);
        process.exit(1);
      }
    }

    console.log(`✅ Removed ${duplicateSources?.length || 0} duplicate sources`);
    console.log('');
  }

  // Step 1: Fetch source data
  console.log('📥 Step 1: Fetching source raw_text...');
  const { data: source, error: sourceError } = await supabase
    .from('sources')
    .select('id, user_id, raw_text, source_type, file_name')
    .eq('id', sourceId)
    .eq('user_id', userId)
    .single();

  if (sourceError || !source) {
    console.error('❌ Error fetching source:', sourceError);
    process.exit(1);
  }

  if (source.source_type !== 'cover_letter') {
    console.error(`❌ Source is type "${source.source_type}", expected "cover_letter"`);
    process.exit(1);
  }

  if (!source.raw_text) {
    console.error('❌ No raw_text found in source');
    process.exit(1);
  }

  console.log(`✅ Found cover letter: ${source.file_name}`);
  console.log(`   Raw text length: ${source.raw_text.length} characters`);
  console.log('');

  // Step 2: Parse cover letter
  console.log('🔧 Step 2: Parsing cover letter...');
  let parsedData;
  let sections;
  try {
    const { parseCoverLetter, convertToSavedSections } = await import('../src/services/coverLetterParser.js');
    parsedData = parseCoverLetter(source.raw_text);
    sections = convertToSavedSections(parsedData);
    
    console.log('✅ Parsed cover letter structure:');
    console.log(`   Greeting: ${parsedData.greeting ? '✓' : '✗'}`);
    console.log(`   Introduction: ${parsedData.introduction ? parsedData.introduction.substring(0, 50) + '...' : '✗'}`);
    console.log(`   Body paragraphs: ${parsedData.bodyParagraphs.length}`);
    console.log(`   Closing: ${parsedData.closing ? '✓' : '✗'}`);
    console.log(`   Signature: ${parsedData.signature ? '✓' : '✗'}`);
    console.log(`   Converted sections: ${sections.length}`);
  } catch (parseError) {
    console.error('❌ Error parsing cover letter:', parseError);
    process.exit(1);
  }
  console.log('');

  // Step 3: Save sections to database
  console.log('💾 Step 3: Creating saved sections...');
  try {
    // Map section slugs to database types
    const typeMapping: Record<string, string> = {
      'introduction': 'intro',
      'closing': 'closer'
    };

    const sectionPayload = sections.map((section: any, idx: number) => ({
      user_id: userId,
      type: typeMapping[section.slug] || 'body',
      title: section.title,
      content: section.content,
      source_type: 'cover_letter',
      source_id: sourceId,
      tags: [],
      position: idx,
      paragraph_index: idx,
      is_dynamic: section.slug.startsWith('body-')
    }));

    const { data: insertedSections, error: sectionsError } = await supabase
      .from('saved_sections')
      .insert(sectionPayload)
      .select('id, type, title');

    if (sectionsError) {
      console.error('❌ Error inserting saved sections:', sectionsError);
      process.exit(1);
    }

    console.log('✅ Created saved sections:');
    (insertedSections || []).forEach((section: any, index: number) => {
      console.log(`   ${index + 1}. [${section.type}] ${section.title}`);
    });
  } catch (saveError) {
    console.error('❌ Error saving sections:', saveError);
    process.exit(1);
  }
  console.log('');

  // Step 4: Create template from saved sections
  console.log('💾 Step 4: Creating template...');
  try {
    // Check if user already has a template
    const { data: existingTemplates } = await supabase
      .from('cover_letter_templates')
      .select('id, name')
      .eq('user_id', userId);

    if (existingTemplates && existingTemplates.length > 0) {
      console.log(`⚠️  User already has ${existingTemplates.length} template(s). Updating existing template...`);
      
      // Fetch the sections we just created
      const { data: savedSections } = await supabase
        .from('saved_sections')
        .select('*')
        .eq('user_id', userId)
        .eq('source_id', sourceId)
        .order('position');

      if (!savedSections || savedSections.length === 0) {
        console.error('❌ No saved sections found after insert');
        process.exit(1);
      }

      // Build template structure
      const templateStructure = savedSections.map((section: any, idx: number) => ({
        id: section.id,
        type: section.type,
        title: section.title,
        slug: section.type,
        order: idx,
        isStatic: !section.is_dynamic,
        staticContent: section.content,
        savedSectionId: section.id
      }));

      const sectionIds = savedSections.map((s: any) => s.id);

      // Update existing template
      const { data: updatedTemplate, error: updateError } = await supabase
        .from('cover_letter_templates')
        .update({
          sections: templateStructure,
          section_ids: sectionIds,
          source_id: sourceId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTemplates[0].id)
        .select('id, name')
        .single();

      if (updateError) {
        console.error('❌ Error updating template:', updateError);
        process.exit(1);
      }

      console.log(`✅ Updated template: "${updatedTemplate?.name}" (ID: ${updatedTemplate?.id})`);
    } else {
      console.log('📋 Creating new template...');
      
      // Fetch the sections we just created
      const { data: savedSections } = await supabase
        .from('saved_sections')
        .select('*')
        .eq('user_id', userId)
        .eq('source_id', sourceId)
        .order('position');

      if (!savedSections || savedSections.length === 0) {
        console.error('❌ No saved sections found after insert');
        process.exit(1);
      }

      // Build template structure
      const templateStructure = savedSections.map((section: any, idx: number) => ({
        id: section.id,
        type: section.type,
        title: section.title,
        slug: section.type,
        order: idx,
        isStatic: !section.is_dynamic,
        staticContent: section.content,
        savedSectionId: section.id
      }));

      const sectionIds = savedSections.map((s: any) => s.id);

      // Create new template
      const { data: newTemplate, error: createError } = await supabase
        .from('cover_letter_templates')
        .insert({
          user_id: userId,
          name: 'My Cover Letter Template',
          sections: templateStructure,
          section_ids: sectionIds,
          source_id: sourceId
        })
        .select('id, name')
        .single();

      if (createError) {
        console.error('❌ Error creating template:', createError);
        process.exit(1);
      }

      console.log(`✅ Created template: "${newTemplate?.name}" (ID: ${newTemplate?.id})`);
    }
  } catch (templateError) {
    console.error('❌ Error creating/updating template:', templateError);
    process.exit(1);
  }
  console.log('');

  // Step 4: Verify results
  console.log('✅ Step 4: Verifying results...');
  
  const { count: sectionCount } = await supabase
    .from('saved_sections')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source_id', sourceId);

  const { data: templates } = await supabase
    .from('cover_letter_templates')
    .select('id, name, section_ids')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 Regeneration Complete!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Saved sections: ${sectionCount || 0}`);
  console.log(`Template: ${templates?.[0]?.name || 'None'}`);
  console.log(`Template sections: ${templates?.[0]?.section_ids?.length || 0}`);
  console.log('═══════════════════════════════════════════════════════════');
}

// Run the script
const args = process.argv.slice(2);
const flags = new Set(args.filter(arg => arg.startsWith('--')));
const positional = args.filter(arg => !arg.startsWith('--'));
const reset = flags.has('--reset');
const dedupeSources = flags.has('--dedupe-sources');

if (positional.length < 2) {
  console.error('Usage: tsx scripts/regenerate-cover-letter-sections.ts <user_id> <source_id> [--reset] [--dedupe-sources]');
  console.error('');
  console.error('Example:');
  console.error('  tsx scripts/regenerate-cover-letter-sections.ts \\');
  console.error('    d3937780-28ec-4221-8bfb-2bb0f670fd52 \\');
  console.error('    5a4e4bf9-4d98-408a-8259-808273d233d4');
  process.exit(1);
}

const [userId, sourceId] = positional;

regenerateCoverLetterSections(userId, sourceId, { reset, dedupeSources })
  .then(() => {
    console.log('');
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

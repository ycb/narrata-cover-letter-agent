/**
 * Generate fixture files from synthetic_personas_v5.json
 * 
 * This ensures fixture files match the source JSON data.
 * 
 * Usage:
 *   npm run generate:fixtures
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const JSON_PATH = path.join(__dirname, '../fixtures/synthetic/v1/synthetic_personas_v5.json');
const FIXTURES_PATH = path.join(__dirname, '../fixtures/synthetic/v1/raw_uploads');

interface SyntheticPersona {
  persona_id: string;
  resume: string;
  cover_letter: string;
  linkedin_profile?: any;
}

async function generateFixtures() {
  console.log('📖 Reading synthetic_personas_v5.json...');
  
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`JSON file not found: ${JSON_PATH}`);
  }
  
  const jsonContent = fs.readFileSync(JSON_PATH, 'utf-8');
  const personas: SyntheticPersona[] = JSON.parse(jsonContent);
  
  console.log(`✅ Found ${personas.length} personas\n`);
  
  // Ensure fixtures directory exists
  if (!fs.existsSync(FIXTURES_PATH)) {
    fs.mkdirSync(FIXTURES_PATH, { recursive: true });
  }
  
  let generated = 0;
  let skipped = 0;
  
  for (const persona of personas) {
    const profileId = persona.persona_id;
    
    // Generate resume file
    if (persona.resume) {
      const resumePath = path.join(FIXTURES_PATH, `${profileId}_resume.txt`);
      fs.writeFileSync(resumePath, persona.resume, 'utf-8');
      console.log(`✅ Generated: ${profileId}_resume.txt`);
      generated++;
    } else {
      console.log(`⚠️  Missing resume for ${profileId}`);
      skipped++;
    }
    
    // Generate cover letter file
    if (persona.cover_letter) {
      const coverLetterPath = path.join(FIXTURES_PATH, `${profileId}_cover_letter.txt`);
      fs.writeFileSync(coverLetterPath, persona.cover_letter, 'utf-8');
      console.log(`✅ Generated: ${profileId}_cover_letter.txt`);
      generated++;
    } else {
      console.log(`⚠️  Missing cover letter for ${profileId}`);
      skipped++;
    }
    
    // Generate LinkedIn JSON file (if available)
    if (persona.linkedin_profile) {
      const linkedinPath = path.join(FIXTURES_PATH, `${profileId}_linkedin.json`);
      fs.writeFileSync(
        linkedinPath,
        JSON.stringify(persona.linkedin_profile, null, 2),
        'utf-8'
      );
      console.log(`✅ Generated: ${profileId}_linkedin.json`);
      generated++;
    } else {
      // Check if LinkedIn file exists but wasn't in JSON (P03, P04, etc.)
      const existingLinkedinPath = path.join(FIXTURES_PATH, `${profileId}_linkedin.json`);
      if (!fs.existsSync(existingLinkedinPath)) {
        console.log(`ℹ️  No LinkedIn data for ${profileId} (skipping)`);
      }
    }
  }
  
  console.log(`\n✅ Generation complete!`);
  console.log(`   Generated: ${generated} files`);
  if (skipped > 0) {
    console.log(`   Skipped: ${skipped} missing fields`);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('generate-fixtures-from-json.ts')) {
  generateFixtures().catch(error => {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
}

export { generateFixtures };


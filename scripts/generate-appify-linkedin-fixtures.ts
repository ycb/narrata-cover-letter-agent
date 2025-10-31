// Generate Appify-format LinkedIn data for all 10 synthetic users
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const personasPath = path.join(__dirname, '../fixtures/synthetic/v1/synthetic_personas_v5.json');
const templatePath = path.join(__dirname, '../fixtures/synthetic/v1/appify_template.json');
const outputDir = path.join(__dirname, '../fixtures/synthetic/v1/raw_uploads');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Helper to parse date string "2021-05" or "Present" to Appify format
function parseDate(dateStr: string | undefined): { year?: number; month?: string } | undefined {
  if (!dateStr || dateStr === 'Present' || dateStr === 'Current') {
    return undefined;
  }
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    const year = parseInt(parts[0]);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNum = parseInt(parts[1]) - 1;
    return {
      year,
      month: months[monthNum] || 'Jan'
    };
  }
  if (parts.length === 1 && /^\d{4}$/.test(parts[0])) {
    return { year: parseInt(parts[0]) };
  }
  return undefined;
}

// Convert persona LinkedIn data to Appify format
function convertPersonaToAppify(persona: any): any {
  const li = persona.linkedin_profile;
  const basicInfo = li.basic_info || {};
  
  // Split full_name into first_name and last_name
  const nameParts = (basicInfo.full_name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  // Parse location string "City, State, Country" or "City, State"
  const locationStr = basicInfo.location || '';
  const locationParts = locationStr.split(',').map(s => s.trim());
  const city = locationParts[0] || '';
  const state = locationParts[1] || '';
  const country = locationParts[2] || 'United States';
  
  const appifyData: any = {
    basic_info: {
      fullname: basicInfo.full_name || '',
      first_name: firstName,
      last_name: lastName,
      headline: basicInfo.headline || '',
      profile_url: `https://linkedin.com/in/${persona.persona_id.toLowerCase()}`,
      profile_picture_url: null,
      about: li.about || basicInfo.headline || '',
      location: {
        country: country,
        city: city,
        full: locationStr,
        country_code: country === 'United States' || country === 'US' || country === 'USA' ? 'US' : 
                     country === 'Canada' || country === 'CA' ? 'CA' : 'US'
      },
      creator_hashtags: [],
      is_creator: false,
      is_influencer: false,
      is_premium: false,
      created_timestamp: Date.now() - (Math.random() * 10 * 365 * 24 * 60 * 60 * 1000), // Random timestamp within last 10 years
      show_follower_count: false,
      background_picture_url: null,
      urn: `ACo${persona.persona_id}${Math.random().toString(36).substring(2, 15)}`,
      follower_count: Math.floor(Math.random() * 5000) + 500,
      connection_count: Math.floor(Math.random() * 5000) + 500,
      current_company: basicInfo.current_company || '',
      current_company_urn: null,
      current_company_url: null,
      email: basicInfo.email || null
    },
    experience: (li.experience || []).map((exp: any, idx: number) => {
      const startDate = parseDate(exp.start_date);
      const endDate = exp.end_date && exp.end_date !== 'Present' && exp.end_date !== 'Current' 
        ? parseDate(exp.end_date) 
        : undefined;
      const isCurrent = !endDate && (exp.end_date === 'Present' || exp.end_date === 'Current' || idx === 0);
      
      // Convert description array to string
      const description = Array.isArray(exp.description) 
        ? exp.description.join('\n\n')
        : (exp.description || '');
      
      return {
        title: exp.title || '',
        company: exp.company || '',
        description: description,
        location: exp.location || '',
        duration: `${exp.start_date || ''} - ${exp.end_date || 'Present'}`,
        start_date: startDate,
        end_date: endDate,
        is_current: isCurrent,
        company_linkedin_url: null,
        company_logo_url: null,
        skills: exp.skills || li.skills?.slice(0, 2) || [],
        company_id: null
      };
    }),
    education: (li.education || []).map((edu: any) => {
      const startDate = parseDate(edu.start_date);
      const endDate = parseDate(edu.end_date);
      
      return {
        school: edu.school || '',
        degree: edu.degree || edu.degree_name || '',
        degree_name: edu.degree || edu.degree_name || '',
        field_of_study: edu.field || edu.field_of_study || '',
        duration: `${edu.start_date || ''} - ${edu.end_date || ''}`,
        start_date: startDate,
        end_date: endDate,
        school_linkedin_url: null,
        school_logo_url: null,
        school_id: null
      };
    }),
    projects: (li.projects || []).map((proj: any) => ({
      name: proj.name || '',
      description: typeof proj.description === 'string' ? proj.description : JSON.stringify(proj.description),
      associated_with: proj.associated_with || null,
      is_current: proj.is_current || false
    })),
    certifications: (li.certifications || []).map((cert: any) => ({
      name: cert.name || '',
      issuer: cert.authority || cert.issuer || '',
      issued_date: cert.date || cert.issued_date || ''
    })),
    languages: (li.languages || []).map((lang: any) => ({
      language: typeof lang === 'string' ? lang : (lang.language || lang),
      proficiency: lang.proficiency || 'Native or bilingual proficiency'
    })),
    skills: li.skills || []
  };
  
  return appifyData;
}

async function generateLinkedInFixtures() {
  try {
    // Read personas and template
    const personasContent = fs.readFileSync(personasPath, 'utf-8');
    const personas: any[] = JSON.parse(personasContent);
    
    console.log(`📖 Read ${personas.length} personas from ${personasPath}`);
    
    // Generate Appify-format LinkedIn data for each persona
    for (const persona of personas) {
      const profileId = persona.persona_id;
      const appifyData = convertPersonaToAppify(persona);
      
      const outputPath = path.join(outputDir, `${profileId}_linkedin.json`);
      fs.writeFileSync(outputPath, JSON.stringify(appifyData, null, 2));
      
      console.log(`✅ Created ${outputPath}`);
      console.log(`   - Name: ${appifyData.basic_info.fullname}`);
      console.log(`   - Experience entries: ${appifyData.experience.length}`);
      console.log(`   - Education entries: ${appifyData.education.length}`);
      console.log(`   - Skills: ${appifyData.skills.length}`);
    }
    
    console.log(`\n🎉 Successfully generated Appify-format LinkedIn data for all ${personas.length} personas!`);
    console.log(`📁 Output directory: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ Error generating LinkedIn fixtures:', error);
    process.exit(1);
  }
}

generateLinkedInFixtures();


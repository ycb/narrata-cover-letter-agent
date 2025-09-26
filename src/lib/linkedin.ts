import { supabase } from './supabase'

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID
const LINKEDIN_REDIRECT_URI = `${window.location.origin}/auth/linkedin/callback`

// LinkedIn API endpoints
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2'
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'

// LinkedIn OAuth scopes - Start with minimal scope
const LINKEDIN_SCOPES = [
  'r_liteprofile'        // Basic profile info only
].join(' ')

export interface LinkedInProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  profilePicture?: string
}

export interface LinkedInPosition {
  id: string
  title: string
  companyName: string
  companyId: string
  startDate: string
  endDate?: string
  description?: string
  location?: string
  industry?: string
}

export interface LinkedInEducation {
  id: string
  schoolName: string
  degreeName?: string
  fieldOfStudy?: string
  startDate: string
  endDate?: string
  description?: string
}

export interface LinkedInSkill {
  id: string
  name: string
  endorsementCount?: number
}

export interface LinkedInImportResult {
  profile: LinkedInProfile
  positions: LinkedInPosition[]
  education: LinkedInEducation[]
  skills: LinkedInSkill[]
  conflicts: DataConflict[]
}

export interface DataConflict {
  type: 'company' | 'position' | 'education'
  linkedinData: any
  existingData?: any
  resolution: 'keep-existing' | 'replace-with-linkedin' | 'merge' | 'skip'
}

// Initialize LinkedIn OAuth flow
export function initiateLinkedInOAuth() {
  if (!LINKEDIN_CLIENT_ID) {
    throw new Error('LinkedIn Client ID not configured')
  }

  const authUrl = new URL(LINKEDIN_AUTH_URL)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', LINKEDIN_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', LINKEDIN_REDIRECT_URI)
  authUrl.searchParams.set('scope', LINKEDIN_SCOPES)
  authUrl.searchParams.set('state', generateState())

  // Store state for verification
  localStorage.setItem('linkedin_oauth_state', authUrl.searchParams.get('state')!)

  // Redirect to LinkedIn
  window.location.href = authUrl.toString()
}

// Generate random state for OAuth security
function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Handle LinkedIn OAuth callback
export async function handleLinkedInCallback(code: string, state: string): Promise<string> {
  // Verify state parameter
  const storedState = localStorage.getItem('linkedin_oauth_state')
  if (state !== storedState) {
    throw new Error('Invalid OAuth state parameter')
  }

  // Exchange code for access token
  const { data: { access_token }, error } = await supabase.functions.invoke('linkedin-exchange-token', {
    body: { code, redirect_uri: LINKEDIN_REDIRECT_URI }
  })

  if (error) throw error

  // Store access token temporarily
  localStorage.setItem('linkedin_access_token', access_token)
  localStorage.removeItem('linkedin_oauth_state')

  return access_token
}

// Fetch LinkedIn profile data via Edge Function
export async function fetchLinkedInData(accessToken: string): Promise<LinkedInImportResult> {
  try {
    console.log('Fetching LinkedIn data via Edge Function...');
    
    const { data, error } = await supabase.functions.invoke('linkedin-fetch-data', {
      body: { access_token: accessToken }
    });

    if (error) {
      console.error('Edge Function error:', error);
      throw new Error(`Edge Function error: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from Edge Function');
    }

    console.log('LinkedIn data received:', data);

    // Transform the data to match our interfaces
    const profile: LinkedInProfile = {
      id: data.profile.id,
      firstName: data.profile.localizedFirstName || data.profile.firstName?.localized?.en_US || '',
      lastName: data.profile.localizedLastName || data.profile.lastName?.localized?.en_US || '',
      email: '', // Will be fetched separately if needed
      profilePicture: data.profile.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier
    };

    const positions: LinkedInPosition[] = data.positions.map((position: any) => ({
      id: position.id,
      title: position.title || '',
      companyName: position.companyName || '',
      companyId: position.company?.id || '',
      startDate: position.startDate || '',
      endDate: position.endDate || undefined,
      description: position.summary || '',
      location: position.location?.name || '',
      industry: position.company?.industry || ''
    }));

    const education: LinkedInEducation[] = data.education.map((edu: any) => ({
      id: edu.id,
      schoolName: edu.schoolName || '',
      degreeName: edu.degreeName || '',
      fieldOfStudy: edu.fieldOfStudy || '',
      startDate: edu.startDate || '',
      endDate: edu.endDate || undefined,
      description: edu.activities || ''
    }));

    const skills: LinkedInSkill[] = data.skills.map((skill: any) => ({
      id: skill.id,
      name: skill.skillName || '',
      endorsementCount: skill.numEndorsements || 0
    }));

    // Check for conflicts with existing data
    const conflicts = await checkDataConflicts(profile, positions, education);
    
    return {
      profile,
      positions,
      education,
      skills,
      conflicts
    }
  } catch (error) {
    console.error('Error fetching LinkedIn data:', error);
    throw error;
  }
}

// Note: Direct API calls are now handled by the Edge Function
// The functions below are kept for reference but not used

// Check for conflicts with existing data
async function checkDataConflicts(
  profile: LinkedInProfile,
  positions: LinkedInPosition[],
  education: LinkedInEducation[]
): Promise<DataConflict[]> {
  const { user } = await supabase.auth.getUser()
  if (!user) return []

  const conflicts: DataConflict[] = []

  // Check for company conflicts
  for (const position of positions) {
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', position.companyName)
      .single()

    if (existingCompany) {
      conflicts.push({
        type: 'company',
        linkedinData: position,
        existingData: existingCompany,
        resolution: 'keep-existing'
      })
    }
  }

  // Check for position conflicts
  for (const position of positions) {
    const { data: existingPosition } = await supabase
      .from('work_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('title', position.title)
      .eq('start_date', position.startDate)
      .single()

    if (existingPosition) {
      conflicts.push({
        type: 'position',
        linkedinData: position,
        existingData: existingPosition,
        resolution: 'keep-existing'
      })
    }
  }

  return conflicts
}

// Process LinkedIn import with conflict resolution
export async function processLinkedInImport(
  importResult: LinkedInImportResult,
  conflictResolutions: Record<string, DataConflict['resolution']>
): Promise<void> {
  const { user } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Process companies
  for (const position of importResult.positions) {
    const conflict = importResult.conflicts.find(c => 
      c.type === 'company' && c.linkedinData.companyName === position.companyName
    )
    
    if (conflict && conflictResolutions[`company_${position.companyName}`] === 'skip') {
      continue
    }

    // Create or update company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .upsert({
        name: position.companyName,
        description: position.industry || '',
        tags: [position.industry].filter(Boolean),
        user_id: user.id
      }, {
        onConflict: 'name,user_id'
      })
      .select()
      .single()

    if (companyError) throw companyError

    // Create work item
    const { error: workItemError } = await supabase
      .from('work_items')
      .insert({
        company_id: company.id,
        title: position.title,
        start_date: position.startDate,
        end_date: position.endDate,
        description: position.description,
        tags: [position.industry].filter(Boolean),
        achievements: [],
        user_id: user.id
      })

    if (workItemError) throw workItemError
  }

  // Process education
  for (const edu of importResult.education) {
    const { error: educationError } = await supabase
      .from('work_items')
      .insert({
        company_id: null, // Education doesn't have company
        title: `${edu.degreeName} in ${edu.fieldOfStudy}`,
        start_date: edu.startDate,
        end_date: edu.endDate,
        description: edu.description,
        tags: ['Education', edu.fieldOfStudy].filter(Boolean),
        achievements: [],
        user_id: user.id
      })

    if (educationError) throw educationError
  }

  // Process skills (store as tags for now)
  // In the future, this could be a separate skills table
  console.log('Skills imported:', importResult.skills.length)
}

// Clean up LinkedIn OAuth data
export function cleanupLinkedInOAuth() {
  localStorage.removeItem('linkedin_access_token')
  localStorage.removeItem('linkedin_oauth_state')
}

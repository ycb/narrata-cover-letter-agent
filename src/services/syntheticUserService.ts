// Synthetic user service for admin testing
import { supabase } from '../lib/supabase';
import { syntheticStorage, getSyntheticLocalOnlyFlag } from '../utils/storage';

export interface SyntheticUser {
  id: string;
  parentUserId: string;
  profileId: string;
  profileName: string;
  email: string;
  isActive: boolean;
  profileData?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SyntheticUserContext {
  currentUser: SyntheticUser | null;
  availableUsers: SyntheticUser[];
  isSyntheticTestingEnabled: boolean;
}

export class SyntheticUserService {
  // Allowlist of users who can use synthetic testing mode
  private readonly SYNTHETIC_TESTING_ALLOWLIST = [
    'narrata.ai@gmail.com'
    // Add more emails here as needed
  ];

  /**
   * Check if synthetic testing is enabled for current user
   * Simple allowlist-based approach - only specified users can access
   */
  async isSyntheticTestingEnabled(): Promise<boolean> {
    const startTime = Date.now();
    try {
      console.log('[Synthetic] Starting isSyntheticTestingEnabled check...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[Synthetic] Error getting user:', userError);
        return false;
      }
      
      if (!user) {
        console.log('[Synthetic] No authenticated user');
        return false;
      }

      console.log('[Synthetic] Got user, fetching profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[Synthetic] Error fetching profile:', profileError);
        return false;
      }

      if (!profile || !('email' in profile)) {
        console.log('[Synthetic] No profile email found');
        return false;
      }

      const profileEmail = (profile as any).email as string;
      if (!profileEmail) {
        console.log('[Synthetic] Profile email is empty');
        return false;
      }

      // Normalize email for comparison (lowercase, trim)
      const normalizedEmail = profileEmail.toLowerCase().trim();
      const normalizedAllowlist = this.SYNTHETIC_TESTING_ALLOWLIST.map(e => e.toLowerCase().trim());
      const isAllowed = normalizedAllowlist.includes(normalizedEmail);
      const elapsed = Date.now() - startTime;
      console.log(`[Synthetic] User ${profileEmail} (normalized: ${normalizedEmail}) - Synthetic testing: ${isAllowed ? 'ENABLED' : 'DISABLED'} (took ${elapsed}ms)`);
      console.log(`[Synthetic] Allowlist:`, this.SYNTHETIC_TESTING_ALLOWLIST);
      return isAllowed;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[Synthetic] Error checking synthetic testing access (after ${elapsed}ms):`, error);
      console.error('[Synthetic] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * Get current synthetic user context
   */
  async getSyntheticUserContext(): Promise<SyntheticUserContext> {
    const startTime = Date.now();
    try {
      console.log('[Synthetic] getSyntheticUserContext: Starting...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Synthetic] getSyntheticUserContext: No user found');
        return {
          currentUser: null,
          availableUsers: [],
          isSyntheticTestingEnabled: false
        };
      }

      console.log('[Synthetic] getSyntheticUserContext: Checking if enabled...');
      const isEnabled = await this.isSyntheticTestingEnabled();
      if (!isEnabled) {
        console.log('[Synthetic] getSyntheticUserContext: Not enabled, returning early');
        return {
          currentUser: null,
          availableUsers: [],
          isSyntheticTestingEnabled: false
        };
      }

      console.log('[Synthetic] getSyntheticUserContext: Ensuring synthetic users exist (non-blocking)...');
      const ensureStart = Date.now();
      // Run ensureSyntheticUsersExist in background - don't wait for it
      // If it fails or times out, we'll still fetch existing users
      this.ensureSyntheticUsersExist().catch((ensureError) => {
        const elapsed = Date.now() - ensureStart;
        console.warn(`[Synthetic] getSyntheticUserContext: ensureSyntheticUsersExist failed (after ${elapsed}ms), but continuing:`, ensureError);
      });
      // Don't await - continue immediately to fetch users

      console.log('[Synthetic] getSyntheticUserContext: Fetching synthetic users from database...');
      const fetchStart = Date.now();
      // Get all synthetic users for this parent user
      const { data: syntheticUsers, error } = await (supabase
        .from('synthetic_users') as any)
        .select('*')
        .eq('parent_user_id', user.id)
        .order('profile_id');
      console.log(`[Synthetic] getSyntheticUserContext: Fetched synthetic users in ${Date.now() - fetchStart}ms, count: ${syntheticUsers?.length || 0}`);

      if (error) {
        const elapsed = Date.now() - startTime;
        console.error(`[Synthetic] getSyntheticUserContext: Error fetching synthetic users (after ${elapsed}ms):`, error);
        return {
          currentUser: null,
          availableUsers: [],
          isSyntheticTestingEnabled: true
        };
      }

      console.log('[Synthetic] getSyntheticUserContext: Mapping users...');
      // Map database fields to component interface
      const localOnly = getSyntheticLocalOnlyFlag();
      const overrideProfileId = localOnly ? syntheticStorage.getActiveProfileId() : null;
      const dbActiveProfileId =
        (syntheticUsers || []).find((entry: any) => entry.is_active)?.profile_id || null;

      let effectiveProfileId = overrideProfileId || dbActiveProfileId;
      if (!effectiveProfileId && (syntheticUsers || []).length > 0) {
        effectiveProfileId = (syntheticUsers || [])[0].profile_id;
      }

      if (localOnly && effectiveProfileId) {
        syntheticStorage.setActiveProfileId(effectiveProfileId);
      } else if (!localOnly && effectiveProfileId) {
        // Keep local storage in sync for convenience when not in local-only mode
        syntheticStorage.setActiveProfileId(effectiveProfileId);
      }

      const mappedUsers = (syntheticUsers || []).map((user: any) => ({
        id: user.id,
        parentUserId: user.parent_user_id,
        profileId: user.profile_id,
        profileName: user.profile_name,
        email: user.email,
        isActive: localOnly
          ? user.profile_id === effectiveProfileId
          : Boolean(user.is_active),
        profileData: user.profile_data,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }));

      const currentUser =
        mappedUsers.find(u => u.profileId === effectiveProfileId) ||
        mappedUsers.find(u => u.isActive) ||
        null;
      const availableUsers = mappedUsers;

      const elapsed = Date.now() - startTime;
      console.log(`[Synthetic] getSyntheticUserContext: Completed successfully in ${elapsed}ms`, {
        currentUser: currentUser?.profileId,
        availableUsersCount: availableUsers.length
      });

      return {
        currentUser,
        availableUsers,
        isSyntheticTestingEnabled: true
      };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[Synthetic] getSyntheticUserContext: Exception (after ${elapsed}ms):`, error);
      return {
        currentUser: null,
        availableUsers: [],
        isSyntheticTestingEnabled: false
      };
    }
  }

  /**
   * Switch to a different synthetic user
   */
  async switchSyntheticUser(profileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'No authenticated user' };
      }

      const isEnabled = await this.isSyntheticTestingEnabled();
      if (!isEnabled) {
        return { success: false, error: 'Synthetic testing not enabled' };
      }

      const localOnly = getSyntheticLocalOnlyFlag();

      if (localOnly) {
        // Validate profile exists before setting override
        const { data: syntheticUsers, error: usersError } = await (supabase
          .from('synthetic_users') as any)
          .select('profile_id')
          .eq('parent_user_id', user.id);

        if (usersError) {
          console.error('Error fetching synthetic users for local override:', usersError);
          return { success: false, error: usersError.message };
        }

        const profileExists = (syntheticUsers || []).some(
          (syntheticUser: any) => syntheticUser.profile_id === profileId
        );

        if (!profileExists) {
          return { success: false, error: `Profile ${profileId} not found` };
        }

        syntheticStorage.setActiveProfileId(profileId);
        return { success: true };
      }

      // Call the database function to switch users
      const { error } = await (supabase.rpc as any)('switch_synthetic_user', {
        p_parent_user_id: user.id,
        p_profile_id: profileId
      });

      if (error) {
        console.error('Error switching synthetic user:', error);
        return { success: false, error: error.message };
      }

      // Clear any cached data
      this.clearSyntheticUserCache();
      syntheticStorage.setActiveProfileId(profileId);

      return { success: true };
    } catch (error) {
      console.error('Error switching synthetic user:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Ensure synthetic users exist in database (create if missing)
   */
  async ensureSyntheticUsersExist(): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();
    try {
      console.log('[Synthetic] ensureSyntheticUsersExist: Starting...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Synthetic] ensureSyntheticUsersExist: No user');
        return { success: false, error: 'No authenticated user' };
      }

      console.log('[Synthetic] ensureSyntheticUsersExist: Checking if enabled...');
      const isEnabled = await this.isSyntheticTestingEnabled();
      if (!isEnabled) {
        console.log('[Synthetic] ensureSyntheticUsersExist: Not enabled');
        return { success: false, error: 'Synthetic testing not enabled for this user' };
      }

      // Define all available synthetic profiles (including P00 for QA)
      const profiles = ['P00', 'P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10'];
      const profileNames: Record<string, string> = {
        'P00': 'P0 QA Profile',
        'P01': 'Avery Chen',
        'P02': 'Jordan Alvarez',
        'P03': 'Riley Gupta',
        'P04': 'Morgan Patel',
        'P05': 'Samira Khan',
        'P06': 'Alex Thompson',
        'P07': 'Taylor Rodriguez',
        'P08': 'Casey Kim',
        'P09': 'Leo Martin',
        'P10': 'Sophia Rivera'
      };

      console.log('[Synthetic] ensureSyntheticUsersExist: Checking existing users...');
      const checkStart = Date.now();
      // Get existing synthetic users to avoid duplicates
      // Add timeout to prevent hanging
      const checkTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout after 3 seconds')), 3000);
      });
      
      let existingUsers: any[] | null = null;
      let checkError: any = null;
      
      try {
        const queryPromise = (supabase
        .from('synthetic_users') as any)
        .select('profile_id')
        .eq('parent_user_id', user.id);
        
        const result = await Promise.race([
          queryPromise.then(({ data, error }: any) => ({ data, error })),
          checkTimeout
        ]) as { data: any[] | null; error: any };
        
        existingUsers = result.data;
        checkError = result.error;
      } catch (timeoutError) {
        console.warn('[Synthetic] ensureSyntheticUsersExist: Query timed out, assuming no existing users');
        existingUsers = [];
        checkError = null; // Continue anyway
      }
      
      if (checkError) {
        console.error('[Synthetic] ensureSyntheticUsersExist: Error checking existing users:', checkError);
        // Don't fail completely - just log and continue
        existingUsers = [];
      }
      
      console.log(`[Synthetic] ensureSyntheticUsersExist: Checked existing users in ${Date.now() - checkStart}ms, found ${existingUsers?.length || 0}`);

      const existingProfileIds = new Set((existingUsers || []).map((u: any) => u.profile_id));
      
      // Filter out profiles that already exist
      const profilesToCreate = profiles.filter(profileId => !existingProfileIds.has(profileId));

      if (profilesToCreate.length === 0) {
        const elapsed = Date.now() - startTime;
        console.log(`[Synthetic] ensureSyntheticUsersExist: All synthetic users already exist (took ${elapsed}ms)`);
        return { success: true };
      }

      console.log(`[Synthetic] ensureSyntheticUsersExist: Creating ${profilesToCreate.length} missing profiles: ${profilesToCreate.join(', ')}`);
      // Create missing synthetic users (including P00 if needed)
      const syntheticUsers = profilesToCreate.map(profileId => ({
        parent_user_id: user.id,
        profile_id: profileId,
        profile_name: profileNames[profileId] || profileId,
        email: `${profileId.toLowerCase()}@test.narrata.ai`,
        is_active: profileId === 'P01', // Set P01 as active by default (not P00)
        profile_data: {}
      }));

      console.log('[Synthetic] ensureSyntheticUsersExist: Inserting synthetic users into database...');
      const insertStart = Date.now();
      
      // Add timeout for insert as well
      const insertTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Insert timeout after 3 seconds')), 3000);
      });
      
      try {
        const insertPromise = (supabase
        .from('synthetic_users') as any)
        .insert(syntheticUsers);

        const result = await Promise.race([
          insertPromise.then(({ error }: any) => ({ error })),
          insertTimeout
        ]) as { error: any };
        
        console.log(`[Synthetic] ensureSyntheticUsersExist: Insert completed in ${Date.now() - insertStart}ms`);
        
        if (result.error) {
          console.error('[Synthetic] ensureSyntheticUsersExist: Error creating synthetic users:', result.error);
          // Don't fail completely - users might already exist
          return { success: true }; // Return success so we can continue
        }
      } catch (timeoutError) {
        const elapsed = Date.now() - insertStart;
        console.warn(`[Synthetic] ensureSyntheticUsersExist: Insert timed out (after ${elapsed}ms), but continuing`);
        // Don't fail - users might already exist, we'll fetch them anyway
        return { success: true }; // Return success so we can continue
      }

      const elapsed = Date.now() - startTime;
      console.log(`[Synthetic] ensureSyntheticUsersExist: Created ${profilesToCreate.length} synthetic user(s): ${profilesToCreate.join(', ')} (took ${elapsed}ms)`);
      return { success: true };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[Synthetic] ensureSyntheticUsersExist: Exception (after ${elapsed}ms):`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create synthetic users from persona data
   */
  async createSyntheticUsersFromPersonas(personaData: any[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'No authenticated user' };
      }

      const isEnabled = await this.isSyntheticTestingEnabled();
      if (!isEnabled) {
        return { success: false, error: 'Synthetic testing not enabled' };
      }

      // Clear existing synthetic users
      await (supabase
        .from('synthetic_users') as any)
        .delete()
        .eq('parent_user_id', user.id);

      // Create new synthetic users
      const syntheticUsers = personaData.map(persona => ({
        parent_user_id: user.id,
        profile_id: persona.persona_id,
        profile_name: persona.linkedin_profile.basic_info.full_name,
        email: `${persona.persona_id.toLowerCase()}@test.narrata.ai`,
        profile_data: persona,
        is_active: persona.persona_id === 'P01' // Set P01 as active by default
      }));

      const { error } = await (supabase
        .from('synthetic_users') as any)
        .insert(syntheticUsers);

      if (error) {
        console.error('Error creating synthetic users:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error creating synthetic users:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get current synthetic user's data
   */
  async getCurrentSyntheticUserData(): Promise<any> {
    try {
      const context = await this.getSyntheticUserContext();
      if (!context.currentUser) {
        return null;
      }

      return context.currentUser.profileData;
    } catch (error) {
      console.error('Error getting current synthetic user data:', error);
      return null;
    }
  }

  /**
   * Clear synthetic user cache
   */
  private clearSyntheticUserCache(): void {
    // Clear any cached data related to synthetic users
    // This could include localStorage, session storage, etc.
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('synthetic_user_context');
        sessionStorage.removeItem('synthetic_user_context');
      } catch (error) {
        console.warn('[Synthetic] Unable to clear synthetic user caches:', error);
      }

      if (!getSyntheticLocalOnlyFlag()) {
        syntheticStorage.clearActiveProfileId();
      }
    }
  }

  /**
   * Get synthetic user by profile ID
   */
  async getSyntheticUserByProfileId(profileId: string): Promise<SyntheticUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await (supabase
        .from('synthetic_users') as any)
        .select('*')
        .eq('parent_user_id', user.id)
        .eq('profile_id', profileId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as SyntheticUser;
    } catch (error) {
      console.error('Error getting synthetic user by profile ID:', error);
      return null;
    }
  }
}

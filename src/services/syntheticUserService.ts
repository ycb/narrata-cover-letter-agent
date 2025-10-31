// Synthetic user service for admin testing
import { supabase } from '../lib/supabase';

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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Synthetic] No authenticated user');
        return false;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || !('email' in profile)) {
        console.log('[Synthetic] No profile email found:', profileError?.message);
        return false;
      }

      const profileEmail = (profile as any).email as string;
      if (!profileEmail) {
        console.log('[Synthetic] Profile email is empty');
        return false;
      }

      const isAllowed = this.SYNTHETIC_TESTING_ALLOWLIST.includes(profileEmail);
      console.log(`[Synthetic] User ${profileEmail} - Synthetic testing: ${isAllowed ? 'ENABLED' : 'DISABLED'}`);
      return isAllowed;
    } catch (error) {
      console.error('[Synthetic] Error checking synthetic testing access:', error);
      return false;
    }
  }

  /**
   * Get current synthetic user context
   */
  async getSyntheticUserContext(): Promise<SyntheticUserContext> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          currentUser: null,
          availableUsers: [],
          isSyntheticTestingEnabled: false
        };
      }

      const isEnabled = await this.isSyntheticTestingEnabled();
      if (!isEnabled) {
        return {
          currentUser: null,
          availableUsers: [],
          isSyntheticTestingEnabled: false
        };
      }

      // Ensure synthetic users exist (create if missing)
      await this.ensureSyntheticUsersExist();

      // Get all synthetic users for this parent user
      const { data: syntheticUsers, error } = await (supabase
        .from('synthetic_users') as any)
        .select('*')
        .eq('parent_user_id', user.id)
        .order('profile_id');

      if (error) {
        console.error('Error fetching synthetic users:', error);
        return {
          currentUser: null,
          availableUsers: [],
          isSyntheticTestingEnabled: true
        };
      }

      // Map database fields to component interface
      const mappedUsers = (syntheticUsers || []).map((user: any) => ({
        id: user.id,
        parentUserId: user.parent_user_id,
        profileId: user.profile_id,
        profileName: user.profile_name,
        email: user.email,
        isActive: user.is_active,
        profileData: user.profile_data,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }));

      const currentUser = mappedUsers.find(u => u.isActive) || null;
      const availableUsers = mappedUsers;

      return {
        currentUser,
        availableUsers,
        isSyntheticTestingEnabled: true
      };
    } catch (error) {
      console.error('Error getting synthetic user context:', error);
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'No authenticated user' };
      }

      const isEnabled = await this.isSyntheticTestingEnabled();
      if (!isEnabled) {
        return { success: false, error: 'Synthetic testing not enabled for this user' };
      }

      // Check if synthetic users already exist
      const { data: existingUsers } = await (supabase
        .from('synthetic_users') as any)
        .select('profile_id')
        .eq('parent_user_id', user.id)
        .limit(1);

      if (existingUsers && existingUsers.length > 0) {
        console.log('[Synthetic] Synthetic users already exist');
        return { success: true };
      }

      // Create P01-P10 synthetic users
      const profiles = ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10'];
      const profileNames: Record<string, string> = {
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

      const syntheticUsers = profiles.map(profileId => ({
        parent_user_id: user.id,
        profile_id: profileId,
        profile_name: profileNames[profileId] || profileId,
        email: `${profileId.toLowerCase()}@test.narrata.ai`,
        is_active: profileId === 'P01', // Set P01 as active by default
        profile_data: {}
      }));

      const { error } = await (supabase
        .from('synthetic_users') as any)
        .insert(syntheticUsers);

      if (error) {
        console.error('[Synthetic] Error creating synthetic users:', error);
        return { success: false, error: error.message };
      }

      console.log('[Synthetic] Created synthetic users P01-P10');
      return { success: true };
    } catch (error) {
      console.error('[Synthetic] Error ensuring synthetic users exist:', error);
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
      localStorage.removeItem('synthetic_user_context');
      sessionStorage.removeItem('synthetic_user_context');
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

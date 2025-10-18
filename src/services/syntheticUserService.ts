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
  /**
   * Check if synthetic testing is enabled for current user
   */
  async isSyntheticTestingEnabled(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .single();

      return profile?.role === 'admin' || profile?.email === 'narrata.ai@gmail.com';
    } catch (error) {
      console.error('Error checking synthetic testing access:', error);
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

      // Get all synthetic users for this parent user
      const { data: syntheticUsers, error } = await supabase
        .from('synthetic_users')
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
      const mappedUsers = syntheticUsers?.map(user => ({
        id: user.id,
        parentUserId: user.parent_user_id,
        profileId: user.profile_id,
        profileName: user.profile_name,
        email: user.email,
        isActive: user.is_active,
        profileData: user.profile_data,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      })) || [];

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
      const { error } = await supabase.rpc('switch_synthetic_user', {
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
      await supabase
        .from('synthetic_users')
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

      const { error } = await supabase
        .from('synthetic_users')
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

      const { data, error } = await supabase
        .from('synthetic_users')
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

/**
 * User Preferences Service
 * Handles persistence of user goals and voice to database (profiles table)
 * Supports synthetic profile testing mode - stores in synthetic_users.profile_data when enabled
 * Phase 3: Gap Detection Service Implementation
 */

import { supabase } from '@/lib/supabase';
import type { UserGoals } from '@/types/userGoals';
import type { UserVoice } from '@/types/userVoice';
import { SyntheticUserService } from './syntheticUserService';

export class UserPreferencesService {
  /**
   * Save user goals to database
   * In synthetic mode, saves to synthetic_users.profile_data instead of profiles.goals
   */
  static async saveGoals(userId: string, goals: UserGoals): Promise<void> {
    try {
      // Check if synthetic mode is enabled
      const syntheticService = new SyntheticUserService();
      const syntheticContext = await syntheticService.getSyntheticUserContext();
      
      if (syntheticContext.isSyntheticTestingEnabled && syntheticContext.currentUser) {
        const activeProfileId = syntheticContext.currentUser.profileId;
        console.log(`[UserPreferencesService] Saving goals for synthetic profile: ${activeProfileId}, user: ${userId}`);
        
        // Save to synthetic_users.profile_data
        // First, read current profile_data to preserve other fields
        const { data: currentSyntheticUser, error: fetchError } = await supabase
          .from('synthetic_users')
          .select('profile_data, profile_id')
          .eq('parent_user_id', userId)
          .eq('profile_id', activeProfileId)
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error(`[UserPreferencesService] Error fetching synthetic profile data for ${activeProfileId}:`, fetchError);
          throw fetchError;
        }
        
        console.log(`[UserPreferencesService] Current profile_data for ${activeProfileId} before update:`, currentSyntheticUser?.profile_data ? Object.keys(currentSyntheticUser.profile_data) : 'empty');
        
        const currentProfileData = currentSyntheticUser?.profile_data || {};
        const updatedProfileData = {
          ...currentProfileData,
          goals: goals
        };
        
        console.log(`[UserPreferencesService] Updating profile_data for ${activeProfileId} with goals:`, goals.targetTitles);
        
        const { data: updateResult, error } = await supabase
          .from('synthetic_users')
          .update({
            profile_data: updatedProfileData,
            updated_at: new Date().toISOString()
          })
          .eq('parent_user_id', userId)
          .eq('profile_id', activeProfileId)
          .select('profile_id, profile_data->goals->targetTitles');

        if (error) {
          console.error('[UserPreferencesService] Error saving goals to synthetic profile:', error);
          throw error;
        }
        
        // Verify the update worked
        if (updateResult && updateResult.length > 0) {
          console.log(`[UserPreferencesService] ✅ Successfully saved goals to synthetic profile ${activeProfileId}. Updated rows: ${updateResult.length}`);
          console.log(`[UserPreferencesService] Verification - saved targetTitles:`, updateResult[0]?.targetTitles || 'none');
        } else {
          console.warn(`[UserPreferencesService] ⚠️ No rows updated for profile ${activeProfileId} - profile may not exist`);
        }
      } else {
        // Normal mode: save to profiles table
        const { error } = await supabase
          .from('profiles')
          .update({
            goals: JSON.stringify(goals),
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) {
          console.error('Error saving goals to database:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in saveGoals:', error);
      throw error;
    }
  }

  /**
   * Load user goals from database
   * In synthetic mode, loads from synthetic_users.profile_data instead of profiles.goals
   */
  static async loadGoals(userId: string): Promise<UserGoals | null> {
    try {
      // Check if synthetic mode is enabled
      const syntheticService = new SyntheticUserService();
      const syntheticContext = await syntheticService.getSyntheticUserContext();
      
      if (syntheticContext.isSyntheticTestingEnabled && syntheticContext.currentUser) {
        const activeProfileId = syntheticContext.currentUser.profileId;
        console.log(`[UserPreferencesService] Loading goals for synthetic profile: ${activeProfileId}, user: ${userId}`);
        
        // Load from synthetic_users.profile_data (read directly from DB for fresh data)
        const { data: syntheticUser, error } = await supabase
          .from('synthetic_users')
          .select('profile_data, profile_id, profile_name')
          .eq('parent_user_id', userId)
          .eq('profile_id', activeProfileId)
          .single();
        
        if (error) {
          console.error(`[UserPreferencesService] Error loading synthetic profile data for ${activeProfileId}:`, error);
          return null;
        }
        
        // Verify we got the right profile
        if (syntheticUser?.profile_id !== activeProfileId) {
          console.error(`[UserPreferencesService] ⚠️ Profile mismatch! Requested ${activeProfileId}, got ${syntheticUser?.profile_id}`);
          return null;
        }
        
        console.log(`[UserPreferencesService] ✅ Loaded synthetic user data for profile ${syntheticUser?.profile_id} (${syntheticUser?.profile_name}), profile_data keys:`, syntheticUser?.profile_data ? Object.keys(syntheticUser.profile_data) : 'none');
        
        const profileData = syntheticUser?.profile_data || {};
        const goals = profileData.goals;
        
        if (goals) {
          console.log(`[UserPreferencesService] Found goals in profile_data for ${activeProfileId}:`, goals);
          // Handle legacy format: if it's an array, convert to UserGoals format
          if (Array.isArray(goals)) {
            console.warn('[UserPreferencesService] Legacy goals format detected (array), converting to object format');
            return {
              targetTitles: goals.filter((item: any) => typeof item === 'string'),
              minimumSalary: 180000,
              companyMaturity: [],
              workType: [],
              industries: [],
              businessModels: [],
              dealBreakers: {
                workType: [],
                companyMaturity: [],
                salaryMinimum: null
              },
              preferredCities: [],
              openToRelocation: true
            };
          }
          
          // Validate it's a proper UserGoals object
          if (goals && typeof goals === 'object' && !Array.isArray(goals)) {
            console.log(`[UserPreferencesService] Successfully loaded goals from synthetic profile ${activeProfileId}`);
            return goals;
          }
        }
        
        console.log(`[UserPreferencesService] No goals found in profile_data for ${activeProfileId}, returning null`);
        return null;
      } else {
        // Normal mode: load from profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('goals')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error loading goals from database:', error);
          return null;
        }

        if (data?.goals) {
          try {
            const parsed = typeof data.goals === 'string' 
              ? JSON.parse(data.goals) 
              : data.goals;
            
            // Handle legacy format: if it's an array, convert to UserGoals format
            if (Array.isArray(parsed)) {
              console.warn('[UserPreferencesService] Legacy goals format detected (array), converting to object format');
              return {
                targetTitles: parsed.filter((item: any) => typeof item === 'string'),
                minimumSalary: 180000,
                companyMaturity: [],
                workType: [],
                industries: [],
                businessModels: [],
                dealBreakers: {
                  workType: [],
                  companyMaturity: [],
                  salaryMinimum: null
                },
                preferredCities: [],
                openToRelocation: true
              };
            }
            
            // Validate it's a proper UserGoals object
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              return parsed;
            }
            
            console.warn('[UserPreferencesService] Invalid goals format, returning null');
            return null;
          } catch (parseError) {
            console.error('Error parsing goals JSON:', parseError);
            return null;
          }
        }

        return null;
      }
    } catch (error) {
      console.error('Error in loadGoals:', error);
      return null;
    }
  }

  /**
   * Save user voice to database
   * In synthetic mode, saves to synthetic_users.profile_data instead of profiles.user_voice
   */
  static async saveVoice(userId: string, voice: UserVoice): Promise<void> {
    try {
      // Check if synthetic mode is enabled
      const syntheticService = new SyntheticUserService();
      const syntheticContext = await syntheticService.getSyntheticUserContext();
      
      if (syntheticContext.isSyntheticTestingEnabled && syntheticContext.currentUser) {
        // Save to synthetic_users.profile_data
        // First, read current profile_data to preserve other fields
        const { data: currentSyntheticUser, error: fetchError } = await supabase
          .from('synthetic_users')
          .select('profile_data')
          .eq('parent_user_id', userId)
          .eq('profile_id', syntheticContext.currentUser.profileId)
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('[UserPreferencesService] Error fetching synthetic profile data:', fetchError);
          throw fetchError;
        }
        
        const currentProfileData = currentSyntheticUser?.profile_data || {};
        const updatedProfileData = {
          ...currentProfileData,
          user_voice: voice
        };
        
        const { error } = await supabase
          .from('synthetic_users')
          .update({
            profile_data: updatedProfileData,
            updated_at: new Date().toISOString()
          })
          .eq('parent_user_id', userId)
          .eq('profile_id', syntheticContext.currentUser.profileId);

        if (error) {
          console.error('[UserPreferencesService] Error saving voice to synthetic profile:', error);
          throw error;
        }
        
        console.log(`[UserPreferencesService] Saved voice to synthetic profile ${syntheticContext.currentUser.profileId}`);
      } else {
        // Normal mode: save to profiles table
        const { error } = await supabase
          .from('profiles')
          .update({
            user_voice: JSON.stringify(voice),
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) {
          console.error('Error saving voice to database:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in saveVoice:', error);
      throw error;
    }
  }

  /**
   * Load user voice from database
   * In synthetic mode, loads from synthetic_users.profile_data instead of profiles.user_voice
   */
  static async loadVoice(userId: string): Promise<UserVoice | null> {
    try {
      // Check if synthetic mode is enabled
      const syntheticService = new SyntheticUserService();
      const syntheticContext = await syntheticService.getSyntheticUserContext();
      
      if (syntheticContext.isSyntheticTestingEnabled && syntheticContext.currentUser) {
        // Load from synthetic_users.profile_data (read directly from DB for fresh data)
        const { data: syntheticUser, error } = await supabase
          .from('synthetic_users')
          .select('profile_data')
          .eq('parent_user_id', userId)
          .eq('profile_id', syntheticContext.currentUser.profileId)
          .single();
        
        if (error) {
          console.error('[UserPreferencesService] Error loading synthetic profile data:', error);
          return null;
        }
        
        const profileData = syntheticUser?.profile_data || {};
        const voice = profileData.user_voice;
        
        if (voice) {
          console.log(`[UserPreferencesService] Loaded voice from synthetic profile ${syntheticContext.currentUser.profileId}`);
          return voice;
        }
        
        return null;
      } else {
        // Normal mode: load from profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('user_voice')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error loading voice from database:', error);
          return null;
        }

        if (data?.user_voice) {
          try {
            return typeof data.user_voice === 'string'
              ? JSON.parse(data.user_voice)
              : data.user_voice;
          } catch (parseError) {
            console.error('Error parsing voice JSON:', parseError);
            return null;
          }
        }

        return null;
      }
    } catch (error) {
      console.error('Error in loadVoice:', error);
      return null;
    }
  }

  /**
   * Get target job titles from user goals
   * Used for gap detection (target level expectations)
   */
  static async getTargetJobTitles(userId: string): Promise<string[]> {
    try {
      const goals = await this.loadGoals(userId);
      return goals?.targetTitles || [];
    } catch (error) {
      console.error('Error getting target job titles:', error);
      return [];
    }
  }
}


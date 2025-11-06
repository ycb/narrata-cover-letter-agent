/**
 * User Preferences Service
 * Handles persistence of user goals and voice to database (profiles table)
 * Phase 3: Gap Detection Service Implementation
 */

import { supabase } from '@/lib/supabase';
import type { UserGoals } from '@/types/userGoals';
import type { UserVoice } from '@/types/userVoice';

export class UserPreferencesService {
  /**
   * Save user goals to database
   */
  static async saveGoals(userId: string, goals: UserGoals): Promise<void> {
    try {
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
    } catch (error) {
      console.error('Error in saveGoals:', error);
      throw error;
    }
  }

  /**
   * Load user goals from database
   */
  static async loadGoals(userId: string): Promise<UserGoals | null> {
    try {
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
    } catch (error) {
      console.error('Error in loadGoals:', error);
      return null;
    }
  }

  /**
   * Save user voice to database
   */
  static async saveVoice(userId: string, voice: UserVoice): Promise<void> {
    try {
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
    } catch (error) {
      console.error('Error in saveVoice:', error);
      throw error;
    }
  }

  /**
   * Load user voice from database
   */
  static async loadVoice(userId: string): Promise<UserVoice | null> {
    try {
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


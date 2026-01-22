import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigError, getUserProfile, upsertUserProfile, getCurrentUser, safeAuthOperations } from '@/lib/supabase'
import { setPreferredDashboardCache } from '@/lib/dashboardPreference'
import type { Database } from '@/types/supabase'
import { PersonalDataService } from '@/services/personalDataService'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  isDemo: boolean
  demoSlug: string | null
  newSignupRedirect: boolean
  isOnboardingComplete: boolean | null
  onboardingStatusLoading: boolean
  loading: boolean
  error: string | null
  enterDemo: (slug: string) => Promise<{ error: any }>
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    acceptedTerms?: boolean,
    accountType?: 'alpha' | 'beta'
  ) => Promise<{ error: any; message?: string }>
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any }>
  signInWithMagicLink: (email: string) => Promise<{ error: any }>
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: any }>
  signInWithLinkedIn: (redirectTo?: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>
  refreshProfile: () => Promise<void>
  refreshOAuthData: () => Promise<void>
  needsProfileCompletion: () => boolean
  clearNewSignupRedirect: () => void
  refreshOnboardingStatus: () => Promise<void>
  getOAuthData: () => {
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
    picture: string | null;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const DEMO_SLUG_STORAGE_KEY = 'narrata_demo_slug';
const NEW_SIGNUP_WINDOW_MS = 10 * 60 * 1000;

const getDemoSlugFromStorageOrPath = (): string | null => {
  try {
    const stored = localStorage.getItem(DEMO_SLUG_STORAGE_KEY);
    if (stored && stored.trim()) return stored.trim();
  } catch {
    // ignore
  }

  try {
    const path = window.location.pathname || '';
    const match = path.match(/^\/demo\/([^/]+)/);
    if (match?.[1]) return match[1];
    if (path === '/peter' || path.startsWith('/peter/')) return 'peter';
  } catch {
    // ignore
  }

  return null;
};

const isRecentSignup = (user: User | null) => {
  if (!user?.created_at) return false;
  const createdAt = new Date(user.created_at).getTime();
  if (Number.isNaN(createdAt)) return false;
  return Date.now() - createdAt < NEW_SIGNUP_WINDOW_MS;
};

// Note: Using existing profile columns only (full_name, avatar_url)
// No additional OAuth metadata storage needed

// Helper function to extract data from OAuth identities
const extractOAuthData = (identities: any[]): {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  picture: string | null;
} => {
  console.log('🔍 OAuth Identities Analysis:');
  console.log('Raw identities:', JSON.stringify(identities, null, 2));
  
  if (!identities || identities.length === 0) {
    console.log('❌ No identities provided');
    return { fullName: null, firstName: null, lastName: null, picture: null };
  }
  
  // Find the most recent identity (LinkedIn preferred, then Google)
  const linkedinIdentity = identities.find(id => id.provider === 'linkedin_oidc');
  const googleIdentity = identities.find(id => id.provider === 'google');
  const identity = linkedinIdentity || googleIdentity || identities[0];
  
  console.log('🎯 Using identity from provider:', identity.provider);
  console.log('📋 Identity data:', JSON.stringify(identity.identity_data, null, 2));
  
  const identityData = identity.identity_data || {};
  
  // Extract name components
  let fullName = null;
  let firstName = null;
  let lastName = null;
  
  // Primary: full_name from identity data
  if (identityData.full_name && identityData.full_name.trim()) {
    fullName = identityData.full_name.trim();
    console.log('✅ Found full_name:', fullName);
  }
  
  // Secondary: name from identity data
  if (!fullName && identityData.name && identityData.name.trim()) {
    fullName = identityData.name.trim();
    console.log('✅ Found name:', fullName);
  }
  
  // Tertiary: given_name + family_name from identity data
  if (!fullName && identityData.given_name && identityData.family_name) {
    fullName = `${identityData.given_name.trim()} ${identityData.family_name.trim()}`.trim();
    console.log('✅ Found given_name + family_name:', fullName);
  }
  
  // Extract individual name components
  if (identityData.given_name && identityData.given_name.trim()) {
    firstName = identityData.given_name.trim();
    console.log('✅ Found given_name:', firstName);
  }
  
  if (identityData.family_name && identityData.family_name.trim()) {
    lastName = identityData.family_name.trim();
    console.log('✅ Found family_name:', lastName);
  }
  
  // Extract picture data
  const picture = identityData.picture || identityData.avatar_url || null;
  
  if (picture) {
    console.log('✅ Found picture:', picture);
  }
  
  console.log('📊 Extracted OAuth data:', {
    fullName,
    firstName,
    lastName,
    picture
  });
  
  return { fullName, firstName, lastName, picture };
};

// Legacy function for backward compatibility
const extractNameFromOAuthMetadata = (metadata: any): string | null => {
  console.log('⚠️ Using legacy extractNameFromOAuthMetadata - consider using extractOAuthData instead');
  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [demoSlug, setDemoSlug] = useState<string | null>(null)
  const [newSignupRedirect, setNewSignupRedirect] = useState(false)
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null)
  const [onboardingStatusLoading, setOnboardingStatusLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const isDemoRef = useRef(false)

  useEffect(() => {
    isDemoRef.current = isDemo
  }, [isDemo])

  const refreshOnboardingStatus = useCallback(async () => {
    if (!user?.id || isDemoRef.current) {
      setIsOnboardingComplete(null);
      setOnboardingStatusLoading(false);
      return;
    }

    setOnboardingStatusLoading(true);
    try {
      const latestProfile = await getUserProfile(user.id);
      if (latestProfile) {
        setProfile(latestProfile);
        const profileFlag = (latestProfile as any).onboarding_complete;
        if (typeof profileFlag === 'boolean') {
          setIsOnboardingComplete(profileFlag);
          return;
        }
      }

      const assets = await PersonalDataService.getAssets(user.id);
      const completedTypes = new Set(
        assets
          .filter(asset => !asset.isDeleted && asset.processingStatus === 'completed')
          .map(asset => asset.sourceType)
      );
      const complete = completedTypes.has('resume') && completedTypes.has('cover_letter');
      setIsOnboardingComplete(complete);
    } catch (err) {
      console.error('[OnboardingGate] Failed to check onboarding status:', err);
      setIsOnboardingComplete(prev => (prev === null ? false : prev));
    } finally {
      setOnboardingStatusLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || isDemoRef.current) {
      setIsOnboardingComplete(null);
      setOnboardingStatusLoading(false);
      return;
    }
    refreshOnboardingStatus();
  }, [user?.id, refreshOnboardingStatus]);

  useEffect(() => {
    if (!user?.id || isDemoRef.current) {
      return;
    }

    const channel = supabase
      .channel(`onboarding-sources-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sources', filter: `user_id=eq.${user.id}` },
        () => {
          refreshOnboardingStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshOnboardingStatus]);

  const clearDemoMode = useCallback((reason?: string) => {
    if (reason) {
      console.log('🔓 Exiting demo mode:', reason);
    }
    setIsDemo(false);
    setDemoSlug(null);
    isDemoRef.current = false;
    try {
      localStorage.removeItem(DEMO_SLUG_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const loadDemoProfile = useCallback(async (slug: string) => {
    const { data: demoProfile, error: demoProfileError } = await supabase
      .from('public_demo_profiles')
      .select('user_id')
      .eq('slug', slug)
      .single()

    if (demoProfileError || !demoProfile?.user_id) {
      throw new Error('Demo not found')
    }

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', demoProfile.user_id)
      .maybeSingle()

    setIsDemo(true)
    setDemoSlug(slug)
    setSession(null)
    setProfile((profileRow as Profile) ?? null)
    setUser(({ id: demoProfile.user_id, email: (profileRow as any)?.email ?? null } as unknown) as User)
    setError(null)
  }, [])

  // Load user profile when user changes - memoized to prevent unnecessary re-renders
  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      console.log('👤 Loading user profile for ID:', userId);
      let profileData = await getUserProfile(userId)
      const shouldRedirectToOnboarding = !profileData

      // Demo mode: never attempt to create/update a profile (no real auth.uid()).
      if (isDemo) {
        setProfile(profileData)
        return
      }
      
      // If profile doesn't exist, create it based on auth method
      if (!profileData) {
        console.log('🆕 No existing profile found, creating new profile...');
        const user = await getCurrentUser()
        if (user) {
          console.log('👤 Current user data for profile creation:', {
            id: user.id,
            email: user.email,
            identities: user.identities,
            user_metadata: user.user_metadata
          });
          
          let fullName = null;
          let avatarUrl = null;
          
          // Check if user has OAuth identities (LinkedIn, Google)
          if (user.identities && user.identities.length > 0) {
            console.log('🔗 OAuth user detected, extracting OAuth data...');
            const oauthData = extractOAuthData(user.identities);
            fullName = oauthData.fullName;
            avatarUrl = oauthData.picture;
            console.log('📝 OAuth data extracted:', { fullName, avatarUrl });
          } else {
            console.log('📧 Email/password/magic link user detected, using user_metadata...');
            // For email/password/magic link users, check user_metadata
            fullName = user.user_metadata?.full_name || null;
            avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
            console.log('📝 User metadata extracted:', { fullName, avatarUrl });
            
            // If no name found, this might be a magic link user who needs profile completion
            if (!fullName) {
              console.log('⚠️ No name found - user may need profile completion');
            }
          }
          
          try {
            const newProfileData = {
              id: userId,
              email: user.email || '',
              full_name: fullName,
              avatar_url: avatarUrl,
            }
            
            console.log('💾 Creating profile with data:', newProfileData);
            profileData = await upsertUserProfile(newProfileData)
            console.log('✅ Profile created successfully:', profileData);
          } catch (profileError: any) {
            // If profile creation fails (e.g., RLS policy violation), 
            // wait a moment and try to fetch again (trigger might have created it)
            console.log('Profile creation failed, retrying fetch...', profileError.message)
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
            profileData = await getUserProfile(userId)
          }
        }
      } else {
        console.log('✅ Existing profile found, using stored data:', profileData);
        // Profile exists, use stored data - no need to re-extract
      }


      if (shouldRedirectToOnboarding && profileData) {
        setPreferredDashboardCache('onboarding');
        setNewSignupRedirect(true);
      }
      
      console.log('🎯 Setting profile in state:', profileData);
      console.log('🔍 Profile preferred_dashboard:', (profileData as any)?.preferred_dashboard);
      if ((profileData as any)?.preferred_dashboard) {
        setPreferredDashboardCache((profileData as any).preferred_dashboard as 'main' | 'onboarding');
      }
      if (typeof (profileData as any)?.onboarding_complete === 'boolean') {
        setIsOnboardingComplete((profileData as any).onboarding_complete);
      }
      setProfile(profileData)
    } catch (err: any) {
      console.error('Error loading user profile:', err)
      // Don't show toast for profile loading errors - they're not critical
      // The user can still use the app without a complete profile
    }
  }, [isDemo])

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        if (supabaseConfigError) {
          if (!mounted) return;
          setError(supabaseConfigError);
          setLoading(false);
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('Error getting session:', error)
          setError(error.message)
        } else {
          if (session?.user) {
            clearDemoMode('authenticated session detected');
            setSession(session)
            setUser(session.user)
          } else {
            const demoSlug = getDemoSlugFromStorageOrPath();
            if (demoSlug) {
              await loadDemoProfile(demoSlug)
              return
            }
            setSession(null)
            setUser(null)
          }
        }
      } catch (err) {
        console.error('Error in getInitialSession:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    if (supabaseConfigError) {
      return () => {
        mounted = false
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth State Change:', event);
      console.log('📧 User email:', session?.user?.email);
      console.log('🔗 Provider:', session?.user?.app_metadata?.provider);
      
      if (!mounted) return

      if (session?.user && isDemoRef.current) {
        clearDemoMode('auth state change with session');
      }

      // If we are in demo mode without a session, ignore auth state changes.
      if (isDemoRef.current && !session?.user) {
        return
      }
      
      // Don't process auth state changes during logout
      if (isSigningOut) {
        return
      }
      
      // Log detailed user metadata for LinkedIn OAuth
      if (session?.user && event === 'SIGNED_IN') {
        console.log('🔍 LinkedIn OAuth User Data:');
        console.log('User ID:', session.user.id);
        console.log('Email:', session.user.email);
        console.log('App Metadata:', JSON.stringify(session.user.app_metadata, null, 2));
        console.log('User Metadata:', JSON.stringify(session.user.user_metadata, null, 2));
        console.log('Identities:', JSON.stringify(session.user.identities, null, 2));
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      setError(null)

      if (event === 'SIGNED_IN' && session?.user && !isDemoRef.current) {
        if (isRecentSignup(session.user)) {
          setPreferredDashboardCache('onboarding');
          setNewSignupRedirect(true);
        }
      }
      
      if (session?.user) {
        setProfile(null) // Clear profile first
      } else {
        setProfile(null)
      }
      
      setLoading(false)
    })

    // Timeout protection - force loading to false after 10 seconds
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false)
      }
    }, 10000)

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [clearDemoMode, isSigningOut, loadDemoProfile])

  // Separate effect to load profile when user changes
  useEffect(() => {
    if (user?.id) {
      loadUserProfile(user.id)
    } else {
      setProfile(null)
    }
  }, [user?.id, loadUserProfile])

  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
    acceptedTerms?: boolean,
    accountType?: 'alpha' | 'beta'
  ) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/new-user`,
          data: {
            full_name: fullName,
            account_type: accountType ?? 'beta',
          },
        },
      })
      
      if (error) {
        setError(error.message)
        return { error }
      }

      // If user is created and session exists, they're automatically signed in
      if (data.user && data.session) {
        console.log('User signed up and automatically signed in:', data.user.email)
        
        // Record terms acceptance if user agreed
        if (acceptedTerms && data.user.id) {
          const now = new Date().toISOString()
          try {
            const { error: profileError } = await supabase
              .from('profiles')
              .update({
                terms_accepted_at: now,
                privacy_accepted_at: now,
              })
              .eq('id', data.user.id)
            
            if (profileError) {
              console.error('Error recording terms acceptance:', profileError)
              // Don't fail signup if terms logging fails, but log it
            } else {
              console.log('✅ Terms and Privacy Policy acceptance recorded for user:', data.user.email)
            }
          } catch (termsError) {
            console.error('Exception recording terms acceptance:', termsError)
            // Don't fail signup if terms logging fails
          }
        }
        
        // The auth state change will be handled by the onAuthStateChange listener
        return { error: null }
      }

      // If no session (email confirmation required), show message
      if (data.user && !data.session) {
        console.log('User created but email confirmation required:', data.user.email)
        return { 
          error: null, 
          message: 'Please check your email and click the confirmation link to complete your signup.' 
        }
      }
      return { error: null }
    } catch (err: any) {
      setError(err.message)
      return { error: err }
    }
  }

  const signIn = async (email: string, password: string, rememberMe = false) => {
    try {
      setError(null)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        setError(error.message)
        return { error }
      }

      return { error: null }
    } catch (err: any) {
      setError(err.message)
      return { error: err }
    }
  }

  const signInWithMagicLink = async (email: string) => {
    try {
      setError(null)
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) {
        setError(error.message)
        return { error }
      }

      return { error: null }
    } catch (err: any) {
      setError(err.message)
      return { error: err }
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      setIsSigningOut(true)

      try {
        localStorage.removeItem(DEMO_SLUG_STORAGE_KEY)
      } catch {
        // ignore
      }
      setIsDemo(false)
      setDemoSlug(null)
      
      console.log('Starting sign out process...')
      
      // Clear local state immediately to prevent hanging
      setUser(null)
      setSession(null)
      setProfile(null)
      setLoading(false)
      
      // Clear all Supabase-related localStorage items
      try {
        console.log('Clearing localStorage...')
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key)
          }
        })
        
        // Also clear sessionStorage
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
            sessionStorage.removeItem(key)
          }
        })
      } catch (e) {
        console.warn('Error clearing storage:', e)
      }
      
      // Try to call Supabase signOut with timeout (non-blocking)
      try {
        console.log('Attempting Supabase signOut...')
        const signOutPromise = supabase.auth.signOut()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SignOut timeout')), 3000)
        )
        
        await Promise.race([signOutPromise, timeoutPromise])
        console.log('Supabase signOut completed')
      } catch (signOutError) {
        console.warn('Supabase signOut failed or timed out:', signOutError)
        // Continue anyway - local state is already cleared
      }
      
      console.log('Sign out process completed')
      return { error: null }
    } catch (err: any) {
      console.error('SignOut exception:', err)
      setError(err.message)
      return { error: err }
    } finally {
      setIsSigningOut(false)
    }
  }

  const enterDemo = useCallback(async (slug: string) => {
    try {
      setError(null)
      setLoading(true)
      try {
        localStorage.setItem(DEMO_SLUG_STORAGE_KEY, slug)
      } catch {
        // ignore
      }
      await loadDemoProfile(slug)
      return { error: null }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Demo not found'
      setError(message)
      return { error: err }
    } finally {
      setLoading(false)
    }
  }, [loadDemoProfile])

  const resetPassword = async (email: string) => {
    try {
      setError(null)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      
      if (error) {
        setError(error.message)
        return { error }
      }

      return { error: null }
    } catch (err: any) {
      setError(err.message)
      return { error: err }
    }
  }

  const signInWithGoogle = async (redirectTo?: string) => {
    try {
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirectTo || '/dashboard'}`,
        },
      })
      return { error }
    } catch (err: any) {
      setError(err.message)
      return { error: err }
    }
  }

  const signInWithLinkedIn = async (redirectTo?: string) => {
    try {
      console.log('🔗 Initiating LinkedIn OAuth sign-in...');
      console.log('📍 Redirect URL:', `${window.location.origin}${redirectTo || '/dashboard'}`);
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: `${window.location.origin}${redirectTo || '/dashboard'}`,
        },
      })
      
      if (error) {
        console.error('❌ LinkedIn OAuth error:', error);
      } else {
        console.log('✅ LinkedIn OAuth initiated successfully');
      }
      
      return { error }
    } catch (err: any) {
      console.error('❌ LinkedIn OAuth exception:', err);
      setError(err.message)
      return { error: err }
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) {
        const error = new Error('User not authenticated')
        setError(error.message)
        return { error }
      }

      setError(null)
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) {
        setError(error.message)
        return { error }
      }

      // Refresh profile data
      if ((updates as any).preferred_dashboard) {
        setPreferredDashboardCache((updates as any).preferred_dashboard as 'main' | 'onboarding');
      }
      await refreshProfile()
      return { error: null }
    } catch (err: any) {
      setError(err.message)
      return { error: err }
    }
  }

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadUserProfile(user.id)
    }
  }, [user, loadUserProfile])

  const refreshOAuthData = useCallback(async () => {
    if (!user || !profile) return;
    
    try {
      console.log('🔄 Refreshing OAuth data from current identities...');
      
      // Extract fresh OAuth data from current identities
      const oauthData = extractOAuthData(user.identities || []);
      console.log('📝 Fresh OAuth data:', oauthData);
      
      // Update profile with fresh OAuth data using existing columns
      const updatedProfile = {
        full_name: oauthData.fullName,
        avatar_url: oauthData.picture,
        // Only update existing columns - no additional metadata
      };
      
      console.log('💾 Updating profile with fresh OAuth data:', updatedProfile);
      await updateProfile(updatedProfile);
      console.log('✅ OAuth data refreshed successfully');
    } catch (err: any) {
      console.error('❌ Error refreshing OAuth data:', err);
      setError(err.message);
    }
  }, [user, profile, updateProfile])

  const needsProfileCompletion = useCallback(() => {
    // Check if user needs to complete their profile
    if (!user || !profile) return false;
    
    // If no full_name in profile, user needs to complete profile
    return !profile.full_name || profile.full_name.trim().length === 0;
  }, [user, profile])

  const getOAuthData = useCallback(() => {
    console.log('🔍 getOAuthData called with profile:', profile);
    console.log('🔍 getOAuthData called with user:', user);
    
    // First try to get data from stored profile
    if (profile && profile.full_name) {
      console.log('✅ Using stored profile data');
      const fullName = profile.full_name;
      const firstName = fullName ? fullName.split(' ')[0] : null;
      const lastName = fullName ? fullName.split(' ').slice(1).join(' ') : null;
      
      console.log('📊 Profile data extracted:', {
        fullName,
        firstName,
        lastName,
        picture: profile.avatar_url
      });
      
      return {
        fullName: profile.full_name,
        firstName: firstName,
        lastName: lastName,
        picture: profile.avatar_url
      };
    }
    
    // Fallback: Extract from current user OAuth data if profile is empty
    if (user && user.identities && user.identities.length > 0) {
      console.log('🔄 Profile empty, extracting from current user OAuth data');
      const oauthData = extractOAuthData(user.identities);
      console.log('📊 OAuth data extracted as fallback:', oauthData);
      return oauthData;
    }
    
    // Final fallback: Check user_metadata
    if (user && user.user_metadata) {
      console.log('🔄 Using user_metadata as final fallback');
      const fullName = user.user_metadata.full_name;
      const firstName = fullName ? fullName.split(' ')[0] : null;
      const lastName = fullName ? fullName.split(' ').slice(1).join(' ') : null;
      
      return {
        fullName: fullName,
        firstName: firstName,
        lastName: lastName,
        picture: user.user_metadata.avatar_url || user.user_metadata.picture || null
      };
    }
    
    console.log('❌ No data available from any source');
    return { fullName: null, firstName: null, lastName: null, picture: null };
  }, [profile, user])

  const clearNewSignupRedirect = useCallback(() => {
    setNewSignupRedirect(false);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    session,
    profile,
    isDemo,
    demoSlug,
    newSignupRedirect,
    isOnboardingComplete,
    onboardingStatusLoading,
    loading,
    error,
    enterDemo,
    signUp,
    signIn,
    signInWithMagicLink,
    signInWithGoogle,
    signInWithLinkedIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
    refreshOAuthData,
    needsProfileCompletion,
    clearNewSignupRedirect,
    refreshOnboardingStatus,
    getOAuthData,
  }), [
    user,
    session,
    profile,
    isDemo,
    demoSlug,
    newSignupRedirect,
    isOnboardingComplete,
    onboardingStatusLoading,
    loading,
    error,
    enterDemo,
    signUp,
    signIn,
    signInWithMagicLink,
    signInWithGoogle,
    signInWithLinkedIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
    refreshOAuthData,
    needsProfileCompletion,
    clearNewSignupRedirect,
    refreshOnboardingStatus,
    getOAuthData,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

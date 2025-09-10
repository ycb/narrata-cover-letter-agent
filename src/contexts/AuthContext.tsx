import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, getUserProfile, upsertUserProfile, getCurrentUser } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string | null
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signInWithMagicLink: (email: string) => Promise<{ error: any }>
  signInWithGoogle: () => Promise<{ error: any }>
  signInWithLinkedIn: () => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  // Load user profile when user changes - memoized to prevent unnecessary re-renders
  const loadUserProfile = useCallback(async (userId: string) => {
    try {
      let profileData = await getUserProfile(userId)
      
      // If profile doesn't exist, create it
      if (!profileData) {
        const user = await getCurrentUser()
        if (user) {
          const newProfileData = {
            id: userId,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          }
          
          profileData = await upsertUserProfile(newProfileData)
        }
      }
      
      setProfile(profileData)
    } catch (err: any) {
      console.error('Error loading user profile:', err)
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('Error getting session:', error)
          setError(error.message)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
          
          // Load profile if user exists
          if (session?.user) {
            await loadUserProfile(session.user.id)
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      // Don't process auth state changes during logout
      if (isSigningOut) {
        return
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      setError(null)
      
      // Load profile if user exists
      if (session?.user) {
        await loadUserProfile(session.user.id)
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
  }, [loadUserProfile, loading])

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      
      if (error) {
        setError(error.message)
        return { error }
      }

      // Create profile if signup was successful
      if (data.user) {
        await upsertUserProfile({
          id: data.user.id,
          email: data.user.email!,
          full_name: fullName || null,
        })
      }

      return { error: null }
    } catch (err: any) {
      setError(err.message)
      return { error: err }
    }
  }

  const signIn = async (email: string, password: string) => {
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
      
      // First, sign out from Supabase to clear the session
      const signOutPromise = supabase.auth.signOut()
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('SignOut timeout')), 3000)
      )
      
      try {
        const { error } = await Promise.race([signOutPromise, timeoutPromise])
        if (error) {
          console.warn('Supabase signOut error:', error)
          // Even if Supabase fails, clear local state
        }
      } catch (timeoutError) {
        console.warn('SignOut timed out')
        // Even if timeout, clear local state
      }

      // Clear local state after Supabase signOut attempt
      setUser(null)
      setSession(null)
      setProfile(null)
      setLoading(false)
      
      // Force clear any remaining session data
      try {
        // Clear all Supabase-related localStorage items
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') && key.includes('auth-token')) {
            localStorage.removeItem(key)
          }
        })
      } catch (e) {
        // Ignore localStorage errors
      }

      return { error: null }
    } catch (err: any) {
      console.error('SignOut exception:', err)
      setError(err.message)
      return { error: err }
    } finally {
      setIsSigningOut(false)
    }
  }

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

  const signInWithGoogle = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })
      return { error }
    } catch (err: any) {
      setError(err.message)
      return { error: err }
    }
  }

  const signInWithLinkedIn = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'linkedin',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })
      return { error }
    } catch (err: any) {
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

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signInWithMagicLink,
    signInWithGoogle,
    signInWithLinkedIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
  }), [
    user,
    session,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signInWithMagicLink,
    signInWithGoogle,
    signInWithLinkedIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
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

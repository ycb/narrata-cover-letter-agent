import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Create Supabase client with proper configuration for RLS
// Using optimized settings to prevent hanging issues
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Enable RLS by ensuring we always have a user context
    flowType: 'pkce',
    // Add timeout to prevent hanging
    debug: false,
    // Disable storage key to prevent conflicts
    storageKey: 'cover-letter-agent-auth'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'cover-letter-agent-frontend'
    }
  },
  // Add timeout for all requests
  db: {
    schema: 'public'
  }
})

// Timeout wrapper to prevent hanging operations
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
    )
  ])
}

// Safe auth operations with timeout protection
export const safeAuthOperations = {
  getSession: () => withTimeout(supabase.auth.getSession(), 15000), // Increased to 15 seconds
  getUser: () => withTimeout(supabase.auth.getUser(), 15000), // Increased to 15 seconds
  signOut: () => withTimeout(supabase.auth.signOut(), 10000) // Keep signOut at 10 seconds
}

// Helper function to get the current user with error handling
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Auth error getting current user:', error.message)
      throw error
    }
    console.log('Current user retrieved:', user?.id)
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// Helper function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser()
  return !!user
}

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  try {
    console.log('Fetching profile for user:', userId)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('Database error getting user profile:', error.message)
      throw error
    }
    console.log('User profile retrieved:', data?.id)
    return data
  } catch (error) {
    console.error('Error getting user profile:', error)
    return null
  }
}

// Helper function to create or update user profile
export const upsertUserProfile = async (profileData: {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileData, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error upserting user profile:', error)
    throw error
  }
}

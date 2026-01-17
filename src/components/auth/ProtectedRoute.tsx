import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface ProtectedRouteProps {
  children: ReactNode
  requireAuth?: boolean
  requireProfile?: boolean
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  requireProfile = false 
}: ProtectedRouteProps) {
  const { user, profile, loading, error, isDemo, isOnboardingComplete } = useAuth()
  const location = useLocation()
  const isOnboardingRoute = location.pathname.startsWith('/new-user')

  console.log('ProtectedRoute check:', { 
    user: user?.email, 
    profile: profile?.id, 
    loading, 
    error, 
    requireAuth, 
    requireProfile,
    path: location.pathname 
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Demo mode: never redirect to auth pages; treat demo "user" as the source of truth.
  if (isDemo) {
    // If the demo profile hasn't been hydrated yet, keep showing a loading state.
    if (requireProfile && user && !profile) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your profile...</p>
          </div>
        </div>
      )
    }
    return <>{children}</>
  }

  // If there's an error, redirect to sign-in for protected routes only.
  if (error && requireAuth) {
    return <Navigate to="/signin" state={{ from: location, error: error }} replace />
  }

  if (requireAuth && !user) {
    // Redirect to sign in page, but save the attempted location
    return <Navigate to="/signin" state={{ from: location }} replace />
  }

  if (requireProfile && user && !profile) {
    // User is authenticated but profile is not loaded yet
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (user && !isDemo && !isOnboardingRoute) {
    if (isOnboardingComplete === null) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      )
    }
    if (!isOnboardingComplete) {
      return <Navigate to="/new-user" replace />
    }
  }

  if (!requireAuth && user && !isDemo) {
    // Redirect authenticated users away from auth pages
    return <Navigate to={isOnboardingComplete === false ? "/new-user" : "/dashboard"} replace />
  }

  return <>{children}</>
}

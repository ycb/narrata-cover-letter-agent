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
  const { user, profile, loading, error } = useAuth()
  const location = useLocation()

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

  // If there's an error, redirect to sign-in instead of showing full-page error
  if (error) {
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

  if (!requireAuth && user) {
    // Redirect authenticated users away from auth pages
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

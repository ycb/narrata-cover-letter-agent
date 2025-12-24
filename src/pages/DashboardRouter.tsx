import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/shared/LoadingState';

/**
 * Dashboard Router - Redirects to preferred dashboard view
 * 
 * Routes:
 * - /dashboard → redirects based on user preference
 * - /dashboard/onboarding → NewUserDashboard (gaps + checklist)
 * - /dashboard/main → Dashboard (main dashboard)
 * 
 * Default: 'onboarding' for new users, 'main' after checklist completion or manual toggle
 */
export default function DashboardRouter() {
  const navigate = useNavigate();
  const { profile, loading } = useAuth();

  console.log('🔀 [DashboardRouter] Component render:', {
    loading,
    hasProfile: !!profile,
    profileId: profile?.id,
    preferredDashboard: (profile as any)?.preferred_dashboard
  });

  useEffect(() => {
    console.log('🔀 [DashboardRouter] useEffect triggered:', { loading, hasProfile: !!profile });
    
    if (loading) {
      console.log('⏳ [DashboardRouter] Still loading auth, waiting...');
      return;
    }

    if (!profile) {
      console.log('⏳ [DashboardRouter] Profile not loaded yet, waiting...');
      return;
    }

    // Get preferred dashboard from profile (default: 'onboarding')
    const preferredDashboard = (profile as any)?.preferred_dashboard || 'onboarding';

    console.log('🔀 [DashboardRouter] Routing decision:', {
      loading,
      hasProfile: !!profile,
      profileId: profile?.id,
      preferredDashboard,
      rawPreferredValue: (profile as any)?.preferred_dashboard,
      willNavigateTo: preferredDashboard === 'main' ? '/dashboard/main' : '/dashboard/onboarding'
    });

    // Redirect to preferred view
    if (preferredDashboard === 'main') {
      console.log('✅ [DashboardRouter] Navigating to /dashboard/main');
      navigate('/dashboard/main', { replace: true });
    } else {
      console.log('⚠️ [DashboardRouter] Navigating to /dashboard/onboarding');
      navigate('/dashboard/onboarding', { replace: true });
    }
  }, [profile, loading, navigate]);

  // Show loading state while determining redirect
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
      <LoadingState isLoading={true} loadingText="Loading dashboard..." />
    </div>
  );
}


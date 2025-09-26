import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function AuthCallback() {
  const { user, loading, error } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [callbackError, setCallbackError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Handling OAuth callback...');
        console.log('Current URL:', window.location.href);
        
        // Check if we have OAuth parameters in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        console.log('URL search params:', Object.fromEntries(urlParams));
        console.log('URL hash params:', Object.fromEntries(hashParams));
        
        // Listen for auth state changes first
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state change:', event, session?.user?.email);
            
            if (event === 'SIGNED_IN' && session) {
              console.log('User signed in successfully:', session.user.email);
              setStatus('success');
              setTimeout(() => navigate('/dashboard'), 2000);
            } else if (event === 'SIGNED_OUT') {
              console.log('User signed out');
              setCallbackError('Authentication failed');
              setStatus('error');
              setTimeout(() => navigate('/signin'), 3000);
            }
          }
        );

        // Try to get the session
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setCallbackError(sessionError.message);
          setStatus('error');
          setTimeout(() => navigate('/signin'), 2000);
          return;
        }

        if (data.session) {
          console.log('OAuth session found:', data.session.user.email);
          setStatus('success');
          setTimeout(() => navigate('/dashboard'), 2000);
          return;
        }

        // If no session and no OAuth params, this might be a direct visit
        if (!urlParams.has('code') && !hashParams.has('access_token')) {
          console.log('No OAuth parameters found, redirecting to sign in');
          setCallbackError('No authentication data found');
          setStatus('error');
          setTimeout(() => navigate('/signin'), 2000);
          return;
        }

        console.log('OAuth parameters found, waiting for auth state change...');

        // Clean up subscription after 15 seconds
        setTimeout(() => {
          subscription.unsubscribe();
          if (status === 'loading') {
            console.log('Auth timeout - no session received');
            setCallbackError('Authentication timeout - please try again');
            setStatus('error');
            setTimeout(() => navigate('/signin'), 2000);
          }
        }, 15000);

      } catch (err) {
        console.error('Auth callback error:', err);
        setCallbackError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
        setTimeout(() => navigate('/signin'), 2000);
      }
    };

    // Only run once when component mounts
    handleAuthCallback();
  }, []); // Empty dependency array to run only once

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-muted-foreground">Authentication successful! Redirecting to dashboard...</p>
      </div>
    </div>
  );
}
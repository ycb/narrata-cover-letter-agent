import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { initiateLinkedInOAuth } from '@/lib/linkedin';

export function LinkedInDebug() {
  const handleTestOAuth = () => {
    try {
      console.log('Testing LinkedIn OAuth...');
      initiateLinkedInOAuth();
    } catch (error) {
      console.error('LinkedIn OAuth test failed:', error);
      alert(`LinkedIn OAuth test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const checkEnvironment = () => {
    const customClientId = import.meta.env.VITE_LINKEDIN_CUSTOM_CLIENT_ID;
    const supabaseClientId = import.meta.env.VITE_LINKEDIN_SUPABASE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/linkedin/callback`;
    
    console.log('Environment check:');
    console.log('- VITE_LINKEDIN_CUSTOM_CLIENT_ID:', customClientId ? 'Set' : 'Not set');
    console.log('- VITE_LINKEDIN_SUPABASE_CLIENT_ID:', supabaseClientId ? 'Set' : 'Not set');
    console.log('- Redirect URI:', redirectUri);
    console.log('- Current origin:', window.location.origin);
    
    return {
      customClientId: customClientId ? 'Set' : 'Not set',
      supabaseClientId: supabaseClientId ? 'Set' : 'Not set',
      redirectUri,
      origin: window.location.origin
    };
  };

  const env = checkEnvironment();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>LinkedIn OAuth Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div><strong>Custom Client ID:</strong> {env.customClientId}</div>
          <div><strong>Supabase Client ID:</strong> {env.supabaseClientId}</div>
          <div><strong>Redirect URI:</strong> {env.redirectUri}</div>
          <div><strong>Origin:</strong> {env.origin}</div>
        </div>
        
        <Button onClick={handleTestOAuth} className="w-full">
          Test LinkedIn OAuth
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Check the browser console for detailed logs
        </div>
      </CardContent>
    </Card>
  );
}

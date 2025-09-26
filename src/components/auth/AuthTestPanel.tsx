import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  User, 
  Database, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  duration?: number;
}

export function AuthTestPanel() {
  const { user, profile, loading, error, signOut, refreshProfile } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTest = async (testName: string, testFn: () => Promise<void>): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      await testFn();
      return {
        name: testName,
        status: 'success',
        message: 'Passed',
        duration: Date.now() - startTime
      };
    } catch (err: any) {
      return {
        name: testName,
        status: 'error',
        message: err.message || 'Failed',
        duration: Date.now() - startTime
      };
    }
  };

  const runAllTests = async () => {
    if (!user) {
      setTestResults([{
        name: 'Authentication Check',
        status: 'error',
        message: 'User not authenticated'
      }]);
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    const tests: TestResult[] = [];

    // Test 1: Auth Context State
    tests.push(await runTest('Auth Context State', async () => {
      if (!user) throw new Error('User not available');
      if (loading) throw new Error('Still loading');
      if (error) throw new Error(`Auth error: ${error}`);
    }));

    // Test 2: Profile Loading
    tests.push(await runTest('Profile Loading', async () => {
      if (!profile) throw new Error('Profile not loaded');
      if (profile.id !== user.id) throw new Error('Profile ID mismatch');
    }));

    // Test 3: Database Connection
    tests.push(await runTest('Database Connection', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('No profile data returned');
    }));

    // Test 4: RLS Policy Test
    tests.push(await runTest('RLS Policy Test', async () => {
      // Try to access another user's data (should fail)
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .neq('id', user.id)
        .limit(1);
      
      // This should return empty array due to RLS
      if (data && data.length > 0) {
        throw new Error('RLS policy failed - accessed other user data');
      }
    }));

    // Test 5: Session Validity
    tests.push(await runTest('Session Validity', async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session) throw new Error('No active session');
      if (session.user.id !== user.id) throw new Error('Session user mismatch');
    }));

    setTestResults(tests);
    setIsRunning(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleRefreshProfile = async () => {
    await refreshProfile();
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Authentication Test Panel
        </CardTitle>
        <CardDescription>
          Comprehensive testing of Supabase Auth RLS integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current State */}
        <div className="space-y-3">
          <h4 className="font-medium">Current State</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">User:</span>
              <Badge variant={user ? 'default' : 'secondary'}>
                {user ? 'Authenticated' : 'Not Authenticated'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Profile:</span>
              <Badge variant={profile ? 'default' : 'secondary'}>
                {profile ? 'Loaded' : 'Not Loaded'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Loading:</span>
              <Badge variant={loading ? 'destructive' : 'secondary'}>
                {loading ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Error:</span>
              <Badge variant={error ? 'destructive' : 'secondary'}>
                {error ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
          
          {user && (
            <div className="text-xs text-muted-foreground">
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email}</p>
              {profile && (
                <p><strong>Full Name:</strong> {profile.full_name || 'Not set'}</p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Test Controls */}
        <div className="space-y-3">
          <h4 className="font-medium">Test Controls</h4>
          <div className="flex gap-2">
            <Button 
              onClick={runAllTests} 
              disabled={isRunning || !user}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            
            <Button 
              onClick={handleRefreshProfile} 
              disabled={!user}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Profile
            </Button>
            
            <Button 
              onClick={handleSignOut} 
              disabled={!user}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium">Test Results</h4>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${getStatusColor(result.status)}`}>
                        {result.message}
                      </span>
                      {result.duration && (
                        <span className="text-xs text-muted-foreground">
                          ({result.duration}ms)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

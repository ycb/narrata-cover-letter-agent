import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export function OAuthTest() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testGoogleOAuth = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Starting Google OAuth test...')
      
      // Test 1: Check if Supabase client is working
      console.log('Test 1: Checking Supabase client...')
      const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()
      console.log('Initial session:', initialSession)
      console.log('Session error:', sessionError)

      // Test 2: Try OAuth sign in
      console.log('Test 2: Starting OAuth sign in...')
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })

      console.log('OAuth response:', data)
      console.log('OAuth error:', oauthError)

      if (oauthError) {
        setError(`OAuth Error: ${oauthError.message}`)
        setResult({ step: 'oauth_error', error: oauthError })
      } else {
        setResult({ step: 'oauth_initiated', data })
      }

    } catch (err) {
      console.error('OAuth test error:', err)
      setError(`Test Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setResult({ step: 'test_error', error: err })
    } finally {
      setLoading(false)
    }
  }

  const testSession = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('Testing session...')
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log('Session test result:', session)
      console.log('Session test error:', error)

      if (error) {
        setError(`Session Error: ${error.message}`)
      } else {
        setResult({ step: 'session_test', session, error })
      }
    } catch (err) {
      console.error('Session test error:', err)
      setError(`Session Test Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const testUser = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('Testing user...')
      const { data: { user }, error } = await supabase.auth.getUser()
      console.log('User test result:', user)
      console.log('User test error:', error)

      if (error) {
        setError(`User Error: ${error.message}`)
      } else {
        setResult({ step: 'user_test', user, error })
      }
    } catch (err) {
      console.error('User test error:', err)
      setError(`User Test Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>OAuth Test Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Step:</strong> {result.step}
              <br />
              <strong>Result:</strong> {JSON.stringify(result, null, 2)}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={testGoogleOAuth} 
            disabled={loading}
            className="flex-1"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Test Google OAuth
          </Button>
          
          <Button 
            onClick={testSession} 
            disabled={loading}
            variant="outline"
          >
            Test Session
          </Button>
          
          <Button 
            onClick={testUser} 
            disabled={loading}
            variant="outline"
          >
            Test User
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p><strong>Instructions:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Test Google OAuth" to start OAuth flow</li>
            <li>Complete Google authentication</li>
            <li>You should be redirected back to dashboard</li>
            <li>Check console logs for detailed information</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}

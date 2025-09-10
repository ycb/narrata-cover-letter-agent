import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function OAuthDebug() {
  const [session, setSession] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('Debug - Session:', session)
        console.log('Debug - Error:', error)
        setSession(session)
        setUser(session?.user || null)
      } catch (err) {
        console.error('Debug - Error:', err)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Debug - Auth state change:', event, session)
      setSession(session)
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const testGoogleOAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })
      if (error) console.error('OAuth error:', error)
    } catch (err) {
      console.error('OAuth error:', err)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>OAuth Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Current Session:</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Current User:</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className="flex gap-2">
          <Button onClick={testGoogleOAuth}>
            Test Google OAuth
          </Button>
          <Badge variant={session ? "default" : "destructive"}>
            {session ? "Authenticated" : "Not Authenticated"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

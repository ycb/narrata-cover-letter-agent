import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { CheckCircle, XCircle, AlertCircle, Linkedin } from 'lucide-react'
import { handleLinkedInCallback, fetchLinkedInData, processLinkedInImport } from '@/lib/linkedin'
import { useAuth } from '@/contexts/AuthContext'

export default function LinkedInCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string>('')
  const [importResult, setImportResult] = useState<any>(null)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    // For now, allow LinkedIn callback even without authentication
    // This is needed for the OAuth flow to work
    // if (!user) {
    //   navigate('/signin')
    //   return
    // }

    const processCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')

        if (error) {
          setError(`LinkedIn authorization failed: ${error}`)
          setStatus('error')
          return
        }

        if (!code || !state) {
          setError('Missing authorization code or state parameter')
          setStatus('error')
          return
        }

        // Exchange code for access token
        const accessToken = await handleLinkedInCallback(code, state)
        
        // Fetch LinkedIn data
        const data = await fetchLinkedInData(accessToken)
        setImportResult(data)
        setStatus('success')

      } catch (err: any) {
        console.error('LinkedIn callback error:', err)
        setError(err.message || 'Failed to process LinkedIn authorization')
        setStatus('error')
      }
    }

    processCallback()
  }, [searchParams, user, navigate])

  const handleImport = async () => {
    if (!importResult) return

    setIsImporting(true)
    try {
      // For now, use default conflict resolution (keep existing)
      const conflictResolutions: Record<string, any> = {}
      
      await processLinkedInImport(importResult, conflictResolutions)
      
      // Redirect to work history page
      navigate('/work-history', { 
        state: { 
          message: 'LinkedIn data imported successfully!',
          importedCount: importResult.positions.length + importResult.education.length
        }
      })
    } catch (err: any) {
      setError(`Import failed: ${err.message}`)
      setStatus('error')
    } finally {
      setIsImporting(false)
    }
  }

  const handleSkip = () => {
    navigate('/work-history')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Linkedin className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold">Processing LinkedIn...</span>
            </div>
            <CardDescription>
              Please wait while we process your LinkedIn authorization
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Fetching your professional data...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
              <span className="text-xl font-bold">Authorization Failed</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/work-history')}
                className="flex-1"
              >
                Go to Work History
              </Button>
              <Button 
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'success' && importResult) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
              <span className="text-xl font-bold">LinkedIn Data Ready!</span>
            </div>
            <CardDescription>
              We've found your professional data from LinkedIn. Review and import what you'd like.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {importResult.positions.length}
                </div>
                <div className="text-sm text-muted-foreground">Positions</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {importResult.education.length}
                </div>
                <div className="text-sm text-muted-foreground">Education</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {importResult.skills.length}
                </div>
                <div className="text-sm text-muted-foreground">Skills</div>
              </div>
            </div>

            {/* Conflicts Warning */}
            {importResult.conflicts.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  We found {importResult.conflicts.length} potential conflicts with your existing data. 
                  We'll keep your existing data and add new items.
                </AlertDescription>
              </Alert>
            )}

            {/* Sample Data Preview */}
            <div className="space-y-4">
              <h4 className="font-semibold">Preview of what will be imported:</h4>
              
              {/* Positions Preview */}
              {importResult.positions.slice(0, 3).map((position: any, index: number) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <div className="font-medium">{position.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {position.companyName} • {position.startDate} - {position.endDate || 'Present'}
                  </div>
                </div>
              ))}
              
              {importResult.positions.length > 3 && (
                <div className="text-sm text-muted-foreground text-center">
                  ...and {importResult.positions.length - 3} more positions
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleSkip}
                className="flex-1"
              >
                Skip Import
              </Button>
              <Button 
                onClick={handleImport}
                disabled={isImporting}
                className="flex-1"
              >
                {isImporting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Import All Data
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              You can always edit or remove imported data later in your Work History
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

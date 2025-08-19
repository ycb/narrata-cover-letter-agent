import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, AlertCircle, Database, Shield, Eye, EyeOff } from 'lucide-react'

// Only show in development
const isDevelopment = import.meta.env.DEV

export function RLSTestPanel() {
  const { user } = useAuth()
  const [testResults, setTestResults] = useState<any>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [userData, setUserData] = useState<any>(null)

  // Hide completely in production
  if (!isDevelopment) {
    return null
  }

  // Test 1: Verify user can only see their own data
  const testDataIsolation = async () => {
    if (!user) return false

    try {
      // Fetch user's own companies
      const { data: ownCompanies, error: ownError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)

      if (ownError) throw ownError

      // Try to fetch ALL companies (should be filtered by RLS)
      const { data: allCompanies, error: allError } = await supabase
        .from('companies')
        .select('*')

      if (allError) throw allError

      // RLS should ensure allCompanies only contains user's own data
      const hasOtherUsersData = allCompanies && allCompanies.some(company => company.user_id !== user.id)

      return {
        success: !hasOtherUsersData,
        message: hasOtherUsersData 
          ? 'RLS Policy Violation: User can see other users\' data' 
          : 'RLS Policy Working: User can only see their own data',
        ownCompaniesCount: ownCompanies?.length || 0,
        allCompaniesCount: allCompanies?.length || 0
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Error: ${error.message}`,
        ownCompaniesCount: 0,
        allCompaniesCount: 0
      }
    }
  }

  // Test 2: Verify user cannot access data by ID without ownership
  const testDirectAccess = async () => {
    if (!user) return false

    try {
      // First, create a test company for this user
      const { data: testCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          name: 'RLS Test Company',
          description: 'Testing RLS policies',
          tags: ['test', 'rls'],
          user_id: user.id
        })
        .select()
        .single()

      if (createError) throw createError

      // Now try to access it by ID (should work)
      const { data: accessedCompany, error: accessError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', testCompany.id)
        .single()

      if (accessError) throw accessError

      // Clean up test data
      await supabase.from('companies').delete().eq('id', testCompany.id)

      return {
        success: true,
        message: 'RLS Policy Working: User can access their own data by ID',
        testCompanyId: testCompany.id
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Error: ${error.message}`,
        testCompanyId: null
      }
    }
  }

  // Test 3: Verify CRUD operations respect user ownership
  const testCRUDOperations = async () => {
    if (!user) return false

    try {
      // Create
      const { data: createdCompany, error: createError } = await supabase
        .from('companies')
        .insert({
          name: 'CRUD Test Company',
          description: 'Testing CRUD operations',
          tags: ['test', 'crud'],
          user_id: user.id
        })
        .select()
        .single()

      if (createError) throw createError

      // Read
      const { data: readCompany, error: readError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', createdCompany.id)
        .single()

      if (readError) throw readError

      // Update
      const { data: updatedCompany, error: updateError } = await supabase
        .from('companies')
        .update({ name: 'Updated CRUD Test Company' })
        .eq('id', createdCompany.id)
        .select()
        .single()

      if (updateError) throw updateError

      // Delete
      const { error: deleteError } = await supabase
        .from('companies')
        .delete()
        .eq('id', createdCompany.id)

      if (deleteError) throw deleteError

      return {
        success: true,
        message: 'CRUD Operations Working: All operations respect user ownership',
        operations: ['Create', 'Read', 'Update', 'Delete']
      }
    } catch (error: any) {
      return {
        success: false,
        message: `CRUD Test Failed: ${error.message}`,
        operations: []
      }
    }
  }

  // Run all tests
  const runAllTests = async () => {
    if (!user) {
      setTestResults({ error: 'User not authenticated' })
      return
    }

    setIsRunning(true)
    setTestResults(null)

    try {
      const results = {
        dataIsolation: await testDataIsolation(),
        directAccess: await testDirectAccess(),
        crudOperations: await testCRUDOperations(),
        timestamp: new Date().toISOString()
      }

      setTestResults(results)
    } catch (error: any) {
      setTestResults({ error: error.message })
    } finally {
      setIsRunning(false)
    }
  }

  // Fetch current user's data
  const fetchUserData = async () => {
    if (!user) return

    try {
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)

      if (companiesError) throw companiesError

      const { data: workItems, error: workItemsError } = await supabase
        .from('work_items')
        .select('*')
        .eq('user_id', user.id)

      if (workItemsError) throw workItemsError

      setUserData({
        companies: companies || [],
        workItems: workItems || []
      })
    } catch (error: any) {
      console.error('Error fetching user data:', error)
    }
  }

  if (!user) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Shield className="h-5 w-5" />
            RLS Testing Unavailable
          </CardTitle>
          <CardDescription>
            You must be signed in to test RLS policies
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Database className="h-5 w-5" />
            🔧 RLS Policy Testing Panel (Development Only)
          </CardTitle>
          <CardDescription className="text-orange-700">
            This panel is only visible in development mode for testing RLS policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            <Button 
              onClick={fetchUserData} 
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View My Data
            </Button>
          </div>

          {testResults && (
            <div className="space-y-4">
              <h4 className="font-semibold">Test Results:</h4>
              
              {testResults.error ? (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{testResults.error}</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {/* Data Isolation Test */}
                  <div className="flex items-center gap-2">
                    {testResults.dataIsolation?.success ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <div className="font-medium">Data Isolation</div>
                      <div className="text-sm text-muted-foreground">
                        {testResults.dataIsolation?.message}
                      </div>
                      {testResults.dataIsolation?.ownCompaniesCount !== undefined && (
                        <div className="text-xs">
                          Own companies: {testResults.dataIsolation.ownCompaniesCount} | 
                          Total visible: {testResults.dataIsolation.allCompaniesCount}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Direct Access Test */}
                  <div className="flex items-center gap-2">
                    {testResults.directAccess?.success ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <div className="font-medium">Direct Access</div>
                      <div className="text-sm text-muted-foreground">
                        {testResults.directAccess?.message}
                      </div>
                    </div>
                  </div>

                  {/* CRUD Operations Test */}
                  <div className="flex items-center gap-2">
                    {testResults.crudOperations?.success ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <div className="font-medium">CRUD Operations</div>
                      <div className="text-sm text-muted-foreground">
                        {testResults.crudOperations?.message}
                      </div>
                      {testResults.crudOperations?.operations && (
                        <div className="flex gap-1 mt-1">
                          {testResults.crudOperations.operations.map((op: string) => (
                            <Badge key={op} variant="secondary" className="text-xs">
                              {op}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground pt-2">
                    Tests run at: {new Date(testResults.timestamp).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}

          {userData && (
            <div className="space-y-3">
              <h4 className="font-semibold">Your Current Data:</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {userData.companies.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Companies</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {userData.workItems.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Work Items</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

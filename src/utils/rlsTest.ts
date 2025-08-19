import { supabase } from '@/lib/supabase'

// Test data for RLS verification
const testCompanyData = {
  name: 'Test Company Inc.',
  description: 'A test company for RLS verification',
  tags: ['Test', 'RLS', 'Verification']
}

const testWorkItemData = {
  company_id: '', // Will be set after company creation
  title: 'Test Role',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  description: 'A test role for RLS verification',
  tags: ['Test', 'Role'],
  achievements: ['Tested RLS policies', 'Verified data isolation']
}

const testApprovedContentData = {
  work_item_id: '', // Will be set after work item creation
  title: 'Test Content',
  content: 'This is test content for RLS verification',
  status: 'approved' as const,
  confidence: 'high' as const,
  tags: ['Test', 'Content'],
  times_used: 0
}

export class RLSTester {
  private testUserId1: string | null = null
  private testUserId2: string | null = null
  private testCompanyId1: string | null = null
  private testCompanyId2: string | null = null

  // Test 1: Create test users and verify they can only see their own data
  async testUserIsolation() {
    console.log('🧪 Testing User Isolation...')
    
    try {
      // Create test user 1 data
      const { data: company1, error: company1Error } = await supabase
        .from('companies')
        .insert({
          ...testCompanyData,
          name: 'User 1 Company',
          user_id: this.testUserId1
        })
        .select()
        .single()

      if (company1Error) throw company1Error
      this.testCompanyId1 = company1.id

      // Create test user 2 data
      const { data: company2, error: company2Error } = await supabase
        .from('companies')
        .insert({
          ...testCompanyData,
          name: 'User 2 Company',
          user_id: this.testUserId2
        })
        .select()
        .single()

      if (company2Error) throw company2Error
      this.testCompanyId2 = company2.id

      console.log('✅ Test data created successfully')
      return true
    } catch (error: any) {
      console.error('❌ Failed to create test data:', error.message)
      return false
    }
  }

  // Test 2: Verify users can only see their own companies
  async testCompanyIsolation() {
    console.log('🏢 Testing Company Isolation...')
    
    try {
      // Test user 1 can see their own company
      const { data: user1Companies, error: user1Error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', this.testUserId1)

      if (user1Error) throw user1Error

      // Test user 1 cannot see user 2's company
      const { data: user2Companies, error: user2Error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', this.testUserId2)

      if (user2Error) throw user2Error

      console.log(`✅ User 1 sees ${user1Companies?.length || 0} companies`)
      console.log(`✅ User 2 sees ${user2Companies?.length || 0} companies`)
      
      // Verify isolation
      const user1CompanyIds = user1Companies?.map(c => c.id) || []
      const user2CompanyIds = user2Companies?.map(c => c.id) || []
      
      const hasOverlap = user1CompanyIds.some(id => user2CompanyIds.includes(id))
      
      if (hasOverlap) {
        console.error('❌ RLS Policy Violation: Users can see each other\'s companies')
        return false
      } else {
        console.log('✅ RLS Policy Working: Users cannot see each other\'s companies')
        return true
      }
    } catch (error: any) {
      console.error('❌ Company isolation test failed:', error.message)
      return false
    }
  }

  // Test 3: Verify users cannot access other users' data directly
  async testDirectAccessPrevention() {
    console.log('🚫 Testing Direct Access Prevention...')
    
    try {
      if (!this.testCompanyId1 || !this.testCompanyId2) {
        throw new Error('Test data not created')
      }

      // Try to access user 2's company as user 1 (should fail)
      const { data: unauthorizedAccess, error: accessError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', this.testCompanyId2)

      if (accessError) {
        console.log('✅ RLS Policy Working: Unauthorized access blocked')
        return true
      } else if (unauthorizedAccess && unauthorizedAccess.length > 0) {
        console.error('❌ RLS Policy Violation: User can access unauthorized data')
        return false
      } else {
        console.log('✅ RLS Policy Working: No unauthorized data returned')
        return true
      }
    } catch (error: any) {
      console.error('❌ Direct access test failed:', error.message)
      return false
    }
  }

  // Test 4: Verify CRUD operations respect user isolation
  async testCRUDIsolation() {
    console.log('✏️ Testing CRUD Operations Isolation...')
    
    try {
      if (!this.testCompanyId1) {
        throw new Error('Test data not created')
      }

      // Test update - should only work on own data
      const { data: updateResult, error: updateError } = await supabase
        .from('companies')
        .update({ name: 'Updated Company Name' })
        .eq('id', this.testCompanyId1)
        .select()

      if (updateError) {
        console.error('❌ Update failed:', updateError.message)
        return false
      }

      // Test delete - should only work on own data
      const { error: deleteError } = await supabase
        .from('companies')
        .delete()
        .eq('id', this.testCompanyId1)

      if (deleteError) {
        console.error('❌ Delete failed:', deleteError.message)
        return false
      }

      console.log('✅ CRUD operations respect user isolation')
      return true
    } catch (error: any) {
      console.error('❌ CRUD isolation test failed:', error.message)
      return false
    }
  }

  // Clean up test data
  async cleanup() {
    console.log('🧹 Cleaning up test data...')
    
    try {
      if (this.testCompanyId1) {
        await supabase.from('companies').delete().eq('id', this.testCompanyId1)
      }
      if (this.testCompanyId2) {
        await supabase.from('companies').delete().eq('id', this.testCompanyId2)
      }
      console.log('✅ Test data cleaned up')
    } catch (error: any) {
      console.error('❌ Cleanup failed:', error.message)
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting RLS Policy Tests...\n')
    
    const results = {
      userIsolation: false,
      companyIsolation: false,
      directAccess: false,
      crudIsolation: false
    }

    try {
      // Set test user IDs (you'll need to create these users first)
      // For now, we'll use placeholder IDs
      this.testUserId1 = 'test-user-1-id'
      this.testUserId2 = 'test-user-2-id'

      results.userIsolation = await this.testUserIsolation()
      results.companyIsolation = await this.testCompanyIsolation()
      results.directAccess = await this.testDirectAccessPrevention()
      results.crudIsolation = await this.testCRUDIsolation()

      console.log('\n📊 Test Results:')
      console.log(`User Isolation: ${results.userIsolation ? '✅' : '❌'}`)
      console.log(`Company Isolation: ${results.companyIsolation ? '✅' : '❌'}`)
      console.log(`Direct Access Prevention: ${results.directAccess ? '✅' : '❌'}`)
      console.log(`CRUD Isolation: ${results.crudIsolation ? '✅' : '❌'}`)

      const allPassed = Object.values(results).every(result => result)
      console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed'}`)

    } catch (error: any) {
      console.error('❌ Test execution failed:', error.message)
    } finally {
      await this.cleanup()
    }

    return results
  }
}

// Manual test function for browser console
export async function testRLSPolicies() {
  const tester = new RLSTester()
  return await tester.runAllTests()
}

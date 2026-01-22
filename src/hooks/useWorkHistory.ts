import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { SoftDeleteService } from '@/services/softDeleteService'
import type { Database } from '@/types/supabase'
import { schedulePMLevelBackgroundRun } from '@/services/pmLevelsEdgeClient'

type Company = Database['public']['Tables']['companies']['Row']
type WorkItem = Database['public']['Tables']['work_items']['Row']
type Story = Database['public']['Tables']['stories']['Row']
type ExternalLink = Database['public']['Tables']['external_links']['Row']

interface WorkHistoryData {
  companies: Company[]
  workItems: WorkItem[]
  approvedContent: Story[]
  externalLinks: ExternalLink[]
}

export function useWorkHistory() {
  const { user } = useAuth()
  const [data, setData] = useState<WorkHistoryData>({
    companies: [],
    workItems: [],
    approvedContent: [],
    externalLinks: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getActiveSyntheticProfileId = () => {
    if (typeof window === 'undefined') {
      return undefined
    }

    try {
      const syntheticProfile = window.localStorage.getItem('synthetic_active_profile_id')
      return syntheticProfile || undefined
    } catch (err) {
      console.warn('[useWorkHistory] Failed to read synthetic profile id from localStorage', err)
      return undefined
    }
  }

  const scheduleLevelRefresh = (reason: string) => {
    if (!user) return

    schedulePMLevelBackgroundRun({
      userId: user.id,
      syntheticProfileId: getActiveSyntheticProfileId(),
      delayMs: 2500,
      reason,
      triggerReason: 'content-update',
    })
  }

  // Fetch all work history data for the current user
  const fetchWorkHistory = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Fetch companies
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (companiesError) throw companiesError

      // Fetch work items
      const { data: workItems, error: workItemsError } = await supabase
        .from('work_items')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })

      if (workItemsError) throw workItemsError

      // Fetch approved content
      const { data: approvedContent, error: contentError } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (contentError) throw contentError

      // Fetch external links
      const { data: externalLinks, error: linksError } = await supabase
        .from('external_links')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (linksError) throw linksError

      setData({
        companies: companies || [],
        workItems: workItems || [],
        approvedContent: approvedContent || [],
        externalLinks: externalLinks || []
      })
    } catch (err: any) {
      setError(err.message || 'Failed to fetch work history')
    } finally {
      setLoading(false)
    }
  }

  // Add a new company
  const addCompany = async (companyData: Omit<Company, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { data: newCompany, error } = await supabase
        .from('companies')
        .insert({
          ...companyData,
          user_id: user.id
        })
        .select()
        .single()

      if (error) throw error

      setData(prev => ({
        ...prev,
        companies: [newCompany, ...prev.companies]
      }))

      scheduleLevelRefresh('Company added')

      return newCompany
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add company')
    }
  }

  // Add a new work item
  const addWorkItem = async (workItemData: Omit<WorkItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { data: newWorkItem, error } = await supabase
        .from('work_items')
        .insert({
          ...workItemData,
          user_id: user.id
        })
        .select()
        .single()

      if (error) throw error

      setData(prev => ({
        ...prev,
        workItems: [newWorkItem, ...prev.workItems]
      }))

      scheduleLevelRefresh('Work item added')

      return newWorkItem
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add work item')
    }
  }

  // Add approved content
  const addStory = async (contentData: Omit<Story, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { data: newContent, error } = await supabase
        .from('stories')
        .insert({
          ...contentData,
          user_id: user.id
        })
        .select()
        .single()

      if (error) throw error

      setData(prev => ({
        ...prev,
        approvedContent: [newContent, ...prev.approvedContent]
      }))

      scheduleLevelRefresh('Story added to work history')

      return newContent
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add approved content')
    }
  }

  // Update approved content
  const updateStory = async (id: string, updates: Partial<Story>) => {
    try {
      const { data: updatedContent, error } = await supabase
        .from('stories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setData(prev => ({
        ...prev,
        approvedContent: prev.approvedContent.map(content =>
          content.id === id ? updatedContent : content
        )
      }))

      scheduleLevelRefresh('Story updated')

      return updatedContent
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update approved content')
    }
  }

  // Delete approved content
  const deleteStory = async (id: string) => {
    try {
      const { data: row, error: fetchError } = await supabase
        .from('stories')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      if (row) {
        await SoftDeleteService.archiveRecord({
          userId: row.user_id,
          sourceTable: 'stories',
          sourceId: row.id,
          sourceData: row
        })
      }

      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', id)

      if (error) throw error

      setData(prev => ({
        ...prev,
        approvedContent: prev.approvedContent.filter(content => content.id !== id)
      }))

      scheduleLevelRefresh('Story deleted')
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete approved content')
    }
  }

  // Fetch data on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchWorkHistory()
    } else {
      setData({
        companies: [],
        workItems: [],
        approvedContent: [],
        externalLinks: []
      })
      setLoading(false)
    }
  }, [user])

  return {
    data,
    loading,
    error,
    fetchWorkHistory,
    addCompany,
    addWorkItem,
    addStory,
    updateStory,
    deleteStory
  }
}

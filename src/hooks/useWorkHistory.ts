import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Company = Database['public']['Tables']['companies']['Row']
type WorkItem = Database['public']['Tables']['work_items']['Row']
type ApprovedContent = Database['public']['Tables']['approved_content']['Row']
type ExternalLink = Database['public']['Tables']['external_links']['Row']

interface WorkHistoryData {
  companies: Company[]
  workItems: WorkItem[]
  approvedContent: ApprovedContent[]
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
        .from('approved_content')
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

      return newWorkItem
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add work item')
    }
  }

  // Add approved content
  const addApprovedContent = async (contentData: Omit<ApprovedContent, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { data: newContent, error } = await supabase
        .from('approved_content')
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

      return newContent
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add approved content')
    }
  }

  // Update approved content
  const updateApprovedContent = async (id: string, updates: Partial<ApprovedContent>) => {
    try {
      const { data: updatedContent, error } = await supabase
        .from('approved_content')
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

      return updatedContent
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update approved content')
    }
  }

  // Delete approved content
  const deleteApprovedContent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('approved_content')
        .delete()
        .eq('id', id)

      if (error) throw error

      setData(prev => ({
        ...prev,
        approvedContent: prev.approvedContent.filter(content => content.id !== id)
      }))
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
    addApprovedContent,
    updateApprovedContent,
    deleteApprovedContent
  }
}

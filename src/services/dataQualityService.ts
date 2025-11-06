import { supabase } from '@/lib/supabase'

export type DataQualityFlag = {
  id: string
  evaluation_run_id: string
  reviewer_id: string
  issue_category: string
  severity: 'low' | 'medium' | 'high'
  data_type: string
  data_path: string
  notes?: string
  data_snapshot?: any
  status: 'open' | 'reviewed' | 'resolved'
  created_at: string
  updated_at: string
}

export const DataQualityService = {
  async getFlagsForEvaluationRun(evaluationRunId: string): Promise<DataQualityFlag[]> {
    const { data, error } = await supabase
      .from('data_quality_flags')
      .select('*')
      .eq('evaluation_run_id', evaluationRunId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as any[]) as DataQualityFlag[]
  },

  async createFlag(flag: Omit<DataQualityFlag, 'id' | 'created_at' | 'updated_at' | 'status'> & { status?: DataQualityFlag['status'] }): Promise<void> {
    const payload = {
      ...flag,
      status: flag.status ?? 'open',
    }
    const { error } = await supabase.from('data_quality_flags').insert(payload as any)
    if (error) throw error
  },
}

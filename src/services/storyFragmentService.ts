import { supabase } from '@/lib/supabase';
import { SoftDeleteService } from '@/services/softDeleteService';
import type { Database } from '@/types/supabase';

type StoryFragmentRow = Database['public']['Tables']['story_fragments']['Row'];
type StoryFragmentInsert = Database['public']['Tables']['story_fragments']['Insert'];

export class StoryFragmentService {
  static async fetchByUser(userId: string): Promise<StoryFragmentRow[]> {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('story_fragments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[StoryFragmentService] Failed to load fragments:', error);
      return [];
    }

    return (data || []) as StoryFragmentRow[];
  }

  static async fetchByWorkItem(userId: string, workItemId: string): Promise<StoryFragmentRow[]> {
    if (!userId || !workItemId) return [];
    const { data, error } = await supabase
      .from('story_fragments')
      .select('*')
      .eq('user_id', userId)
      .eq('work_item_id', workItemId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[StoryFragmentService] Failed to load fragments by work item:', error);
      return [];
    }

    return (data || []) as StoryFragmentRow[];
  }

  static async insertFromResume(params: {
    userId: string;
    workItemId?: string | null;
    title: string;
    content: string;
    sourceId?: string | null;
    narrativeHints?: string[];
    metrics?: StoryFragmentInsert['metrics'];
    tags?: string[];
    sourceType?: StoryFragmentInsert['source_type'];
  }): Promise<StoryFragmentRow | null> {
    const payload: StoryFragmentInsert = {
      user_id: params.userId,
      work_item_id: params.workItemId || null,
      title: params.title,
      content: params.content,
      source_id: params.sourceId || null,
      narrative_hints: params.narrativeHints || [],
      metrics: params.metrics || '[]',
      tags: params.tags || [],
      source_type: params.sourceType || 'resume',
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('story_fragments')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('[StoryFragmentService] Failed to insert fragment:', error);
      return null;
    }

    return data as StoryFragmentRow;
  }

  static async markPromoted(userId: string, fragmentId: string, convertedStoryId?: string): Promise<StoryFragmentRow | null> {
    if (!userId || !fragmentId) return null;
    const updates: Partial<StoryFragmentRow> = {
      status: 'promoted',
      converted_story_id: convertedStoryId ?? null,
      converted_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('story_fragments')
      .update(updates)
      .eq('user_id', userId)
      .eq('id', fragmentId)
      .select('*')
      .single();

    if (error) {
      console.error('[StoryFragmentService] Failed to mark fragment promoted:', error);
      return null;
    }

    return data as StoryFragmentRow;
  }

  static async deleteFragments(userId: string, fragmentIds: string[]): Promise<void> {
    if (!userId || !fragmentIds.length) return;

    const { data: fragments, error: fetchError } = await supabase
      .from('story_fragments')
      .select('*')
      .eq('user_id', userId)
      .in('id', fragmentIds);

    if (fetchError) {
      console.error('[StoryFragmentService] Failed to fetch fragments for delete:', fetchError);
    } else if (fragments && fragments.length > 0) {
      await SoftDeleteService.archiveRows({
        userId,
        sourceTable: 'story_fragments',
        rows: fragments,
      });
    }

    const { error } = await supabase
      .from('story_fragments')
      .update({ status: 'archived' })
      .eq('user_id', userId)
      .in('id', fragmentIds);

    if (error) {
      console.error('[StoryFragmentService] Failed to archive fragments:', error);
      throw error;
    }
  }

  static async countPending(userId: string): Promise<number> {
    if (!userId) return 0;

    try {
      const { count, error } = await supabase
        .from('story_fragments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['pending', 'in_progress']);

      if (error) {
        console.error('[StoryFragmentService] Failed to count fragments:', error);
        return 0;
      }

      return count ?? 0;
    } catch (error) {
      console.error('[StoryFragmentService] countPending error:', error);
      return 0;
    }
  }
}

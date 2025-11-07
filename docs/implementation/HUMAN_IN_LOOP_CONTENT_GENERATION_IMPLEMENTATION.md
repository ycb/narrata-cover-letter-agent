# Implementation Plan: Human-in-the-Loop Content Generation MVP

**Epic**: Phase 4 - AI-Assisted Content Creation
**Related PRD**: `docs/prd/HUMAN_IN_LOOP_CONTENT_GENERATION_PRD.md`
**Status**: Ready for Implementation
**Estimated Duration**: 5 weeks
**Developer**: To be assigned

---

## Overview

This document provides a detailed, task-by-task implementation plan for building the Human-in-the-Loop Content Generation MVP. The plan is organized into 5 phases with clear dependencies, acceptance criteria, and testing requirements.

**Key Principles**:
- Ship incrementally - each phase should result in a deployable, testable feature
- **Context-dependent behavior**: Work History view defaults to REPLACE, Cover Letter Draft view ALWAYS creates VARIATIONS
- **Primary workflow**: Post-onboarding, most content improvement happens during cover letter drafting (addressing JD-specific gaps)
- **Gap resolution**: Both AI-generated AND human-edited content should address gaps

**Key Design Insights** (from user feedback):
1. **Cover Letter Workflow** = Assemble draft from best-matching content → HIL content creation addresses JD gaps → All edits are variations
2. **Variation Naming**: Auto-generate based on gap context, with visual nesting challenge in table views
3. **Multi-Gap Validation**: One content item can have multiple gaps; validate all simultaneously
4. **No Variation Limits**: Allow unlimited variations for MVP (monitor and adjust if needed)
5. **Future Enhancement**: User-configurable prompts in profile menu (Phase 6, post-MVP)

---

## Phase 1: Foundation (Week 1) - Database & Services

**Goal**: Set up database schema, LLM integration, and core service layer

### Task 1.1: Create Database Migration for Variations Table

**File**: `supabase/migrations/012_create_content_variations.sql`

**Implementation**:
```sql
-- Migration: 012_create_content_variations.sql
-- Purpose: Add content_variations table and saved_sections table

-- ===========================
-- 1. Create saved_sections table
-- ===========================
CREATE TABLE IF NOT EXISTS public.saved_sections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  section_type TEXT NOT NULL CHECK (section_type IN ('introduction', 'closer', 'signature', 'custom')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  times_used INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  is_default BOOLEAN DEFAULT false,
  addressed_gap_id UUID, -- Will reference gaps.id after gaps table exists
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for saved_sections
CREATE INDEX IF NOT EXISTS idx_saved_sections_user_id ON public.saved_sections(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_sections_section_type ON public.saved_sections(section_type);

-- RLS for saved_sections
ALTER TABLE public.saved_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved sections" ON public.saved_sections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved sections" ON public.saved_sections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved sections" ON public.saved_sections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved sections" ON public.saved_sections
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================
-- 2. Create content_variations table
-- ===========================
CREATE TABLE public.content_variations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  parent_entity_type TEXT NOT NULL CHECK (parent_entity_type IN ('approved_content', 'saved_section')),
  parent_entity_id UUID NOT NULL, -- Generic reference to parent entity

  -- Variation content
  title TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Gap context
  filled_gap_id UUID, -- Will reference gaps.id
  gap_tags TEXT[] DEFAULT '{}', -- Tags describing which gaps this addresses

  -- Job context (optional)
  target_job_title TEXT,
  target_company TEXT,
  job_description_id UUID REFERENCES public.job_descriptions(id) ON DELETE SET NULL,

  -- Reuse tracking
  times_used INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_by TEXT DEFAULT 'AI' CHECK (created_by IN ('user', 'AI', 'user-edited-AI')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for content_variations
CREATE INDEX idx_content_variations_parent ON public.content_variations(parent_entity_type, parent_entity_id);
CREATE INDEX idx_content_variations_user_id ON public.content_variations(user_id);
CREATE INDEX idx_content_variations_filled_gap ON public.content_variations(filled_gap_id);

-- RLS for content_variations
ALTER TABLE public.content_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own variations" ON public.content_variations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own variations" ON public.content_variations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own variations" ON public.content_variations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own variations" ON public.content_variations
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================
-- 3. Add foreign key constraints (deferred until after gaps table exists)
-- ===========================
-- These will be added in a separate migration after verifying gaps table structure
-- ALTER TABLE public.saved_sections
--   ADD CONSTRAINT fk_saved_sections_addressed_gap
--   FOREIGN KEY (addressed_gap_id) REFERENCES public.gaps(id) ON DELETE SET NULL;

-- ALTER TABLE public.content_variations
--   ADD CONSTRAINT fk_content_variations_filled_gap
--   FOREIGN KEY (filled_gap_id) REFERENCES public.gaps(id) ON DELETE SET NULL;

-- Create index after FK added
CREATE INDEX IF NOT EXISTS idx_saved_sections_addressed_gap_id ON public.saved_sections(addressed_gap_id);

-- ===========================
-- 4. Extend gaps table to support cover_letter_drafts
-- ===========================
DO $$
DECLARE
  con_name text;
BEGIN
  -- Drop existing check constraint on entity_type
  FOR con_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'gaps'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%entity_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.gaps DROP CONSTRAINT %I', con_name);
  END LOOP;

  -- Recreate constraint allowing cover_letter_drafts
  ALTER TABLE public.gaps
    ADD CONSTRAINT gaps_entity_type_check
    CHECK (entity_type IN ('work_item','approved_content','saved_section','cover_letter_drafts'));
END$$;
```

**Acceptance Criteria**:
- [ ] Migration runs successfully on clean database
- [ ] Migration is idempotent (can run multiple times)
- [ ] `saved_sections` table created with all columns
- [ ] `content_variations` table created with all columns
- [ ] RLS policies prevent cross-user data access
- [ ] Indexes created for performance
- [ ] `gaps.entity_type` supports all 4 entity types

**Testing**:
```bash
# Run migration
npm run migrate

# Verify tables created
psql $DATABASE_URL -c "\d saved_sections"
psql $DATABASE_URL -c "\d content_variations"

# Test RLS (should fail)
# Create user A, insert variation, try to query as user B
```

---

### Task 1.2: Create TypeScript Types for Variations

**File**: `src/types/variations.ts`

**Implementation**:
```typescript
import type { Database } from './supabase';

export type SavedSection = Database['public']['Tables']['saved_sections']['Row'];
export type SavedSectionInsert = Database['public']['Tables']['saved_sections']['Insert'];
export type SavedSectionUpdate = Database['public']['Tables']['saved_sections']['Update'];

export type ContentVariation = Database['public']['Tables']['content_variations']['Row'];
export type ContentVariationInsert = Database['public']['Tables']['content_variations']['Insert'];
export type ContentVariationUpdate = Database['public']['Tables']['content_variations']['Update'];

export interface ContentVariationWithMetadata extends ContentVariation {
  parent_entity?: {
    id: string;
    title: string;
    content: string;
  };
  gap_details?: {
    id: string;
    gap_category: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  };
}

export interface SavedSectionWithVariations extends SavedSection {
  variations?: ContentVariation[];
  gap_count?: number;
  gaps?: Array<{
    id: string;
    gap_category: string;
    description: string;
  }>;
}
```

**File**: Update `src/types/workHistory.ts`

**Changes**:
```typescript
// Add to WorkHistoryBlurb interface
export interface WorkHistoryBlurb {
  // ... existing fields
  variations?: ContentVariation[]; // UPDATED: Use ContentVariation type
  variationCount?: number; // NEW: Count of variations
}
```

**Acceptance Criteria**:
- [ ] All types exported and importable
- [ ] Types match database schema exactly
- [ ] No TypeScript errors in codebase after adding types

---

### Task 1.3: Create Content Generation Prompts

**File**: `src/prompts/contentGeneration.ts`

**Implementation**:
```typescript
import type { Gap } from '@/services/gapDetectionService';
import type { WorkItem } from '@/types/supabase';

export interface WorkHistoryContext {
  userId: string;
  currentRole?: {
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
  };
  allStories: Array<{
    title: string;
    content: string;
    metrics?: string[];
  }>;
  metrics?: string[]; // Role-level metrics
}

export interface JobContext {
  jobTitle: string;
  company: string;
  jobDescription?: string;
  keywords?: string[];
}

/**
 * Build content generation prompt for stories (approved_content)
 */
export function buildStoryGenerationPrompt(
  gap: Gap,
  existingContent: string,
  workHistoryContext: WorkHistoryContext,
  jobContext?: JobContext
): string {
  const prompt = `You are an expert career coach helping a professional improve their work history content for job applications.

**Your Task**: Generate enhanced content that addresses the identified gap while maintaining 100% truth fidelity.

**CRITICAL CONSTRAINTS**:
1. Use ONLY facts from the provided work history - NO hallucinations
2. Maintain the user's authentic voice and tone
3. Follow STAR format: Situation, Task, Action, Result
4. Include specific, quantifiable metrics when available
5. Keep content concise (2-4 sentences)

**User Context**:
${workHistoryContext.currentRole ? `Current Role: ${workHistoryContext.currentRole.title} at ${workHistoryContext.currentRole.company}` : ''}

${workHistoryContext.metrics && workHistoryContext.metrics.length > 0 ? `
Available Metrics:
${workHistoryContext.metrics.map(m => `- ${m}`).join('\n')}
` : ''}

${workHistoryContext.allStories.length > 0 ? `
Related Stories (for context, do NOT copy):
${workHistoryContext.allStories.slice(0, 3).map(s => `- ${s.title}: ${s.content.substring(0, 100)}...`).join('\n')}
` : ''}

${jobContext ? `
**Target Job Context**:
- Position: ${jobContext.jobTitle} at ${jobContext.company}
${jobContext.keywords ? `- Key Requirements: ${jobContext.keywords.join(', ')}` : ''}
` : ''}

**Gap to Address**:
- Category: ${gap.gap_category}
- Issue: ${gap.description}
- Suggestion: ${gap.suggestions ? gap.suggestions.join('; ') : 'Add more specific details and measurable outcomes'}

**Existing Content**:
${existingContent}

**Instructions**:
Generate improved content that:
1. Addresses the gap by ${gap.suggestions ? gap.suggestions[0] : 'adding specific details'}
2. Uses ONLY the metrics and facts provided above
3. Maintains the original story's core message
4. Follows STAR format structure
5. Is compelling and achievement-focused

Output ONLY the enhanced content, no explanations.`;

  return prompt;
}

/**
 * Build content generation prompt for role descriptions (work_item)
 */
export function buildRoleDescriptionPrompt(
  gap: Gap,
  existingContent: string,
  workHistoryContext: WorkHistoryContext
): string {
  const prompt = `You are an expert career coach helping a professional improve their role description for job applications.

**Your Task**: Generate an enhanced role description that showcases measurable impact and specific achievements.

**CRITICAL CONSTRAINTS**:
1. Use ONLY facts from the work history - NO hallucinations
2. Focus on outcomes and impact, not responsibilities
3. Include 2-3 specific metrics or achievements
4. Keep it concise (2-3 sentences)
5. Maintain professional tone

**Role Context**:
${workHistoryContext.currentRole ? `${workHistoryContext.currentRole.title} at ${workHistoryContext.currentRole.company}` : ''}
${workHistoryContext.currentRole?.startDate ? `Duration: ${workHistoryContext.currentRole.startDate} - ${workHistoryContext.currentRole?.endDate || 'Present'}` : ''}

${workHistoryContext.metrics && workHistoryContext.metrics.length > 0 ? `
**Available Metrics** (use these in the description):
${workHistoryContext.metrics.map(m => `- ${m}`).join('\n')}
` : ''}

${workHistoryContext.allStories.length > 0 ? `
**Key Achievements** (reference these):
${workHistoryContext.allStories.slice(0, 5).map(s => `- ${s.title}${s.metrics ? ': ' + s.metrics.join(', ') : ''}`).join('\n')}
` : ''}

**Gap to Address**:
- Issue: ${gap.description}
- Suggestion: ${gap.suggestions ? gap.suggestions.join('; ') : 'Add quantifiable results and specific achievements'}

**Existing Description**:
${existingContent || 'No description provided'}

**Instructions**:
Generate an enhanced role description that:
1. Leads with the most impactful achievement or metric
2. Demonstrates scope and leadership (team size, budget, stakeholders)
3. Uses 2-3 specific metrics from the list above
4. Avoids generic statements like "led the team" without context
5. Is results-focused, not task-focused

Output ONLY the enhanced description, no explanations.`;

  return prompt;
}

/**
 * Build content generation prompt for saved sections (cover letter sections)
 */
export function buildSavedSectionPrompt(
  gap: Gap,
  existingContent: string,
  sectionType: 'introduction' | 'closer' | 'signature' | 'custom',
  workHistoryContext: WorkHistoryContext,
  jobContext?: JobContext
): string {
  const sectionGuidance = {
    introduction: {
      purpose: 'Open the cover letter with a compelling hook that grabs attention',
      structure: '1) Hook (company research or relevant achievement), 2) Value proposition, 3) Relevance to role',
      length: '3-4 sentences'
    },
    closer: {
      purpose: 'Close the cover letter with a strong call-to-action and enthusiasm',
      structure: '1) Restate value proposition, 2) Express enthusiasm, 3) Call-to-action',
      length: '2-3 sentences'
    },
    signature: {
      purpose: 'Professional sign-off',
      structure: 'Simple professional closing',
      length: '1 sentence'
    },
    custom: {
      purpose: 'Custom section content',
      structure: 'Depends on section purpose',
      length: '2-4 sentences'
    }
  };

  const guidance = sectionGuidance[sectionType] || sectionGuidance.custom;

  const prompt = `You are an expert cover letter writer helping a professional create compelling, reusable cover letter sections.

**Your Task**: Generate a ${sectionType} section that ${guidance.purpose.toLowerCase()}.

**CRITICAL CONSTRAINTS**:
1. Use ONLY facts from the work history - NO generic claims
2. Avoid clichés like "I am writing to express my interest"
3. Make it specific and compelling, not templated
4. Length: ${guidance.length}
5. Use [Placeholders] for company/role names for reusability

**User Context**:
${workHistoryContext.currentRole ? `Most Recent Role: ${workHistoryContext.currentRole.title} at ${workHistoryContext.currentRole.company}` : ''}

${workHistoryContext.metrics && workHistoryContext.metrics.length > 0 ? `
**Key Achievements to Reference**:
${workHistoryContext.metrics.slice(0, 3).map(m => `- ${m}`).join('\n')}
` : ''}

${jobContext ? `
**Target Role** (use as example context):
- Position: ${jobContext.jobTitle} at ${jobContext.company}
${jobContext.keywords ? `- Key Requirements: ${jobContext.keywords.join(', ')}` : ''}
` : ''}

**Gap to Address**:
- Issue: ${gap.description}
- Suggestion: ${gap.suggestions ? gap.suggestions.join('; ') : 'Make content more specific and compelling'}

**Existing Content**:
${existingContent || 'No existing content'}

**Structure Guidance for ${sectionType}**:
${guidance.structure}

**Instructions**:
Generate enhanced content that:
1. ${guidance.purpose}
2. References specific achievements with metrics
3. Uses placeholders: [Company], [Position], [Industry/Field]
4. Avoids generic cover letter clichés
5. Can be reused across multiple applications

Output ONLY the enhanced section content, no explanations.`;

  return prompt;
}

/**
 * System prompt for content generation
 */
export const CONTENT_GENERATION_SYSTEM_PROMPT = `You are a professional career coach and cover letter expert. Your role is to help job seekers create compelling, truth-based content that showcases their achievements effectively.

Core Principles:
1. TRUTH FIDELITY: Never fabricate or exaggerate. Use only provided facts.
2. SPECIFICITY: Replace vague statements with concrete metrics and examples.
3. IMPACT FOCUS: Emphasize measurable outcomes over responsibilities.
4. AUTHENTICITY: Maintain the user's natural voice and tone.
5. BREVITY: Be concise and impactful.

Always output only the requested content without explanations or meta-commentary.`;
```

**Acceptance Criteria**:
- [ ] Prompts follow established pattern from `resumeAnalysis.ts`
- [ ] Prompts emphasize truth fidelity and no hallucinations
- [ ] All entity types covered (stories, role descriptions, saved sections)
- [ ] Prompts include gap context and work history context
- [ ] System prompt is clear and constraint-focused

**Testing**:
```typescript
// Unit test: Verify prompt structure
test('buildStoryGenerationPrompt includes gap context', () => {
  const prompt = buildStoryGenerationPrompt(mockGap, mockContent, mockContext);
  expect(prompt).toContain('Gap to Address');
  expect(prompt).toContain(mockGap.description);
  expect(prompt).toContain('ONLY facts from the provided work history');
});
```

---

### Task 1.4: Create ContentGenerationService

**File**: `src/services/contentGenerationService.ts`

**Implementation**:
```typescript
import { supabase } from '@/lib/supabase';
import { LLMAnalysisService } from './openaiService';
import { GapDetectionService, type Gap } from './gapDetectionService';
import {
  buildStoryGenerationPrompt,
  buildRoleDescriptionPrompt,
  buildSavedSectionPrompt,
  CONTENT_GENERATION_SYSTEM_PROMPT,
  type WorkHistoryContext,
  type JobContext
} from '@/prompts/contentGeneration';
import type { ContentVariationInsert } from '@/types/variations';

export interface ContentGenerationRequest {
  gap: Gap;
  existingContent: string;
  entityType: 'work_item' | 'approved_content' | 'saved_section';
  entityId: string;
  workHistoryContext: WorkHistoryContext;
  jobContext?: JobContext;
  sectionType?: 'introduction' | 'closer' | 'signature' | 'custom'; // For saved_section
}

export interface ValidationResult {
  status: 'pass' | 'partial' | 'fail';
  addressedGaps: Gap[];
  remainingGaps: Gap[];
  newGaps: Gap[];
  confidence: number;
  suggestions: string[];
}

export interface ContentSaveRequest {
  mode: 'replace' | 'variation';
  entityType: 'work_item' | 'approved_content' | 'saved_section';
  entityId: string;
  content: string;
  userId: string;
  gapId: string;

  // For variations only
  variationData?: {
    title: string;
    gapTags: string[];
    targetJobTitle?: string;
    targetCompany?: string;
    jobDescriptionId?: string;
  };
}

export class ContentGenerationService {
  private static llmService = new LLMAnalysisService();

  /**
   * Generate enhanced content using LLM
   */
  static async generateContent(request: ContentGenerationRequest): Promise<string> {
    try {
      // Build appropriate prompt based on entity type
      let prompt: string;

      switch (request.entityType) {
        case 'approved_content':
          prompt = buildStoryGenerationPrompt(
            request.gap,
            request.existingContent,
            request.workHistoryContext,
            request.jobContext
          );
          break;

        case 'work_item':
          prompt = buildRoleDescriptionPrompt(
            request.gap,
            request.existingContent,
            request.workHistoryContext
          );
          break;

        case 'saved_section':
          prompt = buildSavedSectionPrompt(
            request.gap,
            request.existingContent,
            request.sectionType || 'custom',
            request.workHistoryContext,
            request.jobContext
          );
          break;

        default:
          throw new Error(`Unsupported entity type: ${request.entityType}`);
      }

      // Call OpenAI API
      const response = await this.llmService.callOpenAI(
        prompt,
        1000, // Max tokens for content generation
        CONTENT_GENERATION_SYSTEM_PROMPT
      );

      if (!response.success) {
        throw new Error(response.error || 'Content generation failed');
      }

      // Extract generated content from response
      const generatedContent = typeof response.data === 'string'
        ? response.data
        : response.data.content || response.data.text || '';

      if (!generatedContent || generatedContent.trim().length === 0) {
        throw new Error('Generated content is empty');
      }

      return generatedContent.trim();

    } catch (error) {
      console.error('Content generation error:', error);
      throw error;
    }
  }

  /**
   * Validate generated content by running gap detection
   */
  static async validateContent(
    content: string,
    originalGap: Gap,
    entityType: 'work_item' | 'approved_content' | 'saved_section',
    userId: string
  ): Promise<ValidationResult> {
    try {
      // Run gap detection on generated content
      // Note: This is a simplified validation - full gap detection runs on saved content
      const detectedGaps: Gap[] = [];

      // For stories (approved_content), check for STAR format and metrics
      if (entityType === 'approved_content') {
        const hasMetrics = /\d+%/.test(content) || /\d+x/.test(content);
        const hasSTAR = content.length > 100 && content.split('.').length >= 3;

        if (!hasMetrics && originalGap.gap_category === 'missing_metrics') {
          detectedGaps.push({
            ...originalGap,
            description: 'Generated content still lacks specific metrics'
          });
        }

        if (!hasSTAR && originalGap.gap_category === 'incomplete_story') {
          detectedGaps.push({
            ...originalGap,
            description: 'Generated content does not follow STAR format'
          });
        }
      }

      // For role descriptions (work_item), check for specificity
      if (entityType === 'work_item') {
        const hasMetrics = /\d+%/.test(content) || /\d+x/.test(content);
        const isGeneric = content.toLowerCase().includes('led the team') &&
                         !content.match(/\d+/); // Generic "led the team" without numbers

        if (isGeneric && originalGap.gap_category === 'generic_role_description') {
          detectedGaps.push({
            ...originalGap,
            description: 'Role description still too generic'
          });
        }

        if (!hasMetrics && originalGap.gap_category === 'missing_achievements') {
          detectedGaps.push({
            ...originalGap,
            description: 'Role description lacks quantifiable achievements'
          });
        }
      }

      // Determine validation status
      const addressedGaps = detectedGaps.length === 0 ? [originalGap] : [];
      const remainingGaps = detectedGaps;

      const status: ValidationResult['status'] =
        detectedGaps.length === 0 ? 'pass' :
        detectedGaps.length < 2 ? 'partial' : 'fail';

      return {
        status,
        addressedGaps,
        remainingGaps,
        newGaps: [],
        confidence: detectedGaps.length === 0 ? 0.9 : 0.5,
        suggestions: detectedGaps.map(g => g.description || '')
      };

    } catch (error) {
      console.error('Validation error:', error);
      // On validation error, return pass (optimistic) but with low confidence
      return {
        status: 'pass',
        addressedGaps: [originalGap],
        remainingGaps: [],
        newGaps: [],
        confidence: 0.3,
        suggestions: ['Unable to validate - please review content carefully']
      };
    }
  }

  /**
   * Save generated content (replace or create variation)
   */
  static async saveContent(request: ContentSaveRequest): Promise<{ success: boolean; id?: string }> {
    try {
      if (request.mode === 'replace') {
        return await this.replaceContent(request);
      } else {
        return await this.createVariation(request);
      }
    } catch (error) {
      console.error('Save content error:', error);
      throw error;
    }
  }

  /**
   * Replace existing content
   */
  private static async replaceContent(request: ContentSaveRequest): Promise<{ success: boolean; id: string }> {
    const tableName = request.entityType === 'work_item' ? 'work_items' :
                     request.entityType === 'approved_content' ? 'approved_content' : 'saved_sections';

    const contentField = request.entityType === 'work_item' ? 'description' : 'content';

    // Update entity content
    const { error } = await supabase
      .from(tableName)
      .update({
        [contentField]: request.content,
        updated_at: new Date().toISOString(),
        addressed_gap_id: request.gapId
      })
      .eq('id', request.entityId)
      .eq('user_id', request.userId);

    if (error) throw error;

    // Mark gap as resolved
    await GapDetectionService.resolveGap(
      request.gapId,
      request.userId,
      'content_added',
      request.entityId
    );

    return { success: true, id: request.entityId };
  }

  /**
   * Create variation
   */
  private static async createVariation(request: ContentSaveRequest): Promise<{ success: boolean; id: string }> {
    if (!request.variationData) {
      throw new Error('Variation data required for variation mode');
    }

    // Validate parent entity type
    if (request.entityType === 'work_item') {
      throw new Error('Variations not supported for work_item - use replace mode');
    }

    const variationInsert: ContentVariationInsert = {
      user_id: request.userId,
      parent_entity_type: request.entityType,
      parent_entity_id: request.entityId,
      title: request.variationData.title,
      content: request.content,
      filled_gap_id: request.gapId,
      gap_tags: request.variationData.gapTags,
      target_job_title: request.variationData.targetJobTitle,
      target_company: request.variationData.targetCompany,
      job_description_id: request.variationData.jobDescriptionId,
      created_by: 'AI'
    };

    const { data: variation, error } = await supabase
      .from('content_variations')
      .insert(variationInsert)
      .select()
      .single();

    if (error) throw error;

    // Mark gap as resolved with variation ID
    await GapDetectionService.resolveGap(
      request.gapId,
      request.userId,
      'content_added',
      variation.id
    );

    return { success: true, id: variation.id };
  }

  /**
   * Fetch work history context for content generation
   */
  static async fetchWorkHistoryContext(
    userId: string,
    entityType: 'work_item' | 'approved_content' | 'saved_section',
    entityId: string
  ): Promise<WorkHistoryContext> {
    try {
      // Fetch current entity
      let currentRole = undefined;
      let metrics: string[] = [];
      let workItemId: string | undefined = undefined;

      if (entityType === 'work_item') {
        const { data: workItem } = await supabase
          .from('work_items')
          .select('*, companies(name)')
          .eq('id', entityId)
          .eq('user_id', userId)
          .single();

        if (workItem) {
          currentRole = {
            title: workItem.title,
            company: (workItem.companies as any)?.name || '',
            startDate: workItem.start_date,
            endDate: workItem.end_date || undefined
          };
          metrics = workItem.achievements || [];
          workItemId = workItem.id;
        }
      } else if (entityType === 'approved_content') {
        const { data: content } = await supabase
          .from('approved_content')
          .select('*, work_items(*, companies(name))')
          .eq('id', entityId)
          .eq('user_id', userId)
          .single();

        if (content && content.work_items) {
          const workItem = content.work_items as any;
          currentRole = {
            title: workItem.title,
            company: workItem.companies?.name || '',
            startDate: workItem.start_date,
            endDate: workItem.end_date || undefined
          };
          workItemId = workItem.id;
        }
      }

      // Fetch all stories for context
      let allStories: Array<{ title: string; content: string; metrics?: string[] }> = [];

      if (workItemId) {
        const { data: stories } = await supabase
          .from('approved_content')
          .select('title, content')
          .eq('work_item_id', workItemId)
          .eq('user_id', userId)
          .limit(5);

        allStories = stories || [];
      }

      return {
        userId,
        currentRole,
        allStories,
        metrics
      };

    } catch (error) {
      console.error('Error fetching work history context:', error);
      throw error;
    }
  }
}
```

**Acceptance Criteria**:
- [ ] Service exports all required functions
- [ ] `generateContent()` calls LLM with appropriate prompts
- [ ] `validateContent()` runs basic gap detection checks
- [ ] `saveContent()` handles both replace and variation modes
- [ ] `fetchWorkHistoryContext()` loads related stories and metrics
- [ ] Error handling with clear messages
- [ ] TypeScript types are strict

**Testing**:
```typescript
// Unit tests
describe('ContentGenerationService', () => {
  test('generateContent returns non-empty string', async () => {
    const request = mockGenerationRequest();
    const content = await ContentGenerationService.generateContent(request);
    expect(content.length).toBeGreaterThan(0);
  });

  test('validateContent detects missing metrics', async () => {
    const result = await ContentGenerationService.validateContent(
      'Led the team effectively',
      mockGap,
      'approved_content',
      'user-123'
    );
    expect(result.status).toBe('fail');
    expect(result.remainingGaps.length).toBeGreaterThan(0);
  });

  test('saveContent replaces existing content', async () => {
    const result = await ContentGenerationService.saveContent({
      mode: 'replace',
      entityType: 'approved_content',
      entityId: 'story-123',
      content: 'New content',
      userId: 'user-123',
      gapId: 'gap-123'
    });
    expect(result.success).toBe(true);
  });
});
```

---

## Phase 2: Modal Integration (Week 2)

### Task 2.1: Update ContentGenerationModal Component

**File**: `src/components/hil/ContentGenerationModal.tsx`

**Changes Required**:

1. **Update Props Interface** (lines 27-37):
```typescript
interface ContentGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Gap context
  gap: Gap;

  // Entity context (NEW)
  entityType: 'work_item' | 'approved_content' | 'saved_section';
  entityId: string;
  existingContent: string;

  // Work history context for LLM (NEW)
  workHistoryContext: WorkHistoryContext;

  // Job context (optional, for variations) (NEW)
  jobContext?: JobContext;

  // Section type for saved sections (NEW)
  sectionType?: 'introduction' | 'closer' | 'signature' | 'custom';

  // Callbacks
  onContentApplied?: () => void; // Called after successful save
}
```

2. **Update State Management** (add after line 52):
```typescript
// Content generation state
const [generatedContent, setGeneratedContent] = useState('');
const [isGenerating, setIsGenerating] = useState(false);

// Validation state (NEW)
const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
const [isValidating, setIsValidating] = useState(false);

// Save mode state (NEW)
const [saveMode, setSaveMode] = useState<'replace' | 'variation'>('replace');
const [showSaveModeSelection, setShowSaveModeSelection] = useState(false);

// Variation metadata state (NEW)
const [variationMetadata, setVariationMetadata] = useState({
  title: `Fills Gap: ${gap.gap_category.replace(/_/g, ' ')}`,
  gapTags: [gap.gap_category],
  targetJobTitle: jobContext?.jobTitle || '',
  targetCompany: jobContext?.company || ''
});
```

3. **Replace handleGenerate function** (lines 58-109):
```typescript
const handleGenerate = async () => {
  setIsGenerating(true);
  setValidationResult(null);

  try {
    // Call ContentGenerationService
    const content = await ContentGenerationService.generateContent({
      gap,
      existingContent,
      entityType,
      entityId,
      workHistoryContext,
      jobContext,
      sectionType
    });

    setGeneratedContent(content);

    // Run validation
    setIsValidating(true);
    const validation = await ContentGenerationService.validateContent(
      content,
      gap,
      entityType,
      workHistoryContext.userId
    );

    setValidationResult(validation);
    setIsValidating(false);

  } catch (error) {
    console.error('Generation error:', error);
    toast({
      title: 'Generation Failed',
      description: error instanceof Error ? error.message : 'Failed to generate content',
      variant: 'destructive'
    });
  } finally {
    setIsGenerating(false);
  }
};
```

4. **Update handleApply function** (lines 117-125):
```typescript
const handleApply = async () => {
  if (!generatedContent.trim()) return;

  // Context-dependent save mode logic:
  // - Cover Letter Draft context (jobContext exists) → ALWAYS variation
  // - Work History context (no jobContext) → Default to replace, but show option for variations

  if (jobContext) {
    // Cover letter draft context: ALWAYS create variation (no user choice needed)
    await saveContent('variation');
    return;
  }

  // Work History context: Show save mode selection for entities that support variations
  if (entityType === 'approved_content' || entityType === 'saved_section') {
    setShowSaveModeSelection(true);
    return;
  }

  // For work_item (role descriptions), always replace
  await saveContent('replace');
};

const saveContent = async (mode: 'replace' | 'variation') => {
  try {
    const { user } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const saveRequest: ContentSaveRequest = {
      mode,
      entityType,
      entityId,
      content: generatedContent,
      userId: user.id,
      gapId: gap.id!,
      variationData: mode === 'variation' ? variationMetadata : undefined
    };

    const result = await ContentGenerationService.saveContent(saveRequest);

    if (result.success) {
      toast({
        title: mode === 'replace' ? 'Content Updated' : 'Variation Created',
        description: mode === 'replace'
          ? 'Your content has been updated successfully.'
          : 'A new variation has been created and saved to your library.',
      });

      // Call parent callback to refresh data
      onContentApplied?.();

      // Close modal after delay
      setTimeout(() => {
        onClose();
        // Reset state
        setGeneratedContent('');
        setValidationResult(null);
        setShowSaveModeSelection(false);
      }, 1000);
    }

  } catch (error) {
    console.error('Save error:', error);
    toast({
      title: 'Save Failed',
      description: error instanceof Error ? error.message : 'Failed to save content',
      variant: 'destructive'
    });
  }
};
```

5. **Add Validation Result Display** (insert after line 226):
```typescript
{/* Validation Result Display */}
{validationResult && (
  <Card className="border-2" style={{
    borderColor: validationResult.status === 'pass' ? 'var(--success)' :
                 validationResult.status === 'partial' ? 'var(--warning)' : 'var(--destructive)'
  }}>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm">Gap Validation</CardTitle>
        <Badge variant={
          validationResult.status === 'pass' ? 'default' :
          validationResult.status === 'partial' ? 'secondary' : 'destructive'
        }>
          {validationResult.status === 'pass' && <CheckCircle className="h-3 w-3 mr-1" />}
          {validationResult.status === 'partial' && <AlertTriangle className="h-3 w-3 mr-1" />}
          {validationResult.status === 'fail' && <XCircle className="h-3 w-3 mr-1" />}
          {validationResult.status === 'pass' ? 'All gaps addressed' :
           validationResult.status === 'partial' ? `${validationResult.remainingGaps.length} gap(s) remaining` :
           'Gaps not addressed'}
        </Badge>
      </div>
    </CardHeader>
    <CardContent>
      {validationResult.addressedGaps.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-success">✓ Addressed:</p>
          {validationResult.addressedGaps.map(g => (
            <p key={g.id} className="text-xs text-muted-foreground ml-4">
              • {g.gap_category.replace(/_/g, ' ')}
            </p>
          ))}
        </div>
      )}

      {validationResult.remainingGaps.length > 0 && (
        <div className="space-y-1 mt-3">
          <p className="text-xs font-medium text-warning">⚠ Remaining:</p>
          {validationResult.remainingGaps.map(g => (
            <p key={g.id} className="text-xs text-muted-foreground ml-4">
              • {g.description}
            </p>
          ))}
        </div>
      )}

      {validationResult.suggestions.length > 0 && (
        <div className="mt-3 p-2 bg-muted rounded text-xs">
          <p className="font-medium mb-1">Suggestions:</p>
          {validationResult.suggestions.map((s, i) => (
            <p key={i} className="text-muted-foreground">• {s}</p>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
)}
```

6. **Add Save Mode Selection Dialog** (insert before closing `</Dialog>`):
```typescript
{/* Save Mode Selection */}
{showSaveModeSelection && (
  <Card className="mt-4 border-primary">
    <CardHeader>
      <CardTitle className="text-base">How would you like to save this content?</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-start gap-3">
        <input
          type="radio"
          id="mode-replace"
          checked={saveMode === 'replace'}
          onChange={() => setSaveMode('replace')}
          className="mt-1"
        />
        <div className="flex-1">
          <label htmlFor="mode-replace" className="font-medium text-sm cursor-pointer">
            Replace existing content
          </label>
          <p className="text-xs text-muted-foreground mt-1">
            Update the original {entityType === 'approved_content' ? 'story' : 'section'} with this improved version
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <input
          type="radio"
          id="mode-variation"
          checked={saveMode === 'variation'}
          onChange={() => setSaveMode('variation')}
          className="mt-1"
        />
        <div className="flex-1">
          <label htmlFor="mode-variation" className="font-medium text-sm cursor-pointer">
            Save as variation
          </label>
          <p className="text-xs text-muted-foreground mt-1">
            Keep the original and create a new variation for specific job contexts
          </p>
        </div>
      </div>

      {saveMode === 'variation' && (
        <div className="pl-6 space-y-3 mt-3 border-l-2 border-primary">
          <div>
            <Label htmlFor="variation-title" className="text-xs">Variation Title</Label>
            <Input
              id="variation-title"
              value={variationMetadata.title}
              onChange={(e) => setVariationMetadata(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Fills Gap: Leadership Philosophy"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="gap-tags" className="text-xs">Gap Tags (comma-separated)</Label>
            <Input
              id="gap-tags"
              value={variationMetadata.gapTags.join(', ')}
              onChange={(e) => setVariationMetadata(prev => ({
                ...prev,
                gapTags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
              }))}
              placeholder="leadership, team-management"
              className="mt-1"
            />
          </div>

          {jobContext && (
            <>
              <div>
                <Label htmlFor="target-job" className="text-xs">Target Job (Optional)</Label>
                <Input
                  id="target-job"
                  value={variationMetadata.targetJobTitle}
                  onChange={(e) => setVariationMetadata(prev => ({ ...prev, targetJobTitle: e.target.value }))}
                  placeholder={jobContext.jobTitle}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="target-company" className="text-xs">Target Company (Optional)</Label>
                <Input
                  id="target-company"
                  value={variationMetadata.targetCompany}
                  onChange={(e) => setVariationMetadata(prev => ({ ...prev, targetCompany: e.target.value }))}
                  placeholder={jobContext.company}
                  className="mt-1"
                />
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-3">
        <Button variant="secondary" onClick={() => setShowSaveModeSelection(false)} className="flex-1">
          Cancel
        </Button>
        <Button onClick={() => saveContent(saveMode)} className="flex-1">
          {saveMode === 'replace' ? 'Replace Content' : 'Save Variation'}
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

**Acceptance Criteria**:
- [ ] Modal opens with real gap and entity context
- [ ] "Generate Content" calls `ContentGenerationService.generateContent()`
- [ ] Generated content displays in editable textarea
- [ ] Validation runs automatically after generation
- [ ] Validation results display with color-coded badges
- [ ] Save mode selection appears for entities that support variations
- [ ] Replace mode updates existing entity content
- [ ] Variation mode creates new variation with metadata
- [ ] Toast notifications on success/failure
- [ ] Modal closes and resets state after save

**Testing**:
- Storybook stories for all modal states (loading, validation pass/partial/fail, save mode selection)
- E2E test: Open modal → Generate → Validate → Save (both modes)

---

### Task 2.2: Update ContentGapBanner Integration

**File**: `src/components/shared/ContentGapBanner.tsx`

**Changes** (update `onGenerateContent` callback):

Current implementation passes minimal context. Need to fetch full context before opening modal.

**Create New Hook**: `src/hooks/useContentGeneration.ts`

```typescript
import { useState } from 'react';
import { ContentGenerationService } from '@/services/contentGenerationService';
import type { Gap } from '@/services/gapDetectionService';
import type { WorkHistoryContext, JobContext } from '@/prompts/contentGeneration';

export interface UseContentGenerationProps {
  onContentApplied?: () => void;
}

export function useContentGeneration({ onContentApplied }: UseContentGenerationProps = {}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProps, setModalProps] = useState<any>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  const openModal = async (
    gap: Gap,
    entityType: 'work_item' | 'approved_content' | 'saved_section',
    entityId: string,
    existingContent: string,
    jobContext?: JobContext,
    sectionType?: 'introduction' | 'closer' | 'signature' | 'custom'
  ) => {
    try {
      setIsLoadingContext(true);

      // Fetch work history context
      const workHistoryContext = await ContentGenerationService.fetchWorkHistoryContext(
        gap.user_id,
        entityType,
        entityId
      );

      // Set modal props
      setModalProps({
        gap,
        entityType,
        entityId,
        existingContent,
        workHistoryContext,
        jobContext,
        sectionType,
        onContentApplied: () => {
          onContentApplied?.();
          setIsModalOpen(false);
        }
      });

      setIsModalOpen(true);

    } catch (error) {
      console.error('Error loading content generation context:', error);
      toast({
        title: 'Failed to Load Context',
        description: 'Could not fetch work history context. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingContext(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalProps(null);
  };

  return {
    isModalOpen,
    modalProps,
    isLoadingContext,
    openModal,
    closeModal
  };
}
```

**Usage in Components** (example in `WorkHistoryDetail.tsx`):

```typescript
import { useContentGeneration } from '@/hooks/useContentGeneration';
import { ContentGenerationModal } from '@/components/hil/ContentGenerationModal';

export function WorkHistoryDetail() {
  const { isModalOpen, modalProps, openModal, closeModal } = useContentGeneration({
    onContentApplied: () => {
      // Refresh work history data
      refetch();
    }
  });

  const handleGenerateContent = (gap: Gap, story: ApprovedContent) => {
    openModal(
      gap,
      'approved_content',
      story.id,
      story.content,
      undefined, // No job context in work history view
      undefined  // No section type
    );
  };

  return (
    <>
      {/* Existing UI */}
      <ContentGapBanner
        gaps={storyGaps}
        onGenerateContent={() => handleGenerateContent(storyGaps[0], story)}
      />

      {/* Content Generation Modal */}
      {isModalOpen && modalProps && (
        <ContentGenerationModal
          isOpen={isModalOpen}
          onClose={closeModal}
          {...modalProps}
        />
      )}
    </>
  );
}
```

**Acceptance Criteria**:
- [ ] `useContentGeneration` hook created and exported
- [ ] Hook fetches work history context before opening modal
- [ ] Hook manages modal open/close state
- [ ] Hook provides loading state for context fetch
- [ ] All gap banners updated to use new hook pattern
- [ ] Modal receives full context on open

**Testing**:
- Unit tests for `useContentGeneration` hook
- E2E test: Click gap banner → Context loaded → Modal opens with props

---

## Phase 3: Variations UI (Week 3)

### Task 3.1: Update ContentCard Component

**File**: `src/components/shared/ContentCard.tsx`

**Add Variations Section** (after tags section, before gap banner):

```typescript
{/* Variations Section */}
{variations && variations.length > 0 && (
  <div className="mt-4 pt-4 border-t">
    <button
      onClick={() => setShowVariations(!showVariations)}
      className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors w-full"
    >
      <Layers className="h-4 w-4" />
      <span>Variations ({variations.length})</span>
      {showVariations ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
    </button>

    {showVariations && (
      <div className="mt-3 space-y-2">
        {variations.map((variation) => (
          <VariationCard
            key={variation.id}
            variation={variation}
            onEdit={() => onEditVariation?.(variation)}
            onDelete={() => onDeleteVariation?.(variation.id)}
            onUse={() => onUseVariation?.(variation)}
          />
        ))}
      </div>
    )}
  </div>
)}
```

**Update Props**:
```typescript
interface ContentCardProps {
  // ... existing props
  variations?: ContentVariation[];
  onEditVariation?: (variation: ContentVariation) => void;
  onDeleteVariation?: (variationId: string) => void;
  onUseVariation?: (variation: ContentVariation) => void;
}
```

**Acceptance Criteria**:
- [ ] Variations section displays when variations exist
- [ ] Collapsible with count indicator
- [ ] Uses VariationCard component for each variation
- [ ] Callbacks for edit/delete/use actions

---

### Task 3.2: Create VariationCard Component

**File**: `src/components/shared/VariationCard.tsx`

**Design Challenge: Variation Naming & Nesting**

The user identified an important UX challenge: How to visually organize variations in table views with auto-generated names?

**Auto-Generated Variation Name Pattern**:
```typescript
// Format: "Fills Gap: [Gap Category]"
// Examples:
"Fills Gap: Leadership Philosophy"
"Fills Gap: People Management"
"Fills Gap: Roadmap"
```

**Visual Nesting Options** (deferred to post-MVP):

1. **Filter-Based Approach** (RECOMMENDED - Simple Solution):
   - Add "Show Variations" filter toggle in work history table
   - When enabled, show variations as separate rows with visual indicator
   - Example: `[↳] "Fills Gap: Leadership" (variation of "Team Building")`
   - Easy to implement, no complex nesting logic needed

2. **Indented List View**:
   ```
   Story: "Team Building at AtlasSuite"
     ↳ Variation: "Fills Gap: Leadership Philosophy" (Director of Product @ TechCorp)
     ↳ Variation: "Fills Gap: People Management" (PM @ Acme)
   ```

3. **Expandable Rows**:
   ```
   ▶ Story: "Team Building at AtlasSuite" [2 variations]
   ```
   (Click to expand shows nested variation cards)

**MVP Approach**: Use expandable sections in ContentCard (already implemented). Defer table view enhancements to future iteration.

---

```typescript
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit, Trash2, Copy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ContentVariation } from '@/types/variations';
import { formatDistanceToNow } from 'date-fns';

interface VariationCardProps {
  variation: ContentVariation;
  onEdit: () => void;
  onDelete: () => void;
  onUse: () => void;
}

export function VariationCard({ variation, onEdit, onDelete, onUse }: VariationCardProps) {
  return (
    <Card className="border-l-4 border-l-primary bg-muted/30">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <h4 className="text-sm font-medium">{variation.title}</h4>
            {variation.target_job_title && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Developed for: {variation.target_job_title}
                {variation.target_company && ` @ ${variation.target_company}`}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onUse}>
                <Copy className="h-3 w-3 mr-2" />
                Use in Cover Letter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-3 w-3 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-3 w-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content Preview */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {variation.content}
        </p>

        {/* Gap Tags */}
        {variation.gap_tags && variation.gap_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {variation.gap_tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs py-0 px-1.5">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {variation.times_used > 0 && (
            <span>Used {variation.times_used} times</span>
          )}
          {variation.last_used && (
            <span>Last used {formatDistanceToNow(new Date(variation.last_used), { addSuffix: true })}</span>
          )}
          {variation.created_at && (
            <span>Created {formatDistanceToNow(new Date(variation.created_at), { addSuffix: true })}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Acceptance Criteria**:
- [ ] Card displays variation title, content preview, gap tags
- [ ] Shows job context (target job title + company)
- [ ] Displays usage stats (times used, last used)
- [ ] Dropdown menu with Edit/Delete/Use actions
- [ ] Proper styling with left border accent

**Testing**:
- Storybook story with mock variations
- Visual regression test

---

### Task 3.3: Update Saved Sections Page

**File**: `src/pages/SavedSections.tsx`

**Changes**:

1. **Replace Mock Data with Real Database Queries**:
   - Remove `mockTemplateBlurbs` (line 12-60)
   - Add Supabase query to fetch saved sections
   - Fetch variations for each saved section

2. **Add Variation Support**:
   - Display variations in ContentCard
   - Wire up variation actions (edit/delete/use)

3. **Update ContentGenerationModal Integration**:
   - Use `useContentGeneration` hook
   - Pass section type to modal

**(See full implementation in codebase - file is already partially set up with mock data)**

**Acceptance Criteria**:
- [ ] Saved sections loaded from database
- [ ] Variations displayed for each section
- [ ] Generate content opens modal with section type
- [ ] Variation creation saves to database
- [ ] Real-time updates after content applied

---

## Phase 4: Gap Validation (Week 4)

### Task 4.1: Enhance Gap Detection for Validation

**File**: `src/services/gapDetectionService.ts`

**Add New Method**:

```typescript
/**
 * Fast gap detection for content validation
 * Optimized for speed - runs lightweight checks only
 *
 * IMPORTANT: Validates ALL gaps for a content item, not just one
 * One piece of content can have multiple gaps (e.g., missing metrics + generic description)
 */
static async validateContentForGaps(
  content: string,
  entityType: 'work_item' | 'approved_content' | 'saved_section',
  allGaps: Gap[], // CHANGED: Accept array of gaps, not single gap
  userId: string
): Promise<{
  hasGaps: boolean;
  gaps: Gap[];
  gapsAddressed: Gap[];
}> {
  const detectedGaps: Gap[] = [];

  // Validate each gap category present in the content
  for (const originalGap of allGaps) {
    let gapStillExists = false;

    // Run quick validation checks based on gap category
    switch (originalGap.gap_category) {
      case 'incomplete_story':
        gapStillExists = !this.checkSTARFormat(content);
        break;

      case 'missing_metrics':
        gapStillExists = !this.checkForMetrics(content);
        break;

      case 'generic_role_description':
        gapStillExists = this.checkForGenericContent(content);
        break;

      // Add more gap categories as needed
      default:
        // For unknown gap types, assume addressed (optimistic)
        gapStillExists = false;
    }

    if (gapStillExists) {
      detectedGaps.push(originalGap);
    }
  }

  // Determine which gaps were addressed
  const gapsAddressed = allGaps.filter(
    gap => !detectedGaps.find(detected => detected.id === gap.id)
  );

  return {
    hasGaps: detectedGaps.length > 0,
    gaps: detectedGaps,
    gapsAddressed
  };
}

// Helper methods for quick validation
private static checkSTARFormat(content: string): boolean {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  return sentences.length >= 3 && content.length > 100;
}

private static checkForMetrics(content: string): boolean {
  const metricPatterns = [
    /\d+%/,                    // 25%
    /\d+x/,                    // 3x
    /\$[\d,]+/,                // $100,000
    /\d+\s*(month|year|week)/, // 6 months
    /increased.*\d+/i,         // increased by 30
    /reduced.*\d+/i,           // reduced costs by 40
  ];

  return metricPatterns.some(pattern => pattern.test(content));
}

private static checkForGenericContent(content: string): boolean {
  const genericPhrases = [
    'led the team',
    'managed projects',
    'worked with stakeholders'
  ];

  const hasGenericPhrase = genericPhrases.some(phrase =>
    content.toLowerCase().includes(phrase)
  );

  const hasNoMetrics = !this.checkForMetrics(content);

  return hasGenericPhrase && hasNoMetrics;
}
```

**Acceptance Criteria**:
- [ ] `validateContentForGaps()` method added
- [ ] Optimized for speed (<1s execution)
- [ ] Checks aligned with gap categories
- [ ] Returns clear validation result

**Testing**:
```typescript
describe('Gap Validation', () => {
  test('validates STAR format', async () => {
    const result = await GapDetectionService.validateContentForGaps(
      'As PM at TechCorp, I led the product strategy. I increased engagement by 25%. This resulted in $1M revenue.',
      'approved_content',
      mockIncompleteStoryGap,
      'user-123'
    );
    expect(result.hasGaps).toBe(false);
    expect(result.gapsAddressed.length).toBe(1);
  });

  test('detects missing metrics', async () => {
    const result = await GapDetectionService.validateContentForGaps(
      'Led the team effectively and delivered results.',
      'approved_content',
      mockMissingMetricsGap,
      'user-123'
    );
    expect(result.hasGaps).toBe(true);
    expect(result.gaps.length).toBeGreaterThan(0);
  });
});
```

---

### Task 4.2: Update ContentGenerationService Validation

**File**: `src/services/contentGenerationService.ts`

**Replace `validateContent` method** (use new gap detection):

```typescript
static async validateContent(
  content: string,
  originalGap: Gap,
  entityType: 'work_item' | 'approved_content' | 'saved_section',
  userId: string
): Promise<ValidationResult> {
  try {
    const validation = await GapDetectionService.validateContentForGaps(
      content,
      entityType,
      originalGap,
      userId
    );

    const status: ValidationResult['status'] =
      !validation.hasGaps ? 'pass' :
      validation.gaps.length === 1 ? 'partial' : 'fail';

    return {
      status,
      addressedGaps: validation.gapsAddressed,
      remainingGaps: validation.gaps,
      newGaps: [],
      confidence: !validation.hasGaps ? 0.95 : 0.6,
      suggestions: validation.gaps.map(g => g.description || '')
    };

  } catch (error) {
    console.error('Validation error:', error);
    return {
      status: 'pass',
      addressedGaps: [originalGap],
      remainingGaps: [],
      newGaps: [],
      confidence: 0.3,
      suggestions: ['Unable to validate - please review content manually']
    };
  }
}
```

**Acceptance Criteria**:
- [ ] Uses new `validateContentForGaps()` method
- [ ] Returns proper ValidationResult structure
- [ ] Handles errors gracefully

---

## Phase 5: Cover Letter Drafts Support (Week 5)

**Goal**: Integrate content generation into cover letter draft workflow (PRIMARY USE CASE)

**Context**: This is where most users will interact with content generation post-onboarding. The workflow is:
1. Draft assembled from best-matching base content
2. Gap detection identifies JD-specific gaps
3. User generates variations to address gaps
4. ALL edits in this context create variations (never replace base content)

**Timeline Note**: Cover letter branch merging within 24 hours, so Phase 5 can begin on schedule.

### Task 5.1: Extend Gap Detection to Cover Letter Drafts

**File**: Database migration already includes `cover_letter_drafts` in `gaps.entity_type` constraint

**Implementation**:
1. Ensure gap detection runs on cover letter draft paragraphs
2. Link gaps to specific paragraphs in draft
3. Track which base content item each paragraph came from (for variation linking)

### Task 5.2: Cover Letter Draft Editor Integration

**File**: Cover letter editor component (TBD - needs merge from branch)

**Requirements**:
1. Display gap banners at paragraph level
2. "Generate Content" button opens modal in VARIATION mode (no choice)
3. Auto-fill job context from current draft
4. Auto-link generated variation to parent content item
5. Update draft paragraph with variation content on save

### Task 5.3: Variation Auto-Linking

**Challenge**: When user clicks "Generate Content" in cover letter draft, need to know which base content item to create variation for.

**Solution**:
- Track `source_content_id` in draft paragraph data
- When generating, create variation linked to that source content
- If paragraph has no source (user wrote from scratch), prompt user to select parent content or save as new saved section

### Task 5.4: Truth Fidelity Testing

**Important**: Cover letter context is where hallucination risk is highest (user pressure to match JD)

**Testing Plan**:
1. **Adversarial Prompts**: Test with JD requirements NOT in user's work history
2. **Cross-Referencing**: Verify generated metrics exist in user's profile
3. **Metric Validation**: Flag any numbers that don't match known achievements
4. **Prompt Engineering**: Ensure LLM says "I don't have that information" rather than fabricating

**Acceptance Criteria**:
- Generated variations only reference facts from user's work history
- When JD requirement can't be met from work history, suggest related content (don't fabricate)
- All metrics in generated content traceable to source stories
- LLM refuses to generate content for gaps it cannot address with available data

---

---

## Testing Strategy

### Unit Tests

**Services**:
- `ContentGenerationService`: All methods with mocked LLM responses
- `GapDetectionService`: Validation methods with various content inputs
- Prompt builders: Verify structure and context inclusion

**Components**:
- `ContentGenerationModal`: All states (loading, validation pass/fail, save modes)
- `VariationCard`: Rendering and action callbacks
- `ContentCard`: Variations display

### Integration Tests

**Flows**:
- Gap detection → Modal open → Generate → Validate → Save (replace)
- Gap detection → Modal open → Generate → Validate → Save (variation)
- Variation creation → Display in ContentCard → Edit → Save

### E2E Tests

**Critical Paths**:
1. **Story Enhancement Flow**:
   - Navigate to Work History
   - View story with gap
   - Click "Generate Content"
   - Modal opens with context
   - Generate content
   - Validation passes
   - Apply content (replace mode)
   - Verify story updated
   - Verify gap resolved

2. **Variation Creation Flow**:
   - Navigate to Saved Sections
   - View section with gap
   - Click "Generate Content"
   - Generate content for specific job
   - Choose "Save as variation"
   - Fill variation metadata
   - Save variation
   - Verify variation appears in section card
   - Verify gap resolved

---

## Deployment Plan

### Database Migrations

1. Run migration 012 in staging environment
2. Verify tables created correctly
3. Test RLS policies with test users
4. Run migration in production during low-traffic window

### Feature Flags

**Decision**: No feature flag needed for MVP features (per user feedback).

All functionality ships to all users once complete. Monitor metrics closely in first week after deployment.

### Monitoring

**Metrics to Track**:
- Generation request count (daily)
- Generation success rate
- Validation pass rate
- Average generation latency
- LLM costs per user
- Gap resolution rate
- Variation creation rate

**Alerts**:
- Generation error rate > 10%
- Average latency > 5s
- LLM costs spike > 2x baseline

---

## Rollback Plan

If critical issues arise after deployment:

1. **Disable Feature Flag**: Turn off content generation for all users
2. **Database Rollback**: Revert migration 012 (drop tables)
3. **Code Rollback**: Revert to previous commit before merge

**Rollback Criteria**:
- Generation error rate > 30%
- Database performance degradation
- Hallucinated content detected
- User complaints > 10% of active users

---

## Success Criteria

**Phase 1 Complete**:
- [ ] Database tables created
- [ ] Prompts written and tested
- [ ] ContentGenerationService fully functional
- [ ] Unit tests passing

**Phase 2 Complete**:
- [ ] Modal integrated with real LLM
- [ ] Validation working
- [ ] Gap banners trigger modal with context
- [ ] Save modes functional

**Phase 3 Complete**:
- [ ] Variations display in UI
- [ ] VariationCard component built
- [ ] Saved Sections migrated to database

**Phase 4 Complete**:
- [ ] Gap validation optimized
- [ ] Real-time validation in modal
- [ ] Validation results clear and actionable

**Phase 5 Complete**:
- [ ] Cover letter drafts supported
- [ ] Truth fidelity verification in place

**MVP Launch Ready**:
- [ ] All phases complete
- [ ] E2E tests passing
- [ ] Performance metrics within targets
- [ ] Documentation updated
- [ ] User testing completed with positive feedback

---

## Appendix: Code Snippets & Examples

### Example LLM Call

```typescript
// In ContentGenerationService
const response = await this.llmService.callOpenAI(
  buildStoryGenerationPrompt(gap, existingContent, context),
  1000, // max tokens
  CONTENT_GENERATION_SYSTEM_PROMPT
);
```

### Example Variation Query

```sql
-- Fetch variations for a story
SELECT * FROM content_variations
WHERE parent_entity_type = 'approved_content'
  AND parent_entity_id = $1
  AND user_id = $2
ORDER BY created_at DESC;
```

### Example Gap Resolution

```typescript
// After content applied
await GapDetectionService.resolveGap(
  gapId,
  userId,
  'content_added',
  variation.id // or entity.id for replace mode
);
```

---

**End of Implementation Plan**

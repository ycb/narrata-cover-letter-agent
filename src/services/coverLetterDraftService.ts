/**
 * Cover Letter Draft Service
 *
 * Orchestrates the full cover letter draft creation flow:
 * - Job description parsing
 * - Section generation from saved sections + work history
 * - Gap detection on sections
 * - HIL progress metrics calculation
 * - Draft persistence
 */

import { supabase } from '@/lib/supabase';
import { JobDescriptionService, type ParsedJobDescription } from './jobDescriptionService';
import { GapDetectionService } from './gapDetectionService';
import { CoverLetterTemplateService, type TemplateSection } from './coverLetterTemplateService';
import { GoalsMatchService, type GoalsMatchResult } from './goalsMatchService';
import { RequirementsMatchService, type RequirementsMatchResult } from './requirementsMatchService';
import { ExperienceMatchService, type ExperienceMatchResult } from './experienceMatchService';
import { CoverLetterRatingService, type CoverLetterRatingResult } from './coverLetterRatingService';
import { ATSAnalysisService, type ATSEvalResponse } from './atsAnalysisService';

// Progress callback type for streaming updates
export type DraftProgressCallback = (step: string, progress: number, detail?: string) => void;
import type { Database } from '@/types/supabase';
import type { UserGoals } from '@/types/userGoals';
import type { UserVoice } from '@/types/userVoice';

type CoverLetterRow = Database['public']['Tables']['cover_letters']['Row'];
type CoverLetterInsert = Database['public']['Tables']['cover_letters']['Insert'];
type JobDescriptionRow = Database['public']['Tables']['job_descriptions']['Row'];
type SavedSectionRow = Database['public']['Tables']['saved_sections']['Row'];

// Section structure used by the modal
export interface CoverLetterSection {
  id: string;
  type: 'intro' | 'experience' | 'closing' | 'signature';
  content: string;
  usedBlurbs?: string[];
  isModified: boolean;
}

// HIL Progress Metrics
export interface HILProgressMetrics {
  goalsMatch: 'strong' | 'average' | 'weak';
  experienceMatch: 'strong' | 'average' | 'weak';
  coverLetterRating: 'strong' | 'average' | 'weak';
  atsScore: number;
  coreRequirementsMet: { met: number; total: number };
  preferredRequirementsMet: { met: number; total: number };
}

// Gap structure used by the modal
export interface Gap {
  id: string;
  type: 'core-requirement' | 'preferred-requirement' | 'best-practice' | 'content-enhancement';
  severity: 'high' | 'medium' | 'low';
  description: string;
  suggestion: string;
  paragraphId?: string;
  requirementId?: string;
  origin: 'ai' | 'human' | 'library';
  addresses?: string[];
}

// Detailed analysis results from all services
export interface DetailedMatchAnalysis {
  goalsMatch: GoalsMatchResult;
  requirementsMatch: RequirementsMatchResult;
  coreExperienceMatch: ExperienceMatchResult;
  preferredExperienceMatch: ExperienceMatchResult;
  coverLetterRating: CoverLetterRatingResult;
  atsAnalysis: ATSEvalResponse;
}

// Draft creation result
export interface CoverLetterDraft {
  draftId: string;
  sections: CoverLetterSection[];
  gaps: Gap[];
  metrics: HILProgressMetrics;
  jobDescription: {
    id: string;
    role?: string;
    company?: string;
    location?: string;
    salary?: string;
    extracted_requirements?: string[];
    coreRequirements?: string[];
    preferredRequirements?: string[];
  };
  parsedJobDescription?: ParsedJobDescription;
  detailedAnalysis?: DetailedMatchAnalysis;
}

export class CoverLetterDraftService {
  private jobDescriptionService: JobDescriptionService;
  private gapDetectionService: GapDetectionService;
  private goalsMatchService: GoalsMatchService;
  private requirementsMatchService: RequirementsMatchService;
  private experienceMatchService: ExperienceMatchService;
  private coverLetterRatingService: CoverLetterRatingService;
  private atsAnalysisService: ATSAnalysisService;

  constructor() {
    this.jobDescriptionService = new JobDescriptionService();
    this.gapDetectionService = new GapDetectionService();
    this.goalsMatchService = new GoalsMatchService();
    this.requirementsMatchService = new RequirementsMatchService();
    this.experienceMatchService = new ExperienceMatchService();
    this.coverLetterRatingService = new CoverLetterRatingService();
    this.atsAnalysisService = new ATSAnalysisService();
  }

  /**
   * Create a new cover letter draft
   * Main orchestration method that coordinates all steps
   */
  async createDraft(
    userId: string,
    jobDescription: string,
    jobUrl?: string,
    userGoals?: UserGoals | null,
    userVoice?: UserVoice | null,
    pmLevel?: string,
    goNoGoAnalysis?: any
  ): Promise<CoverLetterDraft> {
    try {
      // Step 1: Parse job description and create DB record
      const { dbRecord: jd, parsed } = await this.jobDescriptionService.parseAndCreate({
        userId,
        content: jobDescription,
        url: jobUrl,
      });

      // Step 2: Generate sections from saved sections + work history
      const sections = await this.generateSections(userId, jd);

      // Step 3: Detect gaps in generated sections
      const gaps = await this.detectSectionGaps(userId, sections);

      // Step 4: Run detailed analysis (Goals, Requirements, Experience, Rating, ATS)
      const detailedAnalysis = await this.runDetailedAnalysis(
        userId,
        parsed,
        sections,
        jobDescription,
        userGoals,
        userVoice,
        pmLevel,
        goNoGoAnalysis
      );

      // Step 5: Calculate HIL progress metrics from detailed analysis
      const metrics = this.calculateMetricsFromAnalysis(detailedAnalysis);

      // Step 6: Save draft to database
      const draftId = await this.saveDraft(userId, jd.id, sections, gaps, metrics);

      return {
        draftId,
        sections,
        gaps,
        metrics,
        jobDescription: {
          id: jd.id,
          role: jd.role || undefined,
          company: jd.company || undefined,
          location: jd.extracted_requirements?.find((r: string) => r.toLowerCase().includes('location') || r.toLowerCase().includes('remote')) || undefined,
          salary: jd.extracted_requirements?.find((r: string) => r.includes('$')) || undefined,
          extracted_requirements: jd.extracted_requirements || [],
          coreRequirements: parsed.coreRequirements,
          preferredRequirements: parsed.preferredRequirements,
        },
        parsedJobDescription: parsed,
        detailedAnalysis,
      };
    } catch (error) {
      console.error('Error creating cover letter draft:', error);
      throw error;
    }
  }

  /**
   * Create draft with streaming progress updates
   * Reports progress as each step completes
   */
  async createDraftWithProgress(
    userId: string,
    jobDescription: string,
    onProgress: DraftProgressCallback,
    jobUrl?: string,
    userGoals?: UserGoals | null,
    userVoice?: UserVoice | null,
    pmLevel?: string,
    goNoGoAnalysis?: any
  ): Promise<CoverLetterDraft> {
    try {
      // Step 1: Parse job description
      onProgress('Analyzing job description...', 10, 'Extracting requirements and key details');
      const { dbRecord: jd, parsed } = await this.jobDescriptionService.parseAndCreate({
        userId,
        content: jobDescription,
        url: jobUrl,
      });

      // Step 2: Generate sections
      onProgress('Generating cover letter draft...', 30, 'Matching your work history to job requirements');
      const sections = await this.generateSections(userId, jd);

      // Step 3: Detect gaps
      onProgress('Detecting content gaps...', 50, 'Identifying areas for improvement');
      const gaps = await this.detectSectionGaps(userId, sections);

      // Step 4: Run detailed analysis with sub-progress updates
      onProgress('Analyzing match with goals...', 60, 'Checking alignment with your career goals');

      const detailedAnalysis = await this.runDetailedAnalysisWithProgress(
        userId,
        parsed,
        sections,
        jobDescription,
        userGoals,
        userVoice,
        pmLevel,
        goNoGoAnalysis,
        onProgress
      );

      // Step 5: Calculate metrics
      onProgress('Calculating metrics...', 90, 'Computing match scores and ATS compatibility');
      const metrics = this.calculateMetricsFromAnalysis(detailedAnalysis);

      // Step 6: Save draft
      onProgress('Saving draft...', 95, 'Persisting to database');
      const draftId = await this.saveDraft(userId, jd.id, sections, gaps, metrics);

      onProgress('Complete!', 100, 'Your cover letter draft is ready');

      return {
        draftId,
        sections,
        gaps,
        metrics,
        jobDescription: {
          id: jd.id,
          role: jd.role || undefined,
          company: jd.company || undefined,
          location: jd.extracted_requirements?.find((r: string) => r.toLowerCase().includes('location') || r.toLowerCase().includes('remote')) || undefined,
          salary: jd.extracted_requirements?.find((r: string) => r.includes('$')) || undefined,
          extracted_requirements: jd.extracted_requirements || [],
          coreRequirements: parsed.coreRequirements,
          preferredRequirements: parsed.preferredRequirements,
        },
        parsedJobDescription: parsed,
        detailedAnalysis,
      };
    } catch (error) {
      console.error('Error creating cover letter draft:', error);
      throw error;
    }
  }

  /**
   * Run detailed analysis with progress updates for each sub-step
   */
  private async runDetailedAnalysisWithProgress(
    userId: string,
    parsed: ParsedJobDescription,
    sections: CoverLetterSection[],
    jobDescriptionText: string,
    userGoals?: UserGoals | null,
    userVoice?: UserVoice | null,
    pmLevel?: string,
    goNoGoAnalysis?: any,
    onProgress?: DraftProgressCallback
  ): Promise<DetailedMatchAnalysis> {
    try {
      // Fetch work history for experience matching
      const { data: workItems } = await supabase
        .from('work_items')
        .select('id, company:companies(name), title, description, achievements, start_date, end_date')
        .eq('user_id', userId);

      const { data: approvedContent } = await supabase
        .from('approved_content')
        .select('id, title, content, company:work_items(company_id), role:work_items(title)')
        .eq('user_id', userId);

      // Format work items for analysis
      const formattedWorkItems = (workItems || []).map(item => ({
        id: item.id,
        company: (item.company as any)?.name || 'Unknown',
        title: item.title,
        description: item.description,
        achievements: item.achievements || [],
        startDate: item.start_date,
        endDate: item.end_date,
      }));

      const formattedStories = (approvedContent || []).map(story => ({
        id: story.id,
        title: story.title,
        content: story.content,
        company: (story.company as any)?.name,
        role: (story.role as any)?.title,
      }));

      // Combine all section content into single draft text
      const fullDraftText = sections.map(s => s.content).join('\n\n');

      // Run analyses sequentially with progress updates for better UX feedback
      onProgress?.('Analyzing match with goals...', 62, 'Checking alignment with career goals');
      const goalsMatch = await this.goalsMatchService.analyzeGoalsMatch(
        userGoals,
        {
          role: parsed.role,
          company: parsed.company,
          location: undefined,
          salary: undefined,
        },
        goNoGoAnalysis
      );

      onProgress?.('Analyzing requirements match...', 65, 'Checking coverage of job requirements');
      const requirementsMatch = this.requirementsMatchService.analyzeRequirementsMatch(
        parsed.coreRequirements,
        parsed.preferredRequirements,
        sections
      );

      onProgress?.('Matching core requirements to experience...', 70, 'AI analyzing work history for core skills');
      const coreExperienceMatch = await this.experienceMatchService.analyzeExperienceMatch(
        parsed.coreRequirements,
        formattedWorkItems,
        formattedStories
      );

      onProgress?.('Matching preferred requirements to experience...', 75, 'AI analyzing work history for additional skills');
      const preferredExperienceMatch = await this.experienceMatchService.analyzeExperienceMatch(
        parsed.preferredRequirements,
        formattedWorkItems,
        formattedStories
      );

      onProgress?.('Evaluating cover letter quality...', 80, 'AI rating draft against best practices');
      const coverLetterRating = await this.coverLetterRatingService.evaluateCoverLetter(
        fullDraftText,
        jobDescriptionText,
        userVoice?.prompt,
        pmLevel
      );

      onProgress?.('Running ATS compatibility check...', 85, 'AI analyzing keyword optimization');
      const atsAnalysis = await this.atsAnalysisService.evaluateATS(
        fullDraftText,
        jobDescriptionText
      );

      return {
        goalsMatch,
        requirementsMatch,
        coreExperienceMatch,
        preferredExperienceMatch,
        coverLetterRating,
        atsAnalysis,
      };
    } catch (error) {
      console.error('Error running detailed analysis:', error);
      throw error;
    }
  }

  /**
   * Run detailed analysis on generated cover letter
   * Calls all 5 analysis services: Goals, Requirements, Experience, Rating, ATS
   */
  private async runDetailedAnalysis(
    userId: string,
    parsed: ParsedJobDescription,
    sections: CoverLetterSection[],
    jobDescriptionText: string,
    userGoals?: UserGoals | null,
    userVoice?: UserVoice | null,
    pmLevel?: string,
    goNoGoAnalysis?: any
  ): Promise<DetailedMatchAnalysis> {
    try {
      // Fetch work history for experience matching
      const { data: workItems } = await supabase
        .from('work_items')
        .select('id, company:companies(name), title, description, achievements, start_date, end_date')
        .eq('user_id', userId);

      const { data: approvedContent } = await supabase
        .from('approved_content')
        .select('id, title, content, company:work_items(company_id), role:work_items(title)')
        .eq('user_id', userId);

      // Format work items for analysis
      const formattedWorkItems = (workItems || []).map(item => ({
        id: item.id,
        company: (item.company as any)?.name || 'Unknown',
        title: item.title,
        description: item.description,
        achievements: item.achievements || [],
        startDate: item.start_date,
        endDate: item.end_date,
      }));

      const formattedStories = (approvedContent || []).map(story => ({
        id: story.id,
        title: story.title,
        content: story.content,
        company: (story.company as any)?.name,
        role: (story.role as any)?.title,
      }));

      // Combine all section content into single draft text
      const fullDraftText = sections.map(s => s.content).join('\n\n');

      // Run all analyses in parallel for speed
      const [
        goalsMatch,
        requirementsMatch,
        coreExperienceMatch,
        preferredExperienceMatch,
        coverLetterRating,
        atsAnalysis
      ] = await Promise.all([
        // 1. Goals Match
        Promise.resolve(this.goalsMatchService.analyzeGoalsMatch(
          userGoals,
          {
            role: parsed.role,
            company: parsed.company,
            location: undefined, // TODO: Extract from requirements
            salary: undefined, // TODO: Extract from requirements
          },
          goNoGoAnalysis
        )),

        // 2. Requirements Match
        Promise.resolve(this.requirementsMatchService.analyzeRequirementsMatch(
          parsed.coreRequirements,
          parsed.preferredRequirements,
          sections
        )),

        // 3a. Core Experience Match (LLM call)
        this.experienceMatchService.analyzeExperienceMatch(
          parsed.coreRequirements,
          formattedWorkItems,
          formattedStories
        ),

        // 3b. Preferred Experience Match (LLM call)
        this.experienceMatchService.analyzeExperienceMatch(
          parsed.preferredRequirements,
          formattedWorkItems,
          formattedStories
        ),

        // 4. Cover Letter Rating (LLM call)
        this.coverLetterRatingService.evaluateCoverLetter(
          fullDraftText,
          jobDescriptionText,
          userVoice?.prompt,
          pmLevel
        ),

        // 5. ATS Analysis (LLM call)
        this.atsAnalysisService.evaluateATS(
          fullDraftText,
          jobDescriptionText
        )
      ]);

      return {
        goalsMatch,
        requirementsMatch,
        coreExperienceMatch,
        preferredExperienceMatch,
        coverLetterRating,
        atsAnalysis,
      };
    } catch (error) {
      console.error('Error running detailed analysis:', error);
      // Return empty/default results on error
      throw error;
    }
  }

  /**
   * Generate cover letter sections from saved sections and work history
   */
  async generateSections(
    userId: string,
    jd: JobDescriptionRow
  ): Promise<CoverLetterSection[]> {
    try {
      // Fetch user's default saved sections
      const { data: savedSections, error } = await supabase
        .from('saved_sections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved sections:', error);
      }

      const sections: SavedSectionRow[] = savedSections || [];

      // Find default sections for each type
      const introSection = sections.find((s) => s.type === 'introduction');
      const closerSection = sections.find((s) => s.type === 'closer');
      const signatureSection = sections.find((s) => s.type === 'signature');

      // Generate sections
      const coverLetterSections: CoverLetterSection[] = [];

      // 1. Introduction
      coverLetterSections.push({
        id: 'intro',
        type: 'intro',
        content: introSection
          ? this.personalizeSection(introSection.content, jd)
          : this.generateDefaultIntro(jd),
        usedBlurbs: introSection ? [introSection.id] : [],
        isModified: false,
      });

      // 2. Experience (generated from work history)
      const experienceContent = await this.generateExperienceSection(userId, jd);
      coverLetterSections.push({
        id: 'experience',
        type: 'experience',
        content: experienceContent.content,
        usedBlurbs: experienceContent.usedBlurbs,
        isModified: false,
      });

      // 3. Closing
      coverLetterSections.push({
        id: 'closing',
        type: 'closing',
        content: closerSection
          ? this.personalizeSection(closerSection.content, jd)
          : this.generateDefaultClosing(jd),
        usedBlurbs: closerSection ? [closerSection.id] : [],
        isModified: false,
      });

      // 4. Signature
      coverLetterSections.push({
        id: 'signature',
        type: 'signature',
        content: signatureSection
          ? signatureSection.content
          : this.generateDefaultSignature(),
        usedBlurbs: signatureSection ? [signatureSection.id] : [],
        isModified: false,
      });

      return coverLetterSections;
    } catch (error) {
      console.error('Error generating sections:', error);
      throw error;
    }
  }

  /**
   * Generate experience section from user's work history
   */
  private async generateExperienceSection(
    userId: string,
    jd: JobDescriptionRow
  ): Promise<{ content: string; usedBlurbs: string[] }> {
    try {
      // Fetch user's approved content (stories)
      const { data: approvedContent, error } = await supabase
        .from('approved_content')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3); // Get top 3 most recent stories

      if (error) {
        console.error('Error fetching approved content:', error);
        return {
          content: this.generateDefaultExperience(jd),
          usedBlurbs: [],
        };
      }

      if (!approvedContent || approvedContent.length === 0) {
        return {
          content: this.generateDefaultExperience(jd),
          usedBlurbs: [],
        };
      }

      // Use the first (most recent) story as the primary experience paragraph
      const primaryStory = approvedContent[0];
      const content = `In my previous role as ${primaryStory.title || 'a professional'}, ${primaryStory.content}`;

      return {
        content,
        usedBlurbs: [primaryStory.id],
      };
    } catch (error) {
      console.error('Error generating experience section:', error);
      return {
        content: this.generateDefaultExperience(jd),
        usedBlurbs: [],
      };
    }
  }

  /**
   * Personalize saved section content with job details
   */
  private personalizeSection(content: string, jd: JobDescriptionRow): string {
    let personalized = content;

    // Replace placeholders with actual job details
    personalized = personalized.replace(/\[Position\]/g, jd.role || '[Position]');
    personalized = personalized.replace(/\[Company\]/g, jd.company || '[Company]');
    personalized = personalized.replace(/\[Role\]/g, jd.role || '[Role]');

    return personalized;
  }

  /**
   * Generate default introduction if no saved section exists
   */
  private generateDefaultIntro(jd: JobDescriptionRow): string {
    return `I am writing to express my strong interest in the ${jd.role || 'position'} at ${jd.company || 'your company'}. With my background in product management and a passion for creating innovative solutions, I am excited about the opportunity to contribute to your team's success.`;
  }

  /**
   * Generate default experience section if no work history exists
   */
  private generateDefaultExperience(jd: JobDescriptionRow): string {
    return `In my previous roles, I have successfully led product initiatives and collaborated with cross-functional teams to deliver impactful solutions. My experience aligns well with the requirements outlined in the ${jd.role || 'position'} description.`;
  }

  /**
   * Generate default closing if no saved section exists
   */
  private generateDefaultClosing(jd: JobDescriptionRow): string {
    return `What particularly excites me about ${jd.company || 'your company'} is your commitment to innovation and customer success. I am eager to bring my skills and experience to your team and contribute to your continued growth.`;
  }

  /**
   * Generate default signature
   */
  private generateDefaultSignature(): string {
    return `I look forward to discussing how my background aligns with your needs and how I can contribute to your team's success.

Best regards,
[Your Name]
[Your Phone]
[Your Email]
[Your LinkedIn]`;
  }

  /**
   * Detect gaps in generated sections
   */
  async detectSectionGaps(
    userId: string,
    sections: CoverLetterSection[]
  ): Promise<Gap[]> {
    const gaps: Gap[] = [];

    try {
      for (const section of sections) {
        // Run basic content analysis to detect gaps
        const sectionGaps = this.analyzeSection(section);
        gaps.push(...sectionGaps);
      }

      return gaps;
    } catch (error) {
      console.error('Error detecting section gaps:', error);
      return [];
    }
  }

  /**
   * Analyze a section for gaps (basic heuristics)
   */
  private analyzeSection(section: CoverLetterSection): Gap[] {
    const gaps: Gap[] = [];

    // Check for quantifiable metrics
    const hasMetrics = /\d+%|\$[\d,]+|[\d,]+\s*(users|customers|dollars|hours|days|months|years)/i.test(
      section.content
    );

    if (!hasMetrics && section.type !== 'signature') {
      gaps.push({
        id: `${section.id}-metrics-gap`,
        type: 'best-practice',
        severity: 'medium',
        description: 'Quantifiable achievements not prominently featured',
        suggestion: 'Include specific metrics and KPIs from past projects',
        paragraphId: section.id,
        origin: 'ai',
        addresses: [],
      });
    }

    // Check content length (too short)
    if (section.content.length < 50 && section.type !== 'signature') {
      gaps.push({
        id: `${section.id}-length-gap`,
        type: 'content-enhancement',
        severity: 'low',
        description: 'Content is too brief',
        suggestion: 'Expand with more specific details and examples',
        paragraphId: section.id,
        origin: 'ai',
        addresses: [],
      });
    }

    // Check for generic content (placeholder text)
    if (section.content.includes('[Position]') || section.content.includes('[Company]')) {
      gaps.push({
        id: `${section.id}-placeholder-gap`,
        type: 'content-enhancement',
        severity: 'high',
        description: 'Content contains placeholder text',
        suggestion: 'Replace placeholders with actual job details',
        paragraphId: section.id,
        origin: 'ai',
        addresses: [],
      });
    }

    return gaps;
  }

  /**
   * Calculate HIL progress metrics
   */
  async calculateMetrics(
    sections: CoverLetterSection[],
    gaps: Gap[],
    jd: JobDescriptionRow
  ): Promise<HILProgressMetrics> {
    try {
      // Count high-severity gaps
      const highSeverityGaps = gaps.filter((g) => g.severity === 'high').length;
      const mediumSeverityGaps = gaps.filter((g) => g.severity === 'medium').length;

      // Calculate ratings based on gaps
      let coverLetterRating: 'strong' | 'average' | 'weak' = 'strong';
      if (highSeverityGaps > 0) {
        coverLetterRating = 'weak';
      } else if (mediumSeverityGaps > 2) {
        coverLetterRating = 'average';
      }

      // Calculate ATS score (simplified)
      const atsScore = Math.max(50, 100 - (highSeverityGaps * 15 + mediumSeverityGaps * 5));

      // Analyze requirements match
      const requirements = jd.extracted_requirements || [];
      const totalRequirements = requirements.length;
      const coreRequirements = Math.ceil(totalRequirements * 0.6); // 60% are core
      const preferredRequirements = totalRequirements - coreRequirements;

      // Simple keyword matching against content
      const allContent = sections.map((s) => s.content.toLowerCase()).join(' ');
      const metRequirements = requirements.filter((req) =>
        allContent.includes(req.toLowerCase())
      ).length;

      const coreRequirementsMet = Math.min(coreRequirements, Math.floor(metRequirements * 0.6));
      const preferredRequirementsMet = Math.min(
        preferredRequirements,
        metRequirements - coreRequirementsMet
      );

      return {
        goalsMatch: 'average', // TODO: Implement actual goals matching
        experienceMatch: coreRequirementsMet >= coreRequirements / 2 ? 'strong' : 'average',
        coverLetterRating,
        atsScore,
        coreRequirementsMet: { met: coreRequirementsMet, total: coreRequirements },
        preferredRequirementsMet: {
          met: preferredRequirementsMet,
          total: preferredRequirements,
        },
      };
    } catch (error) {
      console.error('Error calculating metrics:', error);

      // Return safe defaults
      return {
        goalsMatch: 'average',
        experienceMatch: 'average',
        coverLetterRating: 'average',
        atsScore: 65,
        coreRequirementsMet: { met: 2, total: 4 },
        preferredRequirementsMet: { met: 1, total: 4 },
      };
    }
  }

  /**
   * Calculate HIL progress metrics from detailed analysis results
   * Uses real analysis data instead of heuristics
   */
  private calculateMetricsFromAnalysis(analysis: DetailedMatchAnalysis): HILProgressMetrics {
    // Goals match
    const goalsMatch = analysis.goalsMatch.overallMatch;

    // Experience match - combine core + preferred for overall rating
    const totalHighConfidence = analysis.coreExperienceMatch.highConfidenceCount + analysis.preferredExperienceMatch.highConfidenceCount;
    const totalRequirements = analysis.coreExperienceMatch.totalCount + analysis.preferredExperienceMatch.totalCount;
    const experienceMatchPercentage = totalRequirements > 0 ? (totalHighConfidence / totalRequirements) * 100 : 0;

    let experienceMatch: 'strong' | 'average' | 'weak';
    if (experienceMatchPercentage >= 70) {
      experienceMatch = 'strong';
    } else if (experienceMatchPercentage >= 40) {
      experienceMatch = 'average';
    } else {
      experienceMatch = 'weak';
    }

    // Cover letter rating
    const coverLetterRating = analysis.coverLetterRating.overallRating;

    // ATS score
    const atsScore = analysis.atsAnalysis.overall_score;

    // Core requirements - from requirementsMatch (what's in the DRAFT)
    const coreMetCount = analysis.requirementsMatch.coreMetCount;
    const coreTotalCount = analysis.requirementsMatch.coreTotalCount;

    // Preferred requirements - from requirementsMatch (what's in the DRAFT)
    const preferredMetCount = analysis.requirementsMatch.preferredMetCount;
    const preferredTotalCount = analysis.requirementsMatch.preferredTotalCount;

    return {
      goalsMatch,
      experienceMatch,
      coverLetterRating,
      atsScore,
      coreRequirementsMet: {
        met: coreMetCount,
        total: coreTotalCount
      },
      preferredRequirementsMet: {
        met: preferredMetCount,
        total: preferredTotalCount
      },
    };
  }

  /**
   * Get or create a default template for the user
   * Uses CoverLetterTemplateService to properly manage templates
   */
  private async ensureDefaultTemplate(userId: string): Promise<string> {
    console.log('[ensureDefaultTemplate] Called with userId:', userId);

    try {
      // Try to find any existing template for this user
      console.log('[ensureDefaultTemplate] Searching for existing templates...');
      const existingTemplates = await CoverLetterTemplateService.getUserTemplates(userId);

      console.log('[ensureDefaultTemplate] Found', existingTemplates.length, 'existing templates');

      if (existingTemplates.length > 0) {
        const templateId = existingTemplates[0].id;
        console.log('[ensureDefaultTemplate] Using existing template:', templateId);
        return templateId!;
      }

      // Create a minimal default template using the proper service
      console.log('[ensureDefaultTemplate] Creating new minimal template for user:', userId);

      const defaultSections: TemplateSection[] = [
        {
          id: 'intro-default',
          type: 'intro',
          isStatic: false,
          order: 1
        },
        {
          id: 'paragraph-default',
          type: 'paragraph',
          isStatic: false,
          blurbCriteria: {
            goals: ['showcase relevant experience']
          },
          order: 2
        },
        {
          id: 'closer-default',
          type: 'closer',
          isStatic: false,
          order: 3
        }
      ];

      const newTemplate = await CoverLetterTemplateService.createDefaultTemplate(
        userId,
        'Default Template',
        defaultSections,
        [] // No saved sections yet
      );

      console.log('[ensureDefaultTemplate] Successfully created template:', newTemplate.id);
      return newTemplate.id!;
    } catch (error) {
      console.error('[ensureDefaultTemplate] Error:', error);
      throw error;
    }
  }

  /**
   * Save draft to database
   */
  async saveDraft(
    userId: string,
    jobDescriptionId: string,
    sections: CoverLetterSection[],
    gaps: Gap[],
    metrics: HILProgressMetrics
  ): Promise<string> {
    console.log('[saveDraft] Called with userId:', userId, 'jobDescriptionId:', jobDescriptionId);

    try {
      // Ensure we have a valid template_id
      console.log('[saveDraft] Getting template_id...');
      const templateId = await this.ensureDefaultTemplate(userId);
      console.log('[saveDraft] Got template_id:', templateId);

      // Prepare insert data
      const insertData: CoverLetterInsert = {
        user_id: userId,
        job_description_id: jobDescriptionId,
        template_id: templateId,
        sections: sections as any, // Store as JSON
        llm_feedback: {
          metrics,
          gaps,
        } as any,
        status: 'draft',
      };

      console.log('[saveDraft] Inserting cover letter with template_id:', templateId);
      const { data, error } = await supabase
        .from('cover_letters')
        .insert(insertData)
        .select()
        .single();

      console.log('[saveDraft] Insert result:', { data: data?.id, error });

      if (error) {
        console.error('[saveDraft] Insert failed:', error);
        throw new Error(`Failed to save draft: ${error.message}`);
      }

      if (!data) {
        console.error('[saveDraft] No data returned from insert');
        throw new Error('Failed to save draft: no data returned');
      }

      console.log('[saveDraft] Successfully saved draft:', data.id);
      return data.id;
    } catch (error) {
      console.error('[saveDraft] Error:', error);
      throw error;
    }
  }

  /**
   * Update existing draft with new sections
   */
  async updateDraft(
    draftId: string,
    sections: CoverLetterSection[],
    gaps?: Gap[],
    metrics?: HILProgressMetrics
  ): Promise<void> {
    try {
      const updateData: any = {
        sections: sections as any,
        updated_at: new Date().toISOString(),
      };

      if (gaps && metrics) {
        updateData.llm_feedback = {
          metrics,
          gaps,
        };
      }

      const { error } = await supabase
        .from('cover_letters')
        .update(updateData)
        .eq('id', draftId);

      if (error) {
        throw new Error(`Failed to update draft: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating draft:', error);
      throw error;
    }
  }

  /**
   * Fetch draft by ID
   */
  async getDraft(draftId: string): Promise<CoverLetterDraft | null> {
    try {
      const { data, error } = await supabase
        .from('cover_letters')
        .select('*, job_descriptions(*)')
        .eq('id', draftId)
        .single();

      if (error || !data) {
        return null;
      }

      const sections = (data.sections as any) || [];
      const llmFeedback = (data.llm_feedback as any) || {};

      return {
        draftId: data.id,
        sections,
        gaps: llmFeedback.gaps || [],
        metrics: llmFeedback.metrics || {
          goalsMatch: 'average',
          experienceMatch: 'average',
          coverLetterRating: 'average',
          atsScore: 65,
          coreRequirementsMet: { met: 2, total: 4 },
          preferredRequirementsMet: { met: 1, total: 4 },
        },
      };
    } catch (error) {
      console.error('Error fetching draft:', error);
      return null;
    }
  }
}

import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/supabase";
import { classifyRoleToBucket } from "@/lib/roleBuckets";
import { CoverLetterTemplateService } from "@/services/coverLetterTemplateService";

// Helper function to get Supabase configuration
const getSupabaseConfig = () => ({
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY
});

type WorkItem = Database['public']['Tables']['work_items']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];
type Story = Database['public']['Tables']['stories']['Row'];
type CoverLetter = Database['public']['Tables']['cover_letters']['Row'];

export interface DashboardStats {
  stories: number;
  savedSections: number;
  coverLetters: number;
  interviews: number;
  skillsCoverage: number;
  lastMonthStories: number;
  lastMonthSavedSections: number;
  lastMonthCoverLetters: number;
  lastMonthInterviews: number;
  skillsImprovement: number;
}

export interface TopRole {
  title: string;
  bucketKey: string;
  count: number;
  percentage: number;
  lastApplied: string;
}

export interface ContentHealth {
  stories: {
    count: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  savedSections: {
    count: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  coverLetters: {
    count: number;
    status: 'healthy' | 'warning' | 'critical';
  };
}

export interface StoryStrength {
  overall: number;
  competencies: Array<{
    name: string;
    strength: number;
    evidence: string[];
  }>;
}

export interface ResumeGap {
  competency: string;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  suggestions: string[];
}

export interface CompetencyCoverage {
  competency: string;
  coverage: number;
  strength: number;
  evidence: string[];
}

export interface DashboardData {
  stats: DashboardStats;
  outcomes: OutcomeSnapshot;
  topRoles: TopRole[];
  contentHealth: ContentHealth;
  storyStrength: StoryStrength;
  resumeGaps: ResumeGap[];
  coverageMap: {
    competencies: CompetencyCoverage[];
    overallCoverage: number;
    priorityGaps: string[];
  };
}

export interface OutcomeSnapshot {
  applied: number;
  interview: number;
  noResponse: number;
  notSelected: number;
  interviewRate: number;
}

export class DashboardService {
  private session: any = null;

  constructor(session?: any) {
    this.session = session;
  }

  private async getAccessTokenOptional(): Promise<string | null> {
    console.log('DashboardService: Getting access token...');
    
    // Use session from constructor if available, otherwise try to get from auth context
    if (!this.session) {
      console.log('DashboardService: No session provided, trying to get from auth context...');
      // This is a fallback - ideally we should pass session from the hook
      const { data: { session } } = await supabase.auth.getSession();
      this.session = session;
    }
    
    const token = this.session?.access_token ?? null;
    console.log('DashboardService: Session result:', token ? 'token found' : 'no token');
    return token;
  }

  private async directFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
    const accessToken = await this.getAccessTokenOptional();
    
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      ...options,
      headers: {
        ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Database query failed: ${errorText}`);
    }

    return response.json();
  }

  private async countTable(
    table: 'work_items' | 'cover_letters' | 'stories' | 'saved_sections',
    userId: string,
    filters?: (query: any) => any
  ): Promise<number> {
    let query = supabase.from(table).select('id', { count: 'exact', head: true }).eq('user_id', userId);
    if (filters) query = filters(query);
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  }

  /**
   * Get dashboard statistics using direct fetch
   */
  async getStats(userId: string): Promise<DashboardStats> {
    try {
      console.log('DashboardService: getStats called for user:', userId);
      const storiesCount = await this.countTable('work_items', userId);
      const savedSectionsCount = await this.countTable('saved_sections', userId);
      const coverLettersCount = await this.countTable('cover_letters', userId);
      const interviewsCount = await this.countTable('cover_letters', userId, (q) =>
        q.eq('outcome_status', 'interview')
      );
      const approvedContentCount = await this.countTable('stories', userId, (q) => q.eq('status', 'approved'));

      // Calculate skills coverage
      const skillsCoverage = Math.min(100, Math.round((approvedContentCount || 0) * 8.33));

      // Get last month data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const lastMonthStories = await this.countTable('work_items', userId, (q) => q.gte('created_at', thirtyDaysAgo.toISOString()));
      const lastMonthSavedSections = await this.countTable('saved_sections', userId, (q) => q.gte('created_at', thirtyDaysAgo.toISOString()));
      const lastMonthCoverLetters = await this.countTable('cover_letters', userId, (q) => q.gte('created_at', thirtyDaysAgo.toISOString()));
      const lastMonthInterviews = await this.countTable('cover_letters', userId, (q) =>
        q.eq('outcome_status', 'interview').gte('outcome_updated_at', thirtyDaysAgo.toISOString())
      );

      return {
        stories: storiesCount,
        savedSections: savedSectionsCount,
        coverLetters: coverLettersCount,
        interviews: interviewsCount,
        skillsCoverage,
        lastMonthStories: lastMonthStories,
        lastMonthSavedSections,
        lastMonthCoverLetters: lastMonthCoverLetters,
        lastMonthInterviews: lastMonthInterviews,
        skillsImprovement: Math.round(Math.random() * 20) + 5 // Mock improvement for now
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        stories: 0,
        savedSections: 0,
        coverLetters: 0,
        interviews: 0,
        skillsCoverage: 0,
        lastMonthStories: 0,
        lastMonthSavedSections: 0,
        lastMonthCoverLetters: 0,
        lastMonthInterviews: 0,
        skillsImprovement: 0
      };
    }
  }

  async getOutcomeSnapshot(userId: string): Promise<OutcomeSnapshot> {
    try {
      await CoverLetterTemplateService.autoApplyNoResponse({ userId, days: 30 });

      const applied = await this.countTable('cover_letters', userId, (q) =>
        q.eq('status', 'finalized')
      );
      const interview = await this.countTable('cover_letters', userId, (q) =>
        q.eq('outcome_status', 'interview')
      );
      const noResponse = await this.countTable('cover_letters', userId, (q) =>
        q.eq('outcome_status', 'no_response')
      );
      const notSelected = await this.countTable('cover_letters', userId, (q) =>
        q.eq('outcome_status', 'not_selected')
      );
      const interviewRate = applied > 0 ? Math.round((interview / applied) * 100) : 0;

      return {
        applied,
        interview,
        noResponse,
        notSelected,
        interviewRate,
      };
    } catch (error) {
      console.error('Error fetching outcome snapshot:', error);
      return {
        applied: 0,
        interview: 0,
        noResponse: 0,
        notSelected: 0,
        interviewRate: 0,
      };
    }
  }

  /**
   * Get top roles targeted (roles applied for) using job_descriptions
   */
  async getTopRoles(userId: string): Promise<TopRole[]> {
    try {
      const { data, error } = await supabase
        .from('job_descriptions')
        .select('role, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];

      const roleCounts: Record<string, { title: string; count: number; lastApplied: string }> = {};

      rows.forEach((row: any) => {
        const roleRaw = typeof row?.role === 'string' ? row.role : '';
        const role = roleRaw.trim() ? roleRaw.trim() : 'Unknown Role';
        const bucket = classifyRoleToBucket(role);
        const createdAt = row?.created_at || new Date().toISOString();
        if (!roleCounts[bucket.key]) {
          roleCounts[bucket.key] = { title: bucket.label, count: 0, lastApplied: createdAt };
        }
        roleCounts[bucket.key].count += 1;
        if (new Date(createdAt) > new Date(roleCounts[bucket.key].lastApplied)) {
          roleCounts[bucket.key].lastApplied = createdAt;
        }
      });

      const total = Object.values(roleCounts).reduce((sum, role) => sum + role.count, 0);
      
      const topRoles: TopRole[] = Object.entries(roleCounts)
        .map(([bucketKey, data]) => ({
          title: data.title,
          bucketKey,
          count: data.count,
          percentage: Math.round((data.count / total) * 100),
          lastApplied: new Date(data.lastApplied).toISOString().split('T')[0]
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return topRoles;
    } catch (error) {
      console.error('Error fetching top roles:', error);
      return [];
    }
  }

  /**
   * Get content health status using direct fetch
   */
  async getContentHealth(userId: string): Promise<ContentHealth> {
    try {
      const storiesCount = await this.countTable('work_items', userId);
      const savedSectionsCount = await this.countTable('stories', userId, (q) => q.eq('status', 'approved'));
      const coverLettersCount = await this.countTable('cover_letters', userId);

      const getStatus = (count: number) => {
        if (count >= 10) return 'healthy';
        if (count >= 5) return 'warning';
        return 'critical';
      };

      return {
        stories: {
          count: storiesCount,
          status: getStatus(storiesCount)
        },
        savedSections: {
          count: savedSectionsCount,
          status: getStatus(savedSectionsCount)
        },
        coverLetters: {
          count: coverLettersCount,
          status: getStatus(coverLettersCount)
        }
      };
    } catch (error) {
      console.error('Error fetching content health:', error);
      return {
        stories: { count: 0, status: 'critical' },
        savedSections: { count: 0, status: 'critical' },
        coverLetters: { count: 0, status: 'critical' }
      };
    }
  }

  /**
   * Get story strength analysis (simplified for now)
   */
  async getStoryStrength(userId: string): Promise<StoryStrength> {
    // TODO: Implement with direct fetch when needed
    return {
      overall: 75,
      competencies: [
        { name: 'Leadership', strength: 80, evidence: ['Led team of 5 engineers', 'Managed product roadmap'] },
        { name: 'Technical Skills', strength: 70, evidence: ['Built scalable systems', 'Implemented CI/CD'] },
        { name: 'Product Management', strength: 85, evidence: ['Launched 3 products', 'Increased user engagement'] }
      ]
    };
  }

  /**
   * Get resume gaps analysis
   */
  async getResumeGaps(userId: string): Promise<ResumeGap[]> {
    // Mock data for now - this would typically come from AI analysis
    return [
      {
        competency: 'Product Strategy',
        gap: 25,
        priority: 'high',
        suggestions: ['Add strategic planning examples', 'Include market analysis stories']
      },
      {
        competency: 'Data Analysis',
        gap: 15,
        priority: 'medium',
        suggestions: ['Include metrics-driven decisions', 'Add A/B testing examples']
      },
      {
        competency: 'Stakeholder Management',
        gap: 10,
        priority: 'low',
        suggestions: ['Add cross-functional collaboration stories']
      }
    ];
  }

  /**
   * Get competency coverage map
   */
  async getCoverageMap(userId: string): Promise<{
    competencies: CompetencyCoverage[];
    overallCoverage: number;
    priorityGaps: string[];
  }> {
    try {
      const storyStrength = await this.getStoryStrength(userId);
      const resumeGaps = await this.getResumeGaps(userId);

      const competencies: CompetencyCoverage[] = [
        'product-strategy',
        'user-research',
        'data-analysis',
        'stakeholder-management',
        'team-leadership',
        'technical-understanding',
        'business-acumen',
        'execution',
        'communication',
        'prioritization'
      ].map(competency => {
        const strength = storyStrength.competencies.find(c => c.name === competency);
        const gap = resumeGaps.find(g => g.competency === competency);
        
        return {
          competency,
          coverage: strength ? strength.strength : 0,
          strength: strength ? strength.strength : 0,
          evidence: strength ? strength.evidence : []
        };
      });

      const overallCoverage = competencies.length > 0
        ? Math.round(competencies.reduce((sum, c) => sum + c.coverage, 0) / competencies.length)
        : 0;

      const priorityGaps = resumeGaps
        .filter(gap => gap.priority === 'high')
        .map(gap => gap.competency);

      return {
        competencies,
        overallCoverage,
        priorityGaps
      };
    } catch (error) {
      console.error('Error fetching coverage map:', error);
      return {
        competencies: [],
        overallCoverage: 0,
        priorityGaps: []
      };
    }
  }

  /**
   * Get complete dashboard data
   */
  async getDashboardData(userId: string): Promise<DashboardData> {
    try {
      const [stats, outcomes, topRoles, contentHealth, storyStrength, resumeGaps, coverageMap] = await Promise.all([
        this.getStats(userId),
        this.getOutcomeSnapshot(userId),
        this.getTopRoles(userId),
        this.getContentHealth(userId),
        this.getStoryStrength(userId),
        this.getResumeGaps(userId),
        this.getCoverageMap(userId)
      ]);

      return {
        stats,
        outcomes,
        topRoles,
        contentHealth,
        storyStrength,
        resumeGaps,
        coverageMap
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }
}

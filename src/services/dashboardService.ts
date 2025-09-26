import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/supabase";

// Helper function to get Supabase configuration
const getSupabaseConfig = () => ({
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY
});

type WorkItem = Database['public']['Tables']['work_items']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];
type ApprovedContent = Database['public']['Tables']['approved_content']['Row'];
type CoverLetter = Database['public']['Tables']['cover_letters']['Row'];

export interface DashboardStats {
  stories: number;
  coverLetters: number;
  skillsCoverage: number;
  lastMonthStories: number;
  lastMonthCoverLetters: number;
  skillsImprovement: number;
}

export interface TopRole {
  title: string;
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

export class DashboardService {
  private session: any = null;

  constructor(session?: any) {
    this.session = session;
  }

  private async getAccessToken(): Promise<string> {
    console.log('DashboardService: Getting access token...');
    
    // Use session from constructor if available, otherwise try to get from auth context
    if (!this.session) {
      console.log('DashboardService: No session provided, trying to get from auth context...');
      // This is a fallback - ideally we should pass session from the hook
      const { data: { session } } = await supabase.auth.getSession();
      this.session = session;
    }
    
    console.log('DashboardService: Session result:', this.session ? 'session found' : 'no session');
    if (!this.session?.access_token) {
      throw new Error('No access token available');
    }
    console.log('DashboardService: Access token available, length:', this.session.access_token.length);
    return this.session.access_token;
  }

  private async directFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
    const accessToken = await this.getAccessToken();
    
    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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

  /**
   * Get dashboard statistics using direct fetch
   */
  async getStats(userId: string): Promise<DashboardStats> {
    try {
      console.log('DashboardService: getStats called for user:', userId);
      const accessToken = await this.getAccessToken();
      const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
      console.log('DashboardService: Starting work items count query...');

      // Get work items count
      const workItemsResponse = await fetch(`${supabaseUrl}/rest/v1/work_items?user_id=eq.${userId}&select=count`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Prefer': 'count=exact'
        }
      });
      const storiesCount = parseInt(workItemsResponse.headers.get('content-range')?.split('/')[1] || '0');

      // Get cover letters count
      const coverLettersResponse = await fetch(`${supabaseUrl}/rest/v1/cover_letters?user_id=eq.${userId}&select=count`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Prefer': 'count=exact'
        }
      });
      const coverLettersCount = parseInt(coverLettersResponse.headers.get('content-range')?.split('/')[1] || '0');

      // Get approved content count
      const approvedContentResponse = await fetch(`${supabaseUrl}/rest/v1/approved_content?user_id=eq.${userId}&status=eq.approved&select=count`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Prefer': 'count=exact'
        }
      });
      const approvedContentCount = parseInt(approvedContentResponse.headers.get('content-range')?.split('/')[1] || '0');

      // Calculate skills coverage
      const skillsCoverage = Math.min(100, Math.round((approvedContentCount || 0) * 8.33));

      // Get last month data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const lastMonthStoriesResponse = await fetch(`${supabaseUrl}/rest/v1/work_items?user_id=eq.${userId}&created_at=gte.${thirtyDaysAgo.toISOString()}&select=count`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Prefer': 'count=exact'
        }
      });
      const lastMonthStories = parseInt(lastMonthStoriesResponse.headers.get('content-range')?.split('/')[1] || '0');

      const lastMonthCoverLettersResponse = await fetch(`${supabaseUrl}/rest/v1/cover_letters?user_id=eq.${userId}&created_at=gte.${thirtyDaysAgo.toISOString()}&select=count`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Prefer': 'count=exact'
        }
      });
      const lastMonthCoverLetters = parseInt(lastMonthCoverLettersResponse.headers.get('content-range')?.split('/')[1] || '0');

      return {
        stories: storiesCount,
        coverLetters: coverLettersCount,
        skillsCoverage,
        lastMonthStories: lastMonthStories,
        lastMonthCoverLetters: lastMonthCoverLetters,
        skillsImprovement: Math.round(Math.random() * 20) + 5 // Mock improvement for now
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        stories: 0,
        coverLetters: 0,
        skillsCoverage: 0,
        lastMonthStories: 0,
        lastMonthCoverLetters: 0,
        skillsImprovement: 0
      };
    }
  }

  /**
   * Get top roles targeted using direct fetch
   */
  async getTopRoles(userId: string): Promise<TopRole[]> {
    try {
      const accessToken = await this.getAccessToken();
      const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();

      // Get work items with role information
      const workItemsResponse = await fetch(`${supabaseUrl}/rest/v1/work_items?user_id=eq.${userId}&select=*`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      });

      if (!workItemsResponse.ok) {
        throw new Error('Failed to fetch work items');
      }

      const workItems = await workItemsResponse.json();
      
      // Count roles and calculate percentages
      const roleCounts: Record<string, { count: number; lastApplied: string }> = {};
      
      workItems.forEach((item: any) => {
        const role = item.role_title || 'Unknown Role';
        if (!roleCounts[role]) {
          roleCounts[role] = { count: 0, lastApplied: item.created_at };
        }
        roleCounts[role].count++;
        if (new Date(item.created_at) > new Date(roleCounts[role].lastApplied)) {
          roleCounts[role].lastApplied = item.created_at;
        }
      });

      const total = Object.values(roleCounts).reduce((sum, role) => sum + role.count, 0);
      
      const topRoles: TopRole[] = Object.entries(roleCounts)
        .map(([title, data]) => ({
          title,
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
      const accessToken = await this.getAccessToken();
      const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();

      // Get stories count
      const storiesResponse = await fetch(`${supabaseUrl}/rest/v1/work_items?user_id=eq.${userId}&select=count`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Prefer': 'count=exact'
        }
      });
      const storiesCount = parseInt(storiesResponse.headers.get('content-range')?.split('/')[1] || '0');

      // Get approved content count (saved sections)
      const savedSectionsResponse = await fetch(`${supabaseUrl}/rest/v1/approved_content?user_id=eq.${userId}&status=eq.approved&select=count`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Prefer': 'count=exact'
        }
      });
      const savedSectionsCount = parseInt(savedSectionsResponse.headers.get('content-range')?.split('/')[1] || '0');

      // Get cover letters count
      const coverLettersResponse = await fetch(`${supabaseUrl}/rest/v1/cover_letters?user_id=eq.${userId}&select=count`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Prefer': 'count=exact'
        }
      });
      const coverLettersCount = parseInt(coverLettersResponse.headers.get('content-range')?.split('/')[1] || '0');

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
      const [stats, topRoles, contentHealth, storyStrength, resumeGaps, coverageMap] = await Promise.all([
        this.getStats(userId),
        this.getTopRoles(userId),
        this.getContentHealth(userId),
        this.getStoryStrength(userId),
        this.getResumeGaps(userId),
        this.getCoverageMap(userId)
      ]);

      return {
        stats,
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

/**
 * Goals Match Service
 *
 * Analyzes how well a job matches user's career goals
 * Compares job details against UserGoals preferences
 */

import type { UserGoals } from '@/types/userGoals';

export interface GoalMatch {
  id: string;
  goalType: string; // e.g., "Target Title", "Minimum Salary"
  userValue?: string | null; // What user specified in their goals
  jobValue?: string | null; // What was found in job description
  met: boolean;
  evidence: string;
  requiresManualVerification?: boolean; // For fields like industry, business model
  emptyState?: 'no-goals' | 'goal-not-set' | null; // For elegant empty state handling
  matchState?: 'match' | 'no-match' | 'unknown'; // Explicit match state: match (green), no-match (red), unknown (gray)

  // Legacy fields for backward compatibility
  criterion?: string; // Deprecated: use goalType instead
}

export interface GoalsMatchResult {
  matches: GoalMatch[];
  overallMatch: 'strong' | 'average' | 'weak';
  metCount: number;
  totalCount: number;
}

interface GoNoGoMismatch {
  type: 'geography' | 'pay' | 'core-requirements' | 'work-history';
  severity: 'high' | 'medium' | 'low';
  description: string;
  userOverride?: boolean;
}

interface GoNoGoAnalysis {
  decision: 'go' | 'no-go';
  confidence: number;
  mismatches: GoNoGoMismatch[];
}

interface JobDescription {
  role?: string;
  company?: string;
  location?: string;
  salary?: string;
  workType?: string;
}

export class GoalsMatchService {
  /**
   * Analyze how well a job matches user's goals
   * Uses Go/No-Go analysis results + job description data
   */
  analyzeGoalsMatch(
    userGoals: UserGoals | null,
    jobDescription: JobDescription,
    goNoGoAnalysis?: GoNoGoAnalysis
  ): GoalsMatchResult {
    const matches: GoalMatch[] = [];

    // Don't return early if userGoals is null - still show all goal categories as "not-set"

    // 1. Target Title Match
    if (userGoals?.targetTitles && userGoals.targetTitles.length > 0) {
      if (jobDescription.role) {
        const titleMatch = this.checkTitleMatch(userGoals.targetTitles, jobDescription.role);
        matches.push({
          id: 'goal-title',
          goalType: 'Target Title',
          userValue: userGoals.targetTitles.join(', '),
          jobValue: jobDescription.role,
          met: titleMatch.met,
          evidence: titleMatch.evidence,
          criterion: `Target Title: ${userGoals.targetTitles.join(', ')}`, // Legacy
        });
      } else {
        // Job doesn't specify title
        matches.push({
          id: 'goal-title',
          goalType: 'Target Title',
          userValue: userGoals.targetTitles.join(', '),
          jobValue: null,
          met: false,
          evidence: 'Job title not specified in description',
          criterion: `Target Title: ${userGoals.targetTitles.join(', ')}`, // Legacy
        });
      }
    } else {
      // User hasn't set target titles - show as unknown
      matches.push({
        id: 'goal-title',
        goalType: 'Target Title',
        userValue: null,
        jobValue: jobDescription.role || null,
        met: false,
        matchState: 'unknown',
        evidence: 'Target title not specified in your career goals',
        criterion: 'Target Title', // Legacy
      });
    }

    // 2. Salary Match
    if (userGoals?.minimumSalary || userGoals?.dealBreakers?.salaryMinimum) {
      const minSalary = userGoals?.dealBreakers?.salaryMinimum || userGoals.minimumSalary;
      const salaryMismatch = goNoGoAnalysis?.mismatches.find(m => m.type === 'pay');
      
      // Determine match state: match, no-match, or unknown
      const hasJobData = jobDescription.salary && jobDescription.salary.toLowerCase() !== 'unknown';
      const matchState = !hasJobData ? 'unknown' : salaryMismatch ? 'no-match' : 'match';
      const isMatch = matchState === 'match';

      matches.push({
        id: 'goal-salary',
        goalType: 'Minimum Salary',
        userValue: minSalary ? `$${minSalary.toLocaleString()}` : null,
        jobValue: jobDescription.salary || null,
        met: isMatch,
        matchState,
        evidence: salaryMismatch?.description || (hasJobData ? 'Salary meets your requirements' : 'Salary information not specified in JD'),
        criterion: `Minimum Salary: $${minSalary?.toLocaleString() || 'Not specified'}`, // Legacy
      });
    } else {
      // User hasn't set salary preference - show as unknown
      matches.push({
        id: 'goal-salary',
        goalType: 'Minimum Salary',
        userValue: null,
        jobValue: jobDescription.salary || null,
        met: false,
        matchState: 'unknown',
        evidence: 'Minimum salary not specified in your career goals',
        criterion: 'Minimum Salary', // Legacy
      });
    }

    // 3. Work Type Match (Remote/Hybrid/In-person), separate from Geography/Location
    if (userGoals?.workType && userGoals.workType.length > 0) {
      const isDealBreaker = (userGoals?.dealBreakers?.workType?.length ?? 0) > 0;
      const jdWorkType = jobDescription.workType || '';
      const hasJobData = jdWorkType && jdWorkType.toLowerCase() !== 'unknown';
      const normalizedJd = jdWorkType.toLowerCase();
      const isMatch =
        hasJobData &&
        userGoals.workType.some(w => normalizedJd.includes((w || '').toLowerCase()));
      const matchState: 'match' | 'no-match' | 'unknown' = !hasJobData ? 'unknown' : (isMatch ? 'match' : 'no-match');

      matches.push({
        id: 'goal-worktype',
        goalType: 'Work Type',
        userValue: `${userGoals.workType.join(', ')}${isDealBreaker ? ' (Deal-breaker)' : ''}`,
        jobValue: hasJobData ? jdWorkType : null,
        met: isMatch,
        matchState,
        evidence: hasJobData
          ? (isMatch ? 'Work type matches your preferences' : 'Work type differs from your preferences')
          : 'Work type not specified in JD',
        criterion: `Work Type: ${userGoals.workType.join(', ')}${isDealBreaker ? ' (Deal-breaker)' : ''}`, // Legacy
      });
    } else {
      // User hasn't set work type preference - show as unknown
      matches.push({
        id: 'goal-worktype',
        goalType: 'Work Type',
        userValue: null,
        jobValue: jobDescription.workType || null,
        met: false,
        matchState: 'unknown',
        evidence: 'Work type not specified in your career goals',
        criterion: 'Work Type', // Legacy
      });
    }

    // 4. Preferred Cities Match (if specified and not remote)
    if (userGoals?.preferredCities && userGoals.preferredCities.length > 0 && !userGoals.workType?.includes('Remote')) {
      const cityMatch = this.checkCityMatch(userGoals.preferredCities, jobDescription.location);
      matches.push({
        id: 'goal-cities',
        goalType: 'Preferred Location',
        userValue: userGoals.preferredCities.join(', '),
        jobValue: jobDescription.location || null,
        met: cityMatch.met,
        evidence: cityMatch.evidence,
        criterion: `Preferred Cities: ${userGoals.preferredCities.join(', ')}`, // Legacy
      });
    } else if (userGoals?.preferredCities && userGoals.preferredCities.length > 0) {
      // User wants remote, so city preference is not relevant
      matches.push({
        id: 'goal-cities',
        goalType: 'Preferred Location',
        userValue: 'Remote (location flexible)',
        jobValue: jobDescription.location || null,
        met: true, // Remote is always a match if that's what user wants
        evidence: 'Remote work preference - location not a constraint',
        criterion: 'Preferred Location: Remote', // Legacy
      });
    } else {
      // User hasn't specified preferred cities - still show JD location as unknown state
      matches.push({
        id: 'goal-cities',
        goalType: 'Preferred Location',
        userValue: null,
        jobValue: jobDescription.location || null,
        met: false,
        matchState: 'unknown',
        evidence: 'Preferred location not specified in your career goals',
        criterion: 'Preferred Location', // Legacy
      });
    }

    // 5. Company Maturity Match
    if (userGoals?.companyMaturity && userGoals.companyMaturity.length > 0) {
      const isDealBreaker = (userGoals?.dealBreakers?.companyMaturity?.length ?? 0) > 0;
      // jobValue will come from JD extraction (TODO: populate from JD parser)
      const hasJobData = false; // Not yet extracted from JD
      matches.push({
        id: 'goal-maturity',
        goalType: 'Company Maturity',
        userValue: `${userGoals.companyMaturity.join(', ')}${isDealBreaker ? ' (Deal-breaker)' : ''}`,
        jobValue: null, // Not available in JD yet
        met: false, // Can't confirm match without data
        matchState: 'unknown', // Unknown until we have JD data
        evidence: 'Company maturity not specified in job description - requires manual research',
        requiresManualVerification: true,
        criterion: `Company Maturity: ${userGoals.companyMaturity.join(', ')}${isDealBreaker ? ' (Deal-breaker)' : ''}`, // Legacy
      });
    } else {
      // User hasn't set company maturity preference - show as unknown
      matches.push({
        id: 'goal-maturity',
        goalType: 'Company Maturity',
        userValue: null,
        jobValue: null,
        met: false,
        matchState: 'unknown',
        evidence: 'Company maturity not specified in your career goals',
        criterion: 'Company Maturity', // Legacy
      });
    }

    // 6. Industry Match
    if (userGoals?.industries && userGoals.industries.length > 0) {
      // jobValue will come from JD extraction (TODO: populate from JD parser)
      const hasJobData = false; // Not yet extracted from JD
      matches.push({
        id: 'goal-industry',
        goalType: 'Industry',
        userValue: userGoals.industries.join(', '),
        jobValue: null, // Not available in JD yet
        met: false, // Can't confirm match without data
        matchState: 'unknown', // Unknown until we have JD data
        evidence: 'Industry not specified in job description - requires manual research',
        requiresManualVerification: true,
        criterion: `Industries: ${userGoals.industries.join(', ')}`, // Legacy
      });
    } else {
      // User hasn't set industry preference - show as unknown
      matches.push({
        id: 'goal-industry',
        goalType: 'Industry',
        userValue: null,
        jobValue: null,
        met: false,
        matchState: 'unknown',
        evidence: 'Industry not specified in your career goals',
        criterion: 'Industry', // Legacy
      });
    }

    // 7. Business Model Match
    if (userGoals?.businessModels && userGoals.businessModels.length > 0) {
      // jobValue will come from JD extraction (TODO: populate from JD parser)
      const hasJobData = false; // Not yet extracted from JD
      matches.push({
        id: 'goal-business-model',
        goalType: 'Business Model',
        userValue: userGoals.businessModels.join(', '),
        jobValue: null, // Not available in JD yet
        met: false, // Can't confirm match without data
        matchState: 'unknown', // Unknown until we have JD data
        evidence: 'Business model not specified in job description - requires manual research',
        requiresManualVerification: true,
        criterion: `Business Models: ${userGoals.businessModels.join(', ')}`, // Legacy
      });
    } else {
      // User hasn't set business model preference - show as unknown
      matches.push({
        id: 'goal-business-model',
        goalType: 'Business Model',
        userValue: null,
        jobValue: null,
        met: false,
        matchState: 'unknown',
        evidence: 'Business model not specified in your career goals',
        criterion: 'Business Model', // Legacy
      });
    }

    // Calculate overall match
    const metCount = matches.filter(m => m.met).length;
    const totalCount = matches.length;
    const matchPercentage = totalCount > 0 ? (metCount / totalCount) * 100 : 0;

    let overallMatch: 'strong' | 'average' | 'weak';
    if (matchPercentage >= 80) {
      overallMatch = 'strong';
    } else if (matchPercentage >= 50) {
      overallMatch = 'average';
    } else {
      overallMatch = 'weak';
    }

    return {
      matches,
      overallMatch,
      metCount,
      totalCount,
    };
  }

  /**
   * Check if job title matches any of the target titles
   */
  private checkTitleMatch(targetTitles: string[], jobTitle: string): { met: boolean; evidence: string } {
    const normalizedJobTitle = jobTitle.toLowerCase();

    for (const targetTitle of targetTitles) {
      const normalizedTarget = targetTitle.toLowerCase();

      // Exact match or contains
      if (normalizedJobTitle.includes(normalizedTarget) || normalizedTarget.includes(normalizedJobTitle)) {
        return {
          met: true,
          evidence: `Job title "${jobTitle}" matches target "${targetTitle}"`,
        };
      }

      // Check for key words (e.g., "Product Manager" in "Senior Product Manager")
      const targetWords = normalizedTarget.split(' ');
      const titleWords = normalizedJobTitle.split(' ');
      const matchedWords = targetWords.filter(word => titleWords.includes(word));

      if (matchedWords.length >= 2) {
        return {
          met: true,
          evidence: `Job title "${jobTitle}" closely matches target "${targetTitle}"`,
        };
      }
    }

    return {
      met: false,
      evidence: `Job title "${jobTitle}" does not match target titles: ${targetTitles.join(', ')}`,
    };
  }

  /**
   * Check if job location matches any preferred cities
   */
  private checkCityMatch(preferredCities: string[], jobLocation?: string): { met: boolean; evidence: string } {
    if (!jobLocation) {
      return {
        met: false,
        evidence: 'Job location not specified',
      };
    }

    const normalizedLocation = jobLocation.toLowerCase();

    for (const city of preferredCities) {
      const normalizedCity = city.toLowerCase();

      if (normalizedLocation.includes(normalizedCity)) {
        return {
          met: true,
          evidence: `Location "${jobLocation}" matches preferred city "${city}"`,
        };
      }
    }

    return {
      met: false,
      evidence: `Location "${jobLocation}" does not match preferred cities: ${preferredCities.join(', ')}`,
    };
  }
}

/**
 * Job Description Cleaning Service — Phase 1
 * 
 * Removes high-confidence noise from job postings (UI chrome, metadata, navigation)
 * while preserving all meaningful job and company info.
 */

export type PlatformKey =
  | 'generic'
  | 'linkedin'
  | 'levels'
  | 'indeed'
  | 'google_jobs'
  | 'ziprecruiter'
  | 'glassdoor'
  | 'monster';

export interface PatternConfig {
  exact?: string[];
  startsWith?: string[];
  regex?: RegExp[];
}

export interface CleanResult {
  cleaned: string;
  removed: string[];
  confidence: number;
}

/**
 * High-confidence noise patterns for each platform.
 * These are safe to remove without risk of losing meaningful job/company information.
 */
const JOB_BOARD_PATTERNS: Record<PlatformKey, PatternConfig> = {
  generic: {
    exact: [
      'Apply',
      'Apply now',
      'Apply on company site',
      'Easy Apply',
      'Save',
      'Save job',
      'Share',
      'Share job',
      'Report job',
      'Report this job',
      'Message',
      'Follow',
      'Sign in',
      'Log in',
      'Create account',
      'Upload your resume',
      'Upload your CV',
      'Post a job',
      'Back to search',
      'Back to jobs',
      'View more jobs',
      'View similar jobs',
      'Similar jobs',
      'People also viewed',
      'People also searched',
      'Job seekers also viewed',
      'Job seekers also applied',
      'Recommended jobs',
      'Suggested jobs',
      'More jobs like this',
      'More jobs from this company',
      'Company reviews',
      'Salary tools',
      'Career advice',
    ],
    startsWith: [
      'People also viewed',
      'Similar jobs',
      'Job seekers also viewed',
      'Job seekers also applied',
      'Recommended jobs',
      'Suggested jobs',
      'More jobs like this',
      'More jobs from',
      'Top companies hiring',
      'You might also like',
      'Based on your profile',
      'Based on your search',
      'Upload your resume',
      'Upload your CV',
      'Sign in to save',
      'Sign in to apply',
      'Create an account to',
    ],
    regex: [
      /^\d+\s+(minute|minutes|hour|hours|day|days|week|weeks|month|months)\s+ago$/i,
      /^Posted\s+\d+\s+(minute|minutes|hour|hours|day|days|week|weeks|month|months)\s+ago$/i,
      /^Just posted$/i,
      /^Active \d+ days? ago$/i,
      /^\d+\+?\s+applicants$/i,
      /^Over\s+\d+\s+applicants$/i,
      /^Be among the first \d+\s+applicants$/i,
      /^\d+\+?\s+views?$/i,
    ],
  },

  linkedin: {
    exact: [
      'Show more options',
      'Promoted by hirer',
      'Actively recruiting',
      'Actively hiring',
      'Try Premium for free',
      'Start free trial',
      'Turn on job alerts',
      'Create job alert',
    ],
    startsWith: [
      'People also viewed',
      'Similar jobs',
      'You may also like',
      'Others who viewed this job also viewed',
      'Top jobs for',
      'From your network:',
      'People you may know at',
      'Courses for',
      'Recommended based on your activity',
    ],
    regex: [
      /^\d+\+?\s+applicants$/i,
      /^Over\s+\d+\s+people clicked apply$/i,
      /^Be among the first \d+\s+applicants$/i,
      /^Responses? managed off LinkedIn$/i,
      /^\d{1,3}(,\d{3})*\+?\s+employees$/i,
    ],
  },

  levels: {
    exact: [
      'Apply',
      'Save',
      'Share',
      'Copy link',
      'Report job',
      'See all jobs at this company',
      'More jobs at',
      'More jobs like this',
      'Similar jobs',
      'Compare compensation',
      'View salary data',
      'Company reviews',
      'Interview questions',
      'Discuss on Levels.fyi',
      'Join the discussion',
    ],
    startsWith: [
      'Trending jobs',
      'Similar roles at',
      'More roles at',
      'Top paying companies',
      'Other roles you may like',
      'People also viewed',
    ],
    regex: [
      /^Last updated\s+\d+\s+(day|days|week|weeks|month|months)\s+ago$/i,
    ],
  },

  indeed: {
    exact: [
      'Apply now',
      'Apply on company site',
      'Save this job',
      'Save job',
      'Share',
      'Report job',
      'Report this job',
      'Print',
      'Follow',
      'People also searched:',
      'People who searched for this job also searched for',
      'You may also like',
      'Similar jobs',
      'Recommended jobs',
      'View similar jobs',
      'View all jobs at this company',
      'View all jobs from this employer',
    ],
    startsWith: [
      'People also searched',
      'Similar jobs',
      'You may also like',
      'Recommended jobs',
      'More jobs at',
      'More jobs like this',
      'Related searches',
      'Explore more jobs',
    ],
    regex: [
      /^\d+(\.\d+)?\s+star rating\s*·\s*\d+\s+reviews$/i,
      /^\d+\+?\s+applicants\s*·\s*updated\s+\d+\s+(day|days|week|weeks|month|months)\s+ago$/i,
    ],
  },

  google_jobs: {
    exact: [
      'Apply',
      'Apply on company site',
      'Apply on LinkedIn',
      'Apply on Indeed',
      'Apply on Glassdoor',
      'Save',
      'Share',
      'More options',
      'View more jobs',
      'Similar jobs',
      'More jobs like this',
      'Report this job',
      'Feedback',
      'More about this job',
      'View original job posting',
    ],
    startsWith: [
      'Similar jobs',
      'More jobs at',
      'Search for more jobs',
      'Jobs near',
      'People also searched for',
    ],
    regex: [
      /^Posted\s+\d+\s+(day|days|week|weeks|month|months)\s+ago$/i,
      /^Updated\s+\d+\s+(day|days|week|weeks|month|months)\s+ago$/i,
    ],
  },

  ziprecruiter: {
    exact: [
      '1-Click Apply',
      'Apply now',
      'Apply on company site',
      'Save job',
      'Share job',
      'Report job',
      'Post a Job',
      'Create free account',
      'Sign in',
      'Job Seeker Support',
      'Upload Your Resume',
      'Get the App',
      'People who searched for this job also searched for:',
      'People who viewed this job also viewed:',
      'Similar Jobs',
      'Top jobs for you',
      'Recommended Jobs',
      'More jobs from this company',
    ],
    startsWith: [
      'People who searched for this job also searched for',
      'People who viewed this job also viewed',
      'Similar jobs',
      'Top jobs hiring near you',
      'Other jobs you might like',
      'More jobs from',
      'More jobs like this',
    ],
    regex: [
      /^Rated\s+\d(\.\d+)?\s+stars? out of 5$/i,
    ],
  },

  glassdoor: {
    exact: [
      'Apply',
      'Apply now',
      'Apply on employer site',
      'Save',
      'Save job',
      'Share',
      'Share job',
      'Report job',
      'Report this job',
      'Easy Apply',
      'Full job description',
      'Job Details',
      'View more jobs',
      'View all jobs at this company',
      'Similar Jobs',
      'Job Seekers Also Viewed',
      'People also viewed',
      'More jobs like this',
    ],
    startsWith: [
      'Job seekers also viewed',
      'People also viewed',
      'Similar Jobs',
      'More jobs at',
      'More jobs like this',
      'Other jobs at this company',
    ],
    regex: [
      /^\d+\s+reviews?\s*·\s*\d+\s+salaries?\s*·\s*\d+\s+interviews?$/i,
    ],
  },

  monster: {
    exact: [
      'Apply',
      'Apply now',
      'Apply on company site',
      'Save job',
      'Save',
      'Share',
      'Share job',
      'Report job',
      'Report job',
      'Upload Resume',
      'Upload your resume',
      'Create an account',
      'Sign in to apply',
      'Sign in to save',
      'Similar jobs',
      'More jobs like this',
      'View all jobs at this company',
      'View all jobs in this category',
      'Recommended Jobs',
      'Top jobs near you',
      'Search jobs',
      'Find jobs near you',
      'Career Advice',
      'Salary Tools',
    ],
    startsWith: [
      'Similar jobs',
      'More jobs at',
      'More jobs like this',
      'Top jobs near you',
      'Jobs in',
      'Jobs similar to',
      'Recommended for you',
    ],
    regex: [
      /^Posted\s+\d+\s+(day|days|week|weeks|month|months)\s+ago$/i,
      /^Updated\s+\d+\s+(day|days|week|weeks|month|months)\s+ago$/i,
    ],
  },
};

/**
 * Normalize platform key to handle common variations.
 */
function normalizePlatform(platform: string): PlatformKey {
  const normalized = platform.toLowerCase().trim();
  
  // Map common variations to canonical platform keys
  if (normalized.includes('linkedin')) return 'linkedin';
  if (normalized.includes('levels') || normalized.includes('fyi')) return 'levels';
  if (normalized.includes('indeed')) return 'indeed';
  if (normalized.includes('google')) return 'google_jobs';
  if (normalized.includes('ziprecruiter') || normalized.includes('zip')) return 'ziprecruiter';
  if (normalized.includes('glassdoor')) return 'glassdoor';
  if (normalized.includes('monster')) return 'monster';
  
  return 'generic';
}

/**
 * Merge generic patterns with platform-specific patterns.
 */
function mergePatterns(platform: PlatformKey): PatternConfig {
  const generic = JOB_BOARD_PATTERNS.generic;
  const specific = JOB_BOARD_PATTERNS[platform];

  return {
    exact: [...(generic.exact ?? []), ...(specific.exact ?? [])],
    startsWith: [...(generic.startsWith ?? []), ...(specific.startsWith ?? [])],
    regex: [...(generic.regex ?? []), ...(specific.regex ?? [])],
  };
}

/**
 * Check if a line matches any noise pattern.
 */
function isNoiseLine(line: string, patterns: PatternConfig): boolean {
  const trimmed = line.trim();
  
  // Skip empty lines (they're structural, not noise)
  if (!trimmed) return false;

  // Check exact matches (case-insensitive)
  if (patterns.exact) {
    for (const exact of patterns.exact) {
      if (trimmed.toLowerCase() === exact.toLowerCase()) {
        return true;
      }
    }
  }

  // Check startsWith patterns (case-insensitive)
  if (patterns.startsWith) {
    for (const prefix of patterns.startsWith) {
      if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
        return true;
      }
    }
  }

  // Check regex patterns
  if (patterns.regex) {
    for (const regex of patterns.regex) {
      if (regex.test(trimmed)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculate confidence score based on removal ratio.
 * Higher confidence means more content was preserved (less was removed).
 */
function calculateConfidence(totalLines: number, removedCount: number): number {
  if (totalLines === 0) return 1.0;
  
  // Confidence = proportion of lines kept
  // We use a minimum floor to avoid 0 confidence even when many lines are removed
  const keepRatio = 1 - (removedCount / totalLines);
  
  // Apply a floor of 0.1 (10%) so we never report 0 confidence
  return Math.max(0.1, Math.min(1.0, keepRatio));
}

/**
 * Clean job description text by removing high-confidence noise patterns.
 * 
 * @param text - Raw job description text
 * @param platform - Platform key (e.g., 'linkedin', 'indeed', 'generic')
 * @returns CleanResult with cleaned text, removed lines, and confidence score
 */
export function clean(text: string, platform: string = 'generic'): CleanResult {
  if (!text || text.trim().length === 0) {
    return {
      cleaned: '',
      removed: [],
      confidence: 1.0,
    };
  }

  const normalizedPlatform = normalizePlatform(platform);
  const patterns = mergePatterns(normalizedPlatform);

  // Split into lines
  const lines = text.split('\n');
  const removed: string[] = [];
  const kept: string[] = [];

  for (const line of lines) {
    if (isNoiseLine(line, patterns)) {
      removed.push(line.trim());
    } else {
      kept.push(line);
    }
  }

  // Rejoin kept lines
  const cleaned = kept.join('\n');
  
  // Calculate confidence
  const nonEmptyLines = lines.filter(l => l.trim().length > 0).length;
  const confidence = calculateConfidence(nonEmptyLines, removed.length);

  return {
    cleaned,
    removed,
    confidence,
  };
}


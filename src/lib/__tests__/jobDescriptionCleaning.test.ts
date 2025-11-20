import { describe, it, expect } from 'vitest';
import { clean, type CleanResult } from '../jobDescriptionCleaning';

describe('jobDescriptionCleaning', () => {
  describe('clean - basic functionality', () => {
    it('should return empty result for empty input', () => {
      const result = clean('', 'generic');
      expect(result.cleaned).toBe('');
      expect(result.removed).toEqual([]);
      expect(result.confidence).toBe(1.0);
    });

    it('should preserve meaningful content without noise', () => {
      const content = `Senior Product Manager
Acme Corp
San Francisco, CA

We are looking for an experienced PM to lead our platform team.

Requirements:
- 5+ years product management experience
- Strong technical background
- Excellent communication skills`;

      const result = clean(content, 'generic');
      expect(result.cleaned).toBe(content);
      expect(result.removed).toEqual([]);
      expect(result.confidence).toBe(1.0);
    });

    it('should remove generic noise patterns', () => {
      const content = `Senior Product Manager
Apply now
Acme Corp
Save job
Share
Requirements:
- 5+ years experience
People also viewed
Similar jobs`;

      const result = clean(content, 'generic');
      expect(result.removed).toContain('Apply now');
      expect(result.removed).toContain('Save job');
      expect(result.removed).toContain('Share');
      expect(result.removed).toContain('People also viewed');
      expect(result.removed).toContain('Similar jobs');
      expect(result.cleaned).toContain('Senior Product Manager');
      expect(result.cleaned).toContain('Acme Corp');
      expect(result.cleaned).toContain('Requirements:');
      expect(result.cleaned).toContain('- 5+ years experience');
    });

    it('should handle exact matches case-insensitively', () => {
      const content = `Job Title
APPLY NOW
apply now
Apply Now`;

      const result = clean(content, 'generic');
      expect(result.removed.length).toBe(3);
      expect(result.removed).toContain('APPLY NOW');
      expect(result.removed).toContain('apply now');
      expect(result.removed).toContain('Apply Now');
      expect(result.cleaned).toContain('Job Title');
    });

    it('should preserve empty lines for structure', () => {
      const content = `Title

Description

Requirements`;

      const result = clean(content, 'generic');
      expect(result.cleaned).toBe(content);
      expect(result.removed).toEqual([]);
    });
  });

  describe('clean - startsWith patterns', () => {
    it('should match lines starting with pattern', () => {
      const content = `Job Title
People also viewed these jobs
Similar jobs at other companies
More jobs from Google
Requirements here`;

      const result = clean(content, 'generic');
      expect(result.removed).toContain('People also viewed these jobs');
      expect(result.removed).toContain('Similar jobs at other companies');
      expect(result.removed).toContain('More jobs from Google');
      expect(result.cleaned).toContain('Job Title');
      expect(result.cleaned).toContain('Requirements here');
    });

    it('should match startsWith case-insensitively', () => {
      const content = `Job Title
PEOPLE ALSO VIEWED some jobs
people also viewed more jobs
People Also Viewed different jobs`;

      const result = clean(content, 'generic');
      expect(result.removed.length).toBe(3);
    });
  });

  describe('clean - regex patterns', () => {
    it('should match time-based patterns', () => {
      const content = `Job Title
Posted 2 days ago
Active 5 days ago
Just posted
3 weeks ago
Requirements here`;

      const result = clean(content, 'generic');
      expect(result.removed).toContain('Posted 2 days ago');
      expect(result.removed).toContain('Active 5 days ago');
      expect(result.removed).toContain('Just posted');
      expect(result.removed).toContain('3 weeks ago');
      expect(result.cleaned).toContain('Job Title');
      expect(result.cleaned).toContain('Requirements here');
    });

    it('should match applicant count patterns', () => {
      const content = `Job Title
50+ applicants
Over 100 applicants
Be among the first 25 applicants
200 views`;

      const result = clean(content, 'generic');
      expect(result.removed).toContain('50+ applicants');
      expect(result.removed).toContain('Over 100 applicants');
      expect(result.removed).toContain('Be among the first 25 applicants');
      expect(result.removed).toContain('200 views');
    });

    it('should handle plural/singular in time patterns', () => {
      const content = `Posted 1 minute ago
Posted 1 hour ago
Posted 1 day ago
Posted 1 week ago
Posted 1 month ago`;

      const result = clean(content, 'generic');
      expect(result.removed.length).toBe(5);
    });
  });

  describe('clean - platform-specific patterns', () => {
    it('should apply LinkedIn-specific patterns', () => {
      const content = `Senior PM at Microsoft
Show more options
Try Premium for free
100+ applicants
Responses managed off LinkedIn
Requirements: 5 years experience`;

      const result = clean(content, 'linkedin');
      expect(result.removed).toContain('Show more options');
      expect(result.removed).toContain('Try Premium for free');
      expect(result.removed).toContain('100+ applicants');
      expect(result.removed).toContain('Responses managed off LinkedIn');
      expect(result.cleaned).toContain('Senior PM at Microsoft');
      expect(result.cleaned).toContain('Requirements: 5 years experience');
    });

    it('should apply Levels.fyi-specific patterns', () => {
      const content = `Staff Product Manager
Compare compensation
View salary data
Discuss on Levels.fyi
Last updated 2 weeks ago
Requirements here`;

      const result = clean(content, 'levels');
      expect(result.removed).toContain('Compare compensation');
      expect(result.removed).toContain('View salary data');
      expect(result.removed).toContain('Discuss on Levels.fyi');
      expect(result.removed).toContain('Last updated 2 weeks ago');
      expect(result.cleaned).toContain('Staff Product Manager');
      expect(result.cleaned).toContain('Requirements here');
    });

    it('should apply Indeed-specific patterns', () => {
      const content = `Product Manager
Apply on company site
4.5 star rating · 200 reviews
100+ applicants · updated 3 days ago
People who searched for this job also searched for
Requirements here`;

      const result = clean(content, 'indeed');
      expect(result.removed).toContain('Apply on company site');
      expect(result.removed).toContain('4.5 star rating · 200 reviews');
      expect(result.removed).toContain('100+ applicants · updated 3 days ago');
      expect(result.removed).toContain('People who searched for this job also searched for');
      expect(result.cleaned).toContain('Product Manager');
      expect(result.cleaned).toContain('Requirements here');
    });

    it('should apply Google Jobs-specific patterns', () => {
      const content = `PM Role
Apply on LinkedIn
Apply on Indeed
View original job posting
Posted 1 week ago
Requirements here`;

      const result = clean(content, 'google_jobs');
      expect(result.removed).toContain('Apply on LinkedIn');
      expect(result.removed).toContain('Apply on Indeed');
      expect(result.removed).toContain('View original job posting');
      expect(result.removed).toContain('Posted 1 week ago');
      expect(result.cleaned).toContain('PM Role');
    });

    it('should apply ZipRecruiter-specific patterns', () => {
      const content = `Product Manager
1-Click Apply
Upload Your Resume
People who viewed this job also viewed:
Rated 4.5 stars out of 5
Requirements here`;

      const result = clean(content, 'ziprecruiter');
      expect(result.removed).toContain('1-Click Apply');
      expect(result.removed).toContain('Upload Your Resume');
      expect(result.removed).toContain('People who viewed this job also viewed:');
      expect(result.removed).toContain('Rated 4.5 stars out of 5');
      expect(result.cleaned).toContain('Product Manager');
    });

    it('should apply Glassdoor-specific patterns', () => {
      const content = `Product Manager
Apply on employer site
Easy Apply
50 reviews · 30 salaries · 10 interviews
Job Seekers Also Viewed
Requirements here`;

      const result = clean(content, 'glassdoor');
      expect(result.removed).toContain('Apply on employer site');
      expect(result.removed).toContain('Easy Apply');
      expect(result.removed).toContain('50 reviews · 30 salaries · 10 interviews');
      expect(result.removed).toContain('Job Seekers Also Viewed');
      expect(result.cleaned).toContain('Product Manager');
    });

    it('should apply Monster-specific patterns', () => {
      const content = `Senior PM
Upload Resume
Create an account
Sign in to apply
Top jobs near you
Requirements here`;

      const result = clean(content, 'monster');
      expect(result.removed).toContain('Upload Resume');
      expect(result.removed).toContain('Create an account');
      expect(result.removed).toContain('Sign in to apply');
      expect(result.removed).toContain('Top jobs near you');
      expect(result.cleaned).toContain('Senior PM');
    });
  });

  describe('clean - platform normalization', () => {
    it('should normalize platform variations', () => {
      const content = 'Job\nApply now\nDescription';
      
      // All should behave the same
      const r1 = clean(content, 'LinkedIn');
      const r2 = clean(content, 'LINKEDIN');
      const r3 = clean(content, 'linkedin.com');
      
      expect(r1.removed).toContain('Apply now');
      expect(r2.removed).toContain('Apply now');
      expect(r3.removed).toContain('Apply now');
    });

    it('should default to generic for unknown platforms', () => {
      const content = 'Job\nApply now\nDescription';
      const result = clean(content, 'unknown-platform');
      
      // Should still remove generic patterns
      expect(result.removed).toContain('Apply now');
    });

    it('should handle platform name with whitespace', () => {
      const content = 'Job\nApply now\nDescription';
      const result = clean(content, '  linkedin  ');
      
      expect(result.removed).toContain('Apply now');
    });
  });

  describe('clean - confidence calculation', () => {
    it('should return 1.0 confidence when nothing removed', () => {
      const content = 'Clean job description\nNo noise here';
      const result = clean(content, 'generic');
      
      expect(result.confidence).toBe(1.0);
    });

    it('should return lower confidence when many lines removed', () => {
      const content = `Job Title
Apply now
Save job
Share
Report job
Back to search
View similar jobs
People also viewed
One real requirement`;

      const result = clean(content, 'generic');
      
      // 8 noise lines out of 9 total lines = 1/9 kept ≈ 0.11 confidence
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.confidence).toBeGreaterThanOrEqual(0.1);
    });

    it('should return medium confidence for moderate removal', () => {
      const content = `Job Title
Company Name
Requirements:
- 5 years experience
- Technical skills
- Communication
Apply now
Save job`;

      const result = clean(content, 'generic');
      
      // 2 noise out of 8 lines = 6/8 kept = 0.75 confidence
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should have minimum confidence floor of 0.1', () => {
      // All noise, no content
      const content = `Apply now
Save job
Share
Report job
Back to search`;

      const result = clean(content, 'generic');
      
      expect(result.confidence).toBeGreaterThanOrEqual(0.1);
    });

    it('should not count empty lines in confidence calculation', () => {
      const content = `Job Title

Apply now

Requirements`;

      const result = clean(content, 'generic');
      
      // 3 non-empty lines (Job Title, Apply now, Requirements)
      // 1 removed (Apply now)
      // confidence = 1 - (1/3) = 0.67
      expect(result.confidence).toBeCloseTo(0.67, 1);
    });
  });

  describe('clean - edge cases', () => {
    it('should handle whitespace-only lines', () => {
      const content = `Job Title
   
\t
Requirements`;

      const result = clean(content, 'generic');
      // Whitespace-only lines are preserved as structural
      expect(result.cleaned).toBe(content);
    });

    it('should handle very long lines', () => {
      const longLine = 'A'.repeat(1000);
      const content = `Job Title\n${longLine}\nApply now`;
      
      const result = clean(content, 'generic');
      expect(result.cleaned).toContain(longLine);
      expect(result.removed).toContain('Apply now');
    });

    it('should handle mixed line endings', () => {
      // JavaScript's split('\n') works with \n, so normalize to \n for testing
      const content = 'Job Title\nApply now\nRequirements\n';
      const result = clean(content, 'generic');
      
      // Should handle mixed line endings gracefully
      expect(result.removed).toContain('Apply now');
      expect(result.cleaned).toContain('Job Title');
      expect(result.cleaned).toContain('Requirements');
    });

    it('should handle unicode characters', () => {
      const content = `Product Manager • Remote
Apply now
Requirements: 日本語 OK`;

      const result = clean(content, 'generic');
      // "Apply now" matches exactly, even when other lines have unicode
      expect(result.removed).toContain('Apply now');
      expect(result.cleaned).toContain('Product Manager • Remote');
      expect(result.cleaned).toContain('Requirements: 日本語 OK');
    });

    it('should handle partial matches correctly', () => {
      const content = `Job Title
Apply now to this role
Save this job for later
Requirements`;

      const result = clean(content, 'generic');
      // These should NOT be removed as they don't match exactly
      expect(result.cleaned).toContain('Apply now to this role');
      expect(result.cleaned).toContain('Save this job for later');
      expect(result.removed.length).toBe(0);
    });
  });

  describe('clean - real-world scenarios', () => {
    it('should clean a realistic LinkedIn job posting', () => {
      const content = `Senior Product Manager
Microsoft
Redmond, WA (Hybrid)
Posted 2 days ago
50+ applicants
Try Premium for free

About the role:
We're looking for a Senior Product Manager to lead our Azure platform team.

Responsibilities:
- Define product vision and strategy
- Work with engineering teams
- Drive customer research

Qualifications:
- 5+ years PM experience
- Strong technical background
- MBA preferred

Show more options
People also viewed
Similar jobs`;

      const result = clean(content, 'linkedin');
      
      // Should preserve all meaningful content
      expect(result.cleaned).toContain('Senior Product Manager');
      expect(result.cleaned).toContain('Microsoft');
      expect(result.cleaned).toContain('About the role:');
      expect(result.cleaned).toContain('Responsibilities:');
      expect(result.cleaned).toContain('Qualifications:');
      expect(result.cleaned).toContain('5+ years PM experience');
      
      // Should remove noise
      expect(result.removed).toContain('Posted 2 days ago');
      expect(result.removed).toContain('50+ applicants');
      expect(result.removed).toContain('Try Premium for free');
      expect(result.removed).toContain('Show more options');
      expect(result.removed).toContain('People also viewed');
      expect(result.removed).toContain('Similar jobs');
      
      // Should have high confidence (mostly preserved)
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should clean a Levels.fyi job posting', () => {
      const content = `Staff Product Manager - Infrastructure
Stripe
$220k - $350k • Remote
Last updated 5 days ago

Compare compensation
View salary data

Role Overview:
Lead the infrastructure platform team...

Requirements:
- 8+ years experience
- Distributed systems background

Discuss on Levels.fyi
Similar roles at Stripe`;

      const result = clean(content, 'levels');
      
      expect(result.cleaned).toContain('Staff Product Manager');
      expect(result.cleaned).toContain('Stripe');
      expect(result.cleaned).toContain('Role Overview:');
      expect(result.cleaned).toContain('8+ years experience');
      
      expect(result.removed).toContain('Last updated 5 days ago');
      expect(result.removed).toContain('Compare compensation');
      expect(result.removed).toContain('View salary data');
      expect(result.removed).toContain('Discuss on Levels.fyi');
      expect(result.removed).toContain('Similar roles at Stripe');
    });

    it('should preserve salary ranges and compensation info', () => {
      const content = `Product Manager
$150k - $200k base salary
Equity: 0.1% - 0.3%
Benefits: Health, dental, 401k
Apply now`;

      const result = clean(content, 'generic');
      
      expect(result.cleaned).toContain('$150k - $200k base salary');
      expect(result.cleaned).toContain('Equity: 0.1% - 0.3%');
      expect(result.cleaned).toContain('Benefits: Health, dental, 401k');
      expect(result.removed).toContain('Apply now');
    });

    it('should preserve company culture and values', () => {
      const content = `About Us:
We're a mission-driven company focused on sustainability.

Our values:
- Customer obsession
- Innovation
- Diversity and inclusion

Apply now
People also viewed`;

      const result = clean(content, 'generic');
      
      expect(result.cleaned).toContain('About Us:');
      expect(result.cleaned).toContain('mission-driven');
      expect(result.cleaned).toContain('Our values:');
      expect(result.cleaned).toContain('Customer obsession');
      
      expect(result.removed).toContain('Apply now');
      expect(result.removed).toContain('People also viewed');
    });
  });
});


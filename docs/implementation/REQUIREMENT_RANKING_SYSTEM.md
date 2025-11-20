# Requirement Ranking System

## Overview

Intelligent ranking system that scores and prioritizes job requirements based on multiple factors to identify what's truly important vs. generic boilerplate.

## Ranking Factors

### 1. Keyword Score (50% weight)
Detects priority-indicating keywords in requirement text:
- **Critical (100 points)**: "must", "required", "essential", "critical", "mandatory", "non-negotiable"
- **High (80 points)**: "need", "expect", "should have", "important", "key", "primary"
- **Medium (50 points)**: "preferred", "nice to have", "bonus", "plus", "ideal", "strong preference"
- **Low (20 points)**: "optional", "would be great", "helpful"
- **Default (60 points)**: If no keywords found, assume medium priority

### 2. Position Score (10% weight)
Earlier requirements in the list may be slightly higher priority (weak signal):
- First requirement: 60 points (small boost)
- Last requirement: 40 points (small penalty)
- Linear interpolation for items in between
- **Note**: Position is a weak signal and only provides small adjustments. It requires alignment with other factors (keywords, uniqueness) to significantly impact ranking.

### 3. Repetition Score (20% weight)
Requirements mentioned multiple times are more important:
- Counts how many other requirements mention similar concepts
- Uses keyword overlap detection (2+ shared significant words)
- Score: 50 + (count × 15), capped at 100

### 4. Uniqueness Score (20% weight)
Identifies what makes this JD different from standard role requirements:

**Standard Patterns (30 points)** - Common requirements found in most JDs:
- "Bachelor's degree"
- "Years of experience"
- "Strong communication"
- "Cross-functional"
- "Team player"
- "Problem solving"
- "Analytical"
- "Detail-oriented"

**Domain-Specific Terms (80 points)** - Industry/domain indicators:
- AI, ML, legal tech, fintech, healthcare, SaaS, B2B, B2C
- Startup, scale, growth, enterprise
- Compliance, regulatory, security, privacy

**Specific Technologies (90 points)** - Concrete tools/skills:
- Python, SQL, JavaScript, React, AWS, GCP, Azure
- Kubernetes, Docker, Terraform, Databricks, Snowflake
- Tableau, Looker, Amplitude, Mixpanel, Segment

**Default (50 points)** - Neither standard nor unique

## Total Score Calculation

```
Total Score = (Keyword × 0.5) + (Position × 0.1) + (Repetition × 0.2) + (Uniqueness × 0.2)
```

**Weighting Rationale:**
- **Keyword (50%)**: Strongest signal - explicit priority indicators
- **Position (10%)**: Weak signal - only provides small boost/penalty, requires alignment with other factors
- **Repetition (20%)**: Medium signal - repeated mentions indicate importance
- **Uniqueness (20%)**: Medium signal - differentiators matter for matching

## Priority Mapping

Based on total score:
- **85-100**: `critical`
- **70-84**: `high`
- **50-69**: `medium`
- **30-49**: `low`
- **0-29**: `optional`

## Differentiator Identification

The system automatically identifies the top 3 most unique/high-priority requirements as "differentiators":
1. Sorts by uniqueness score first (most unique at top)
2. Then by total score (highest priority)
3. Takes top 3 from combined core + preferred lists

## Usage

### Automatic Ranking
Ranking happens automatically when job descriptions are parsed:

```typescript
// In JobDescriptionService.transformParsedResponse()
const rankedCore = rankRequirements(standardRequirements, role);
const updatedCore = rankedCore.map(req => ({
  ...req,
  priority: updatePriorityFromRanking(req),
}));
```

### Manual Ranking
You can also rank requirements manually:

```typescript
import { rankRequirements, identifyDifferentiators } from '@/services/requirementRankingService';

const ranked = rankRequirements(requirements, 'Product Manager');
const differentiators = identifyDifferentiators(ranked, 3);
```

## Benefits

1. **Better Match Quality**: Critical requirements get proper weight in matching algorithms
2. **Gap Detection**: Users see what's truly important vs. generic boilerplate
3. **Differentiator Identification**: Automatically surfaces what makes this role unique
4. **User Guidance**: Helps users prioritize which requirements to address first

## Example

**Input Requirements:**
1. "Bachelor's degree in Computer Science or related field"
2. "5+ years of product management experience"
3. "Must have experience with AI/ML technologies"
4. "Strong preference for legal tech background"
5. "Experience with SQL and data analytics"

**Ranking Results:**
- #3 gets `critical` priority (keyword "must" + uniqueness "AI/ML")
- #4 gets `high` priority (keyword "strong preference" + uniqueness "legal tech")
- #5 gets `high` priority (uniqueness "SQL" + specific tech)
- #2 gets `medium` priority (standard pattern "years of experience")
- #1 gets `low` priority (standard pattern "Bachelor's degree")

**Differentiators Identified:**
1. "Must have experience with AI/ML technologies"
2. "Strong preference for legal tech background"
3. "Experience with SQL and data analytics"

## Future Enhancements

- Machine learning model to learn from user feedback on requirement importance
- Industry-specific ranking patterns
- Role-specific standard requirement patterns
- Integration with ATS keyword analysis
- User feedback loop to improve ranking accuracy


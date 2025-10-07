# People Data Labs Integration

## Overview

This application integrates with the [People Data Labs Person Enrichment API](https://docs.peopledatalabs.com/docs/person-enrichment-api) to enrich LinkedIn profile data when LinkedIn OAuth is not available or fails.

## Data Flow Strategy

The system uses a **3-tier fallback strategy** for LinkedIn profile data:

1. **LinkedIn OAuth** (Primary) - Direct API access when user authenticates via LinkedIn
2. **People Data Labs API** (Secondary) - Enrichment using name, company, and LinkedIn URL
3. **Mock Data** (Tertiary) - Fallback for development/testing

## Setup

### 1. Get API Key

1. Sign up at [People Data Labs](https://www.peopledatalabs.com/)
2. Get your API key from the dashboard
3. Add to your `.env` file:

```bash
VITE_PDL_API_KEY=your_api_key_here
```

### 2. Configuration

The PDL configuration is in `src/lib/config/fileUpload.ts`:

```typescript
export const PDL_CONFIG = {
  API_URL: 'https://api.peopledatalabs.com/v5/person/enrich',
  TIMEOUT: 15000, // 15 seconds
  MAX_RETRIES: 2,
  MIN_LIKELIHOOD: 0.7 // Minimum confidence score
} as const;
```

## Architecture

### Core Components

#### 1. PeopleDataLabsService (`src/services/peopleDataLabsService.ts`)

Main service for PDL API interactions:

```typescript
const pdlService = new PeopleDataLabsService();

// Enrich using resume data and LinkedIn URL
const result = await pdlService.enrichFromResumeData(
  fullName,
  resumeData,
  linkedinUrl
);

if (result.success && result.data) {
  const structuredData = pdlService.convertToStructuredData(result.data);
  // Use structured data
}
```

**Key Methods:**
- `enrichPerson(params)` - Direct API enrichment
- `enrichFromResumeData(name, resumeData, linkedinUrl)` - Smart enrichment using available data
- `convertToStructuredData(pdlData)` - Convert PDL format to app format
- `isConfigured()` - Check if API key is available

#### 2. LinkedIn Utils (`src/utils/linkedinUtils.ts`)

Utility functions for LinkedIn URL handling:

```typescript
import { extractLinkedInUsername, normalizeLinkedInUrl } from '@/utils/linkedinUtils';

const username = extractLinkedInUsername('https://linkedin.com/in/johndoe');
// Returns: 'johndoe'

const normalized = normalizeLinkedInUrl('linkedin.com/in/johndoe/');
// Returns: 'https://www.linkedin.com/in/johndoe'
```

**Functions:**
- `extractLinkedInUsername(url)` - Extract username from URL
- `buildLinkedInUrl(username)` - Build full URL from username
- `isValidLinkedInUrl(url)` - Validate LinkedIn URL
- `normalizeLinkedInUrl(url)` - Standardize URL format

#### 3. Types (`src/types/peopleDataLabs.ts`)

TypeScript types for PDL data structures:

- `PDLEnrichmentParams` - API request parameters
- `PDLPersonData` - Raw person data from PDL
- `PDLWorkExperience` - Work history item
- `PDLEducation` - Education item
- `PDLCertification` - Certification item
- `PDLEnrichmentResult` - API result wrapper

## Integration Points

### LinkedIn Profile Upload

The PDL integration is seamlessly integrated into the LinkedIn profile upload flow in `src/hooks/useFileUpload.ts`:

```typescript
// Strategy 1: Try LinkedIn OAuth
const profileResult = await linkedInService.fetchProfileData();

if (!profileResult.success) {
  // Strategy 2: Try PDL enrichment
  const pdlService = new PeopleDataLabsService();
  const pdlResult = await pdlService.enrichFromResumeData(
    fullName,
    resumeData,
    linkedinUrl
  );
  
  if (pdlResult.success) {
    // Use enriched data
  } else {
    // Strategy 3: Fall back to mock data
  }
}
```

### Data Sources

The system tracks which data source was used:

- `linkedin_oauth` - Direct LinkedIn API
- `people_data_labs` - PDL enrichment
- `mock` - Fallback mock data

This is logged and can be used for analytics or quality tracking.

## API Parameters

PDL enrichment uses these parameters for matching:

```typescript
{
  name: string,              // Full name from auth
  first_name: string,        // First name
  last_name: string,         // Last name
  company: string,           // Most recent company from resume
  linkedin: string,          // LinkedIn username
  profile: string[]          // LinkedIn profile URLs
}
```

### Parameter Priority

1. **LinkedIn URL** - Most reliable identifier
2. **Name + Company** - Good for recent professionals
3. **Name only** - Least reliable, may return multiple matches

## Data Conversion

PDL data is automatically converted to match our internal `StructuredResumeData` format:

### Work History
```typescript
{
  id: string,
  company: string,
  title: string,
  startDate: string,        // Normalized to YYYY-MM-DD
  endDate?: string,
  description: string,
  achievements: string[],
  location?: string,
  current: boolean
}
```

### Education
```typescript
{
  id: string,
  institution: string,
  degree: string,
  fieldOfStudy?: string,
  startDate: string,
  endDate?: string,
  gpa?: string,
  location?: string
}
```

### Certifications
```typescript
{
  id: string,
  name: string,
  issuer: string,
  issueDate: string,
  expiryDate?: string,
  credentialId?: string
}
```

## Error Handling

### Service-Level Errors

```typescript
const result = await pdlService.enrichPerson(params);

if (!result.success) {
  console.error('PDL Error:', result.error);
  console.log('Retryable:', result.retryable);
  
  if (result.retryable) {
    // Can retry (network error, rate limit)
  } else {
    // Don't retry (invalid params, not found)
  }
}
```

### Common Error Scenarios

1. **No API Key** - Returns error with `retryable: false`
2. **Person Not Found** - Returns error with `retryable: false`
3. **Rate Limited** - Automatically retries with exponential backoff
4. **Network Error** - Returns error with `retryable: true`
5. **Timeout** - Returns error with `retryable: true`

## Confidence Scores

PDL returns a likelihood score (0-1) indicating match confidence:

```typescript
if (result.likelihood && result.likelihood < PDL_CONFIG.MIN_LIKELIHOOD) {
  console.warn('Low confidence match, consider manual review');
}
```

**Score Interpretation:**
- `>0.9` - Very high confidence
- `0.7-0.9` - High confidence (default threshold)
- `0.5-0.7` - Medium confidence
- `<0.5` - Low confidence, likely incorrect match

## Rate Limits & Costs

- Check your PDL plan for rate limits
- Each enrichment call counts against your quota
- Failed matches still consume credits
- Consider caching enriched data to minimize API calls

## Best Practices

### 1. Maximize Match Accuracy

```typescript
// Good: Multiple identifiers
enrichFromResumeData(fullName, resumeData, linkedinUrl);

// Less reliable: Name only
enrichFromResumeData(fullName, null, null);
```

### 2. Handle Missing Data Gracefully

```typescript
const structuredData = pdlService.convertToStructuredData(pdlData);

// Always provide fallbacks
const summary = structuredData.summary || 'No summary available';
const skills = structuredData.skills || [];
```

### 3. Cache Enriched Data

The integration automatically stores enriched data in the database to avoid duplicate API calls:

```typescript
// Check for existing profile before enriching
const existingProfile = await checkExistingProfile(userId, linkedinUsername);
if (existingProfile) {
  return existingProfile;
}
```

### 4. Log Data Sources

Always track which data source was used for debugging and analytics:

```typescript
console.log(`📊 LinkedIn data source: ${dataSource}`);
```

## Testing

### Without API Key

The service gracefully degrades when no API key is configured:

```typescript
const pdlService = new PeopleDataLabsService();
if (!pdlService.isConfigured()) {
  // Will fall back to mock data
}
```

### With Test Data

Use the mock data in the fallback for testing the UI without consuming API credits.

## Troubleshooting

### "No person data found"

**Causes:**
- LinkedIn URL doesn't exist in PDL database
- Name/company combination too generic
- Person's profile is private or not indexed

**Solutions:**
- Verify LinkedIn URL is correct
- Add more identifiers (company, etc.)
- Check PDL coverage for the region/industry

### "Rate limited"

**Causes:**
- Exceeded API rate limit
- Too many concurrent requests

**Solutions:**
- Service automatically retries with backoff
- Consider request batching
- Upgrade PDL plan if needed

### Low Confidence Scores

**Causes:**
- Multiple people with similar names
- Incomplete or outdated LinkedIn data
- Common names without company data

**Solutions:**
- Add company information from resume
- Use LinkedIn URL for exact matching
- Review and verify enriched data manually

## Development

### Adding New PDL Fields

1. Update `PDLPersonData` type in `src/types/peopleDataLabs.ts`
2. Update conversion logic in `peopleDataLabsService.ts`
3. Update destination types if needed

### Modifying Match Logic

The matching logic is in `buildQueryParams()` method:

```typescript
private buildQueryParams(params: PDLEnrichmentParams): Record<string, string> {
  // Add custom matching logic here
}
```

## Security

- **Never commit API keys** - Use environment variables only
- **Validate input** - Always validate LinkedIn URLs and names
- **Rate limiting** - Service includes automatic retry logic
- **Error handling** - Never expose API keys in error messages

## Future Enhancements

Potential improvements:

1. **Webhook Support** - Real-time updates when LinkedIn data changes
2. **Bulk Enrichment** - Batch processing for multiple profiles
3. **Custom Fields** - Allow users to specify which fields to enrich
4. **Quality Scores** - Track enrichment quality over time
5. **Manual Review** - UI for reviewing low-confidence matches

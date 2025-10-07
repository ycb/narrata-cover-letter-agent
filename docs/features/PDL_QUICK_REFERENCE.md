# People Data Labs - Quick Reference

## Setup (2 minutes)

1. Get API key: https://www.peopledatalabs.com/
2. Add to `.env`:
   ```bash
   VITE_PDL_API_KEY=your_key_here
   ```
3. Restart dev server

## Basic Usage

### Enrich a Person

```typescript
import { PeopleDataLabsService } from '@/services/peopleDataLabsService';

const pdl = new PeopleDataLabsService();

const result = await pdl.enrichFromResumeData(
  'John Doe',              // name
  resumeData,              // optional: resume data with company
  'linkedin.com/in/john'   // LinkedIn URL
);

if (result.success) {
  const data = pdl.convertToStructuredData(result.data!);
  // Use data.workHistory, data.education, data.skills, etc.
}
```

### Extract LinkedIn Username

```typescript
import { extractLinkedInUsername } from '@/utils/linkedinUtils';

const username = extractLinkedInUsername('https://linkedin.com/in/johndoe');
// Returns: 'johndoe'
```

### Check Configuration

```typescript
const pdl = new PeopleDataLabsService();

if (!pdl.isConfigured()) {
  console.log('PDL API key not configured');
}
```

## API Response Structure

```typescript
{
  success: boolean,
  data?: {
    full_name: string,
    linkedin_url: string,
    headline: string,
    summary: string,
    experience: [...],
    education: [...],
    skills: [...],
    certifications: [...]
  },
  error?: string,
  retryable?: boolean,
  likelihood?: number  // 0-1 confidence score
}
```

## Common Patterns

### In React Component

```typescript
const [linkedInData, setLinkedInData] = useState(null);
const [loading, setLoading] = useState(false);

const enrichProfile = async (linkedinUrl: string) => {
  setLoading(true);
  
  const pdl = new PeopleDataLabsService();
  const result = await pdl.enrichFromResumeData(
    user.fullName,
    resumeData,
    linkedinUrl
  );
  
  if (result.success) {
    const data = pdl.convertToStructuredData(result.data!);
    setLinkedInData(data);
  } else {
    console.error('Enrichment failed:', result.error);
  }
  
  setLoading(false);
};
```

### With Error Handling

```typescript
try {
  const result = await pdl.enrichFromResumeData(name, resumeData, url);
  
  if (!result.success) {
    if (result.retryable) {
      // Can retry later
      scheduleRetry();
    } else {
      // Show error to user
      showError(result.error);
    }
    return;
  }
  
  // Check confidence
  if (result.likelihood && result.likelihood < 0.7) {
    showWarning('Low confidence match');
  }
  
  // Use data
  const data = pdl.convertToStructuredData(result.data!);
  saveToDatabase(data);
  
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Data Conversion

### Access Converted Data

```typescript
const structured = pdl.convertToStructuredData(pdlData);

// Work History
structured.workHistory.forEach(job => {
  console.log(`${job.title} at ${job.company}`);
  console.log(`${job.startDate} - ${job.endDate || 'Present'}`);
});

// Education
structured.education.forEach(edu => {
  console.log(`${edu.degree} in ${edu.fieldOfStudy}`);
  console.log(`${edu.institution}`);
});

// Skills
console.log('Skills:', structured.skills.join(', '));

// Certifications
structured.certifications?.forEach(cert => {
  console.log(`${cert.name} by ${cert.issuer}`);
});
```

## Troubleshooting

### Problem: "No person data found"

```typescript
// Add more context
const result = await pdl.enrichPerson({
  name: 'John Doe',
  first_name: 'John',
  last_name: 'Doe',
  company: 'TechCorp',  // ← Add this
  linkedin: 'johndoe'
});
```

### Problem: Low confidence scores

```typescript
// Check and handle
if (result.likelihood && result.likelihood < 0.7) {
  // Ask user to verify
  confirmWithUser(result.data);
} else {
  // Auto-accept high confidence
  saveData(result.data);
}
```

### Problem: Rate limited

```typescript
// Service automatically retries, but you can catch:
if (!result.success && result.error?.includes('rate')) {
  // Wait and retry later
  setTimeout(() => retry(), 60000);
}
```

## Configuration

### Default Settings

```typescript
// src/lib/config/fileUpload.ts
export const PDL_CONFIG = {
  API_URL: 'https://api.peopledatalabs.com/v5/person/enrich',
  TIMEOUT: 15000,        // 15 seconds
  MAX_RETRIES: 2,        // Retry twice on failure
  MIN_LIKELIHOOD: 0.7    // Minimum confidence threshold
}
```

### Customizing Timeout

```typescript
// In peopleDataLabsService.ts
const PDL_TIMEOUT = 30000;  // Change to 30 seconds
```

## Testing

### Without Real API Key

```typescript
// Service will gracefully fail
const pdl = new PeopleDataLabsService();

if (!pdl.isConfigured()) {
  // Falls back to mock data
  useMockData();
}
```

### With Mock Data

```typescript
// Integration already handles fallback
// Just test without API key to see mock data
```

## Best Practices

### ✅ DO

- Check `isConfigured()` before calling API
- Handle both success and error cases
- Check confidence scores
- Cache results to avoid duplicate calls
- Log data sources for debugging

### ❌ DON'T

- Make multiple calls for same person
- Ignore confidence scores
- Expose API key in client code
- Retry indefinitely on failures
- Skip error handling

## Quick Debugging

```typescript
// Add logging
console.log('PDL configured:', pdl.isConfigured());
console.log('Enrichment params:', { name, company, linkedinUrl });
console.log('Result:', result);
console.log('Confidence:', result.likelihood);
console.log('Data source:', dataSource);
```

## Cost Optimization

```typescript
// 1. Check cache first
const cached = await checkCache(linkedinUrl);
if (cached) return cached;

// 2. Only call PDL if necessary
if (linkedInOAuthSucceeded) {
  return oauthData;
}

// 3. Enrich with PDL
const result = await pdl.enrichFromResumeData(...);

// 4. Cache result
await saveToCache(linkedinUrl, result);
```

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "API key not found" | Missing env var | Add `VITE_PDL_API_KEY` |
| "No person data found" | Not in DB | Add company/more context |
| "Rate limited" | Too many requests | Wait or upgrade plan |
| "Timeout" | Slow network | Service auto-retries |
| "Invalid parameters" | Missing data | Add name/company/LinkedIn |

## Integration Points

### Used In

1. `src/hooks/useFileUpload.ts` - LinkedIn upload flow
2. `src/components/onboarding/FileUploadCard.tsx` - UI component
3. `src/pages/NewUserOnboarding.tsx` - Onboarding page

### Data Flow

```
User Input → Validate → PDL Enrich → Convert → Store → Display
```

## Resources

- [Full Documentation](./PEOPLE_DATA_LABS_INTEGRATION.md)
- [Implementation Details](../implementation/PDL_IMPLEMENTATION_SUMMARY.md)
- [Environment Setup](../setup/ENVIRONMENT_VARIABLES.md)
- [PDL API Docs](https://docs.peopledatalabs.com/docs/person-enrichment-api)

## Support

```typescript
// Enable debug logging
localStorage.setItem('DEBUG_PDL', 'true');

// Check service status
const status = {
  configured: pdl.isConfigured(),
  apiUrl: PDL_CONFIG.API_URL,
  timeout: PDL_CONFIG.TIMEOUT,
  retries: PDL_CONFIG.MAX_RETRIES
};
console.log('PDL Status:', status);
```

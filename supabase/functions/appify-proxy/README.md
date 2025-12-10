# Appify Proxy Edge Function

Server-side proxy for Appify LinkedIn data scraping to avoid CORS issues.

## Purpose

- Proxies LinkedIn data requests to Appify API server-side
- Avoids CORS errors from direct client-side calls
- Caches responses for 7 days to reduce API costs
- Secures Appify API key (never exposed to client)

## Configuration

### Environment Variables

Set these in Supabase edge function secrets:

```bash
# Required
APPIFY_API_KEY=your_appify_api_key_here
APPIFY_USER_ID=your_appify_user_id_here

# Optional (defaults shown)
APPIFY_BASE_URL=https://api.cloud.appifyhub.com
```

### Setting Secrets

```bash
# Local development (.env.local)
APPIFY_API_KEY=your_key
APPIFY_USER_ID=your_user_id

# Production (Supabase dashboard or CLI)
supabase secrets set APPIFY_API_KEY=your_key
supabase secrets set APPIFY_USER_ID=your_user_id
```

## API

### Endpoint

```
POST https://<project-ref>.supabase.co/functions/v1/appify-proxy
```

### Request

```json
{
  "linkedinUrl": "https://linkedin.com/in/username",
  "fullName": "Optional Name",
  "profileId": "Optional profile ID"
}
```

Alternative field names supported:
- `linkedin_url` (snake_case)
- `name` (instead of fullName)

### Response (Success)

```json
{
  "success": true,
  "data": {
    // Appify structured LinkedIn data
    "basic_info": { ... },
    "experience": [ ... ],
    "education": [ ... ]
  },
  "cached": false
}
```

### Response (Cached)

```json
{
  "success": true,
  "data": { ... },
  "cached": true,
  "sourceId": "uuid-of-cached-source"
}
```

### Response (Error)

```json
{
  "success": false,
  "error": "Error message"
}
```

## Caching Strategy

- **TTL:** 7 days
- **Key:** User ID + LinkedIn username
- **Storage:** `sources` table with `source_type='linkedin'`
- **Invalidation:** Delete source record to force fresh fetch

## Testing

### Local Testing

```bash
# Start edge function locally
supabase functions serve appify-proxy --env-file .env.local

# Test with curl
curl -X POST http://localhost:54321/functions/v1/appify-proxy \
  -H "Authorization: Bearer <user-access-token>" \
  -H "Content-Type: application/json" \
  -d '{"linkedinUrl": "https://linkedin.com/in/username"}'
```

### Clear Cache for Testing

```sql
-- Clear all LinkedIn cache for a user
DELETE FROM sources 
WHERE user_id = '<user-id>' 
  AND source_type = 'linkedin';

-- Clear all LinkedIn cache (all users)
DELETE FROM sources 
WHERE source_type = 'linkedin';
```

## Error Handling

### Client Errors (400)
- Missing `linkedinUrl`
- Invalid LinkedIn URL format

### Auth Errors (401)
- Missing Authorization header
- Invalid or expired token

### Server Errors (500)
- Missing `APPIFY_API_KEY`
- Appify API timeout (30s)
- Unexpected exceptions

### Appify Errors (200 with success: false)
- Appify returns non-200 status
- Rate limiting (429)
- Appify internal errors

## Performance

- **Cache hit:** ~50-100ms (DB query only)
- **Cache miss:** ~5-15s (Appify API call)
- **Timeout:** 30s (aborts after)

## Monitoring

Key log patterns:

```
[appify-proxy] Request: { linkedinUrl, fullName, profileId }
[appify-proxy] Cache HIT: { sourceId, age, duration }
[appify-proxy] Cache MISS - fetching from Appify
[appify-proxy] Appify success: { duration }
[appify-proxy] Appify error: { status, error }
[appify-proxy] Error: { error, stack }
```

## Security

- ✅ API key stored in edge function secrets (never exposed to client)
- ✅ User authentication required (via Authorization header)
- ✅ RLS policies apply to cache reads/writes
- ✅ Input validation prevents injection attacks

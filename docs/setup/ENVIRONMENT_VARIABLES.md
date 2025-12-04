# Environment Variables Setup

## Required Environment Variables

Create a `.env` file in the root of your project with the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration
VITE_OPENAI_KEY=your_openai_api_key
VITE_OPENAI_MODEL=gpt-4

# People Data Labs Configuration (Optional)
# Get your API key from: https://www.peopledatalabs.com/
VITE_PDL_API_KEY=your_pdl_api_key

# LinkedIn OAuth (Optional - if using LinkedIn authentication)
VITE_LINKEDIN_CLIENT_ID=your_linkedin_client_id
VITE_LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# Application Configuration
VITE_APP_URL=http://localhost:5173
VITE_ENV=development
VITE_SYNTHETIC_LOCAL_ONLY=true
```

## Variable Details

### Supabase (Required)

- **VITE_SUPABASE_URL**: Your Supabase project URL (e.g., `https://xxx.supabase.co`)
- **VITE_SUPABASE_ANON_KEY**: Your Supabase anonymous/public API key

Get these from: Supabase Dashboard > Settings > API

### OpenAI (Required)

- **VITE_OPENAI_KEY**: Your OpenAI API key
- **VITE_OPENAI_MODEL**: Model to use (default: `gpt-4`, can use `gpt-3.5-turbo` for cheaper option)

Get your API key from: https://platform.openai.com/api-keys

### People Data Labs (Optional)

- **VITE_PDL_API_KEY**: Your People Data Labs API key

**When to use:**
- To enrich LinkedIn profile data when OAuth fails
- To get comprehensive work history, education, and certifications
- For better data quality when LinkedIn direct API is not available

**What happens without it:**
- System will skip PDL enrichment
- Falls back to mock data for LinkedIn profiles
- All other features work normally

Get your API key from: https://www.peopledatalabs.com/

See: [People Data Labs Integration Guide](../features/PEOPLE_DATA_LABS_INTEGRATION.md)

### LinkedIn OAuth (Optional)

- **VITE_LINKEDIN_CLIENT_ID**: LinkedIn OAuth app client ID
- **VITE_LINKEDIN_CLIENT_SECRET**: LinkedIn OAuth app client secret

**When to use:**
- To enable "Sign in with LinkedIn" functionality
- To fetch LinkedIn data directly via OAuth

**What happens without it:**
- LinkedIn OAuth sign-in will not work
- Can still use email/password authentication
- Can still use PDL for LinkedIn data enrichment

Setup guide: [LinkedIn OAuth Setup](./LINKEDIN_OAUTH_SETUP.md)

### Application Configuration

- **VITE_APP_URL**: The URL where your app is running (for OAuth callbacks)
- **VITE_ENV**: Environment (`development`, `staging`, `production`)
- **VITE_SYNTHETIC_LOCAL_ONLY**: When set to `true`, synthetic profile switches are scoped to the current browser/session only. Leave unset/`false` for shared environments (staging/production) that rely on the Supabase RPC to broadcast changes.

**Local QA Tip:** Enable `VITE_SYNTHETIC_LOCAL_ONLY=true` in your `.env` when running multiple dev servers (e.g., ports 8080/8082). Each window can then pin a different synthetic persona without affecting the others. Clear the flag or set it to `false` before deploying to shared environments.

### Feature Flags (Optional)

These flags control which features are visible in the application. See [`docs/backlog/HIDDEN_FEATURES.md`](../backlog/HIDDEN_FEATURES.md) for the complete list of hidden features.

#### External Links

- **ENABLE_EXTERNAL_LINKS**: Enable external links feature
- **VITE_ENABLE_EXTERNAL_LINKS**: Vite-prefixed version (fallback)

**When to enable:**
- Links feature is ready for production use
- Backend support for external links is complete

**What happens without it:**
- Links tab hidden from Work History
- "Pick Links" button hidden from Add Story modal
- /show-all-links route disabled
- Links navigation items hidden from header

**Default:** Disabled (feature flag off)

#### Draft Readiness Evaluation

- **ENABLE_DRAFT_READINESS**: Enable draft readiness metrics
- **VITE_ENABLE_DRAFT_READINESS**: Vite-prefixed version (fallback)

**When to enable:**
- Soft-launching readiness feature to QA cohort
- Production rollout of editorial verdict system

**Default:** Disabled (feature flag off)

## Security Best Practices

1. **Never commit `.env` to version control**
   - The `.env` file is already in `.gitignore`
   - Use `.env.example` for documentation only

2. **Use different keys for each environment**
   - Development keys
   - Staging keys
   - Production keys

3. **Rotate keys regularly**
   - Especially if they may have been exposed
   - Follow your organization's security policy

4. **Limit key permissions**
   - Use read-only keys where possible
   - Restrict API key access to necessary features only

## Checking Configuration

You can verify your environment is configured correctly by:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Check the browser console** for any missing environment variable warnings

3. **Test each integration:**
   - Try signing up/signing in (Supabase)
   - Upload a resume (OpenAI)
   - Connect LinkedIn profile (PDL)

## Troubleshooting

### "API key not found" errors

**Symptom:** Console errors about missing API keys

**Solution:**
1. Verify `.env` file exists in project root
2. Check variable names match exactly (including `VITE_` prefix)
3. Restart development server after adding variables
4. Clear browser cache

### PDL integration not working

**Symptom:** LinkedIn enrichment always falls back to mock data

**Possible causes:**
1. `VITE_PDL_API_KEY` not set
2. Invalid API key
3. API key quota exceeded

**Solution:**
1. Check API key is correct
2. Verify account has credits
3. Check browser console for specific error messages

### LinkedIn OAuth not working

**Symptom:** "Sign in with LinkedIn" button doesn't work

**Possible causes:**
1. Missing LinkedIn credentials
2. Incorrect redirect URI in LinkedIn app settings
3. App not properly configured in Supabase

**Solution:**
1. Follow [LinkedIn OAuth Setup Guide](./LINKEDIN_OAUTH_SETUP.md)
2. Verify redirect URIs match in all places
3. Check Supabase authentication providers

## Environment-Specific Configuration

### Development

```bash
VITE_APP_URL=http://localhost:5173
VITE_ENV=development
```

### Production

```bash
VITE_APP_URL=https://yourapp.com
VITE_ENV=production
```

Make sure to update OAuth callback URLs and CORS settings when deploying to production.

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [People Data Labs Documentation](https://docs.peopledatalabs.com/)
- [LinkedIn OAuth Documentation](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication)

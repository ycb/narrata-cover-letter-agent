# LinkedIn New App Setup Guide

## 🚀 Quick Setup Steps

### 1. Create New LinkedIn App
1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Click **"Create App"**
3. Fill out the form:
   - **App name**: "Cover Letter Agent - Data Import"
   - **LinkedIn Page**: Select your company page
   - **Privacy Policy URL**: `https://your-domain.com/privacy`
   - **App logo**: Upload a logo
4. Click **"Create app"**

### 2. Configure OAuth Settings
1. In your new app, go to **"Auth"** tab
2. Add **Redirect URLs**:
   - `http://localhost:8080/auth/linkedin/callback`
   - `https://your-production-domain.com/auth/linkedin/callback`
3. Copy your **Client ID** and **Client Secret**

### 3. Request API Access
1. Go to **"Products"** tab
2. Click **"Request access"** on **"Member Data API (3rd Party)"**
3. Fill out the request form:
   - **Use case**: "Import user's professional data for cover letter generation"
   - **Description**: "We need to access user's LinkedIn profile, work history, education, and skills to help them create personalized cover letters"
   - **Data usage**: "Read-only access to user's public professional information"
4. Wait for approval (1-3 business days)

### 4. Set Environment Variables

Create a `.env.local` file in your project root:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# LinkedIn OAuth Configuration (NEW APP)
VITE_LINKEDIN_CLIENT_ID=your_new_linkedin_client_id
VITE_LINKEDIN_CLIENT_SECRET=your_new_linkedin_client_secret

# Development Server
VITE_DEV_SERVER_PORT=8080
```

### 5. Deploy Edge Functions

You'll need to deploy the Edge Functions to Supabase. You can do this via:

**Option A: Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **"Edge Functions"**
3. Create new function: `linkedin-fetch-data`
4. Copy the code from `supabase/functions/linkedin-fetch-data/index.ts`

**Option B: Supabase CLI**
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Deploy functions
supabase functions deploy linkedin-fetch-data
```

### 6. Update Supabase Environment Variables

In your Supabase project dashboard:
1. Go to **"Settings"** → **"Edge Functions"**
2. Add environment variables:
   - `LINKEDIN_CLIENT_ID`: Your new LinkedIn Client ID
   - `LINKEDIN_CLIENT_SECRET`: Your new LinkedIn Client Secret

### 7. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:8080`

3. Go to **Work History** → **Connect LinkedIn**

4. Test the OAuth flow

## 🔧 Troubleshooting

### Common Issues:

1. **"Invalid redirect_uri"**
   - Ensure the redirect URL in your LinkedIn app exactly matches `http://localhost:8080/auth/linkedin/callback`

2. **"unauthorized_scope_error"**
   - Wait for API access approval
   - Ensure you're using the correct scopes

3. **"403 Forbidden"**
   - Check if API access is approved
   - Verify environment variables are set correctly

4. **Edge Function errors**
   - Check Supabase Edge Function logs
   - Verify environment variables in Supabase dashboard

## 📋 Current Status

- ✅ LinkedIn OAuth flow implemented
- ✅ Edge Functions created
- ✅ Data processing logic ready
- ⏳ Waiting for new LinkedIn app setup
- ⏳ Waiting for API access approval

## 🎯 Next Steps

1. Create new LinkedIn app
2. Request "Member Data API (3rd Party)" access
3. Set up environment variables
4. Deploy Edge Functions
5. Test the integration

Once you have the new LinkedIn app credentials, we can update the environment variables and test the full flow!


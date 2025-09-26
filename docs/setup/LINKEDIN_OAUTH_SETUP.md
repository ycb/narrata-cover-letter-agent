# 🔗 LinkedIn OAuth Setup Guide

## **Overview**
This guide will help you set up LinkedIn OAuth integration for your cover letter agent, allowing users to import their professional data directly from LinkedIn.

## **🚀 Step 1: Create LinkedIn App**

### **1. Go to LinkedIn Developers**
1. Visit [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Sign in with your LinkedIn account
3. Click **"Create App"**

### **2. App Configuration**
- **App Name**: `TruthLetter Cover Letter Agent` (or your preferred name)
- **LinkedIn Page**: Select your company page or create a new one
- **App Logo**: Upload a professional logo (optional)

### **3. OAuth 2.0 Settings**
1. Go to **Auth** tab in your app
2. **Authorized Redirect URLs**: Add these URLs:
   ```
   http://localhost:8080/auth/linkedin/callback
   https://yourdomain.com/auth/linkedin/callback
   ```
3. **OAuth 2.0 Scopes**: Request these permissions:
   - ✅ `r_liteprofile` - Basic profile info
   - ✅ `r_emailaddress` - Email address
   - ✅ `r_basicprofile` - Basic profile (deprecated but still used)

## **🔑 Step 2: Get OAuth Credentials**

### **1. Copy Credentials**
From your LinkedIn app dashboard, copy:
- **Client ID** (also called App ID)
- **Client Secret**

### **2. Add to Environment Variables**
Update your `.env.local` file:
```bash
# LinkedIn OAuth
VITE_LINKEDIN_CLIENT_ID=your_linkedin_client_id
```

## **⚙️ Step 3: Configure Supabase**

### **1. Add LinkedIn Environment Variables**
In your Supabase project, go to **Settings > Edge Functions** and add:
```bash
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

### **2. Deploy Edge Function**
1. Go to **Edge Functions** in Supabase
2. Create new function: `linkedin-exchange-token`
3. Copy the code from `supabase/functions/linkedin-exchange-token/index.ts`
4. Deploy the function

### **3. Update Supabase Redirect URLs**
Add to your Supabase **Authentication > URL Configuration**:
```
http://localhost:8080/auth/linkedin/callback
https://yourdomain.com/auth/linkedin/callback
```

## **🧪 Step 4: Test the Integration**

### **1. Test OAuth Flow**
1. Start your dev server: `npm run dev`
2. Go to `/work-history`
3. Click **"Connect LinkedIn"**
4. Complete LinkedIn authorization
5. Verify data import

### **2. Expected Flow**
1. User clicks "Connect LinkedIn"
2. Redirected to LinkedIn OAuth
3. User authorizes your app
4. Redirected back to `/auth/linkedin/callback`
5. Data fetched and processed
6. User reviews and imports data

## **🔒 Security Considerations**

### **1. OAuth Scopes**
- **Minimal permissions**: Only request what you need
- **Read-only access**: We only need to read profile data
- **User control**: Users can revoke access anytime

### **2. Data Handling**
- **Secure storage**: Access tokens stored temporarily
- **User consent**: Clear explanation of data usage
- **Data privacy**: Never share user data with third parties

### **3. Rate Limiting**
- **LinkedIn API limits**: Respect API rate limits
- **User experience**: Handle rate limit errors gracefully
- **Caching**: Cache data when possible

## **📊 Data Import Features**

### **1. Professional Positions**
- Job titles and descriptions
- Company names and industries
- Start/end dates
- Location information

### **2. Education**
- School names and degrees
- Fields of study
- Graduation dates
- Activities and achievements

### **3. Skills**
- Professional skills
- Endorsement counts
- Skill categories

### **4. Conflict Resolution**
- **Duplicate detection**: Identify existing data
- **Merge options**: Keep existing, replace, or merge
- **User control**: Let users decide how to handle conflicts

## **🚨 Troubleshooting**

### **Common Issues**

#### **1. "Invalid redirect URI"**
- **Cause**: Redirect URL not configured in LinkedIn app
- **Solution**: Add exact URL to LinkedIn OAuth settings

#### **2. "OAuth not configured"**
- **Cause**: Missing environment variables
- **Solution**: Check `.env.local` and Supabase Edge Function variables

#### **3. "Authorization failed"**
- **Cause**: User denied permission or OAuth error
- **Solution**: Check LinkedIn app status and user permissions

#### **4. "Token exchange failed"**
- **Cause**: Invalid authorization code or expired code
- **Solution**: Ensure code is used immediately after authorization

### **Debug Steps**
1. **Check browser console** for detailed error messages
2. **Verify LinkedIn app status** in developer dashboard
3. **Check environment variables** are loaded correctly
4. **Test OAuth flow** step by step
5. **Review Supabase Edge Function logs**

## **📈 Next Steps After OAuth**

### **1. Resume Upload Integration**
- PDF/DOCX parsing
- Content extraction
- Data deduplication

### **2. AI-Powered Content Generation**
- Achievement extraction
- Skill identification
- Content optimization

### **3. Advanced Conflict Resolution**
- Smart merging algorithms
- User preference learning
- Batch import options

## **🔗 Useful Links**

- [LinkedIn Developers](https://www.linkedin.com/developers/)
- [LinkedIn OAuth Documentation](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [LinkedIn API Reference](https://docs.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## **✅ Success Criteria**

Your LinkedIn OAuth is working when:
1. ✅ Users can click "Connect LinkedIn" button
2. ✅ OAuth flow completes successfully
3. ✅ Professional data is imported
4. ✅ Conflicts are detected and resolved
5. ✅ Data appears in Work History
6. ✅ Users can edit and approve imported content

---

**Remember**: LinkedIn OAuth is a powerful feature that significantly improves user onboarding. Proper setup ensures a smooth, secure experience for your users! 🚀

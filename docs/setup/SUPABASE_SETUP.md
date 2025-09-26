# Supabase Setup Guide

## 🚀 Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. **Project Name**: `cover-letter-agent` (or your preferred name)
5. **Database Password**: Generate a strong password (save this!)
6. **Region**: Choose closest to your users
7. Click "Create new project"

## 🔑 Step 2: Get Project Credentials

Once created, go to **Settings > API** and copy:
- **Project URL**
- **Anon (public) key**
- **Service Role key** (keep this secret!)

## 📁 Step 3: Environment Variables

Create a `.env.local` file in your project root:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Provider (for later use)
VITE_AI_PROVIDER_API_KEY=your_ai_provider_api_key

# Optional: Analytics
VITE_VERCEL_ANALYTICS_ID=your_vercel_analytics_id
```

## 🗄️ Step 4: Run Database Migration

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and run the migration

## ⚙️ Step 5: Configure Authentication

1. Go to **Authentication > Settings**
2. **Site URL**: Set to your development URL (e.g., `http://localhost:8080`)
3. **Redirect URLs**: Add your development and production URLs

## 🔐 Step 6: Test Authentication

1. Start your development server: `npm run dev`
2. Navigate to `/signup` and create an account
3. Check your email for verification
4. Sign in at `/signin`

## 📊 Step 7: Verify RLS Policies

1. Go to **Authentication > Policies** in Supabase
2. Verify that RLS is enabled on all tables
3. Check that policies are correctly applied

## 🎯 What's Implemented

- ✅ Complete database schema with RLS
- ✅ User authentication (email/password + magic link)
- ✅ Protected routes
- ✅ User profile management
- ✅ Row-level security policies
- ✅ TypeScript types for Supabase

## 🔄 Next Steps

1. **LinkedIn OAuth**: Configure OAuth provider
2. **Resume Upload**: Set up file storage
3. **AI Integration**: Connect to AI providers
4. **Real-time**: Enable real-time subscriptions

## 🐛 Troubleshooting

### Common Issues:

1. **"Missing Supabase environment variables"**
   - Ensure `.env.local` exists and has correct values
   - Restart your development server

2. **"RLS policy violation"**
   - Check that user is authenticated
   - Verify RLS policies are applied correctly

3. **"Email not verified"**
   - Check spam folder
   - Verify email in Supabase dashboard

4. **"Invalid API key"**
   - Double-check your anon key
   - Ensure you're using the anon key, not service role key

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [TypeScript Types](https://supabase.com/docs/guides/api/typescript-support)

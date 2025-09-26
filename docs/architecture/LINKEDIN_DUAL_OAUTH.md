# LinkedIn Dual OAuth Architecture

## 🎯 **Overview**

We use two separate LinkedIn OAuth implementations for different purposes:

1. **Supabase OAuth** - User authentication (sign in/sign up)
2. **Custom OAuth** - Data fetching (onboarding and in-app features)

## 🔧 **Implementation Details**

### **1. Supabase OAuth (Authentication)**

**Purpose**: User sign in and sign up
**Provider**: `linkedin_oidc`
**Scopes**: Basic profile information only
**Usage**: Login/signup flows, user session management

**Files:**
- `src/contexts/AuthContext.tsx` - `signInWithLinkedIn()` method
- `src/pages/SignIn.tsx` - Sign in page
- `src/pages/SignUp.tsx` - Sign up page

**Flow:**
1. User clicks "Continue with LinkedIn" on sign in/sign up
2. Redirected to LinkedIn OAuth via Supabase
3. User authorizes app
4. Supabase handles callback and creates user session
5. User is redirected to dashboard

### **2. Custom OAuth (Data Fetching)**

**Purpose**: Fetching comprehensive LinkedIn data
**Provider**: Custom LinkedIn app with approved API access
**Scopes**: `r_liteprofile`, `r_emailaddress`, `r_basicprofile`
**Usage**: Onboarding flow, profile data import

**Files:**
- `src/lib/linkedin.ts` - Custom OAuth implementation
- `src/pages/LinkedInCallback.tsx` - OAuth callback handler
- `src/hooks/useFileUpload.ts` - `connectLinkedIn()` method
- `supabase/functions/linkedin-exchange-token/` - Token exchange
- `supabase/functions/linkedin-fetch-data/` - Data fetching

**Flow:**
1. User enters LinkedIn URL in onboarding
2. Custom OAuth flow initiated
3. User authorizes app for data access
4. Edge Function exchanges code for access token
5. Edge Function fetches comprehensive LinkedIn data
6. Data stored in `linkedin_profiles` table
7. User continues with onboarding

## 📊 **Data Access Comparison**

| Data Type | Supabase OAuth | Custom OAuth |
|-----------|----------------|--------------|
| **Basic Profile** | ✅ Name, Email | ✅ Name, Email, Headline, Summary |
| **Work Experience** | ❌ Not Available | ✅ Full work history with details |
| **Education** | ❌ Not Available | ✅ Complete education history |
| **Skills** | ❌ Not Available | ✅ Skills with endorsements |
| **Certifications** | ❌ Not Available | ✅ Professional certifications |
| **Projects** | ❌ Not Available | ✅ Personal projects |

## 🔄 **User Journey**

### **New User Sign Up**
1. **Sign Up Page** → Supabase OAuth → User authenticated
2. **Onboarding Page** → Custom OAuth → LinkedIn data imported
3. **Dashboard** → User has both auth and data

### **Existing User Sign In**
1. **Sign In Page** → Supabase OAuth → User authenticated
2. **Dashboard** → Can import more LinkedIn data if needed

## 🛠 **Configuration**

### **Supabase OAuth Setup**
- Configure in Supabase Dashboard → Authentication → Providers
- Provider: `linkedin_oidc`
- Client ID: Your Supabase LinkedIn app ID
- Redirect URL: `https://your-project.supabase.co/auth/v1/callback`

### **Custom OAuth Setup**
- LinkedIn Developer Portal → Create new app
- Request "Member Data API (3rd Party)" access
- Environment variables:
  ```bash
  VITE_LINKEDIN_CLIENT_ID=your_custom_linkedin_client_id
  ```
- Supabase Edge Functions:
  ```bash
  LINKEDIN_CLIENT_ID=your_custom_linkedin_client_id
  LINKEDIN_CLIENT_SECRET=your_custom_linkedin_secret
  ```

## 🎯 **Benefits of Dual Approach**

1. **Best of Both Worlds**: Simple auth + comprehensive data access
2. **User Experience**: Seamless sign in with rich data import
3. **Maintainability**: Clear separation of concerns
4. **Flexibility**: Can use each approach where it's most appropriate
5. **Security**: Different apps for different purposes
6. **Compliance**: Follows LinkedIn's recommended practices

## 🔍 **Key Differences**

### **Supabase OAuth**
- ✅ **Simple Setup**: One-click configuration
- ✅ **Session Management**: Automatic user session handling
- ✅ **Security**: Managed by Supabase
- ❌ **Limited Data**: Only basic profile information
- ❌ **No Work History**: Cannot access professional data

### **Custom OAuth**
- ✅ **Full Data Access**: Complete LinkedIn profile data
- ✅ **Custom Control**: Full control over data fetching
- ✅ **Flexible Scopes**: Can request specific permissions
- ❌ **Complex Setup**: Requires LinkedIn app approval
- ❌ **Manual Management**: Need to handle tokens and sessions

## 🚀 **Usage Examples**

### **Authentication (Supabase OAuth)**
```typescript
// In sign in/sign up components
const { signInWithLinkedIn } = useAuth();
await signInWithLinkedIn(); // Redirects to Supabase OAuth
```

### **Data Fetching (Custom OAuth)**
```typescript
// In onboarding components
const { connectLinkedIn } = useLinkedInUpload();
await connectLinkedIn(linkedinUrl); // Initiates custom OAuth for data
```

## 📋 **Current Status**

- ✅ **Supabase OAuth**: Working for authentication
- ✅ **Custom OAuth**: Implemented with approved API access
- ✅ **Database Schema**: Ready for LinkedIn data storage
- ✅ **Edge Functions**: Deployed for secure data fetching
- ✅ **Documentation**: Complete setup guides available

This dual approach provides the perfect balance of simplicity for authentication and power for data fetching, giving your cover letter agent access to all the LinkedIn data it needs while maintaining a smooth user experience.


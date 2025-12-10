# Apify LinkedIn Integration - Implementation Summary

## Status: ⚠️ DISABLED (Behind Feature Flag)

**Feature Flag**: `ENABLE_LI_SCRAPING=false` (default)

---

## What Was Built

### 1. Custom Apify Actor
- **Location**: `apify-actors/linkedin-scraper/`
- **Actor ID**: `highvoltag3-owner~linkedin-scraper` (`8eFjxq2ISIMAgPJWI`)
- **Build**: `1.1.2` (latest)
- **Purpose**: Scrape LinkedIn profiles using Apify's residential proxies
- **Stack**: Playwright + Crawlee + Apify SDK

### 2. Supabase Edge Function Proxy
- **Location**: `supabase/functions/appify-proxy/index.ts`
- **Purpose**: Server-side proxy to avoid CORS, handle auth, implement caching
- **Features**:
  - 7-day caching in `sources` table
  - LinkedIn URL validation
  - Error handling for Apify failures
  - Feature flag gating (`ENABLE_LI_SCRAPING`)

### 3. Client Integration
- **Hook**: `src/hooks/useFileUpload.ts` (`connectLinkedIn()`)
- **UI**: `src/pages/NewUserOnboarding.tsx`
- **Service**: `src/services/appifyService.ts`
- **Features**:
  - URL validation
  - Progress tracking
  - Feature flag integration
  - Synthetic data fallback (dev only)

### 4. Feature Flag
- **Helper**: `src/lib/flags.ts` (`isLinkedInScrapingEnabled()`)
- **Env Vars**: `ENABLE_LI_SCRAPING`, `VITE_ENABLE_LI_SCRAPING`
- **Default**: `false` (disabled)

---

## What Works

### ✅ Custom Actor (Partial)
- Deploys successfully to Apify
- Uses residential proxies (no bot detection)
- Scrapes public LinkedIn pages
- Returns structured data:
  - `basic_info` (name, headline, about, location, connection count)
  - `languages` (with proficiency levels)
  - `certifications`
  - ⚠️ `experience` - **INCOMPLETE** (only gets volunteer work, not paid roles)
  - ⚠️ `education` - **EMPTY**

### ✅ Edge Function Proxy
- CORS handling
- User authentication
- 7-day caching
- Error handling
- Feature flag gating

### ✅ Client Integration
- URL validation
- Progress tracking
- Feature flag integration
- UI messaging when disabled

---

## What Doesn't Work

### ❌ Work Experience Extraction
**Problem**: LinkedIn **hides work experience** from unauthenticated users:
```
Experience:
Narrata
******** **** ********** **    <- Title hidden
************                   <- Company hidden
**********                     <- Dates hidden
```

**Why**: LinkedIn forces login to view professional details. Only volunteer work is publicly visible.

### ❌ Apify Free Plan API Access
**Problem**: Third-party Actor (`dev_fusion/linkedin-profile-scraper`) blocks free API access:
```
Error: "Users on the free Apify plan can run the actor 
through the UI and not via other methods."
```

**Why**: `dev_fusion` uses authenticated LinkedIn accounts on their infrastructure and blocks free API to prevent abuse.

---

## Technical Details

### How `dev_fusion` Gets Full Data (Without User Auth)
1. Maintains **pool of authenticated LinkedIn accounts**
2. Uses their accounts to scrape profiles (not user's account)
3. Handles rotation, rate limiting, blocks
4. Charges for API access ($49/mo) to cover costs
5. Free Web UI has usage limits

### Why Our Custom Actor Can't Match It
1. **No Authentication**: We scrape as public/logged-out visitor
2. **LinkedIn Blocks**: Intentionally hides work history with `********`
3. **No Account Pool**: Would need to maintain authenticated LinkedIn accounts (expensive + risky)

### What We Get vs What's Needed

| Field | Our Actor | `dev_fusion` Actor | Needed? |
|-------|-----------|-------------------|---------|
| Name | ✅ | ✅ | ✅ Yes |
| Headline | ⚠️ Partial | ✅ | ✅ Yes |
| About | ⚠️ Partial | ✅ | ✅ Yes |
| **Work Experience** | ❌ Empty | ✅ Full | ✅ **CRITICAL** |
| **Education** | ❌ Empty | ✅ Full | ⚠️ Nice to have |
| Skills | ❌ Empty | ✅ List | ⚠️ Nice to have |
| Languages | ✅ Full | ✅ Full | ⚠️ Nice to have |
| Certifications | ✅ Partial | ✅ Full | ⚠️ Nice to have |
| Profile Pictures | ❌ No | ✅ Yes | ❌ Not needed |
| Company Logos | ❌ No | ✅ Yes | ❌ Not needed |

**Verdict**: Our custom Actor **cannot** extract the critical data (work experience) needed for the product.

---

## Options Going Forward

### Option 1: Upgrade Apify Plan ($49/mo)
**Pros**:
- Full structured data immediately
- Maintained by `dev_fusion` (updates, fixes)
- Proven to work

**Cons**:
- $49/month recurring cost
- Vendor lock-in
- Still limited by `dev_fusion` actor capabilities

**Estimated Cost**: ~$50/mo + $0.003/profile

---

### Option 2: Cookie Authentication (Custom Actor)
**Pros**:
- Uses existing custom Actor
- Free (uses Apify credits)
- Full control

**Cons**:
- Privacy/security concern (storing user's LinkedIn cookie)
- Requires user to extract `li_at` cookie from browser
- Cookies expire, need rotation
- Risk of LinkedIn account ban

**Implementation**:
1. User extracts `li_at` cookie from browser DevTools
2. Store cookie as Supabase secret or user setting
3. Pass to Apify Actor
4. Actor adds cookie to Playwright browser context
5. Scrape authenticated view

**Estimated Cost**: ~$0.003/profile

---

### Option 3: Alternative Service
**Pros**:
- May have better free tiers
- Different pricing models
- More features

**Cons**:
- Integration work
- Unknown reliability
- May have same auth limitations

**Candidates**:
- **RapidAPI LinkedIn scrapers** (various, ~$10-50/mo)
- **ScraperAPI** (general purpose, ~$29/mo)
- **Bright Data** (enterprise, expensive)
- **Proxycurl** (LinkedIn-specific, ~$99/mo)

---

### Option 4: Disable Feature (Current State)
**Pros**:
- No ongoing costs
- No maintenance
- Focus on resume/cover letter processing

**Cons**:
- Missing LinkedIn auto-population
- Users enter data manually
- Less competitive vs products with LI integration

**Current Status**: ✅ **IMPLEMENTED** (feature flag OFF)

---

## Recommendation

**For MVP**: **Option 4** (Disabled)
- Feature flag keeps door open for future
- Focus on core resume/cover letter value
- Revisit after product-market fit

**For Beta/Launch**: **Option 1** (Paid Apify) or **Option 3** (Alternative Service)
- $49/mo is reasonable for a launched product
- More reliable than cookie auth
- Better UX than manual entry

---

## Files Reference

### Custom Actor
```
apify-actors/linkedin-scraper/
├── .actor/
│   ├── actor.json              # Actor metadata
│   └── input_schema.json       # Input schema
├── main.js                     # Scraper logic
├── package.json
├── Dockerfile
└── README.md
```

### Edge Function
```
supabase/functions/appify-proxy/
├── index.ts                    # Proxy handler
└── README.md                   # API docs
```

### Client
```
src/
├── lib/flags.ts                # Feature flag helper
├── hooks/useFileUpload.ts      # LinkedIn connect logic
├── pages/NewUserOnboarding.tsx # UI integration
└── services/appifyService.ts   # API client
```

### Documentation
```
docs/
├── backlog/HIDDEN_FEATURES.md              # Feature flag registry
├── implementation/
│   ├── LINKEDIN_FEATURE_FLAG.md            # Flag documentation
│   ├── APIFY_LINKEDIN_INTEGRATION_SUMMARY.md # This file
│   ├── APPIFY_PROXY_DEPLOYMENT.md          # Deployment guide (outdated)
│   ├── APPIFY_PROXY_SUMMARY.md             # High-level summary (outdated)
│   └── CUSTOM_APIFY_ACTOR_SETUP.md         # Actor setup notes
```

---

## Current State

✅ **Feature flag implemented and tested**  
✅ **LinkedIn scraping disabled by default**  
✅ **UI shows "temporarily disabled" message**  
✅ **No Apify calls when disabled**  
✅ **Progress bar advances normally**  
✅ **Custom Actor deployed and functional** (but limited data)  
✅ **Edge function proxy deployed and gated**  
✅ **Documentation complete**  

**Next Action**: None required unless enabling the feature.

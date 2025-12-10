# Custom Apify LinkedIn Scraper Actor

## Overview
We built a custom Apify Actor (`highvoltag3-owner~linkedin-scraper`) to bypass free plan restrictions on third-party actors.

## Why Custom Actor?
- **Third-party actors** (like `dev_fusion~linkedin-profile-scraper`) block API access on free plans
- **Custom actors** work with free $5 credits via API
- **Apify residential proxies** bypass LinkedIn's bot detection (same as Web UI)

## Current Status
✅ Actor deployed: `highvoltag3-owner~linkedin-scraper`  
✅ Edge function updated to use custom actor  
⚠️ **Limitation**: LinkedIn hides structured data without authentication

## What Works
- Name extraction
- Profile URL
- Raw page text (11K+ characters including about, experience, education, etc.)

## What Doesn't Work
- Direct structured data extraction (LinkedIn blocks non-authenticated scrapers)
- Experience/education in clean JSON format

## Next Steps
**Option 1**: Parse raw text to extract structured data  
**Option 2**: Add LinkedIn cookie authentication (user provides `li_at` cookie)  
**Option 3**: Accept limited data and manually enrich

## Files
- Actor: `/apify-actors/linkedin-scraper/`
- Edge function: `/supabase/functions/appify-proxy/index.ts`
- Actor ID: `highvoltag3-owner~linkedin-scraper`
- Console: https://console.apify.com/actors/8eFjxq2ISIMAgPJWI

## Cost
~$0.003 per profile with current setup

# Appify Proxy - Deployment Guide

**Date:** December 9, 2025  
**Status:** Ready for deployment  
**Purpose:** Server-side proxy to eliminate CORS issues with Appify API

---

## 🎯 **What Was Built**

A Supabase edge function that:
- ✅ Proxies LinkedIn scraping requests to Appify server-side
- ✅ Caches responses for 7 days in `sources` table
- ✅ Eliminates CORS errors from direct client calls
- ✅ Secures API key (never exposed to browser)

---

## 📁 **Files Created/Modified**

### **New Files:**
1. `supabase/functions/appify-proxy/index.ts` - Edge function implementation
2. `supabase/functions/appify-proxy/README.md` - Function documentation
3. `docs/implementation/APPIFY_PROXY_DEPLOYMENT.md` - This file

### **Modified Files:**
1. `src/services/appifyService.ts` - Updated to use edge function proxy

---

## 🚀 **Deployment Steps**

### **Step 1: Set Environment Variables**

**Local Development (.env.local):**
```bash
APPIFY_API_KEY=your_actual_appify_api_key
APPIFY_USER_ID=your_actual_appify_user_id
APPIFY_BASE_URL=https://api.cloud.appifyhub.com  # Optional, this is the default
```

**Production (Supabase):**
```bash
# Via CLI
supabase secrets set APPIFY_API_KEY=your_actual_appify_api_key
supabase secrets set APPIFY_USER_ID=your_actual_appify_user_id

# Via Dashboard
# Navigate to: Project Settings → Edge Functions → Secrets
# Add: APPIFY_API_KEY = your_actual_appify_api_key
# Add: APPIFY_USER_ID = your_actual_appify_user_id
```

---

### **Step 2: Deploy Edge Function**

```bash
# Deploy to production
supabase functions deploy appify-proxy

# Verify deployment
supabase functions list
```

**Expected output:**
```
appify-proxy | deployed | <timestamp>
```

---

### **Step 3: Test Locally (Optional)**

```bash
# Start local edge function
supabase functions serve appify-proxy --env-file .env.local

# In another terminal, test with curl
# (Replace <token> with actual user access token from browser)
curl -X POST http://localhost:54321/functions/v1/appify-proxy \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "linkedinUrl": "https://linkedin.com/in/testuser"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": { /* Appify structured data */ },
  "cached": false
}
```

---

### **Step 4: Test in Browser**

1. **Clear LinkedIn cache:**
   ```sql
   DELETE FROM sources 
   WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30' 
     AND source_type = 'linkedin';
   ```

2. **Upload resume with LinkedIn URL**
   - Open DevTools console
   - Upload `Peter Spannagle Resume.pdf`
   - Watch for LinkedIn detection

3. **Verify console logs:**
   ```
   ✅ "LinkedIn URL detected: https://linkedin.com/in/pspan"
   ✅ "Appify API configured, fetching LinkedIn data..."
   ❌ Should NOT see: CORS errors
   ❌ Should NOT see: "Appify request failed"
   ```

4. **Check database:**
   ```sql
   SELECT id, file_name, source_type, processing_status
   FROM sources
   WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30'
     AND source_type = 'linkedin';
   ```
   
   **Expected:** 1 row with `processing_status = 'completed'`

5. **Test cache (re-upload same resume):**
   - Upload same resume again
   - Should complete faster
   - Console should show cache hit logs

---

## 🔍 **Monitoring**

### **Check Edge Function Logs**

```bash
# Via CLI
supabase functions logs appify-proxy --limit 50

# Via Dashboard
# Navigate to: Edge Functions → appify-proxy → Logs
```

**Look for:**
- `[appify-proxy] Cache HIT` - Cache is working
- `[appify-proxy] Cache MISS` - Fresh fetch
- `[appify-proxy] Appify error` - API issues
- `[appify-proxy] Error` - Function errors

---

### **Key Metrics to Track**

```sql
-- Cache hit rate
SELECT 
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as sources_last_24h,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as sources_last_7d
FROM sources
WHERE source_type = 'linkedin';
```

---

## 🧪 **Testing Scenarios**

### **Scenario 1: First-time fetch (cache miss)**
- **Input:** New LinkedIn URL
- **Expected:** ~5-15s response, `cached: false`
- **DB:** New source record created

### **Scenario 2: Cached fetch (cache hit)**
- **Input:** Same LinkedIn URL within 7 days
- **Expected:** ~50-100ms response, `cached: true`
- **DB:** Existing source record returned

### **Scenario 3: Invalid URL**
- **Input:** `https://facebook.com/user`
- **Expected:** 400 error, "Invalid LinkedIn URL format"

### **Scenario 4: Missing auth**
- **Input:** No Authorization header
- **Expected:** 401 error, "Authorization required"

### **Scenario 5: Appify rate limit**
- **Input:** Too many requests
- **Expected:** 200 with `success: false`, error message

---

## ⚠️ **Troubleshooting**

### **Issue: CORS errors still appearing**

**Check:**
- Is the client calling the edge function endpoint?
- Or still calling Appify directly?

**Fix:** Verify `src/services/appifyService.ts` line 384 uses:
```typescript
const endpoint = `${supabaseUrl}/functions/v1/appify-proxy`;
```

---

### **Issue: "Server configuration error"**

**Cause:** `APPIFY_API_KEY` not set

**Fix:**
```bash
supabase secrets set APPIFY_API_KEY=your_key
```

---

### **Issue: "Invalid authorization"**

**Cause:** User token expired or invalid

**Fix:** Client should refresh token automatically. Check auth state.

---

### **Issue: Cache not working**

**Check:**
```sql
-- See if sources are being created
SELECT * FROM sources 
WHERE source_type = 'linkedin'
ORDER BY created_at DESC
LIMIT 5;
```

**Cause:** Source records may not be created if file upload flow changes.

---

## 📊 **Performance Expectations**

### **Without Cache:**
```
LinkedIn detection: ~1ms
Edge function call: ~5-15s (Appify API call)
Total: ~5-15s
```

### **With Cache:**
```
LinkedIn detection: ~1ms
Edge function call: ~50-100ms (DB query)
Total: ~100ms
```

**Improvement:** ~50-150x faster on cache hit!

---

## ✅ **Deployment Checklist**

- [ ] Set `APPIFY_API_KEY` in production secrets
- [ ] Set `APPIFY_USER_ID` in production secrets
- [ ] Deploy edge function: `supabase functions deploy appify-proxy`
- [ ] Verify client code uses proxy endpoint
- [ ] Test with valid LinkedIn URL (cache miss)
- [ ] Test with same URL again (cache hit)
- [ ] Test with invalid URL (400 error)
- [ ] Monitor edge function logs for errors
- [ ] Clear test cache before performance testing

---

## 🔄 **Rollback Plan**

If issues arise, revert client to direct Appify calls:

```typescript
// In src/services/appifyService.ts, line 385
const endpoint = `${APPIFY_API_URL}/v1/scrape/linkedin`;
// Remove edge function proxy logic
```

---

## 📝 **Next Steps**

1. **Deploy to production** with secret set
2. **Test end-to-end** with real resume upload
3. **Monitor logs** for first 24 hours
4. **Measure cache hit rate** after 1 week
5. **Update documentation** if API changes

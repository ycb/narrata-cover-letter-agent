# OpenAI Security Migration - Deployment Checklist

## ✅ Completed Steps

### 1. Edge Functions Deployed
- [x] `stream-gap-resolution` - **ACTIVE** (deployed 2026-03-07 01:23:40)
- [x] `stream-hil-review` - **ACTIVE** (deployed 2026-03-07 01:23:47)
- [x] `generate-stories` - **ACTIVE** (deployed 2026-03-07 01:23:58)

### 2. Secrets Configured
- [x] Supabase: `OPENAI_API_KEY` set in Edge Functions secrets
- [x] GitHub: Secrets updated (VITE_OPENAI_API_KEY removed from workflows)

### 3. Code Changes
- [x] Created 3 Edge Functions with tests (all passing)
- [x] Updated client hooks and components
- [x] Removed VITE_OPENAI_API_KEY from CI/CD workflows
- [x] Production build verified (no API keys in bundle)

### 4. Documentation
- [x] Created comprehensive migration guide (`docs/security/OPENAI_KEY_MIGRATION.md`)
- [x] Pull Request created (#29)

## 🚀 Ready to Merge

### Pre-Merge Verification
Run these checks before merging PR #29:

```bash
# 1. Verify Edge Functions are accessible
supabase functions list | grep ACTIVE

# 2. Test an Edge Function (requires valid JWT token)
# Get token from: await supabase.auth.getSession()
curl -X POST \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  https://lgdciykgqwqhxvtbxcvo.supabase.co/functions/v1/generate-stories \
  -d '{"userId":"<YOUR_USER_ID>","sourceId":"test"}'

# 3. Check GitHub Actions won't fail
gh workflow view deploy.yml
```

### Post-Merge Verification

After merging to `main`:

1. **Wait for GitHub Actions deployment to staging**
   ```bash
   gh run list --workflow=deploy.yml --limit 1
   gh run watch
   ```

2. **Verify staging deployment**
   ```bash
   # Check staging site for API keys (should find nothing)
   curl https://staging.narrata.ai/assets/index-*.js 2>/dev/null | grep -i "sk-proj" || echo "✅ No keys found"
   ```

3. **Test staging functionality**
   - Log into staging.narrata.ai
   - Test gap resolution (ContentGenerationModalV3)
   - Test story generation (file upload flow)
   - Test HIL review (review notes feature)

4. **Monitor Edge Function logs**
   ```bash
   # In Supabase Dashboard:
   # Edge Functions -> Select function -> Logs tab
   # Check for any errors or auth failures
   ```

5. **Deploy to production** (manual trigger)
   ```bash
   gh workflow run deploy.yml --field target=production --field ref=main
   ```

6. **Verify production deployment**
   ```bash
   # Check production site for API keys (should find nothing)
   curl https://narrata.ai/assets/index-*.js 2>/dev/null | grep -i "sk-proj" || echo "✅ No keys found"
   ```

## 🔍 Monitoring

### Edge Function Health
Monitor these metrics in Supabase Dashboard:
- **Invocations**: Should see requests to all 3 functions
- **Error Rate**: Should be <1%
- **Response Time**: 
  - `generate-stories`: 2-10s (batch operation)
  - `stream-gap-resolution`: 1-3s (streaming)
  - `stream-hil-review`: 1-3s (streaming)

### Application Health
Monitor these in LogRocket/Mixpanel:
- No increase in error rates
- Gap resolution workflow completion rate unchanged
- Story generation success rate unchanged
- HIL review usage unchanged

## ⚠️ Rollback Plan

If issues arise after merge:

1. **Revert the PR**
   ```bash
   git revert <merge-commit-sha>
   git push origin main
   ```

2. **Emergency: Re-enable client-side key** (TEMPORARY ONLY)
   - Add `VITE_OPENAI_API_KEY` back to GitHub secrets
   - Update deploy.yml to include it
   - Trigger production deployment
   - **IMPORTANT**: This re-exposes the key - only for emergency recovery

3. **Debug Edge Functions**
   ```bash
   # Check function logs in Supabase Dashboard
   # Check for auth errors, OpenAI API errors, or timeout issues
   
   # Test function locally
   supabase functions serve stream-gap-resolution
   ```

## 📊 Success Metrics

After 24 hours in production:
- [ ] No spike in error rates
- [ ] Edge Function invocations > 0 for all 3 functions
- [ ] User workflows completing successfully
- [ ] No OpenAI API key leak alerts from GitHub or OpenAI

## 🎯 Next Steps (Future)

Optional improvements:
1. Migrate remaining low-priority services (tagSuggestion, browserSearch, etc.)
2. Add rate limiting to Edge Functions
3. Add request/response caching for common queries
4. Set up Edge Function monitoring alerts (Sentry/PagerDuty)
5. Audit other environment variables for sensitive data

## 📞 Support

If you encounter issues:
- Check Supabase Edge Function logs
- Check GitHub Actions logs
- Check browser console for client errors
- Review `docs/security/OPENAI_KEY_MIGRATION.md`

---
**Migration Date**: March 7, 2026  
**Migration Author**: Claude (Codex)  
**Incident Reference**: OpenAI key leak notification (sk-pro...30A)

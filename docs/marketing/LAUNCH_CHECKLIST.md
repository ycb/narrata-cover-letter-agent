# Marketing Landing Page – Launch Checklist
**Use this as your step-by-step guide from screenshots → live site**

---

## ✅ **Pre-Launch Checklist**

### **Phase 1: Local Testing (15 min)**

- [ ] Run `npm install` (ensure all dependencies installed)
- [ ] Run `npm run dev`
- [ ] Visit `http://localhost:8082/` (or your dev port)
- [ ] Verify landing page loads at root `/`
- [ ] Click "Get Started (Free)" → should go to `/signup`
- [ ] Click "Sign In" → should go to `/signin`
- [ ] Click "Terms of Service" in footer → should go to `/terms`
- [ ] Click "Privacy Policy" in footer → should go to `/privacy`
- [ ] Test mobile responsive (DevTools → Device Toolbar)
- [ ] Check browser console (no errors)

**If all ✅, proceed to Phase 2**

---

### **Phase 2: Screenshots (1-2 hours)**

- [ ] Open staging environment
- [ ] Log in with test user (or create one)
- [ ] Upload resume (trigger PM Levels analysis)
- [ ] Create a draft (with job description)
- [ ] Perform human-in-loop edits (get to 80-90% score)
- [ ] Open Readiness accordion
- [ ] Open Saved Sections library

**Capture these 12 screenshots:**

- [ ] **Hero**: Full Draft Editor view (2-column layout, toolbar on left)
- [ ] **Before**: Blank Google Doc (create mockup if needed)
- [ ] **After**: Draft Editor (can reuse Hero screenshot)
- [ ] **Benefit 1**: PM Levels summary + extracted stories
- [ ] **Benefit 2**: Match Metrics Toolbar (all 7 sections visible)
- [ ] **Benefit 3**: Progress Banner (mid-streaming state)
- [ ] **Benefit 4**: Gap Banner + Enhance button
- [ ] **Benefit 5**: Saved Sections library modal
- [ ] **Step 1**: Resume upload + PM Levels screen
- [ ] **Step 2**: JD input + streaming labels
- [ ] **Step 3**: Draft Editor with streaming toolbar
- [ ] **Step 4**: Readiness accordion expanded

**Optimize screenshots:**

- [ ] Crop to relevant UI only (remove browser chrome)
- [ ] Blur or remove personal/sensitive data
- [ ] Resize to 1600px or 1920px wide
- [ ] Compress with Squoosh or TinyPNG (<200KB each)
- [ ] Convert to WebP format (optional but recommended)

**If all ✅, proceed to Phase 3**

---

### **Phase 3: Screenshot Replacement (30-60 min)**

- [ ] Create folder: `/public/marketing/`
- [ ] Save screenshots with these exact names:
  - [ ] `hero-draft-editor.webp`
  - [ ] `before-blank-doc.webp`
  - [ ] `after-narrata-editor.webp`
  - [ ] `benefit-1-pm-levels.webp`
  - [ ] `benefit-2-toolbar.webp`
  - [ ] `benefit-3-streaming.webp`
  - [ ] `benefit-4-gaps.webp`
  - [ ] `benefit-5-library.webp`
  - [ ] `step-1-upload.webp`
  - [ ] `step-2-jd-input.webp`
  - [ ] `step-3-draft.webp`
  - [ ] `step-4-readiness.webp`

- [ ] Open `/src/pages/LandingPage.tsx`
- [ ] Follow `SCREENSHOT_REPLACEMENT_TEMPLATE.md`
- [ ] Replace all 12 placeholder `<div>` blocks with `<img>` tags
- [ ] Save file

**Test locally:**

- [ ] Run `npm run dev` again
- [ ] Reload page (hard refresh: Cmd+Shift+R / Ctrl+Shift+R)
- [ ] Verify all 12 screenshots load (no broken images)
- [ ] Check Network tab (no 404 errors)
- [ ] Test mobile responsive (images scale correctly)

**If all ✅, proceed to Phase 4**

---

### **Phase 4: Analytics Setup (15 min)**

- [ ] Get LogRocket App ID from dashboard
- [ ] Get Pendo API key from dashboard
- [ ] Open `/index.html`
- [ ] Add LogRocket snippet before `</head>`
- [ ] Add Pendo snippet before `</body>`
- [ ] Save file

**Test analytics:**

- [ ] Run `npm run dev`
- [ ] Open browser console
- [ ] Type `window.LogRocket` → should return object (not `undefined`)
- [ ] Type `window.pendo` → should return object (not `undefined`)
- [ ] Click "Get Started (Free)" button
- [ ] Check LogRocket dashboard for `cta_clicked` event
- [ ] Check Pendo dashboard for `cta_clicked` event

**If all ✅, proceed to Phase 5**

---

### **Phase 5: Meta Tags & SEO (5 min)**

- [ ] Open `/index.html`
- [ ] Update `<title>` tag:
  ```html
  <title>Narrata – Personalized Cover Letters Built From Your Experience</title>
  ```
- [ ] Add meta description:
  ```html
  <meta name="description" content="Turn your resume into a reusable story library. Generate tailored cover letters with real-time job matching and feedback. Free during beta.">
  ```
- [ ] Add Open Graph tags (for social sharing):
  ```html
  <meta property="og:title" content="Narrata – Personalized Cover Letters Built From Your Experience">
  <meta property="og:description" content="Turn your resume into a reusable story library. Generate tailored cover letters with real-time job matching and feedback.">
  <meta property="og:image" content="https://narrata.co/OG-image.png">
  <meta property="og:url" content="https://narrata.co">
  ```
- [ ] Verify `viewport` meta tag exists:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ```

**If all ✅, proceed to Phase 6**

---

### **Phase 6: Production Build (5 min)**

- [ ] Run `npm run build`
- [ ] Wait for build to complete (should see `/dist` folder)
- [ ] Check build output (no errors)

**Test production build locally:**

- [ ] Run `npx serve dist` (or `npm run preview` if configured)
- [ ] Visit `http://localhost:3000` (or shown port)
- [ ] Verify landing page loads
- [ ] Test all CTAs work
- [ ] Check all screenshots load

**If all ✅, proceed to Phase 7**

---

### **Phase 7: Deploy to Production (15-30 min)**

**Option A: Vercel (Recommended)**

- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Login: `vercel login`
- [ ] Deploy: `vercel --prod`
- [ ] Note deployment URL (e.g., `narrata-xyz.vercel.app`)
- [ ] Go to Vercel dashboard → Project Settings → Domains
- [ ] Add custom domain: `narrata.co`
- [ ] Add www variant: `www.narrata.co` (optional)
- [ ] Copy DNS instructions from Vercel

**Option B: Netlify**

- [ ] Install Netlify CLI: `npm i -g netlify-cli`
- [ ] Login: `netlify login`
- [ ] Deploy: `netlify deploy --prod --dir=dist`
- [ ] Note deployment URL
- [ ] Go to Netlify dashboard → Domain Settings
- [ ] Add custom domain: `narrata.co`
- [ ] Copy DNS instructions from Netlify

**If all ✅, proceed to Phase 8**

---

### **Phase 8: DNS Configuration (10-60 min)**

- [ ] Go to your domain registrar (where you bought narrata.co)
- [ ] Find DNS settings
- [ ] Add A record (or CNAME, per Vercel/Netlify instructions):
  ```
  Type: A (or CNAME)
  Name: @
  Value: [IP or subdomain from Vercel/Netlify]
  TTL: 3600
  ```
- [ ] Add www CNAME (if using www):
  ```
  Type: CNAME
  Name: www
  Value: [subdomain from Vercel/Netlify]
  TTL: 3600
  ```
- [ ] Save DNS changes
- [ ] Wait 10-60 minutes for propagation

**Check DNS propagation:**

- [ ] Visit `https://dnschecker.org`
- [ ] Enter `narrata.co`
- [ ] Verify A record points to correct IP
- [ ] Try visiting `https://narrata.co` in browser

**If all ✅, proceed to Phase 9**

---

### **Phase 9: Post-Deploy QA (30 min)**

**Desktop testing:**

- [ ] Visit `https://narrata.co` in Chrome
- [ ] All sections load correctly
- [ ] All screenshots visible
- [ ] Click "Get Started (Free)" → goes to `/signup`
- [ ] Click "Sign In" → goes to `/signin`
- [ ] Footer links work

- [ ] Test in Safari (same checks)
- [ ] Test in Firefox (same checks)

**Mobile testing:**

- [ ] Visit on iPhone (or use DevTools → iPhone SE)
- [ ] Scroll through entire page (smooth, no layout breaks)
- [ ] Tap "Get Started (Free)" → goes to `/signup`
- [ ] Test in Android Chrome (if available)

**Performance testing:**

- [ ] Open Chrome DevTools → Lighthouse
- [ ] Run audit (Desktop mode)
- [ ] Check scores:
  - [ ] Performance: >90
  - [ ] Accessibility: >95
  - [ ] Best Practices: >90
  - [ ] SEO: >90
- [ ] If scores low, check recommendations and fix

**Analytics verification:**

- [ ] Click "Get Started (Free)" button
- [ ] Open LogRocket dashboard → Live Sessions
- [ ] Verify your session appears
- [ ] Check Events → `cta_clicked` logged
- [ ] Open Pendo dashboard
- [ ] Verify event tracked

**If all ✅, proceed to Phase 10**

---

### **Phase 10: Go Live Announcement (5 min)**

- [ ] Post announcement (Twitter, LinkedIn, etc.):
  ```
  🚀 Excited to launch Narrata's new landing page!
  
  Turn your resume into a reusable story library and generate 
  tailored cover letters in minutes.
  
  Free during beta → https://narrata.co
  ```

- [ ] Update any existing links (old marketing site, social bios, etc.)
- [ ] Send to beta users (email, Slack, etc.)

**Congrats! 🎉 Your landing page is live.**

---

## 📊 **Post-Launch Monitoring (Week 1)**

### **Daily (First 3 Days)**

- [ ] Check LogRocket → Live Sessions (are people visiting?)
- [ ] Check CTA click rate (Events → `cta_clicked`)
- [ ] Check signup conversion (`/signup` pageviews vs. new users)
- [ ] Monitor for errors (LogRocket → Errors tab)
- [ ] Check mobile vs. desktop traffic split

### **Weekly (Ongoing)**

- [ ] Review analytics funnel:
  - Landing page visits
  - CTA clicks
  - Signups started
  - Signups completed
- [ ] Calculate conversion rates:
  - Landing → CTA click: >10% target
  - CTA click → Signup: >50% target
- [ ] Identify drop-off points (heatmaps, scroll depth)
- [ ] Collect user feedback (DMs, support tickets, etc.)

---

## 🔧 **Troubleshooting**

### **Problem: Screenshots not loading**

**Symptom**: Broken image icons (🖼️) instead of screenshots

**Fix**:
1. Check `/public/marketing/` folder exists
2. Verify filenames match exactly (case-sensitive)
3. Check file extensions (`.webp` vs `.png`)
4. Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)
5. Check DevTools → Network tab for 404 errors

---

### **Problem: Page not loading at narrata.co**

**Symptom**: 404 or "Site not found"

**Fix**:
1. Check DNS propagation: `dig narrata.co` (should show correct IP)
2. Wait up to 60 minutes for DNS to propagate
3. Try `https://` instead of `http://`
4. Check Vercel/Netlify dashboard for deployment status
5. Verify domain added in hosting dashboard

---

### **Problem: CTA button goes to wrong page**

**Symptom**: Clicking "Get Started" shows 404

**Fix**:
1. Check `/signup` route exists in `App.tsx`
2. Verify build includes all routes (`npm run build`)
3. Check hosting config (Vercel/Netlify should auto-handle SPA routing)
4. If using custom server, add rewrite rules for client-side routing

---

### **Problem: Analytics not tracking**

**Symptom**: No events in LogRocket/Pendo

**Fix**:
1. Check browser console for errors
2. Type `window.LogRocket` → should return object
3. Verify App ID / API key correct in `index.html`
4. Check ad blocker disabled (test in incognito mode)
5. Check Network tab for blocked requests

---

### **Problem: Mobile layout broken**

**Symptom**: Text too small, images cut off

**Fix**:
1. Check `viewport` meta tag exists in `index.html`
2. Test in Chrome DevTools → Device Toolbar
3. Verify Tailwind responsive classes (`md:`, `lg:`) working
4. Check for hardcoded widths (should use `w-full` or `max-w-*`)

---

## ✅ **Launch Complete**

Once all checklist items are ✅, your landing page is officially live! 🎉

**Next Steps:**
- Monitor analytics daily (first week)
- Collect user feedback
- Iterate on copy/design based on data
- Consider A/B testing headlines (if conversion <10%)

---

**Total estimated time: 3-5 hours** (from screenshots to live site)

Good luck with the launch! 🚀



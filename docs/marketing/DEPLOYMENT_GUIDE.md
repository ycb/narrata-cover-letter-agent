# Marketing Landing Page – Deployment Guide
**Date**: December 1, 2025  
**Status**: Ready for Screenshot Replacement & Deploy  
**Target**: narrata.co

---

## ✅ **What's Been Built**

### **Component Created**
- **File**: `src/pages/LandingPage.tsx`
- **Route**: `/` (root path)
- **Framework**: React + TypeScript + Tailwind CSS
- **Design System**: Uses your existing Narrata brand styles
- **Analytics**: LogRocket + Pendo tracking hooks built-in

### **Features**
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ 9 screenshot placeholders (ready for your images)
- ✅ Single CTA throughout ("Get Started (Free)")
- ✅ Analytics tracking on CTA clicks (hero + bottom)
- ✅ Links to `/signup`, `/signin`, `/terms`, `/privacy`
- ✅ Uses your existing components (Button, Card, etc.)
- ✅ Matches your brand colors and typography (Poppins font)

---

## 📸 **Screenshot Replacement Instructions**

### **Quick Reference: Screenshot Locations**

All placeholders are marked with 📸 emoji and gray background. You'll find 9 total:

| # | Location | Placeholder Text | What to Replace |
|---|----------|------------------|-----------------|
| 1 | Hero section | "📸 Screenshot: Draft Editor (Full UI)" | Full Draft Editor view |
| 2 | Before/After (Before) | "📸 Before: Blank Document" | Blank Google Doc mockup |
| 3 | Before/After (After) | "📸 After: Narrata Editor" | Draft Editor screenshot |
| 4 | Benefit 1 | "📸 PM Levels + Stories" | PM Levels summary |
| 5 | Benefit 2 | "📸 Match Metrics Toolbar" | Toolbar with all 7 sections |
| 6 | Benefit 3 | "📸 Progress Banner" | Streaming progress UI |
| 7 | Benefit 4 | "📸 Gap Banner" | Section gaps + Enhance button |
| 8 | Benefit 5 | "📸 Saved Sections Library" | Library modal with tags |
| 9 | Step 1 | "📸 Resume upload + PM Levels" | Onboarding PM Level screen |
| 10 | Step 2 | "📸 JD input + streaming labels" | Job description input |
| 11 | Step 3 | "📸 Draft Editor with streaming toolbar" | Draft generation UI |
| 12 | Step 4 | "📸 Readiness accordion expanded" | Readiness evaluation |

---

### **How to Replace Screenshots**

#### **Option 1: Direct Image Replacement (Recommended)**

1. **Capture your screenshots** (PNG or WebP, optimize to <200KB each)
2. **Save to**: `/public/marketing/` folder (create if doesn't exist)
3. **Name convention**: 
   - `hero-draft-editor.webp`
   - `before-blank-doc.webp`
   - `after-narrata-editor.webp`
   - `benefit-1-pm-levels.webp`
   - `benefit-2-toolbar.webp`
   - `benefit-3-streaming.webp`
   - `benefit-4-gaps.webp`
   - `benefit-5-library.webp`
   - `step-1-upload.webp`
   - `step-2-jd-input.webp`
   - `step-3-draft.webp`
   - `step-4-readiness.webp`

4. **Find and replace in** `LandingPage.tsx`:

**Example for Hero Screenshot:**

Find this block:

```tsx
<div className="aspect-video bg-gradient-subtle flex items-center justify-center border rounded-lg">
  <div className="text-center p-8">
    <p className="text-muted-foreground text-sm mb-2">📸 Screenshot: Draft Editor (Full UI)</p>
    <p className="text-xs text-muted-foreground">Replace with actual product screenshot</p>
  </div>
</div>
```

Replace with:

```tsx
<img 
  src="/marketing/hero-draft-editor.webp" 
  alt="Narrata cover letter editor showing job insights and personalized draft content"
  className="w-full h-full object-cover rounded-lg"
/>
```

**Repeat for all 12 placeholders.**

---

#### **Option 2: Use `<img>` Tags (Faster)**

I can provide you a pre-made replacement file if you prefer. Just let me know when screenshots are ready.

---

### **Screenshot Optimization Tips**

Before adding screenshots:

1. **Crop carefully**: Remove sensitive/test data
2. **Optimize file size**: Use TinyPNG or Squoosh (<200KB target)
3. **Use WebP format**: Better compression, modern browser support
4. **Consistent sizing**: Aim for 1920×1080 or 1600×900 (16:9 aspect ratio)
5. **Add subtle blur to personal info** if needed

---

## 🔧 **Analytics Setup**

### **LogRocket Integration**

Add to `/index.html` (before closing `</head>`):

```html
<script>
  window._LRConfig = {
    appId: 'YOUR_LOGROCKET_APP_ID',
  };
  (function(l,o,g,r,o,c,k,e,t){
    // LogRocket snippet (get from LogRocket dashboard)
  })();
</script>
```

### **Pendo Integration**

Add to `/index.html` (before closing `</body>`):

```html
<script>
  (function(apiKey){
    (function(p,e,n,d,o){
      // Pendo snippet (get from Pendo dashboard)
    })('YOUR_PENDO_API_KEY');
  })();
</script>
```

### **Events Being Tracked**

The landing page automatically tracks:

- `cta_clicked` with `location: 'hero'` (hero CTA button)
- `cta_clicked` with `location: 'bottom'` (bottom CTA button)

You can add more tracking by calling:

```tsx
if (window.LogRocket) {
  window.LogRocket.track('event_name', { property: 'value' });
}
```

---

## 🚀 **Deployment Steps**

### **Pre-Deployment Checklist**

- [ ] Replace all 12 screenshot placeholders
- [ ] Add LogRocket snippet to `index.html`
- [ ] Add Pendo snippet to `index.html`
- [ ] Test CTA links (`/signup` works)
- [ ] Test on mobile (responsive design)
- [ ] Update meta description in `index.html` (see Copy doc)

---

### **Deploy to narrata.co**

#### **Step 1: Build Production Bundle**

```bash
npm run build
```

This creates an optimized production build in `/dist`.

---

#### **Step 2: Deploy to Hosting**

**Option A: Vercel (Recommended)**

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel --prod
   ```

4. Configure custom domain:
   - Go to Vercel dashboard → Project → Settings → Domains
   - Add `narrata.co`
   - Update DNS records as instructed

**Option B: Netlify**

1. Install Netlify CLI:
   ```bash
   npm i -g netlify-cli
   ```

2. Login:
   ```bash
   netlify login
   ```

3. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

4. Configure custom domain:
   - Go to Netlify dashboard → Domain Settings
   - Add custom domain `narrata.co`

**Option C: Manual Deploy (Any Static Host)**

1. Upload `/dist` folder contents to your web server
2. Configure server to:
   - Serve `index.html` for all routes (SPA routing)
   - Enable HTTPS
   - Point domain to server IP

---

### **Step 3: DNS Configuration**

**For narrata.co → Vercel/Netlify:**

Add these DNS records at your domain registrar:

**A Record:**
```
Type: A
Name: @
Value: [Vercel/Netlify IP - provided in dashboard]
TTL: 3600
```

**CNAME Record:**
```
Type: CNAME
Name: www
Value: [Your Vercel/Netlify subdomain]
TTL: 3600
```

**Wait 10-60 minutes** for DNS propagation.

---

### **Step 4: Verify Deployment**

Test these URLs:

- [ ] `https://narrata.co` → Landing page loads
- [ ] `https://narrata.co/signup` → Signup page loads
- [ ] `https://narrata.co/signin` → Signin page loads
- [ ] `https://narrata.co/terms` → Terms page loads
- [ ] `https://narrata.co/privacy` → Privacy page loads
- [ ] CTA buttons link correctly
- [ ] Analytics tracking fires (check LogRocket/Pendo dashboard)

---

## 🧪 **Testing Checklist**

### **Desktop Testing**

- [ ] **Chrome**: All sections render, CTAs work
- [ ] **Safari**: All sections render, CTAs work
- [ ] **Firefox**: All sections render, CTAs work

### **Mobile Testing**

- [ ] **iPhone Safari**: Responsive layout, CTAs tappable
- [ ] **Android Chrome**: Responsive layout, CTAs tappable
- [ ] **iPad**: Tablet breakpoint works

### **Analytics Testing**

- [ ] Hero CTA click tracked in LogRocket
- [ ] Bottom CTA click tracked in LogRocket
- [ ] Hero CTA click tracked in Pendo
- [ ] Bottom CTA click tracked in Pendo

### **Performance Testing**

Run Lighthouse audit:

```bash
npm run build
npx serve dist
# Open Chrome DevTools → Lighthouse → Run audit
```

**Target Scores:**
- Performance: >90
- Accessibility: >95
- Best Practices: >95
- SEO: >90

---

## 🔄 **Post-Launch Updates**

### **To Update Copy**

Edit `/src/pages/LandingPage.tsx` directly:

1. Change text in JSX
2. Run `npm run build`
3. Deploy updated `/dist` folder

### **To Swap Screenshots**

Replace images in `/public/marketing/`:

1. Upload new screenshot (same filename)
2. Clear CDN cache (if using Vercel/Netlify)
3. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)

### **To A/B Test Headlines**

Consider using:
- **Vercel Edge Config** (for Vercel deploys)
- **Google Optimize** (free A/B testing)
- **Feature flags** in code

---

## 📊 **Success Metrics to Track**

### **Week 1 Goals**

- **Traffic**: Baseline visits to landing page
- **CTA Click Rate**: >10% of visitors click "Get Started"
- **Signup Conversion**: >50% of CTA clicks complete signup
- **Time on Page**: >30 seconds average

### **LogRocket Funnels to Create**

1. **Landing → Signup → Dashboard**
   - Step 1: Visit `/`
   - Step 2: Click CTA
   - Step 3: Complete signup (`/signup` → `/dashboard`)

2. **Drop-off Analysis**
   - Where do users scroll to?
   - Which screenshots get most attention?
   - Do users click screenshots (thinking they're interactive)?

### **Pendo Guides to Consider**

- **First-time visitor tooltip** on hero CTA
- **Exit intent modal** if user tries to leave without clicking CTA

---

## 🐛 **Troubleshooting**

### **Issue: Screenshots Not Loading**

**Symptom**: Broken image icons or 404 errors

**Fix**:
1. Check images are in `/public/marketing/` (NOT `/src/assets/`)
2. Verify filenames match exactly (case-sensitive)
3. Check file extensions (`.webp` vs `.png`)
4. Clear browser cache

---

### **Issue: CTA Links to Wrong Page**

**Symptom**: Clicking "Get Started" goes to 404

**Fix**:
1. Verify `/signup` route exists in `App.tsx`
2. Check BrowserRouter is wrapping the app
3. Test locally first: `npm run dev` → click CTA

---

### **Issue: Analytics Not Tracking**

**Symptom**: No events in LogRocket/Pendo dashboard

**Fix**:
1. Open browser DevTools → Console
2. Type `window.LogRocket` or `window.pendo`
3. If `undefined`, check script tags in `index.html`
4. Verify App ID / API key is correct
5. Check network tab for blocked requests (ad blockers)

---

### **Issue: Mobile Layout Broken**

**Symptom**: Text too small, images cut off

**Fix**:
1. Add viewport meta tag to `index.html`:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```
2. Test in Chrome DevTools → Device Toolbar
3. Check Tailwind responsive classes (`md:`, `lg:` breakpoints)

---

## 📝 **Next Steps After Launch**

1. **Monitor analytics** for first 48 hours
2. **Collect feedback** from early visitors
3. **A/B test headlines** (if conversion <10%)
4. **Add testimonials** when you have user quotes
5. **Create demo video** to replace hero screenshot (optional)
6. **SEO optimization**: Add blog, FAQ section (later)

---

## 🆘 **Need Help?**

If you encounter issues:

1. Check browser console for errors
2. Verify all dependencies installed (`npm install`)
3. Test in local dev mode first (`npm run dev`)
4. Check Vercel/Netlify build logs
5. Ensure DNS records propagated (use `dig narrata.co`)

---

**The landing page is production-ready once screenshots are added!** 🚀

Let me know when you have screenshots and I can help with the final replacement step.



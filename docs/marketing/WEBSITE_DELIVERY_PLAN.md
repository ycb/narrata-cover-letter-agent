# Marketing Website Delivery Plan
**Date**: December 1, 2025  
**Status**: Ready to Execute  
**Owner**: Product/Marketing Team

---

## 🎯 **Objective**

Launch a high-converting, MVP-scoped marketing landing page for Narrata that:
- Communicates core value proposition clearly
- Drives signups via single CTA ("Get Started (Free)")
- Uses real product screenshots to build credibility
- Sets realistic beta expectations

---

## 📋 **What You Have (Ready)**

### ✅ **Copy & Content**
- [x] Final landing page copy (`LANDING_PAGE_COPY_FINAL.md`)
- [x] Meta description (157 chars, SEO-optimized)
- [x] Hero headline + subheadline
- [x] 5 core benefits with headlines
- [x] 4-step "How It Works" flow
- [x] Single CTA copy
- [x] Mandatory phrases validated

### ✅ **Documentation**
- [x] Screenshot specifications (`SCREENSHOT_SPECIFICATIONS.md`)
- [x] Deliverable summary (`LANDING_PAGE_DELIVERABLE_SUMMARY.md`)
- [x] Asset checklist (9 screenshots mapped)
- [x] Approval criteria defined

### ✅ **Product Foundation**
- [x] Signup page functional (`/signup`)
- [x] TOU/PP compliance implemented
- [x] Product UI stable (Draft Editor, Match Metrics Toolbar)
- [x] Staging environment available

---

## 📸 **What You Need: Screenshots (9 Total)**

### **Critical Path: Screenshot Capture**

I can help you capture these from your staging environment. For each one, I need:

#### **1. Hero Screenshot - Draft Editor (Full UI)**
**What to capture**:
- Full Draft Editor view (2-column layout)
- Match Metrics Toolbar on left showing all 7 sections with realistic scores
- Draft content on right (3-4 sections visible with real text)
- Post-HIL state (strong scores: 80-90% range)

**Questions for you**:
- [ ] What's your staging URL? (e.g., `localhost:8082` or `staging.narrata.app`)
- [ ] Do you have test data ready? (test user with resume uploaded + draft generated)
- [ ] Should I use browser automation to capture these, or will you capture manually?

---

#### **2. Match Metrics Toolbar Close-up**
**What to capture**:
- Toolbar only (no draft content)
- All 7 sections collapsed showing summary values
- Scores: Gaps (2), Goals (87%), Strengths (2/3), Core (8/10), Pref (3/4), Score (85%), Readiness (Strong)

**Questions**:
- [ ] Same test data as #1, or different scenario?

---

#### **3. Progress Banner (Streaming State)**
**What to capture**:
- Banner showing mid-streaming (40-60% progress)
- Stage labels with checkmarks: ✓ Analyze JD, ✓ Extract reqs, ● Match goals (active)
- "Drafting your cover letter…" visible

**Questions**:
- [ ] Can I trigger streaming in staging, or do you have a recording I can screenshot?

---

#### **4. Gap Banner + Enhance Button**
**What to capture**:
- Single ContentCard showing gap banner
- Warning color banner: "2 requirements not addressed: Cross-functional leadership, Data-driven..."
- "Enhance" and "Add Metrics" buttons visible

**Questions**:
- [ ] Pre-HIL draft scenario needed (with unresolved gaps)

---

#### **5. Saved Sections Library**
**What to capture**:
- Library modal showing 4-6 saved sections
- Each card: title, preview text, tags (Growth, Platform, Leadership), usage count
- Realistic variety of tags

**Questions**:
- [ ] Do you have test data with saved sections, or should I seed some?

---

#### **6. PM Levels Inference (Onboarding)**
**What to capture**:
- Resume upload screen showing PM Level assessment
- Level badge: "Senior PM" (or similar)
- Confidence score, competency scores, specialization tags visible

**Questions**:
- [ ] Onboarding flow screenshot, or PM Levels profile page?

---

#### **7. JD Input + Streaming Analysis**
**What to capture**:
- JD text area with real job posting (5-10 lines visible)
- Streaming stages below: ✓ "Analyzing job description", ● "Extracting requirements"
- Live counts appearing (if available)

**Questions**:
- [ ] Can I paste a test JD and capture mid-stream?

---

#### **8. Readiness Accordion (Expanded)**
**What to capture**:
- Readiness section expanded showing:
  - Verdict: "Strong" badge
  - Summary text
  - 10-dimension breakdown (Strong/Sufficient/Insufficient)
  - 3 improvement bullets

**Questions**:
- [ ] Readiness feature enabled in staging? (flag: `ENABLE_DRAFT_READINESS`)

---

#### **9. Before/After Comparison**
**What to capture**:
- **Before panel**: Blank Google Doc screenshot (you provide or I mock up)
- **After panel**: Narrata Draft Editor (#1 repurposed)

**Questions**:
- [ ] Should I create the blank doc mockup, or do you have design assets?

---

## 🛠️ **What You Need: Technical Setup**

### **Option A: Static Landing Page (Recommended for MVP)**

**Pros**:
- Fast to deploy
- No backend needed
- Easy to A/B test
- Cheap hosting (Vercel, Netlify, GitHub Pages)

**Cons**:
- CTA must redirect to `/signup` on main app

**Tech Stack**:
- HTML/CSS/JS (Tailwind for styling)
- OR Webflow/Framer (no-code)
- OR Astro/Next.js static export

**Questions**:
- [ ] Do you want me to build this in code, or hand off to no-code tool?
- [ ] Where should it be hosted? (same domain as app, or separate?)
- [ ] What's your preference: Tailwind (matches app), vanilla CSS, or no-code?

---

### **Option B: Integrated Landing Page (In-App Route)**

**Pros**:
- Same codebase as main app
- Easy to track analytics end-to-end
- Shared components/styling

**Cons**:
- Slower iteration (requires dev deploy)
- Couples marketing site to app

**Implementation**:
- New route: `/` or `/landing` in `App.tsx`
- New component: `LandingPage.tsx` in `src/pages/`
- Reuse existing components (Button, Card, etc.)

**Questions**:
- [ ] Do you want the landing page at `/` (replacing current root)?
- [ ] Should unauthenticated users see landing page, authenticated users see dashboard?

---

## 📊 **What You Need: Analytics & Tracking**

To measure conversion, you need:

**1. CTA Click Tracking**
- [ ] Google Analytics / Plausible / PostHog installed?
- [ ] Event tracking for "Get Started" button clicks
- [ ] Conversion funnel: Landing → Signup → Dashboard

**2. Scroll Depth Tracking** (optional)
- [ ] Track how far users scroll
- [ ] Identify where users drop off

**3. A/B Testing** (future)
- [ ] Test alternate headlines
- [ ] Test different screenshot arrangements

**Questions**:
- [ ] What analytics tool are you using?
- [ ] Do you have tracking IDs ready?
- [ ] Should I add UTM parameter support for campaigns?

---

## 🎨 **What You Need: Design (Optional)**

The copy doc provides structure, but you may want:

**Option 1: Skip Design Phase (Use Screenshots + Tailwind)**
- Arrange screenshots per copy doc
- Use Tailwind typography + spacing
- Mobile-responsive grid

**Option 2: Design Mockups First**
- Hire designer for high-fidelity mockups
- Get visual polish (colors, spacing, animations)
- Hand off to developer

**Questions**:
- [ ] Do you want polished design, or functional MVP first?
- [ ] Do you have brand colors/fonts defined?
- [ ] Should I match existing app styling (from SignUp.tsx)?

---

## 🚀 **Execution Plan (3 Options)**

### **Fast Track (3-5 Days)**
*Best for: MVP validation, quick launch*

**Day 1-2**: Screenshot capture
- I use browser automation to capture all 9 screenshots from staging
- You review and approve

**Day 3**: Build static HTML page
- I build landing page using Tailwind (matches your app styling)
- Mobile-responsive, single CTA
- Screenshots embedded per copy doc

**Day 4**: Deploy + Analytics
- Deploy to Vercel/Netlify
- Add Google Analytics tracking
- Test CTA → `/signup` flow

**Day 5**: QA + Launch
- Mobile/desktop testing
- Fix any issues
- Go live

**What I need from you**:
- Staging URL + test credentials
- Analytics tracking ID
- Domain/subdomain for deployment

---

### **Polished Track (1-2 Weeks)**
*Best for: Professional launch, design quality*

**Week 1**:
- Day 1-2: Screenshot capture
- Day 3-4: Design mockups (designer creates high-fidelity designs)
- Day 5: Design review + revisions

**Week 2**:
- Day 1-3: Development (build from designs)
- Day 4: QA testing
- Day 5: Deploy + launch

**What I need from you**:
- Designer contact (or design tool access)
- Brand guidelines (colors, fonts, logo)
- Approval workflow for designs

---

### **No-Code Track (2-3 Days)**
*Best for: Non-technical team, fast iteration*

**Day 1**: Screenshot capture
- Same as Fast Track

**Day 2**: Webflow/Framer build
- I or you build page in no-code tool
- Drag-drop screenshots
- Copy-paste text from copy doc

**Day 3**: Publish + Analytics
- Connect domain
- Add tracking
- Test CTA flow

**What I need from you**:
- Webflow/Framer account (or I create one)
- Domain DNS access

---

## ✅ **Decision Matrix: What to Choose**

| Criteria | Fast Track | Polished Track | No-Code Track |
|----------|-----------|----------------|---------------|
| Time to launch | 3-5 days | 1-2 weeks | 2-3 days |
| Design quality | Basic | High | Medium |
| Iteration speed | Fast | Slow | Fastest |
| Cost | Free (DIY) | $$$ (designer) | $ (tool sub) |
| Technical skill needed | Low | Medium | None |
| Recommended for | MVP testing | Public launch | Marketing-led |

**My Recommendation**: **Fast Track** for MVP beta launch
- You're in beta, speed > polish
- Screenshots will carry most of the credibility
- You can upgrade to Polished Track later

---

## 📝 **Immediate Next Steps (To Unblock)**

Please answer these questions so I can proceed:

### **A. Screenshot Capture**
1. **Staging environment URL**: `_____________`
2. **Test user credentials**: `_____________`
3. **Capture method**: 
   - [ ] I'll use browser automation (you approve screenshots)
   - [ ] You'll capture manually (I provide checklist)
4. **Readiness feature enabled?**: [ ] Yes [ ] No
5. **Existing test data ready?**: [ ] Yes [ ] No (need to seed)

### **B. Build Approach**
1. **Landing page type**:
   - [ ] Static site (separate from app)
   - [ ] In-app route (integrated with main app)
   - [ ] No-code tool (Webflow/Framer)
2. **Timeline preference**:
   - [ ] Fast Track (3-5 days)
   - [ ] Polished Track (1-2 weeks)
   - [ ] No-Code Track (2-3 days)

### **C. Deployment**
1. **Domain**: `_____________` (e.g., `narrata.app` or `landing.narrata.app`)
2. **Analytics**: 
   - [ ] Google Analytics (ID: `_____________`)
   - [ ] Plausible
   - [ ] PostHog
   - [ ] None yet
3. **Hosting preference**:
   - [ ] Vercel
   - [ ] Netlify
   - [ ] Same as main app
   - [ ] Other: `_____________`

---

## 🎬 **Once You Answer, I Can:**

1. **Capture all 9 screenshots** (using browser automation or checklist)
2. **Build landing page** (code or no-code, your choice)
3. **Set up analytics tracking** (CTA clicks, scroll depth)
4. **Deploy to staging** (for your review)
5. **Deploy to production** (once approved)

**Estimated total time (Fast Track)**: 3-5 days from your answers

---

## 📦 **Deliverables You'll Receive**

1. ✅ 9 optimized screenshots (WebP format, <200KB each)
2. ✅ Landing page (HTML/CSS or no-code project)
3. ✅ Mobile-responsive design
4. ✅ Analytics tracking configured
5. ✅ Deployed to your domain
6. ✅ QA report (tested on Chrome, Safari, mobile)

---

**Ready to proceed? Just answer sections A, B, and C above and I'll start immediately.** 🚀


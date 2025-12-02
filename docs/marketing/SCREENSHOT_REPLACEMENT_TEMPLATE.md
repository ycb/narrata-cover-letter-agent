# Screenshot Replacement – Quick Reference
**Use this as a checklist when you're ready to add real product screenshots**

---

## 📸 **Screenshot Checklist**

### **Before You Start**

- [ ] All screenshots captured from staging
- [ ] Personal/test data removed or blurred
- [ ] Images optimized (<200KB each, WebP format recommended)
- [ ] Create folder: `/public/marketing/`

---

## 🔄 **Replacement Steps**

### **1. Save Your Screenshots**

Place these files in `/public/marketing/`:

```
/public/
  /marketing/
    hero-draft-editor.webp          # Full Draft Editor UI (Hero)
    before-blank-doc.webp            # Blank Google Doc mockup
    after-narrata-editor.webp        # Draft Editor (After panel)
    benefit-1-pm-levels.webp         # PM Levels summary + stories
    benefit-2-toolbar.webp           # Match Metrics Toolbar (all 7 sections)
    benefit-3-streaming.webp         # Progress Banner (streaming)
    benefit-4-gaps.webp              # Gap Banner + Enhance button
    benefit-5-library.webp           # Saved Sections Library
    step-1-upload.webp               # Resume upload + PM Levels
    step-2-jd-input.webp             # JD input + streaming labels
    step-3-draft.webp                # Draft Editor with toolbar
    step-4-readiness.webp            # Readiness accordion expanded
```

---

### **2. Find & Replace Placeholders**

Open `/src/pages/LandingPage.tsx` and replace each placeholder.

---

#### **Hero Screenshot**

**Find:**
```tsx
<div className="aspect-video bg-gradient-subtle flex items-center justify-center border rounded-lg">
  <div className="text-center p-8">
    <p className="text-muted-foreground text-sm mb-2">📸 Screenshot: Draft Editor (Full UI)</p>
    <p className="text-xs text-muted-foreground">Replace with actual product screenshot</p>
  </div>
</div>
```

**Replace with:**
```tsx
<img 
  src="/marketing/hero-draft-editor.webp" 
  alt="Narrata cover letter editor showing job insights and personalized draft content"
  className="w-full h-auto rounded-lg shadow-lg"
  loading="eager"
/>
```

---

#### **Before Panel (Blank Doc)**

**Find:**
```tsx
<div className="aspect-video bg-background flex items-center justify-center border rounded-lg relative">
  <div className="text-center p-8">
    <p className="text-muted-foreground text-sm mb-2">📸 Before: Blank Document</p>
    <p className="text-xs text-muted-foreground">Replace with blank doc mockup</p>
  </div>
  <div className="absolute bottom-4 left-4 right-4">
    <p className="text-sm font-medium text-foreground">Hours spent staring at a blank page…</p>
  </div>
</div>
```

**Replace with:**
```tsx
<div className="relative">
  <img 
    src="/marketing/before-blank-doc.webp" 
    alt="Blank document representing hours of frustration"
    className="w-full h-auto rounded-lg"
    loading="lazy"
  />
  <div className="absolute bottom-4 left-4 right-4 bg-black/50 p-3 rounded">
    <p className="text-sm font-medium text-white">Hours spent staring at a blank page…</p>
  </div>
</div>
```

---

#### **After Panel (Narrata Editor)**

**Find:**
```tsx
<div className="aspect-video bg-gradient-subtle flex items-center justify-center border rounded-lg relative">
  <div className="text-center p-8">
    <p className="text-muted-foreground text-sm mb-2">📸 After: Narrata Editor</p>
    <p className="text-xs text-muted-foreground">Replace with Draft Editor screenshot</p>
  </div>
  <div className="absolute bottom-4 left-4 right-4">
    <p className="text-sm font-medium text-foreground">A structured, personalized draft—plus clear guidance on how to improve it.</p>
  </div>
</div>
```

**Replace with:**
```tsx
<div className="relative">
  <img 
    src="/marketing/after-narrata-editor.webp" 
    alt="Narrata editor with structured, personalized draft content"
    className="w-full h-auto rounded-lg"
    loading="lazy"
  />
  <div className="absolute bottom-4 left-4 right-4 bg-black/50 p-3 rounded">
    <p className="text-sm font-medium text-white">A structured, personalized draft—plus clear guidance on how to improve it.</p>
  </div>
</div>
```

---

#### **Benefit Screenshots (5 total)**

For each benefit screenshot, **find the placeholder** and **replace** with:

**Benefit 1 (PM Levels):**
```tsx
<img 
  src="/marketing/benefit-1-pm-levels.webp" 
  alt="PM Levels assessment showing extracted strengths and stories"
  className="w-full h-auto rounded-lg shadow-md"
  loading="lazy"
/>
```

**Benefit 2 (Toolbar):**
```tsx
<img 
  src="/marketing/benefit-2-toolbar.webp" 
  alt="Match Metrics Toolbar showing job fit analysis"
  className="w-full h-auto rounded-lg shadow-md"
  loading="lazy"
/>
```

**Benefit 3 (Streaming):**
```tsx
<img 
  src="/marketing/benefit-3-streaming.webp" 
  alt="Real-time insights streaming during draft generation"
  className="w-full h-auto rounded-lg shadow-md"
  loading="lazy"
/>
```

**Benefit 4 (Gaps):**
```tsx
<img 
  src="/marketing/benefit-4-gaps.webp" 
  alt="Gap identification and enhancement suggestions"
  className="w-full h-auto rounded-lg shadow-md"
  loading="lazy"
/>
```

**Benefit 5 (Library):**
```tsx
<img 
  src="/marketing/benefit-5-library.webp" 
  alt="Saved sections library with auto-tagged content"
  className="w-full h-auto rounded-lg shadow-md"
  loading="lazy"
/>
```

---

#### **How It Works Screenshots (4 steps)**

**Step 1 (Upload):**
```tsx
<img 
  src="/marketing/step-1-upload.webp" 
  alt="Resume upload and PM Level identification"
  className="w-full h-auto rounded-lg"
  loading="lazy"
/>
```

**Step 2 (JD Input):**
```tsx
<img 
  src="/marketing/step-2-jd-input.webp" 
  alt="Job description parsing and real-time analysis"
  className="w-full h-auto rounded-lg"
  loading="lazy"
/>
```

**Step 3 (Draft Generation):**
```tsx
<img 
  src="/marketing/step-3-draft.webp" 
  alt="Personalized cover letter draft generated from your stories"
  className="w-full h-auto rounded-lg"
  loading="lazy"
/>
```

**Step 4 (Readiness):**
```tsx
<img 
  src="/marketing/step-4-readiness.webp" 
  alt="Readiness evaluation showing what to fix"
  className="w-full h-auto rounded-lg"
  loading="lazy"
/>
```

---

## ✅ **After Replacing All Screenshots**

1. **Test locally:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:8082/` (or your dev port)

2. **Check all images load**:
   - Open browser DevTools → Network tab
   - Look for 404 errors
   - Verify all 12 images loaded

3. **Test responsive design**:
   - DevTools → Toggle Device Toolbar
   - Test iPhone SE, iPad, Desktop sizes

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Deploy** (see DEPLOYMENT_GUIDE.md)

---

## 🎨 **Image Optimization Tips**

**Before adding to `/public/marketing/`:**

1. **Resize to standard width**: 1600px or 1920px wide
2. **Compress**: Use [Squoosh.app](https://squoosh.app) or TinyPNG
3. **Convert to WebP**: Better compression, smaller file size
4. **Target file size**: <200KB per screenshot (aim for <100KB)
5. **Blur sensitive data**: Use Photoshop/Figma blur tool

**Quick WebP conversion:**
```bash
# Install imagemagick
brew install imagemagick  # macOS
# or: sudo apt-get install imagemagick  # Linux

# Convert PNG to WebP
convert input.png -quality 85 output.webp
```

---

## 🔍 **Testing Checklist**

After replacement:

- [ ] All 12 screenshots visible (no broken images)
- [ ] Images don't look pixelated or stretched
- [ ] Mobile layout still responsive
- [ ] Page loads in <3 seconds
- [ ] No console errors
- [ ] Alt text accurate for accessibility
- [ ] File sizes reasonable (<2MB total for all images)

---

**You're all set!** Once screenshots are replaced, the landing page is production-ready. 🚀



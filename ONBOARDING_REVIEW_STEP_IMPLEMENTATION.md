# Onboarding Review Step Implementation Plan

## 🎯 **Project Context**

This document outlines the implementation plan for the Review step in the Narrata onboarding flow. The Content step is complete with error handling and validation. The Welcome step is working correctly with progress bar.

## 📋 **Current Status**

### ✅ **Completed:**
- **Welcome Step**: Progress bar working, value proposition clear
- **Content Step**: File uploads, LinkedIn URL validation, error handling, paste functionality
- **Error States**: Comprehensive validation for file size, type, and LinkedIn URL format
- **UX Improvements**: Content-focused messaging, hover interactions, success states

### 🔄 **In Progress:**
- **Review Step**: Tinder-style content review and approval interface

## 🎯 **Review Step Requirements**

### **Core Functionality:**
- **Tinder-style interface** for content review and approval
- **Chunked processing** to reduce wait times between Content and Review
- **Three-step review process** to break up processing time

### **Content Sources to Review:**

#### **1. Work History (from LinkedIn)**
- **Company** name
- **Role** title  
- **Role Summary** + **Metrics** + **Stories**
- User approval for each work item

#### **2. Resume Content**
- **Extract Metrics** (achievements, KPIs, results)
- **Extract Stories** (accomplishments, projects, impact)
- User approval for each metric and story

#### **3. Cover Letter Content**
- **Extract Metrics** (key achievements, quantified results)
- **Extract Stories** (success stories, project examples)
- **Create Saved Sections** (intro, body paragraphs, closer, signature)
- **Construct cover letter template** from approved content

## 🏗️ **Technical Implementation**

### **Processing Strategy:**
- **Immediate processing** starts on file upload/URL submission
- **Background processing** with progress indicators
- **Chunked results** to reduce perceived wait time
- **Optimistic UI** - show results as they become available

### **Review Interface Design:**
```
┌─────────────────────────────────────┐
│  [Company] [Role] [Duration]        │
│  Role Summary: [extracted text]    │
│  Metrics: [bullet points]          │
│  Stories: [accomplishments]        │
│                                     │
│  [✓ Approve] [✗ Skip] [→ Next]    │
└─────────────────────────────────────┘
```

### **Three-Step Review Process:**
1. **Work History Review** - LinkedIn data approval
2. **Resume Content Review** - Metrics and stories approval  
3. **Cover Letter Review** - Template construction and approval

## 📁 **File Structure**

### **New Components Needed:**
```
src/components/onboarding/review/
├── ReviewStep.tsx                 # Main review container
├── WorkHistoryReview.tsx          # LinkedIn work history review
├── ResumeContentReview.tsx        # Resume metrics and stories
├── CoverLetterReview.tsx         # Cover letter template construction
├── ContentCard.tsx               # Reusable content card component
├── ApprovalControls.tsx          # Approve/Skip/Next controls
└── ProcessingIndicator.tsx        # Background processing status
```

### **Updated Files:**
- `src/pages/NewUserOnboarding.tsx` - Add Review step logic
- `src/components/onboarding/FileUploadCard.tsx` - Trigger background processing

## 🔄 **Data Flow**

### **Processing Pipeline:**
1. **File Upload** → Immediate UI success
2. **Background Processing** → Extract content, metrics, stories
3. **Chunked Results** → Show work history first, then resume, then cover letter
4. **User Review** → Approve/skip each piece of content
5. **Template Construction** → Build cover letter template from approved content
6. **Profile Creation** → Save approved content to user profile

### **Content Mapping to User Profile:**

#### **Work History (LinkedIn Data)**
- **Company** → `companies` table (name, logo, description, tags)
- **Role** → `work_items` table (title, dates, description, achievements)
- **Role Summary + Metrics + Stories** → `approved_content` table (individual blurbs with confidence levels)
- **Skills** → `linkedin_profiles.skills` array (extracted from LinkedIn profile)

#### **Resume Content**
- **Metrics** → `work_items.achievements` array + `approved_content` table
- **Stories** → `approved_content` table with vector embeddings for semantic matching

#### **Cover Letter Content**
- **Metrics & Stories** → `approved_content` table (reusable blurbs)
- **Saved Sections** → `cover_letter_templates.sections` JSONB
- **Cover Letter Template** → `cover_letter_templates` table with section structure

#### **LinkedIn Skills**
- **Skills List** → `linkedin_profiles.skills` array (for skill-based matching and content suggestions)

### **State Management:**
```typescript
interface ReviewData {
  workHistory: WorkHistoryItem[];
  resumeMetrics: Metric[];
  resumeStories: Story[];
  coverLetterSections: CoverLetterSection[];
  approvedContent: {
    workHistory: WorkHistoryItem[];
    metrics: Metric[];
    stories: Story[];
    sections: CoverLetterSection[];
  };
}
```

## 🎨 **UX Considerations**

### **Loading States:**
- **Processing Indicator**: "Analyzing your content..."
- **Chunked Progress**: "Work history ready", "Resume analysis complete"
- **Review Progress**: "3 of 5 items reviewed"

### **Error Handling:**
- **Processing Failures**: Retry mechanisms for failed extractions
- **Partial Success**: Show available content, indicate missing pieces
- **Network Issues**: Offline handling and sync when reconnected

### **User Experience:**
- **Quick Actions**: Swipe gestures for approve/skip
- **Batch Operations**: "Approve all" for similar content
- **Preview Mode**: See how content will appear in final profile
- **Edit Capability**: Modify extracted content before approval

## 🚀 **Implementation Phases**

### **Phase 1: Core Review Interface**
- [ ] Create `ReviewStep.tsx` component
- [ ] Implement `ContentCard.tsx` for content display
- [ ] Add `ApprovalControls.tsx` for user actions
- [ ] Integrate with existing onboarding flow

### **Phase 2: Content Processing**
- [ ] Implement background processing triggers
- [ ] Add `ProcessingIndicator.tsx` for status updates
- [ ] Create chunked result delivery system
- [ ] Handle processing errors and retries

### **Phase 3: Content-Specific Review**
- [ ] Build `WorkHistoryReview.tsx` for LinkedIn data
- [ ] Create `ResumeContentReview.tsx` for resume analysis
- [ ] Develop `CoverLetterReview.tsx` for template construction
- [ ] Implement content editing capabilities

### **Phase 4: Integration & Polish**
- [ ] Connect to backend processing services
- [ ] Add comprehensive error handling
- [ ] Implement user preferences and settings
- [ ] Add analytics and tracking

## 🔧 **Technical Requirements**

### **Dependencies:**
- Existing file upload and validation system
- LinkedIn OAuth integration
- Background processing service
- Content extraction APIs
- User profile storage

### **Performance Considerations:**
- **Lazy Loading**: Load review content as needed
- **Caching**: Store processed content for quick access
- **Optimistic Updates**: Show content immediately, update on approval
- **Error Recovery**: Graceful handling of processing failures

## 📊 **Success Metrics**

### **User Experience:**
- **Completion Rate**: % of users who complete review step
- **Time to Complete**: Average time spent in review step
- **Content Approval Rate**: % of extracted content approved by users
- **User Satisfaction**: Feedback on review interface usability

### **Technical Performance:**
- **Processing Time**: Time from upload to first review content
- **Error Rate**: % of processing failures
- **Content Quality**: Accuracy of extracted metrics and stories
- **System Reliability**: Uptime and response times

## 🎯 **Next Steps**

1. **Start new chat session** with this implementation plan
2. **Begin with Phase 1**: Core review interface
3. **Focus on Tinder-style UX** for content approval
4. **Implement chunked processing** to reduce wait times
5. **Test with real content** to validate extraction quality

---

**Ready to begin implementation of the Review step with Tinder-style content approval interface!** 🚀

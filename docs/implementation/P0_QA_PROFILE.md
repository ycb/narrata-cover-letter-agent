# P0 QA Profile - Gap Detection Test Profile

**Purpose:** P0 is a synthetic profile designed specifically for QA of gap detection. It intentionally includes content that triggers all gap types.

## Profile Structure

### Role 1: GapTest Corp — Product Manager (2023-01–Present)
**Designed to trigger:**
- ✅ `missing_role_description` - No description provided
- ✅ `missing_role_metrics` - No metrics

**Resume content:**
```
• No description provided - this role intentionally has missing description
• Managed backlog items
• Worked on product features
```

### Role 2: NoMetrics Inc — Senior Product Manager (2020-03–2022-12)
**Designed to trigger:**
- ✅ `generic_role_description` - Contains vague language ("worked on things", "contributed to", "helped with")
- ✅ `insufficient_role_metrics` - Only 1 metric, but role has significant tenure (2+ years)

**Resume content:**
```
• Responsible for working on things and contributing to various projects
• Helped with development of features
• Assisted in launching products
• Improved some metrics by a small amount
```

### Role 3: GoodCo — Associate Product Manager (2018-01–2020-02)
**Designed as baseline:** Good content with proper metrics and STAR format
- ✅ No gaps (intentional - shows what good content looks like)

**Resume content:**
```
• Launched new cloud storage product that attracted 50,000 sign-ups in first 6 months, by addressing user onboarding friction and implementing streamlined signup flows
• Improved demo-to-close rates by 18% with better product messaging, which resulted in increased sales velocity and revenue growth
• Managed a project that reduced operational costs by $200,000 annually by optimizing infrastructure and automating manual processes
```

## Cover Letter Stories

### Story 1: Generic Content (GapTest Corp)
**Designed to trigger:**
- ✅ `too_generic` - Contains vague language ("involved in", "helped with")
- ✅ `incomplete_story` - Missing STAR format
- ✅ `missing_metrics` - No quantified metrics

**Content:**
> "In my current role at GapTest Corp, I've been involved in product development work. I've helped with planning and worked on improving things. I collaborated with different teams to make sure features got delivered."

### Story 2: Generic Content (NoMetrics Inc)
**Designed to trigger:**
- ✅ `too_generic` - Contains vague language ("responsible for", "contributed to", "helped with")
- ✅ `incomplete_story` - Missing STAR format
- ✅ `missing_metrics` - No quantified metrics

**Content:**
> "At NoMetrics Inc, I was responsible for working on product strategy. I contributed to decisions about what features to build. I helped with user research and assisted in analyzing data to understand user needs."

### Story 3: Good Story with STAR Format (GoodCo - Story 1)
**Designed as baseline:** Proper STAR format with metrics
- ✅ No gaps (intentional - shows what good content looks like)

**Content:**
> "At GoodCo, I launched a new cloud storage product that attracted 50,000 sign-ups in first 6 months. The situation was that our existing onboarding flow had high drop-off rates. My task was to identify friction points and streamline the signup process. I took action by redesigning the flow with progressive disclosure and async verification, which resulted in increased activation and revenue growth as measured by the 50,000 sign-ups and improved conversion rates."

### Story 4: Good Story with Accomplished Format (GoodCo - Story 2)
**Designed as baseline:** Proper "Accomplished [X] as measured by [Y], by doing [Z]" format with metrics
- ✅ No gaps (intentional - shows alternative good format)

**Content:**
> "I also improved demo-to-close rates by 18% with better product messaging. I analyzed our sales conversations and identified messaging gaps. I developed new positioning and training materials, resulting in measurable improvement in our sales pipeline."

## Expected Gap Detection Results

### Role-Level Gaps (work_item entity)
| Company | Gap Category | Severity | Description |
|---------|-------------|----------|-------------|
| GapTest Corp | `missing_role_description` | High | Missing role description |
| GapTest Corp | `missing_role_metrics` | Medium | No role-level metrics |
| NoMetrics Inc | `generic_role_description` | Medium/High | May be too generic |
| NoMetrics Inc | `insufficient_role_metrics` | Low | Few role-level metrics (< 3) |
| GoodCo | *(none)* | - | Baseline - good content |

### Story-Level Gaps (approved_content entity)
| Story Source | Gap Category | Severity | Description |
|-------------|--------------|----------|-------------|
| GapTest Corp (CL) | `too_generic` | Medium/High | May be too generic |
| GapTest Corp (CL) | `incomplete_story` | High | Missing narrative structure (STAR) |
| GapTest Corp (CL) | `missing_metrics` | Medium | No quantified metrics |
| NoMetrics Inc (CL) | `too_generic` | Medium/High | May be too generic |
| NoMetrics Inc (CL) | `incomplete_story` | High | Missing narrative structure (STAR) |
| NoMetrics Inc (CL) | `missing_metrics` | Medium | No quantified metrics |
| GoodCo (Resume) | *(none)* | - | Baseline - good content |
| GoodCo (CL) | *(none)* | - | Baseline - good content |

## Usage

To test gap detection:

1. **Switch to P0 in the UI:**
   - Use the synthetic profile selector to switch to P0

2. **View gaps in Work History:**
   - Navigate to Work History page
   - Check each role for gap banners
   - Verify orange borders on roles/stories with gaps

3. **Verify gap counts:**
   - Expected: 5 role-level gaps (2 + 2 + 1)
   - Expected: Multiple story-level gaps for GapTest Corp and NoMetrics Inc stories

4. **Test gap resolution:**
   - Use "Generate Content" button to resolve gaps
   - Verify gaps are marked as resolved

## Notes

- LinkedIn data processing requires active synthetic user. If P0 LinkedIn data isn't loaded, switch synthetic user manually or re-upload after switching.
- P0 is designed for QA only - not included in production synthetic profile set (P01-P10)
- All gap detection logic should be validated against P0's expected results


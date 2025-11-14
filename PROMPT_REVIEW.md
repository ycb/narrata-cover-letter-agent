# Prompt Review - Human-in-Loop Content Generation

**Date**: November 6, 2025
**Feature**: Phase 1 - AI-Assisted Content Creation
**File**: `src/prompts/contentGeneration.ts` (277 lines)

---

## Overview

This review covers all new prompts added for the human-in-loop content generation feature. These prompts enable AI-assisted enhancement of work history content, role descriptions, and cover letter sections while maintaining strict truth fidelity.

---

## System Prompt

### `CONTENT_GENERATION_SYSTEM_PROMPT`

**Purpose**: Global system instructions for all content generation tasks

**Key Principles**:
1. **Truth Fidelity**: Never fabricate or exaggerate
2. **Specificity**: Replace vague statements with concrete metrics
3. **Impact Focus**: Emphasize measurable outcomes over responsibilities
4. **Authenticity**: Maintain user's natural voice
5. **Brevity**: Be concise and impactful

**Critical Constraint**:
```
If you cannot address a gap with the provided work history facts,
respond with "I don't have sufficient information to address this gap"
rather than fabricating content.
```

**Strengths**:
- ✅ Clear fallback behavior prevents hallucinations
- ✅ Establishes hierarchy of principles
- ✅ Emphasizes truth-based content generation
- ✅ Short and focused (5 core principles)

**Review Status**: ✅ **APPROVED**

---

## Story Generation Prompt

### `buildStoryGenerationPrompt()`

**Purpose**: Generate/enhance STAR format stories for approved_content

**Input Parameters**:
- `gap`: The detected gap to address
- `existingContent`: Current story content (if any)
- `workHistoryContext`: User's work history with metrics and related stories
- `jobContext`: Optional job-specific context for tailoring

**Prompt Structure**:
1. **Role Definition**: "You are an expert career coach..."
2. **Constraints**: 6 critical rules including STAR format, truth fidelity, 2-4 sentence length
3. **User Context**: Current role, duration, available metrics
4. **Related Stories**: Up to 3 related stories for context (not to copy)
5. **Target Job Context**: Position, keywords, JD excerpt (optional)
6. **Gap Analysis**: Category, issue, suggestions
7. **Existing Content**: What user currently has
8. **Instructions**: 6-point checklist for output

**Key Features**:
- ✅ Enforces STAR format (Situation, Task, Action, Result)
- ✅ Includes available metrics explicitly
- ✅ Shows related stories without encouraging verbatim copying
- ✅ Tailors to job context when provided
- ✅ Limits to 2-4 sentences for brevity
- ✅ Explicit "Insufficient information" fallback

**Example Output Format**:
```
When I led the redesign of Acme's checkout flow, I identified that
cart abandonment was at 45% due to a complex 5-step process. I
simplified it to 2 steps and added one-click payment options,
reducing abandonment by 35% and increasing conversion revenue by $2M annually.
```

**Potential Improvements**:
- Consider adding negative examples (what NOT to do)
- Could specify tone (professional but not overly formal)

**Review Status**: ✅ **APPROVED**

---

## Role Description Prompt

### `buildRoleDescriptionPrompt()`

**Purpose**: Generate achievement-focused role descriptions for work_items

**Input Parameters**:
- `gap`: The detected gap to address
- `existingContent`: Current description (if any)
- `workHistoryContext`: User's work history with achievements

**Prompt Structure**:
1. **Role Definition**: "You are an expert career coach..."
2. **Constraints**: Focus on outcomes, 2-3 metrics required, 2-3 sentence length
3. **Role Context**: Title, company, duration
4. **Available Metrics**: List of metrics to use
5. **Key Achievements**: Story titles with metrics
6. **Gap Analysis**: Issue and suggestions
7. **Existing Description**: What user currently has
8. **Instructions**: 5-point checklist
9. **Format Example**: "Led [team size] at [Company], achieving..."

**Key Features**:
- ✅ Requires 2-3 specific metrics from provided list
- ✅ Avoids generic statements like "led the team" without context
- ✅ Results-focused, not task-focused
- ✅ Demonstrates scope (team size, budget, stakeholders)
- ✅ Provides concrete format example

**Example Output Format**:
```
Led a 12-person product team at TechCorp, achieving 40% increase in
user engagement through data-driven feature prioritization and reducing
time-to-market by 25% through agile process optimization.
```

**Potential Improvements**:
- Could add guidance on balancing scope vs. achievement
- Might benefit from examples of what NOT to include

**Review Status**: ✅ **APPROVED**

---

## Saved Section Prompt

### `buildSavedSectionPrompt()`

**Purpose**: Generate reusable cover letter sections (intro, closer, signature, custom)

**Input Parameters**:
- `gap`: The detected gap to address
- `existingContent`: Current section content (if any)
- `sectionType`: introduction | closer | signature | custom
- `workHistoryContext`: User's achievements and stories
- `jobContext`: Optional job-specific context

**Section-Specific Guidance**:

#### Introduction Sections
- **Purpose**: Open with compelling hook
- **Structure**: Hook → Value proposition → Relevance to role
- **Length**: 3-4 sentences
- **Examples Provided**:
  - Specific achievement hook: "When I led the redesign..."
  - Company research hook: "I was excited to see TechCorp's Series B..."
  - Passion/track record hook: "As a PM who has increased engagement by 40%..."

#### Closer Sections
- **Purpose**: Strong call-to-action and enthusiasm
- **Structure**: Restate value → Express enthusiasm → Call-to-action
- **Length**: 2-3 sentences
- **Examples Provided**:
  - Track record restatement: "My track record of delivering 25% revenue growth..."
  - Opportunity discussion: "I would welcome the opportunity to discuss..."

#### Signature Sections
- **Purpose**: Professional sign-off
- **Structure**: Simple professional closing
- **Length**: 1 sentence
- **Examples Provided**:
  - "Thank you for your consideration."
  - "I look forward to discussing this opportunity further."

#### Custom Sections
- **Purpose**: Flexible section content
- **Structure**: Depends on purpose
- **Length**: 2-4 sentences

**Key Features**:
- ✅ Section-specific guidance with examples
- ✅ Uses placeholders [Company], [Position] for reusability
- ✅ Avoids clichés like "I am writing to express my interest"
- ✅ References specific achievements with metrics
- ✅ Balances specificity with adaptability
- ✅ Multiple example approaches for each section type

**Placeholder Usage**:
```
As a PM who has increased user engagement by 40% across three products,
I'm drawn to [Company]'s mission to democratize [Industry/Field]. My
experience scaling products from 0 to 100K users aligns closely with
the [Position] role's focus on growth and user acquisition.
```

**Potential Improvements**:
- Could add more custom section examples (e.g., explaining career transitions)
- Might benefit from guidance on adapting for different seniority levels

**Review Status**: ✅ **APPROVED**

---

## Cross-Cutting Analysis

### Truth Fidelity Implementation

All prompts enforce truth fidelity through:
1. Explicit "NO fabrications" constraint in every prompt
2. "Insufficient information" fallback language
3. Reference to specific metrics lists
4. "Use ONLY facts from work history" reminders
5. System prompt reinforcement

**Assessment**: ✅ **STRONG** - Multiple layers of constraint ensure LLM stays grounded

---

### Context Provision

Each prompt provides rich context:
- Current role details (title, company, dates)
- Available metrics (explicit lists)
- Related stories/achievements
- Gap analysis (issue + suggestions)
- Existing content
- Optional job context for tailoring

**Assessment**: ✅ **COMPREHENSIVE** - LLM has sufficient context for quality generation

---

### Output Constraints

Consistent across prompts:
- Length limits (1-4 sentences depending on type)
- Format requirements (STAR, achievement-focused)
- Tone guidance (professional, specific)
- "Output ONLY content, no explanations" instruction

**Assessment**: ✅ **WELL-DEFINED** - Clear boundaries prevent verbose/meta responses

---

### Reusability

Prompts support reuse through:
- Placeholder syntax ([Company], [Position], [Industry/Field])
- Focus on transferable achievements
- Section-specific guidance for cover letters
- Job context parameter for tailoring

**Assessment**: ✅ **EXCELLENT** - Balances specificity with adaptability

---

## Potential Edge Cases

### 1. Insufficient Work History
**Scenario**: New grad or career changer with minimal achievements
**Current Handling**: "Insufficient information" fallback
**Recommendation**: Consider adding guidance for highlighting transferable skills

### 2. Overly Long Existing Content
**Scenario**: User has verbose paragraph that needs condensing
**Current Handling**: Implicit through "2-4 sentences" constraint
**Assessment**: ✅ **ADEQUATE** - Length constraint should handle this

### 3. Multiple Gaps Simultaneously
**Scenario**: Story missing both STAR format AND metrics
**Current Handling**: Prompt addresses one gap at a time
**Recommendation**: Already handled by multi-gap validation in service layer ✅

### 4. Job Context Conflicts
**Scenario**: User's experience doesn't match target role requirements
**Current Handling**: Implicit through "truth fidelity" constraint
**Assessment**: ✅ **ADEQUATE** - Will highlight honest mismatches

---

## Integration Points

### With Gap Detection Service
- ✅ Receives `Gap` objects with category, description, suggestions
- ✅ Addresses specific gap categories (incomplete_story, missing_metrics, generic_content)
- ✅ Gap suggestions incorporated into prompt instructions

### With Validation Logic
- ✅ Generated content will be validated against ALL gaps
- ✅ STAR format check validates structure
- ✅ Metrics detection validates quantified results
- ✅ Generic content check validates specificity

### With Content Saving
- ✅ Supports both replace (work history) and variation (cover letter) modes
- ✅ Job context determines variation creation
- ✅ Gap tags populated from generation context

---

## Cost & Performance Considerations

### Token Usage Estimate

**Per Generation**:
- System prompt: ~150 tokens
- User context (role + metrics + stories): ~400-600 tokens
- Gap analysis: ~50-100 tokens
- Instructions: ~200 tokens
- **Total Input**: ~800-1,050 tokens

**Output**:
- Generated content: ~100-200 tokens (2-4 sentences)

**Total per Request**: ~900-1,250 tokens

### Cost Projection (gpt-4o-mini pricing)
- Input: $0.150 per 1M tokens
- Output: $0.600 per 1M tokens
- **Per Generation**: ~$0.000135 - $0.000158 (~$0.00015)
- **Target**: <$0.05 per generation ✅ **WELL UNDER TARGET**

### Latency
- Estimated response time: 1-3 seconds
- Max tokens: 1000
- Temperature: 0.7

**Assessment**: ✅ **EXCELLENT** - Far below cost target, reasonable latency

---

## Recommendations

### High Priority (Should Address)
None - prompts are production-ready as-is.

### Medium Priority (Nice to Have)
1. **Add negative examples**: Show what NOT to do (generic statements, fabrications)
2. **Tone specification**: Add explicit tone guidance (e.g., "professional but conversational")
3. **Seniority adaptation**: Guide LLM to adjust language for IC vs. leadership roles

### Low Priority (Future Enhancement)
1. **Career transition support**: Specific guidance for career changers
2. **Industry-specific variants**: Tailor prompts for PM vs. Engineering vs. Design
3. **A/B testing framework**: Compare different prompt variants for quality

---

## Final Assessment

### Overall Rating: ✅ **PRODUCTION READY**

**Strengths**:
- Comprehensive truth fidelity constraints
- Rich contextual information provided
- Clear output specifications
- Section-specific guidance with examples
- Cost-efficient token usage
- Strong integration with service layer

**Weaknesses**:
- Minor: Could benefit from negative examples
- Minor: Seniority-level adaptation could be more explicit

**Deployment Recommendation**: ✅ **APPROVE FOR PHASE 2 INTEGRATION**

The prompts demonstrate:
- Deep understanding of PM career content
- Strong guardrails against hallucination
- Practical examples that guide LLM behavior
- Efficient token usage
- Clear integration points with gap detection and validation

**Next Steps**:
1. Integrate prompts into ContentGenerationModal (Phase 2)
2. Monitor generation quality through user feedback
3. Collect data for A/B testing different prompt variants
4. Consider adding negative examples based on real failure modes

---

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2025-11-06 | Initial prompt creation | Phase 1 implementation |
| 2025-11-06 | Added section-specific examples | Improve LLM guidance quality |
| 2025-11-06 | Added placeholder syntax | Enable content reusability |

---

## Appendix: Prompt Length Analysis

| Prompt Function | Lines | Tokens (est) | % of Context |
|-----------------|-------|--------------|--------------|
| `CONTENT_GENERATION_SYSTEM_PROMPT` | 10 | 150 | 15% |
| `buildStoryGenerationPrompt()` | 112 | 850 | 68% |
| `buildRoleDescriptionPrompt()` | 47 | 550 | 44% |
| `buildSavedSectionPrompt()` | 95 | 700 | 56% |

**Assessment**: All prompts fit comfortably within 8K context window with room for responses.

---

**Reviewed by**: Claude Code
**Review Date**: November 6, 2025
**Status**: ✅ APPROVED FOR PRODUCTION

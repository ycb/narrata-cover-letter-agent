# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Narrata is an AI-powered cover letter agent for Product Managers, built with React + TypeScript, Vite, Supabase, and OpenAI. The application helps users create compelling cover letters by analyzing their work history, detecting content quality gaps, and providing intelligent feedback.

**For comprehensive business and product context**, see `NARRATA_BUSINESS_CONTEXT_COMPREHENSIVE.md` - a detailed synthesis of strategic vision, market positioning, competitive landscape, go-to-market strategy, and product roadmap themes extracted from Notion business documentation.

## MCP Integration

This project has MCP (Model Context Protocol) servers configured for enhanced capabilities:

### Project-Scoped MCP Servers (`.mcp.json`)

**1. Supabase MCP Server**

Enables Claude Code to directly query the Supabase database, inspect schemas, and run SQL queries.

**Available Tools** (via `mcp__supabase__*` prefix):
- Database schema inspection
- SQL query execution
- Table data browsing

**Supabase Project**: `lgdciykgqwqhxvtbxcvo`

**2. Notion MCP Server**

Enables Claude Code to interact with Notion pages and databases.

**Available Tools** (via `mcp__notion__*` prefix):
- Search Notion pages
- Read page content
- Create and update pages
- Add comments
- Query databases

**Integration Token**: Configured in `.mcp.json`

**Important**: Ensure relevant Notion pages are connected to your integration at https://www.notion.so/profile/integrations

### Local MCP Servers (`~/.claude.json`)

**3. Playwright MCP Server**

Enables browser automation for testing and interaction.

**Available Tools** (via `mcp__playwright__*` prefix):
- Browser automation
- Screenshot capture
- Web page interaction
- E2E testing scenarios

**Note**: Local MCP servers (configured in `~/.claude.json`) are available across all projects, while project-scoped servers (`.mcp.json`) are only active in this repository.

To use MCP tools in Claude Code, prefix tool names with `mcp__<server>__*` (e.g., `mcp__supabase__*`, `mcp__notion__*`, `mcp__playwright__*`).

## GitHub CLI Integration

GitHub CLI (`gh`) is installed and authenticated as **ycb** for full repository access.

**Available Commands**:
```bash
gh repo view              # View repository info
gh issue list             # List issues
gh pr list                # List pull requests
gh pr create              # Create a new PR
gh issue create           # Create a new issue
gh release create         # Create a release
gh run list               # List workflow runs
```

**Repository**: `ycb/narrata-cover-letter-agent`

The CLAUDE.md file already includes detailed instructions for committing changes and creating PRs using `gh` CLI.

## Development Commands

### Core Development
```bash
npm install              # Install dependencies
npm run dev             # Start dev server (http://localhost:8080)
npm run build           # TypeScript compile + Vite build
npm run preview         # Preview production build
npm run lint            # Run ESLint
```

### Testing
```bash
npm test                # Run all tests with Vitest
npm run test:ui         # Open Vitest UI
```

### Utility Scripts
```bash
npm run model-comparison        # Test different AI models
npm run test:upload             # Test file upload flow
npm run test:clear              # Clear upload test data
npm run generate:fixtures       # Generate test fixtures from JSON
```

## Architecture Overview

### Data Layer

**Supabase Integration** (`src/lib/supabase.ts`):
- PKCE auth flow with auto-refresh tokens
- Custom storage key: `cover-letter-agent-auth`
- Timeout wrappers (10-15s) on all database operations to prevent hangs
- Helper functions: `getCurrentUser()`, `getUserProfile()`, `upsertUserProfile()`

**Data Flow Pattern**:
```
Component → Custom Hook → Service Layer → Supabase Client → Database
                ↓
          Local State (useState)
```

React Query is configured but **NOT heavily used**. The codebase uses custom hooks + direct Supabase calls instead.

**Key Database Tables**:
- `profiles` - User profiles with OAuth support
- `work_items` - Work experience entries
- `approved_content` - User-approved stories/content
- `saved_sections` - Reusable content sections
- `cover_letters` - Generated cover letters
- `gaps` - Content quality gaps (Phase 3 feature)
- `sources` - Uploaded file metadata
- `feedback` - User feedback system

### State Management

**Context Providers** (nested in App.tsx):
- `AuthContext` - Authentication state, user profile, OAuth handling
- `UserGoalsContext` - User goals/preferences (NOTE: Fixed legacy array format issue)
- `UserVoiceContext` - Voice/tone analysis storage
- `TourContext` - Onboarding tour state
- `UploadProgressContext` - File upload progress tracking
- `PrototypeContext` - Feature flag management

**Important Custom Hooks**:
- `useWorkHistory()` - Fetches companies, work items, approved content, external links
- `useDashboardData()` - Aggregates dashboard metrics via DashboardService
- `useFileUpload()` - Complex file upload orchestration (22KB file - handle with care)
- `useGapSummary()` - Gap detection aggregations
- `useContentItemsWithGaps()` - Content items with gap metadata
- `useFeedbackSubmission()` - Feedback system integration

### Service Layer

All business logic lives in `src/services/`. Key services:

**File Processing Pipeline**:
1. `fileUploadService.ts` (2,732 lines) - Orchestrates entire upload flow
   - Validation → Checksum → Deduplication → Storage Upload → Text Extraction → LLM Analysis → Database Record
   - Uses parallel processing for resume + cover letter analysis (4x faster than combined)
2. `textExtractionService.ts` - Multi-format extraction (PDF via pdfjs-dist, DOCX via mammoth.js)
3. `openaiService.ts` (769 lines) - LLM analysis with auto-healing for truncated responses

**Gap Detection Service** (`gapDetectionService.ts` - 1,330 lines):
- **Core Phase 3 Feature** - Detects 3 gap types:
  1. Story Completeness (missing STAR format/metrics)
  2. Missing Metrics (quantified results)
  3. Generic Content (LLM-as-judge for vague descriptions)
- Entity types: `work_item`, `approved_content`, `saved_section`
- Severity levels: high, medium, low
- Gap resolution tracking with reasons (`user_override`, `content_added`, etc.)
- Summary aggregations by content type and severity

**Other Key Services**:
- `dashboardService.ts` - Dashboard metrics aggregation
- `templateService.ts` - Cover letter template management
- `linkedinService.ts` / `linkedinOAuthService.ts` - LinkedIn OAuth + profile import
- `evaluationService.ts` - Content quality evaluation
- `feedbackService.ts` - User feedback collection

### Component Architecture

**Organization Pattern**:
```
src/components/
├── ui/                    # 56 Radix UI-based primitives (shadcn/ui pattern)
├── shared/                # Reusable cross-feature components
│   ├── ContentCard.tsx           # Standard content display card with gap banners
│   ├── ContentGapBanner.tsx      # DRY gap notification banner
│   └── ShowAllTemplate.tsx       # Reusable list template (19KB)
├── layout/                # Header and layout components
└── [feature]/             # Feature-specific components
    ├── assessment/
    ├── auth/
    ├── cover-letters/
    ├── dashboard/         # 26+ dashboard widgets
    ├── work-history/
    └── ...
```

**Key Design Patterns**:
- **DRY Components**: Use `ContentCard` and `ContentGapBanner` for consistent content display
- **Radix UI Primitives**: All UI components use Radix for accessibility
- **Composition**: Heavy use of children props and slot patterns
- **Custom Hooks Integration**: Components consume data via custom hooks, never direct Supabase calls

### Routing

React Router v6 with routes defined in `src/App.tsx`:

**Protected Routes** (require authentication):
- `/dashboard` - Main dashboard (default route)
- `/work-history` - Work experience management
- `/cover-letters` - Cover letter management
- `/saved-sections` - Reusable content sections
- `/assessment` - PM competency assessment
- `/show-all-stories` - Story library

**Public Routes**:
- `/signup`, `/signin`, `/forgot-password` - Authentication
- `/marketing` - Landing page

**Onboarding Routes**:
- `/new-user` - New user onboarding flow
- `/onboarding-dashboard` - Onboarding progress

### Prompts System

AI prompts live in `src/prompts/`:
- `resumeAnalysis.ts` - Resume parsing prompts
- `coverLetterAnalysis.ts` - Cover letter parsing
- `contentTagging.ts` - Tag generation
- `gapDetection.ts` - Gap detection prompts
- `evaluation.ts` - Quality evaluation

When modifying AI behavior, update these prompt files rather than hardcoding prompts in services.

## Important Code Patterns

### Path Aliases
Use `@/` for imports:
```typescript
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
```

### TypeScript Configuration
- `noImplicitAny: false` - Implicit any is allowed (tech debt)
- `strictNullChecks: false` - Null checks not enforced
- `noUnusedLocals: false` - Unused vars allowed
- When adding new features, still prefer strict typing for maintainability

### Error Handling
- Supabase operations use timeout wrappers to prevent hanging
- Always check for `error` in Supabase responses before using `data`
- Use toast notifications (`useToast()`) for user-facing errors

### File Upload Flow
When working with file uploads:
1. Validation happens in `fileUploadService.ts`
2. Text extraction delegates to `textExtractionService.ts`
3. LLM analysis happens in parallel for resume + cover letter
4. Progress tracked via `UploadProgressContext`
5. Never bypass the service layer - complex deduplication logic lives there

### Gap Detection Integration
When adding new content types:
1. Ensure entity type is added to gap detection service
2. Update `ContentGapBanner` display logic
3. Add corresponding dashboard widget if needed
4. Gap resolution must track reasons for analytics

## Testing Patterns

**Test Setup** (`src/test/setup.ts`):
- Mocks: `IntersectionObserver`, `ResizeObserver`, `window.matchMedia`, `window.scrollTo`
- Console silencing for cleaner output

**Running Individual Tests**:
```bash
npm test -- path/to/test.test.tsx          # Run specific test file
npm test -- --watch                         # Watch mode
npm test -- --coverage                      # Coverage report
```

**Test Organization**:
- Component tests: Co-located with components (`ComponentName.test.tsx`)
- Service tests: In `src/services/` directory
- Use React Testing Library patterns (query by role/text, not implementation details)

## Environment Variables

Required variables (see `.env.example`):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_OPENAI_API_KEY` - OpenAI API key
- `VITE_LINKEDIN_CUSTOM_CLIENT_ID` - LinkedIn OAuth (data fetching)
- `VITE_LINKEDIN_SUPABASE_CLIENT_ID` - LinkedIn OAuth (authentication)

Optional:
- `VITE_ENABLE_LOGROCKET=true` - Enable LogRocket session recording
- `VITE_ENABLE_FEEDBACK_SYSTEM=true` - Enable feedback system

## Common Development Workflows

### Adding a New Dashboard Widget
1. Create component in `src/components/dashboard/`
2. Use `useDashboardData()` or create specialized hook
3. Follow `ContentCard` pattern for consistent styling
4. Add to dashboard page layout
5. Write test in component directory

### Adding a New Gap Type
1. Update `gapDetectionService.ts` with new detection logic
2. Add prompts to `src/prompts/gapDetection.ts`
3. Update database schema if needed (new gap categories)
4. Add UI display in `ContentGapBanner`
5. Create dashboard widget for new gap type

### Modifying AI Prompts
1. Never hardcode prompts in service files
2. Update centralized prompts in `src/prompts/`
3. Test with `npm run model-comparison` script
4. Document prompt changes in implementation docs

### Working with Supabase Types
- Types auto-generated in `src/types/supabase.ts`
- After schema changes, regenerate types from Supabase dashboard
- Use `Database['public']['Tables']['table_name']['Row']` pattern

## Code Quality Practices

From cursor rules (`.cursor/rules/`):
- **DRY Principle**: Check `NEW_FILE_REQUESTS.md` before creating new files to avoid duplicating functionality
- **Complete Implementations**: Leave NO todos, placeholders, or missing pieces
- **Testing**: Create tests as needed while implementing features
- **Git Commits**: Commit regularly with descriptive messages
- **Polished UX**: Reflect the design system (Radix + Tailwind) in all UI work
- **Readability over Performance**: Prioritize clear, maintainable code

## Key Recent Changes

- **UserGoalsContext Fix**: Fixed legacy array format issue (commit cd11785)
- **ContentCard Standardization**: Created reusable ContentCard component with gap banners (commit 6997ea8)
- **ContentGapBanner DRY Refactor**: Centralized gap banner component across features (commit d037bca)
- **Gap Dismissal**: Added dismiss functionality with tooltips (commit a6b8a89)

## Development Notes

- Dev server runs on port 8080 (configured in `vite.config.ts`)
- Uses IPv6 (`host: "::"`) for Vite dev server
- ESLint max warnings: 0 (strict enforcement)
- All Radix UI components styled with Tailwind CSS
- Design system: Tailwind + shadcn/ui conventions

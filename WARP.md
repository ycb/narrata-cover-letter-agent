# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Core Development
- **Development server**: `npm run dev` (runs on port 8080)
- **Build**: `npm run build` (production build)
- **Build dev**: `npm run build:dev` (development build)
- **Preview**: `npm run preview` (preview production build)

### Testing & Quality
- **Run tests**: `npm test` or `vitest`
- **Test UI**: `npm run test:ui` (Vitest UI interface)
- **Run tests once**: `npm run test:run`
- **Test coverage**: `npm run test:coverage`
- **Lint**: `npm run lint`

### Single Test Execution
Run a specific test file: `vitest path/to/test.test.tsx`
Run tests matching pattern: `vitest --run --reporter=verbose ComponentName`

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React Context + TanStack Query for server state
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Authentication**: Supabase Auth with LinkedIn OAuth integration
- **Testing**: Vitest + React Testing Library + jsdom
- **File Processing**: PDF.js for PDF parsing, Mammoth.js for DOCX files

### Core Application Structure

**Narrata** is an AI-powered cover letter optimization platform for Product Managers. The application helps users:
1. Upload/parse resumes and LinkedIn profiles 
2. Extract and review professional content (stories, metrics, achievements)
3. Generate optimized cover letters with AI feedback
4. Assess PM competency levels and specializations

### Key Architectural Patterns

#### Component Organization
- **Feature-based structure**: Components grouped by domain (`/work-history`, `/cover-letters`, `/assessment`)
- **Shared components**: Reusable UI in `/ui` and `/shared`
- **Context providers**: Multiple providers for different app concerns (Auth, Tour, Goals, etc.)

#### Data Flow Architecture
- **Authentication**: Supabase Auth with RLS (Row Level Security)
- **Content Processing**: Background processing with chunked results and optimistic UI
- **State Management**: Context for global state, TanStack Query for server state caching
- **File Upload**: Multi-format support (PDF, DOCX) with validation and progress tracking

#### Key Business Logic Areas

**Onboarding Flow**: Multi-step process for new users
- Welcome → Content Upload → Review → Dashboard
- Tinder-style content approval interface
- Background processing with progress indicators
- Content extraction: LinkedIn profiles, resumes, cover letters

**Assessment System**: PM competency evaluation
- Overall level assessment (APM, PM, SPM, etc.)
- Core competencies: Execution, Customer Insight, Strategy, Influence  
- Specializations: Growth, Technical, Founding, Platform
- Evidence-based scoring with confidence indicators

**Cover Letter Generation**: AI-powered optimization
- Template-based generation using approved content
- ATS score optimization
- Match analysis against job requirements
- Reusable content library (blurbs, sections, stories)

## Environment & Configuration

### Required Environment Variables
See `.env.example` for complete list:
- **Supabase**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **LinkedIn OAuth**: `VITE_LINKEDIN_CUSTOM_CLIENT_ID`, `VITE_LINKEDIN_SUPABASE_CLIENT_ID`
- **AI Integration**: `VITE_OPENAI_KEY`, `VITE_OPENAI_MODEL`
- **Analytics**: `VITE_LOGROCKET_APP_ID` (optional)

### Key Configuration Files
- **Vite config**: Path aliases (`@/` → `src/`), SWC for fast builds
- **Tailwind**: Custom design system with CSS variables
- **shadcn/ui**: Component library configuration in `components.json`
- **Testing**: Vitest with jsdom environment, setup in `src/test/setup.ts`

## Code Quality Standards

### From Cursor Rules
- Follow DRY principle - avoid duplicating functionality
- Write modular, testable code with proper separation of concerns
- Create tests for new components and utilities
- Use TypeScript strictly - no `any` types without justification
- Implement proper error handling and loading states

### Component Patterns
- Use shadcn/ui components as building blocks
- Implement proper loading and error states
- Follow React hooks best practices (custom hooks for complex logic)
- Use proper TypeScript types for props and state

### Database Integration
- All database operations use Supabase client with RLS
- Timeout protection for auth operations (see `src/lib/supabase.ts`)
- Proper error handling for database failures
- Use TanStack Query for caching and optimistic updates

## Development Workflow

### Testing Strategy
- Unit tests for utilities and hooks
- Component tests for UI components
- Integration tests for critical user flows
- Test files located alongside components in `__tests__/` directories

### File Structure Conventions
- Components: PascalCase with `.tsx` extension
- Hooks: camelCase starting with `use`
- Utilities: camelCase in `/lib` directory
- Types: Define in component files or dedicated `types/` directory
- Tests: Component name + `.test.tsx`

### Important Context Providers
- **AuthProvider**: User authentication and profile management
- **PrototypeProvider**: Feature flags and prototype state
- **TourProvider**: User onboarding and feature tours
- **UserGoalsProvider**: User goals and preferences
- **HILContext**: Human-in-the-loop AI interactions

## Development Notes

### Known Patterns
- **Protected Routes**: All main app routes require authentication
- **File Processing**: Asynchronous with progress tracking and error recovery
- **LinkedIn Integration**: Dual OAuth setup (auth + data fetching)
- **Feedback System**: Environment-controlled user feedback collection
- **Assessment Logic**: Evidence-based competency scoring with confidence levels

### Performance Considerations
- **Code Splitting**: Route-based splitting with React.lazy
- **Query Optimization**: TanStack Query for server state caching
- **Image Optimization**: Proper sizing and loading strategies
- **Bundle Size**: Tree-shaking enabled, analyze with build tools
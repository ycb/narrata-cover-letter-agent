# Feedback System Environment Configuration

The feedback system can be controlled via environment variables, similar to LogRocket initialization.

## Environment Variables

### `VITE_ENABLE_FEEDBACK_SYSTEM`

Controls whether the feedback system is loaded and displayed.

**Values:**
- `'true'` - Always enable feedback system (regardless of environment)
- `'false'` - Always disable feedback system (regardless of environment)
- `undefined` (not set) - Default behavior: only enable in production

## Usage Examples

### Development (Feedback Disabled)
```bash
# .env.local
VITE_ENABLE_FEEDBACK_SYSTEM=false
```

### Staging (Feedback Enabled for Testing)
```bash
# .env.staging
VITE_ENABLE_FEEDBACK_SYSTEM=true
```

### Production (Default Behavior)
```bash
# .env.production
# VITE_ENABLE_FEEDBACK_SYSTEM not set - will default to true in production
```

## Implementation

The feedback system is conditionally rendered in `App.tsx`:

```tsx
{shouldShowFeedbackSystem() && <FeedbackSystem />}
```

The `shouldShowFeedbackSystem()` function checks:
1. Explicit environment variable setting
2. Falls back to production-only behavior if not set

## Benefits

- **Development Safety**: Feedback system won't interfere during development
- **Staging Testing**: Can enable feedback system in staging for testing
- **Production Ready**: Automatically enables in production builds
- **Flexible Control**: Can override default behavior when needed

## Similar to LogRocket

This follows the same pattern as LogRocket initialization:
- Environment-based conditional loading
- Production-only by default
- Explicit override capability
- Clean separation of concerns

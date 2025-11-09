# Testing Multiple Worktrees Simultaneously

This worktree is configured to run on **port 8081** to avoid conflicts with other worktrees.

## Quick Start

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start the dev server**:
   ```bash
   npm run dev
   ```

3. **Access the app**:
   - This worktree: http://localhost:8081
   - Main worktree: http://localhost:8080
   - Other worktrees: Check their respective ports

## Port Configuration

- **Main worktree** (`/Users/admin/ narrata`): Port 8080
- **This worktree** (`/Users/admin/narrata-auto-suggest-tags`): Port 8081
- **Other worktrees**: Configure unique ports in their `vite.config.ts`

## Testing Tips

### Multiple Browser Windows
- Use different browser windows or profiles for each worktree
- Or use incognito/private windows to avoid localStorage conflicts

### Shared Backend
- All worktrees share the same Supabase backend (from `.env`)
- Changes in one worktree affect the same database
- Use different test accounts if needed

### localStorage Isolation
- Each worktree's cache is isolated by port/domain
- Company research cache uses localStorage with prefix `company_research:`
- Clearing cache in one worktree doesn't affect others

### Running Multiple Servers
```bash
# Terminal 1: Main worktree
cd "/Users/admin/ narrata"
npm run dev  # Runs on :8080

# Terminal 2: Auto-suggest-tags worktree
cd "/Users/admin/narrata-auto-suggest-tags"
npm run dev  # Runs on :8081

# Terminal 3: Another worktree (if needed)
cd "/path/to/other-worktree"
npm run dev  # Configure port in vite.config.ts
```

## Changing the Port

If you need a different port, edit `vite.config.ts`:
```typescript
server: {
  host: "::",
  port: 8082, // Your preferred port
},
```

## Notes

- Each worktree has its own `node_modules` (can share via symlink if desired)
- Each worktree has its own `.env` file (copy from main if needed)
- Hot module reloading works independently per worktree
- Build artifacts are isolated per worktree


// Environment setup that must run before any imports
// This file patches import.meta.env for Node.js execution

// This will be loaded BEFORE any other modules
if (typeof process !== 'undefined' && process.env) {
  // Read from process.env if import.meta.env is not available
  const envVars: Record<string, string> = {};
  
  // Load from .env file manually
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '../.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line: string) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim();
      }
    });
  }
  
  // Patch import.meta.env before any modules load
  if (typeof import.meta !== 'undefined') {
    Object.defineProperty(import.meta, 'env', {
      get: () => ({
        VITE_SUPABASE_URL: envVars['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: envVars['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY,
        VITE_OPENAI_KEY: envVars['VITE_OPENAI_KEY'] || process.env.VITE_OPENAI_KEY,
        VITE_OPENAI_MODEL: envVars['VITE_OPENAI_MODEL'] || process.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'
      }),
      configurable: true
    });
  }
}


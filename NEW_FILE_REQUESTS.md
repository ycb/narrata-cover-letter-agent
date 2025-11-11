# New File Requests

## 2025-11-11

- `src/utils/supportEmail.ts`: Searched in `src/services` and `src/utils` for existing email or support contact utilities and found none. Creating a shared helper to route PM level dispute submissions to `support@narrata.co`.

- `supabase/functions/send-support-email/index.ts`: Checked existing edge functions in `supabase/functions` and found only LinkedIn handlers; no support-email function exists. Adding a dedicated function to forward dispute submissions to support.



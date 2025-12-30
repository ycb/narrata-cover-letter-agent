function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Tokenize JD-specific entities back into reusable template tokens.
 * This is intentionally conservative (simple string replacement) so we don't
 * accidentally rewrite unrelated text.
 */
export function tokenizeCoverLetterText(params: {
  text: string;
  company?: string | null;
  role?: string | null;
}): string {
  let out = params.text;

  const company = (params.company ?? '').trim();
  if (company) {
    out = out.replace(new RegExp(escapeRegExp(company), 'gi'), '[COMPANY-NAME]');
  }

  const role = (params.role ?? '').trim();
  if (role) {
    out = out.replace(new RegExp(escapeRegExp(role), 'gi'), '[ROLE]');
  }

  return out;
}


/**
 * Rule-based cover letter parser
 * NO LLM needed - just text parsing
 */

export interface ParsedCoverLetter {
  greeting: string | null;
  introduction: string;
  bodyParagraphs: string[];
  closing: string;
  signature: string | null;
}

const VALEDICTIONS = [
  'Sincerely,',
  'Best regards,',
  'Best,',
  'Thank you,',
  'Thanks,',
  'Regards,',
  'Warm regards,',
  'Warmly,',
  'Cheers,',
  'Kind regards,',
  'With appreciation,',
];

const GREETINGS = [
  /^Dear\s+/i,
  /^Hello\s+/i,
  /^Hi\s+/i,
  /^Greetings\s+/i,
  /^To\s+/i,
];

/**
 * Parse cover letter into structured sections
 */
export function parseCoverLetter(text: string): ParsedCoverLetter {
  // 1. Extract signature (everything after valediction)
  const { mainText, signature } = extractSignature(text);
  
  // 2. Split into paragraphs (simple approach - no fragments/run-ons logic)
  const paragraphs = mainText
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  if (paragraphs.length === 0) {
    throw new Error('No paragraphs found in cover letter');
  }
  
  // 3. Extract greeting from first paragraph (if present)
  const { greeting, paragraph: firstParagraph } = extractGreeting(paragraphs[0]);
  
  // 4. Identify sections
  let introduction: string;
  let bodyParagraphs: string[];
  let closing: string;
  
  if (paragraphs.length === 1) {
    // Single paragraph cover letter (rare but possible)
    introduction = firstParagraph;
    bodyParagraphs = [];
    closing = '';
  } else if (paragraphs.length === 2) {
    // Intro + Closing only
    introduction = firstParagraph;
    bodyParagraphs = [];
    closing = paragraphs[1];
  } else {
    // Standard: Intro + Body(s) + Closing
    introduction = firstParagraph;
    closing = paragraphs[paragraphs.length - 1];
    bodyParagraphs = paragraphs.slice(1, -1);
  }
  
  return {
    greeting,
    introduction,
    bodyParagraphs,
    closing,
    signature,
  };
}

/**
 * Extract signature block (everything after valediction)
 */
function extractSignature(text: string): { mainText: string; signature: string | null } {
  // Try to find valediction
  for (const valediction of VALEDICTIONS) {
    const idx = text.lastIndexOf(valediction);
    if (idx !== -1) {
      return {
        mainText: text.substring(0, idx).trim(),
        signature: text.substring(idx).trim(),
      };
    }
  }
  
  // No valediction found - check if last "paragraph" looks like a signature
  const paragraphs = text.split(/\n\s*\n/);
  const last = paragraphs[paragraphs.length - 1]?.trim();
  
  // Heuristic: if last paragraph is < 30 chars and has no punctuation, likely a name
  if (last && last.length < 30 && !/[.!?]/.test(last)) {
    return {
      mainText: paragraphs.slice(0, -1).join('\n\n').trim(),
      signature: last,
    };
  }
  
  // No signature detected
  return { mainText: text, signature: null };
}

/**
 * Extract greeting from first paragraph
 */
function extractGreeting(firstParagraph: string): { greeting: string | null; paragraph: string } {
  const lines = firstParagraph.split('\n').map(l => l.trim());
  
  // Check if first line is a greeting
  const firstLine = lines[0];
  const isGreeting = GREETINGS.some(pattern => pattern.test(firstLine));
  
  if (isGreeting) {
    return {
      greeting: firstLine,
      paragraph: lines.slice(1).join('\n').trim(),
    };
  }
  
  return { greeting: null, paragraph: firstParagraph };
}

/**
 * Convert parsed CL to saved sections format
 */
export function convertToSavedSections(parsed: ParsedCoverLetter) {
  const sections: Array<{
    slug: string;
    title: string;
    content: string;
    order: number;
    isStatic: boolean;
  }> = [];
  
  let order = 0;
  
  // 1. Greeting (dynamic - uses company name variable)
  sections.push({
    slug: 'greeting',
    title: 'Greeting',
    content: parsed.greeting || '[Greeting] [COMPANY-NAME] Hiring Team,',
    order: order++,
    isStatic: false, // Dynamic - user can edit, uses variable
  });
  
  // 2. Introduction (static - reused as-is)
  sections.push({
    slug: 'introduction',
    title: 'Introduction',
    content: parsed.introduction,
    order: order++,
    isStatic: true,
  });
  
  // 3. Body paragraphs (dynamic - will be replaced with stories)
  parsed.bodyParagraphs.forEach((body, idx) => {
    sections.push({
      slug: `body-${idx + 1}`,
      title: `Experience ${idx + 1}`,
      content: body,
      order: order++,
      isStatic: false, // Dynamic - can be swapped with stories
    });
  });
  
  // 4. Closing (static - reused as-is)
  sections.push({
    slug: 'closing',
    title: 'Closing',
    content: parsed.closing,
    order: order++,
    isStatic: true,
  });
  
  // 5. Signature (static - reused as-is)
  if (parsed.signature) {
    sections.push({
      slug: 'signature',
      title: 'Signature',
      content: parsed.signature,
      order: order++,
      isStatic: true,
    });
  }
  
  return sections;
}

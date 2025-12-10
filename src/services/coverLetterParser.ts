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
  
  // 2. Extract SEMANTIC paragraphs (not just split on \n\n)
  // A paragraph is a cohesive block of related sentences, may span multiple lines
  const paragraphs = extractParagraphs(mainText);
  
  if (paragraphs.length === 0) {
    throw new Error('No paragraphs found in cover letter');
  }
  
  // 3. Extract greeting from first paragraph (if present)
  const { greeting, paragraph: firstParagraph } = extractGreeting(paragraphs[0]);
  
  // 4. Handle case where greeting is on its own line (firstParagraph is empty)
  // In this case, the actual intro is the second paragraph
  let startIdx = 0; // Index where body content starts
  let introduction: string;
  
  if (firstParagraph.trim().length === 0 && paragraphs.length > 1) {
    // Greeting was standalone, use second paragraph as intro
    introduction = paragraphs[1];
    startIdx = 2; // Body starts at paragraph 2
  } else {
    // Greeting was inline with intro, or no greeting
    introduction = firstParagraph;
    startIdx = 1; // Body starts at paragraph 1
  }
  
  // 5. Identify body and closing sections
  let bodyParagraphs: string[];
  let closing: string;
  
  if (paragraphs.length <= startIdx) {
    // No body or closing (intro only)
    bodyParagraphs = [];
    closing = '';
  } else if (paragraphs.length === startIdx + 1) {
    // Only one paragraph left - must be closing
    bodyParagraphs = [];
    closing = paragraphs[startIdx];
  } else {
    // Standard: Body(s) + Closing
    closing = paragraphs[paragraphs.length - 1];
    bodyParagraphs = paragraphs.slice(startIdx, -1);
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
 * Extract semantic paragraphs from text
 * 
 * A paragraph is a cohesive block of related sentences that may span multiple lines.
 * This function uses heuristics to detect actual paragraph boundaries, not just double newlines.
 * 
 * Heuristics:
 * 1. Paragraph breaks occur at: sentence ending (. ! ?) + newline + capital letter OR newline + indent
 * 2. Single line breaks within a sentence are preserved as part of the same paragraph
 * 3. Multiple consecutive short lines (< 50 chars) likely form one paragraph
 * 4. Very short blocks (< 20 chars) are likely fragments and should merge with adjacent paragraphs
 */
function extractParagraphs(text: string): string[] {
  // Since PDF extraction now properly identifies paragraph breaks (via 30px threshold),
  // we can trust \n\n as actual paragraph boundaries.
  // Just split on them and do minimal cleanup.
  
  const paragraphs = text
    .split(/\n\s*\n+/)
    .map(para => para.trim())
    .filter(para => para.length > 0)
    .map(para => {
      // Normalize whitespace within each paragraph
      return para
        .replace(/\n{2,}/g, '\n')       // Remove any internal double newlines
        .replace(/[ \t]+/g, ' ')        // Normalize spaces/tabs
        .replace(/\n /g, '\n')          // Remove leading spaces after newlines
        .trim();
    });
  
  return paragraphs;
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
 * Extract company name from greeting
 * Returns null if no company name found
 */
function extractCompanyNameFromGreeting(greeting: string | null): string | null {
  if (!greeting) return null;
  
  // Match patterns like:
  // "Dear 23andMe team," -> "23andMe"
  // "Dear Hiring Manager at Acme Corp," -> "Acme Corp"
  // "Dear Acme team," -> "Acme"
  
  // Pattern 1: "Dear [COMPANY] team,"
  const teamMatch = greeting.match(/Dear\s+(.+?)\s+team,?/i);
  if (teamMatch) {
    return teamMatch[1].trim();
  }
  
  // Pattern 2: "Dear ... at [COMPANY],"
  const atMatch = greeting.match(/Dear\s+.+?\s+at\s+(.+?),/i);
  if (atMatch) {
    return atMatch[1].trim();
  }
  
  // Pattern 3: Generic "Dear [COMPANY]," (fallback)
  const genericMatch = greeting.match(/Dear\s+(.+?),/i);
  if (genericMatch) {
    const candidate = genericMatch[1].trim();
    // Exclude common generic recipients
    const genericRecipients = ['Hiring Manager', 'Hiring Team', 'Recruiter', 'Sir or Madam', 'whom it may concern'];
    if (!genericRecipients.some(generic => candidate.toLowerCase().includes(generic.toLowerCase()))) {
      return candidate;
    }
  }
  
  return null;
}

/**
 * Replace all instances of company name with [COMPANY-NAME] token
 */
function tokenizeCompanyName(text: string, companyName: string): string {
  if (!companyName) return text;
  
  // Create regex that matches the company name (case-insensitive, whole word or possessive)
  // Handles: "23andMe", "23andMe's", "Acme Corp", "Acme Corp's"
  const escapedName = companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedName}(?:'s)?\\b`, 'gi');
  
  return text.replace(regex, '[COMPANY-NAME]');
}

/**
 * Convert parsed CL to saved sections format
 * 
 * Structure (matching user requirements):
 * 1. Introduction (greeting + intro paragraph combined in one section)
 * 2. Body paragraphs (each separate)
 * 3. Closing (closing paragraph + signature combined in one section)
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
  
  // Extract company name from greeting for tokenization
  const companyName = extractCompanyNameFromGreeting(parsed.greeting);
  
  // 1. Greeting (dynamic - uses [COMPANY-NAME] token)
  // Convert any extracted greeting to use the token format
  const greetingTemplate = parsed.greeting 
    ? parsed.greeting.replace(/Dear .+?,/, 'Dear [COMPANY-NAME] team,')
    : 'Dear [COMPANY-NAME] team,';
  
  sections.push({
    slug: 'greeting',
    title: 'Greeting',
    content: greetingTemplate,
    order: order++,
    isStatic: false, // Dynamic - uses [COMPANY-NAME] token
  });
  
  // 2. Introduction (static - reused as-is, but tokenize company name)
  if (parsed.introduction) {
    sections.push({
      slug: 'introduction',
      title: 'Introduction',
      content: companyName ? tokenizeCompanyName(parsed.introduction, companyName) : parsed.introduction,
      order: order++,
      isStatic: true, // Static - reused as-is
    });
  }
  
  // 3. Body paragraphs (dynamic - will be replaced with stories post-onboarding, but tokenize company name)
  parsed.bodyParagraphs.forEach((body, idx) => {
    sections.push({
      slug: `body-${idx + 1}`,
      title: `Body Paragraph ${idx + 1}`,
      content: companyName ? tokenizeCompanyName(body, companyName) : body,
      order: order++,
      isStatic: false, // Dynamic - can be swapped with stories
    });
  });
  
  // 4. Closing (static - closing paragraph + signature combined, reused as-is, but tokenize company name)
  const closingParts: string[] = [];
  if (parsed.closing) {
    closingParts.push(companyName ? tokenizeCompanyName(parsed.closing, companyName) : parsed.closing);
  }
  if (parsed.signature) {
    closingParts.push(parsed.signature);
  }
  
  if (closingParts.length > 0) {
    sections.push({
      slug: 'closing',
      title: 'Closing',
      content: closingParts.join('\n\n'),
      order: order++,
      isStatic: true, // Static - reused as-is (includes signature)
    });
  }
  
  return sections;
}

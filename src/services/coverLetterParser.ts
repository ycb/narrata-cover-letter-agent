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
  
  // 1. Introduction (greeting + intro paragraph combined)
  // This becomes a single 'intro' section containing both greeting and first paragraph
  const introParts: string[] = [];
  if (parsed.greeting) {
    introParts.push(parsed.greeting);
  }
  if (parsed.introduction) {
    introParts.push(parsed.introduction);
  }
  
  sections.push({
    slug: 'introduction',
    title: 'Introduction',
    content: introParts.join('\n\n'),
    order: order++,
    isStatic: true, // Static - reused as-is
  });
  
  // 2. Body paragraphs (dynamic - will be replaced with stories)
  parsed.bodyParagraphs.forEach((body, idx) => {
    sections.push({
      slug: `body-${idx + 1}`,
      title: `Body Paragraph ${idx + 1}`,
      content: body,
      order: order++,
      isStatic: false, // Dynamic - can be swapped with stories
    });
  });
  
  // 3. Closing (closing paragraph + signature combined)
  // This becomes a single 'closer' section containing both closing and signature
  const closingParts: string[] = [];
  if (parsed.closing) {
    closingParts.push(parsed.closing);
  }
  if (parsed.signature) {
    closingParts.push(parsed.signature);
  }
  
  sections.push({
    slug: 'closing',
    title: 'Closing',
    content: closingParts.join('\n\n'),
    order: order++,
    isStatic: true, // Static - reused as-is
  });
  
  return sections;
}

/**
 * Rule-based cover letter parser
 * NO LLM needed - just text parsing
 */

/**
 * Normalize content by removing excess line breaks within paragraphs
 * This fixes content from old parser versions that preserved single newlines
 */
export function normalizeContent(content: string): string {
  if (!content) return '';
  
  return content
    // First split by double newlines (actual paragraph breaks)
    .split(/\n\s*\n+/)
    // For each paragraph, collapse single newlines to spaces
    .map(para => para
      .replace(/\n/g, ' ')           // Convert newlines to spaces
      .replace(/\s+/g, ' ')          // Normalize multiple spaces
      .trim()
    )
    // Rejoin paragraphs with double newlines
    .filter(para => para.length > 0)
    .join('\n\n');
}

/**
 * Normalize content for final rendering while preserving intentional line breaks
 * (e.g. signatures and multi-line closings).
 */
export function normalizeFinalContent(content: string): string {
  if (!content) return '';

  return content
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface ParsedCoverLetter {
  greeting: string | null;
  introduction: string;
  bodyParagraphs: string[];
  closing: string;
  signature: string | null;
}

const VALEDICTION_PATTERNS = [
  /^\s*sincerely\s*,?\s*$/i,
  /^\s*best(?:\s+regards)?\s*,?\s*$/i,
  /^\s*regards\s*,?\s*$/i,
  /^\s*warm(?:\s+regards)?\s*,?\s*$/i,
  /^\s*kind\s+regards\s*,?\s*$/i,
  /^\s*cheers\s*,?\s*$/i,
  /^\s*cordially\s*,?\s*$/i,
  /^\s*respectfully(?:\s+yours|\s+submitted)?\s*,?\s*$/i,
  /^\s*yours\s+(?:truly|sincerely)\s*,?\s*$/i,
  /^\s*with\s+appreciation\s*,?\s*$/i,
  /^\s*thank(?:s| you)(?:\s+for\s+your\s+consideration)?\s*,?\s*$/i,
];

const GREETINGS = [
  /^Dear\s+/i,
  /^Hello\s+/i,
  /^Hi\s+/i,
  /^Greetings\s+/i,
  /^To\s+/i,
];

const MAX_BODY_SECTION_COUNT = 5;

/**
 * Parse cover letter into structured sections
 */
export function parseCoverLetter(text: string): ParsedCoverLetter {
  // 1. Extract signature (everything after valediction)
  const { mainText, signature } = extractSignature(text);
  
  // 2. Extract SEMANTIC paragraphs (not just split on \n\n)
  // A paragraph is a cohesive block of related sentences, may span multiple lines
  const paragraphs = stripHeaderParagraphs(extractParagraphs(mainText));
  
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
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  // Since PDF extraction now properly identifies paragraph breaks (via 30px threshold),
  // we can trust \n\n as actual paragraph boundaries in most cases.
  const blocks = normalized
    .split(/\n\s*\n+/)
    .map(para => para.trim())
    .filter(para => para.length > 0);

  const paragraphs = blocks.flatMap(block => {
    const blockLineCount = block.split('\n').filter(line => line.trim().length > 0).length;
    if (blockLineCount >= 6) {
      return splitHardWrappedText(block);
    }
    return [block];
  });

  return paragraphs
    .map(para => normalizeParagraph(para))
    .filter(para => para.length > 0);
}

function normalizeParagraph(paragraph: string): string {
  return paragraph
    .replace(/\n{2,}/g, ' ')        // Remove any internal double+ newlines → space
    .replace(/\n/g, ' ')            // Convert remaining single newlines → space
    .replace(/[ \t]+/g, ' ')        // Normalize spaces/tabs
    .trim();
}

function splitHardWrappedText(text: string): string[] {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    return [];
  }
  const paragraphs: string[] = [];
  let startIndex = 0;

  if (GREETINGS.some(pattern => pattern.test(lines[0]))) {
    paragraphs.push(lines[0]);
    startIndex = 1;
  }

  const bodyText = lines.slice(startIndex).join(' ').trim();
  if (!bodyText) {
    return paragraphs;
  }

  const sentences = splitIntoSentences(bodyText);
  let buffer: string[] = [];

  sentences.forEach((sentence) => {
    const trimmed = sentence.trim();
    if (!trimmed) {
      return;
    }

    if (buffer.length > 0 && isParagraphStarter(trimmed)) {
      paragraphs.push(buffer.join(' ').trim());
      buffer = [];
    }

    buffer.push(trimmed);
  });

  if (buffer.length > 0) {
    paragraphs.push(buffer.join(' ').trim());
  }

  return paragraphs;
}

function isParagraphStarter(line: string): boolean {
  const starters = [
    /^As\s+(a|an)\b/i,
    /^I\s+bring\b/i,
    /^I\s+am\s+eager\b/i
  ];

  return starters.some((pattern) => pattern.test(line.trim()));
}

function splitIntoSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]["')\]]*(?=\s+|$)/g);
  if (!matches) {
    return [text];
  }

  return matches.map(sentence => sentence.trim()).filter(Boolean);
}

function stripHeaderParagraphs(paragraphs: string[]): string[] {
  if (paragraphs.length <= 1) {
    return paragraphs;
  }

  const greetingIndex = paragraphs.findIndex((paragraph) =>
    GREETINGS.some((pattern) => pattern.test(paragraph.trim()))
  );

  if (greetingIndex > 0) {
    return paragraphs.slice(greetingIndex);
  }

  if (greetingIndex === 0) {
    return paragraphs;
  }

  const maxSkip = Math.min(6, paragraphs.length - 1);
  let start = 0;
  for (; start < maxSkip; start += 1) {
    if (!isHeaderParagraph(paragraphs[start])) {
      break;
    }
  }
  return paragraphs.slice(start);
}

function isHeaderParagraph(paragraph: string): boolean {
  const trimmed = paragraph.trim();
  if (!trimmed) {
    return true;
  }

  if (/\b(drafted|generated|written|created)\b.*\b(ai|anthropic|chatgpt|claude|gpt)\b/i.test(trimmed)) {
    return true;
  }

  if (/@/.test(trimmed)) {
    return true;
  }

  if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(trimmed)) {
    return true;
  }

  if (/\b[A-Z]{2}\s*\d{5}\b/.test(trimmed)) {
    return true;
  }

  if (/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(trimmed)) {
    return true;
  }

  if (/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(trimmed) && trimmed.length <= 40) {
    return true;
  }

  if (/\b(st|street|ave|avenue|blvd|boulevard|road|rd|lane|ln|drive|dr|way|suite|ste|apt|unit)\b/i.test(trimmed)) {
    return true;
  }

  if (!/[.!?]/.test(trimmed) && trimmed.length <= 50) {
    return true;
  }

  if (/^[A-Za-z]+(?:\s+[A-Za-z]+){0,2}$/.test(trimmed) && trimmed.length <= 40) {
    return true;
  }

  return false;
}

/**
 * Extract signature block (everything after valediction)
 */
function extractSignature(text: string): { mainText: string; signature: string | null } {
  const normalized = text.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  // Prefer explicit valediction lines as the start of signature block.
  for (let idx = lines.length - 1; idx >= 0; idx -= 1) {
    if (VALEDICTION_PATTERNS.some((pattern) => pattern.test(lines[idx].trim()))) {
      return {
        mainText: lines.slice(0, idx).join('\n').trim(),
        signature: lines.slice(idx).join('\n').trim(),
      };
    }
  }

  // Fallback: capture trailing signature/contact blocks even without valediction.
  const paragraphs = normalized
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  if (paragraphs.length > 1) {
    const trailingSignatureParagraphs: string[] = [];

    for (let idx = paragraphs.length - 1; idx >= 0; idx -= 1) {
      if (!isLikelySignatureParagraph(paragraphs[idx])) {
        break;
      }
      trailingSignatureParagraphs.unshift(paragraphs[idx]);
    }

    const trailingSignatureText = trailingSignatureParagraphs.join('\n\n');
    if (
      trailingSignatureParagraphs.length >= 2 ||
      hasStrongSignatureSignal(trailingSignatureText)
    ) {
      return {
        mainText: paragraphs.slice(0, paragraphs.length - trailingSignatureParagraphs.length).join('\n\n').trim(),
        signature: trailingSignatureText.trim(),
      };
    }
  }

  // Last resort: a trailing short line without punctuation is likely a name/signature fragment.
  const last = paragraphs[paragraphs.length - 1]?.trim();
  if (last && last.length < 30 && !/[.!?]/.test(last)) {
    return {
      mainText: paragraphs.slice(0, -1).join('\n\n').trim(),
      signature: last,
    };
  }
  
  // No signature detected
  return { mainText: text, signature: null };
}

function isLikelySignatureParagraph(paragraph: string): boolean {
  const trimmed = paragraph.trim();
  if (!trimmed) return true;

  if (VALEDICTION_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  if (isSignatureClearanceLine(trimmed)) {
    return true;
  }

  if (/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(trimmed)) {
    return true;
  }

  if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(trimmed)) {
    return true;
  }

  if (isContactPlaceholder(trimmed)) {
    return true;
  }

  if (/^[A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,3}$/.test(trimmed) && trimmed.length <= 40) {
    return true;
  }

  return false;
}

function hasStrongSignatureSignal(text: string): boolean {
  return (
    text.split('\n').some((line) => VALEDICTION_PATTERNS.some((pattern) => pattern.test(line.trim()))) ||
    /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(text) ||
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text) ||
    text.split('\n').some((line) => isContactPlaceholder(line.trim())) ||
    text.split('\n').some((line) => isSignatureClearanceLine(line.trim()))
  );
}

function isContactPlaceholder(value: string): boolean {
  return /^\[(?:your\s+)?(?:full\s+)?(?:name|phone(?:\s+number)?|email(?:\s+address)?|address|contact(?:\s+info)?|linkedin(?:\s+url)?|portfolio|website)\]$/i.test(value);
}

function isSignatureClearanceLine(value: string): boolean {
  return /^(?:active\s+)?(?:top\s+secret(?:\/sci)?|ts\/sci|secret)(?:\s+security)?\s+clearance\.?$/i.test(value);
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
  const normalized = normalizeParsedForSections(parsed);
  const boundedBodyParagraphs = limitBodyParagraphCount(normalized.bodyParagraphs);
  const sections: Array<{
    slug: string;
    title: string;
    content: string;
    order: number;
    isStatic: boolean;
  }> = [];
  
  let order = 0;
  
  // Extract company name from greeting for tokenization
  const companyName = extractCompanyNameFromGreeting(normalized.greeting);

  // Build introduction content by combining greeting + intro with tokenized company name
  const introParts: string[] = [];

  if (normalized.greeting || normalized.introduction) {
    const greetingTemplate = normalized.greeting
      ? normalized.greeting.replace(/Dear .+?,/, 'Dear [COMPANY-NAME] team,')
      : 'Dear [COMPANY-NAME] team,';

    introParts.push(greetingTemplate.trim());

    if (normalized.introduction) {
      const introBody = companyName
        ? tokenizeCompanyName(normalized.introduction, companyName)
        : normalized.introduction;
      introParts.push(introBody.trim());
    }
  }

  const introContent = introParts.join('\n\n').trim();

  // 1. Introduction (static - greeting + intro paragraph combined, tokenized)
  if (introContent) {
    sections.push({
      slug: 'introduction',
      title: 'Introduction',
      content: introContent,
      order: order++,
      isStatic: true, // Static - reused as-is
    });
  }
  
  // Body paragraphs (dynamic - will be replaced with stories post-onboarding, but tokenize company name)
  boundedBodyParagraphs.forEach((body, idx) => {
    sections.push({
      slug: `body-${idx + 1}`,
      title: `Body Paragraph ${idx + 1}`,
      content: companyName ? tokenizeCompanyName(body, companyName) : body,
      order: order++,
      isStatic: false, // Dynamic - can be swapped with stories
    });
  });
  
  // Closing (static - closing paragraph + signature combined, reused as-is, but tokenize company name)
  const closingParts: string[] = [];
  if (normalized.closing) {
    closingParts.push(companyName ? tokenizeCompanyName(normalized.closing, companyName) : normalized.closing);
  }
  if (normalized.signature) {
    closingParts.push(normalized.signature);
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

function normalizeParsedForSections(parsed: ParsedCoverLetter): ParsedCoverLetter {
  if (parsed.signature?.trim()) {
    return {
      ...parsed,
      signature: parsed.signature.trim(),
    };
  }

  const bodyParagraphs = [...parsed.bodyParagraphs];
  let closing = parsed.closing;
  const signatureParts: string[] = [];

  if (closing && isLikelySignatureParagraph(closing)) {
    signatureParts.unshift(closing.trim());
    closing = bodyParagraphs.pop() ?? '';
  }

  while (bodyParagraphs.length > 0 && isLikelySignatureParagraph(bodyParagraphs[bodyParagraphs.length - 1])) {
    const signatureFragment = bodyParagraphs.pop();
    if (!signatureFragment) {
      break;
    }
    signatureParts.unshift(signatureFragment.trim());
  }

  return {
    ...parsed,
    bodyParagraphs,
    closing,
    signature: signatureParts.length > 0 ? signatureParts.join('\n\n') : null,
  };
}

function limitBodyParagraphCount(bodyParagraphs: string[]): string[] {
  if (bodyParagraphs.length <= MAX_BODY_SECTION_COUNT) {
    return bodyParagraphs;
  }

  if (MAX_BODY_SECTION_COUNT <= 1) {
    return [bodyParagraphs.join('\n\n').trim()];
  }

  const kept = bodyParagraphs.slice(0, MAX_BODY_SECTION_COUNT - 1);
  const overflowMerged = bodyParagraphs.slice(MAX_BODY_SECTION_COUNT - 1).join('\n\n').trim();
  kept.push(overflowMerged);
  return kept;
}

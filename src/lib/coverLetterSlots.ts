export type LlmSlotScope = 'jd' | 'workHistory' | 'both';

export type LlmSlotToken = {
  id: string;
  rawToken: string;
  label: string;
  instruction: string;
  prefix: 'LLM' | 'SLOT';
  index?: number;
};

type ParsedToken = {
  rawToken: string;
  inner: string;
  prefix: 'LLM' | 'SLOT';
  index: number;
};

const stableHash = (text: string): string => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

const parseInner = (inner: string): { label: string; instruction: string } => {
  const trimmed = inner.trim();
  if (!trimmed) return { label: 'slot', instruction: 'slot' };

  const pipeIndex = trimmed.indexOf('|');
  if (pipeIndex === -1) {
    return { label: trimmed, instruction: trimmed };
  }

  const label = trimmed.slice(0, pipeIndex).trim() || 'slot';
  const instruction = trimmed.slice(pipeIndex + 1).trim() || label;
  return { label, instruction };
};

export const parseLlmSlotTokens = (text: string): LlmSlotToken[] => {
  if (!text) return [];

  const textHash = stableHash(text);
  const tokens: ParsedToken[] = [];
  const pattern = /\[(LLM|SLOT):([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const prefix = match[1] === 'LLM' ? 'LLM' : 'SLOT';
    tokens.push({
      rawToken: match[0],
      inner: match[2] ?? '',
      prefix,
      index: match.index,
    });
  }

  return tokens.map(token => {
    const { label, instruction } = parseInner(token.inner);
    return {
      id: `llm_${stableHash(`${token.prefix}:${token.inner}:${token.index}:${textHash}`)}`,
      rawToken: token.rawToken,
      label,
      instruction,
      prefix: token.prefix,
      index: token.index,
    };
  });
};

export const replaceAllLiteral = (text: string, search: string, replacement: string): string => {
  if (!search) return text;
  return text.split(search).join(replacement);
};

const trailingPunctuation = /[.!?,;:]+$/;
const leadingPunctuation = /^[.!?,;:]/;

export const replaceSlotTokenWithPunctuation = (
  text: string,
  token: string,
  replacement: string,
): string => {
  if (!token) return text;

  let result = '';
  let cursor = 0;

  while (true) {
    const index = text.indexOf(token, cursor);
    if (index === -1) {
      result += text.slice(cursor);
      break;
    }

    const nextSlice = text.slice(index + token.length);
    const nextChar = nextSlice[0] || '';
    const nextNonSpace = nextSlice.match(/\S/)?.[0] || '';
    let nextReplacement = replacement;

    if (nextChar && leadingPunctuation.test(nextChar) && trailingPunctuation.test(replacement)) {
      nextReplacement = replacement.replace(trailingPunctuation, '');
    } else if (nextNonSpace && !leadingPunctuation.test(nextNonSpace) && trailingPunctuation.test(replacement)) {
      nextReplacement = replacement.replace(trailingPunctuation, '');
    }

    result += text.slice(cursor, index) + nextReplacement;
    cursor = index + token.length;
  }

  return result;
};

import { describe, expect, it } from 'vitest';
import { parseLlmSlotTokens, replaceAllLiteral, replaceSlotTokenWithPunctuation } from '../coverLetterSlots';

describe('coverLetterSlots', () => {
  it('parses [LLM:...] tokens', () => {
    const text = 'Hello [LLM:JD_LINE] world';
    const tokens = parseLlmSlotTokens(text);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.prefix).toBe('LLM');
    expect(tokens[0]?.label).toBe('JD_LINE');
    expect(tokens[0]?.instruction).toBe('JD_LINE');
    expect(tokens[0]?.rawToken).toBe('[LLM:JD_LINE]');
  });

  it('parses [SLOT:label|instruction] tokens', () => {
    const text = 'Mission: [SLOT:mission|Insert mission enthusiasm]';
    const tokens = parseLlmSlotTokens(text);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.prefix).toBe('SLOT');
    expect(tokens[0]?.label).toBe('mission');
    expect(tokens[0]?.instruction).toBe('Insert mission enthusiasm');
  });

  it('produces stable ids for the same text', () => {
    const text = 'A [LLM:one] B [LLM:two]';
    const t1 = parseLlmSlotTokens(text).map(t => t.id);
    const t2 = parseLlmSlotTokens(text).map(t => t.id);
    expect(t1).toEqual(t2);
  });

  it('avoids cross-text collisions for same token at same index', () => {
    const textA = '1234567890 [LLM:one]';
    const textB = '1234567890 [LLM:one] and more';
    const idA = parseLlmSlotTokens(textA)[0]?.id;
    const idB = parseLlmSlotTokens(textB)[0]?.id;
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toEqual(idB);
  });

  it('replaces literal tokens safely', () => {
    const text = 'Hello [LLM:JD_LINE] world [LLM:JD_LINE]';
    const out = replaceAllLiteral(text, '[LLM:JD_LINE]', 'Filled.');
    expect(out).toBe('Hello Filled. world Filled.');
  });

  it('avoids duplicate punctuation when token is followed by punctuation', () => {
    const text = 'Sentence [LLM:JD_LINE]. Next.';
    const out = replaceSlotTokenWithPunctuation(text, '[LLM:JD_LINE]', 'Filled.');
    expect(out).toBe('Sentence Filled. Next.');
  });
});

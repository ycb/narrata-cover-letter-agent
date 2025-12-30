import { WorkerLinter, Dialect, binaryInlined } from "harper.js";

export type HarperLanguage = "plaintext" | "markdown";

export interface HarperLintSpan {
  start: number;
  end: number;
  message: string;
  problemText: string;
  kind: string;
  suggestions: HarperSuggestion[];
}

export interface HarperLintOptions {
  language?: HarperLanguage;
  dialect?: Dialect;
}

export type HarperSuggestionKind = "Replace" | "Remove" | "InsertAfter";

export interface HarperSuggestion {
  kind: HarperSuggestionKind;
  text: string;
}

let linterPromise: Promise<WorkerLinter> | null = null;
let dictionaryUserId: string | null = null;
let importedWords = new Set<string>();
const utf8Encoder = new TextEncoder();
const hasNonAscii = (text: string) => /[^\x00-\x7F]/.test(text);

const mapByteOffsetToUtf16Index = (text: string, byteOffset: number) => {
  if (byteOffset <= 0) return 0;
  let bytes = 0;
  let index = 0;

  for (const char of text) {
    const byteLength = utf8Encoder.encode(char).length;
    if (bytes + byteLength > byteOffset) {
      return index;
    }
    bytes += byteLength;
    index += char.length;
  }

  return text.length;
};

const normalizeLintSpan = (
  text: string,
  start: number,
  end: number,
  problemText: string
) => {
  const clampedStart = Math.max(0, start);
  const clampedEnd = Math.min(text.length, end);
  if (!hasNonAscii(text)) {
    return { start: clampedStart, end: clampedEnd };
  }

  const directSlice = text.slice(clampedStart, clampedEnd);
  if (problemText && directSlice.includes(problemText)) {
    return { start: clampedStart, end: clampedEnd };
  }

  const mappedStart = mapByteOffsetToUtf16Index(text, start);
  const mappedEnd = mapByteOffsetToUtf16Index(text, end);
  const mappedSlice = text.slice(mappedStart, mappedEnd);
  if (problemText && mappedSlice.includes(problemText)) {
    return { start: mappedStart, end: mappedEnd };
  }

  return { start: clampedStart, end: clampedEnd };
};

const getLinter = async (dialect?: Dialect) => {
  if (typeof window === "undefined") {
    throw new Error("Harper linter is only available in the browser.");
  }

  if (!linterPromise) {
    linterPromise = (async () => {
      const linter = new WorkerLinter({
        binary: binaryInlined,
        dialect: dialect ?? Dialect.American,
      });
      await linter.setup();
      return linter;
    })();
  }

  const linter = await linterPromise;
  if (dialect !== undefined) {
    const currentDialect = await linter.getDialect();
    if (currentDialect !== dialect) {
      await linter.setDialect(dialect);
    }
  }
  return linter;
};

export const lintText = async (
  text: string,
  options: HarperLintOptions = {}
): Promise<HarperLintSpan[]> => {
  if (typeof window === "undefined") {
    return [];
  }

  const linter = await getLinter(options.dialect);
  const lints = await linter.lint(text, {
    language: options.language ?? "plaintext",
  });

  return lints.map((lint) => {
    const span = lint.span();
    const problemText = lint.get_problem_text();
    const normalizedSpan = normalizeLintSpan(text, span.start, span.end, problemText);
    const suggestions = lint.suggestions().map((suggestion) => {
      const kindValue = suggestion.kind();
      const kind =
        kindValue === 0 ? "Replace" : kindValue === 1 ? "Remove" : "InsertAfter";
      const text = suggestion.get_replacement_text();
      suggestion.free();
      return { kind, text };
    });
    const result = {
      start: normalizedSpan.start,
      end: normalizedSpan.end,
      message: lint.message(),
      problemText,
      kind: lint.lint_kind_pretty(),
      suggestions,
    };
    span.free();
    lint.free();
    return result;
  });
};

export const syncUserDictionary = async (userId: string, words: string[]) => {
  if (!userId) return;
  const linter = await getLinter();

  if (dictionaryUserId !== userId) {
    await linter.clearWords();
    importedWords = new Set<string>();
    dictionaryUserId = userId;
  }

  const toImport = words
    .map((word) => word.trim())
    .filter((word) => word.length > 0 && !importedWords.has(word));

  if (toImport.length === 0) return;

  await linter.importWords(toImport);
  toImport.forEach((word) => importedWords.add(word));
};

export const importUserDictionaryWord = async (userId: string, word: string) => {
  const trimmed = word.trim();
  if (!trimmed) return;
  await syncUserDictionary(userId, [trimmed]);
};

export const replaceUserDictionary = async (userId: string, words: string[]) => {
  if (!userId) return;
  const linter = await getLinter();
  await linter.clearWords();
  importedWords = new Set<string>();
  dictionaryUserId = userId;

  const normalized = words.map((word) => word.trim()).filter((word) => word.length > 0);
  if (normalized.length === 0) return;

  await linter.importWords(normalized);
  normalized.forEach((word) => importedWords.add(word));
};

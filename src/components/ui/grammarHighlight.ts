import type { HarperLintSpan } from "@/lib/harper/harperClient";

export interface HighlightSegment {
  text: string;
  lint?: HarperLintSpan;
}

export const getLintDecorationClass = (lint?: HarperLintSpan) => {
  if (!lint) return undefined;
  const kind = lint.kind.toLowerCase();
  const isSpelling = kind.includes("spelling") || kind.includes("typo");
  if (isSpelling) {
    return "bg-rose-200/70 underline decoration-red-500";
  }
  return "bg-blue-200/60 underline decoration-blue-600";
};

export const buildHighlightSegments = (
  text: string,
  lints: HarperLintSpan[]
): HighlightSegment[] => {
  if (!text) return [{ text: "" }];

  const sorted = lints
    .map((lint) => ({
      ...lint,
      start: Math.max(0, lint.start),
      end: Math.min(text.length, lint.end),
    }))
    .filter((lint) => lint.end > lint.start)
    .sort((a, b) => a.start - b.start);

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const lint of sorted) {
    if (lint.start < cursor) {
      continue;
    }

    if (lint.start > cursor) {
      segments.push({ text: text.slice(cursor, lint.start) });
    }

    segments.push({ text: text.slice(lint.start, lint.end), lint });
    cursor = lint.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
};

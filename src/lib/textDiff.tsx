import type { ReactNode } from "react";

export const highlightWordDiff = (originalContent: string, updatedContent: string): ReactNode[] => {
  const originalWords = originalContent.split(' ');
  const updatedWords = updatedContent.split(' ');

  const highlightedContent: ReactNode[] = [];
  let i = 0;
  let j = 0;

  while (i < originalWords.length || j < updatedWords.length) {
    if (i < originalWords.length && j < updatedWords.length && originalWords[i] === updatedWords[j]) {
      highlightedContent.push(originalWords[i] + ' ');
      i += 1;
      j += 1;
    } else if (j < updatedWords.length) {
      highlightedContent.push(
        <span key={`add-${j}`} className="bg-green-100 text-green-800 px-1 rounded">
          {updatedWords[j]}
        </span>
      );
      highlightedContent.push(' ');
      j += 1;
    } else if (i < originalWords.length) {
      highlightedContent.push(
        <span key={`del-${i}`} className="bg-red-100 text-red-800 px-1 rounded line-through">
          {originalWords[i]}
        </span>
      );
      highlightedContent.push(' ');
      i += 1;
    }
  }

  return highlightedContent;
};

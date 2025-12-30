import { useEffect, useRef, useState } from "react";

import { lintText, type HarperLanguage, type HarperLintSpan } from "@/lib/harper/harperClient";

export interface HarperGrammarOptions {
  enabled?: boolean;
  minLength?: number;
  debounceMs?: number;
  language?: HarperLanguage;
  refreshKey?: number;
}

const DEFAULT_DEBOUNCE_MS = 350;
const DEFAULT_MIN_LENGTH = 4;

export const useHarperGrammar = (
  text: string,
  options: HarperGrammarOptions = {}
) => {
  const {
    enabled = true,
    minLength = DEFAULT_MIN_LENGTH,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    language,
    refreshKey,
  } = options;
  const [lints, setLints] = useState<HarperLintSpan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const lastTextRef = useRef<string>("");
  const lastRefreshRef = useRef<number | undefined>(refreshKey);

  useEffect(() => {
    if (!enabled) {
      setLints([]);
      setIsLoading(false);
      return;
    }

    const normalized = text ?? "";
    if (normalized.trim().length < minLength) {
      setLints([]);
      setIsLoading(false);
      lastTextRef.current = normalized;
      return;
    }

    const refreshChanged = lastRefreshRef.current !== refreshKey;
    if (normalized === lastTextRef.current && !refreshChanged) return;

    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);

    const timer = window.setTimeout(() => {
      lintText(normalized, { language })
        .then((results) => {
          if (requestIdRef.current !== currentRequestId) return;
          setLints(results);
          lastTextRef.current = normalized;
          lastRefreshRef.current = refreshKey;
        })
        .catch(() => {
          if (requestIdRef.current !== currentRequestId) return;
          setLints([]);
          lastTextRef.current = normalized;
          lastRefreshRef.current = refreshKey;
        })
        .finally(() => {
          if (requestIdRef.current !== currentRequestId) return;
          setIsLoading(false);
        });
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [debounceMs, enabled, language, minLength, refreshKey, text]);

  return { lints, isLoading };
};

import * as React from "react";

import { cn } from "@/lib/utils";
import { useHarperGrammar } from "@/hooks/useHarperGrammar";
import type { HarperLintSpan } from "@/lib/harper/harperClient";
import { Input, type InputProps } from "@/components/ui/input";
import { buildHighlightSegments, getLintDecorationClass } from "@/components/ui/grammarHighlight";
import { useHarperDictionary } from "@/hooks/useHarperDictionary";
import { normalizeDictionaryWord } from "@/services/userDictionaryService";

export interface GrammarInputProps extends InputProps {
  grammarEnabled?: boolean;
  grammarMinLength?: number;
  grammarDebounceMs?: number;
  grammarLanguage?: "plaintext" | "markdown";
}

const overlayBaseClassName =
  "pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-md border border-transparent px-3 py-2 text-base leading-none md:text-sm";

const GrammarInput = React.forwardRef<HTMLInputElement, GrammarInputProps>(
  (
    {
      className,
      grammarEnabled = true,
      grammarMinLength,
      grammarDebounceMs,
      grammarLanguage = "plaintext",
      onScroll,
      onClick: onClickProp,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const textValue =
      typeof value === "string"
        ? value
        : typeof defaultValue === "string"
          ? defaultValue
          : "";

    const { addWord, canAdd, version, words } = useHarperDictionary();

    const { lints } = useHarperGrammar(textValue, {
      enabled: grammarEnabled,
      minLength: grammarMinLength,
      debounceMs: grammarDebounceMs,
      language: grammarLanguage,
      refreshKey: version,
    });

    const [activeLint, setActiveLint] = React.useState<HarperLintSpan | null>(null);
    const [anchorPos, setAnchorPos] = React.useState<{ top: number; left: number } | null>(null);
    const [dismissedKeys, setDismissedKeys] = React.useState<Set<string>>(new Set());

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const popoverRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
      setDismissedKeys(new Set());
      setActiveLint(null);
      setAnchorPos(null);
    }, [textValue]);

    const lintKey = (lint: HarperLintSpan) =>
      `${lint.start}:${lint.end}:${lint.message}`;

    const getSuggestions = (lint: HarperLintSpan) => {
      const seen = new Set<string>();
      return lint.suggestions.filter((suggestion) => {
        const key = `${suggestion.kind}:${suggestion.text}`;
        if (seen.has(key)) return false;
        seen.add(key);

        if (suggestion.kind === "Replace") {
          const replacement = suggestion.text.trim();
          if (!replacement) return false;
          if (replacement === lint.problemText.trim()) return false;
        }

        if (suggestion.kind === "InsertAfter" && suggestion.text.trim().length === 0) {
          return false;
        }

        return true;
      });
    };

    const dictionarySet = React.useMemo(() => {
      return new Set(
        words
          .map((word) => normalizeDictionaryWord(word).toLowerCase())
          .filter((word) => word.length > 0)
      );
    }, [words]);

    const visibleLints = React.useMemo(
      () =>
        lints.filter((lint) => {
          if (dismissedKeys.has(lintKey(lint))) return false;
          const normalized = normalizeDictionaryWord(lint.problemText).toLowerCase();
          if (normalized && dictionarySet.has(normalized)) return false;
          return true;
        }),
      [dismissedKeys, dictionarySet, lints]
    );

    const segments = React.useMemo(
      () => buildHighlightSegments(textValue, visibleLints),
      [textValue, visibleLints]
    );

    const suggestionOptions = React.useMemo(
      () => (activeLint ? getSuggestions(activeLint) : []),
      [activeLint]
    );

    const overlayRef = React.useRef<HTMLDivElement | null>(null);

    const setRef = (node: HTMLInputElement | null) => {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const closePopover = () => {
      setActiveLint(null);
      setAnchorPos(null);
    };

    const handleScroll = (event: React.UIEvent<HTMLInputElement>) => {
      if (overlayRef.current) {
        overlayRef.current.scrollLeft = event.currentTarget.scrollLeft;
      }
      if (activeLint) {
        closePopover();
      }
      onScroll?.(event);
    };

    const spellCheck = grammarEnabled ? false : props.spellCheck;

    React.useEffect(() => {
      if (!activeLint) return;
      const handleClick = (event: MouseEvent) => {
        const target = event.target as Node;
        if (popoverRef.current?.contains(target)) return;
        closePopover();
      };
      window.addEventListener("mousedown", handleClick);
      return () => window.removeEventListener("mousedown", handleClick);
    }, [activeLint]);

    const applySuggestion = (lint: HarperLintSpan, suggestion: HarperLintSpan["suggestions"][number]) => {
      const input = overlayRef.current?.parentElement?.querySelector("input") as HTMLInputElement | null;
      const currentValue = typeof value === "string" ? value : input?.value ?? "";
      const start = lint.start;
      const end = lint.end;
      let nextValue = currentValue;

      if (suggestion.kind === "InsertAfter") {
        nextValue = `${currentValue.slice(0, end)}${suggestion.text}${currentValue.slice(end)}`;
      } else {
        nextValue = `${currentValue.slice(0, start)}${suggestion.text}${currentValue.slice(end)}`;
      }

      if (props.onChange) {
        props.onChange({
          target: { value: nextValue },
        } as React.ChangeEvent<HTMLInputElement>);
      } else if (input) {
        input.value = nextValue;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }

      if (input) {
        const caret = suggestion.kind === "InsertAfter" ? end + suggestion.text.length : start + suggestion.text.length;
        input.focus();
        input.setSelectionRange(caret, caret);
      }

      closePopover();
    };

    const getCaretOffset = (input: HTMLInputElement, position: number) => {
      const style = window.getComputedStyle(input);
      const div = document.createElement("div");
      const properties = [
        "boxSizing",
        "width",
        "height",
        "overflowX",
        "overflowY",
        "borderTopWidth",
        "borderRightWidth",
        "borderBottomWidth",
        "borderLeftWidth",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "fontFamily",
        "fontSize",
        "fontWeight",
        "fontStyle",
        "letterSpacing",
        "lineHeight",
        "textTransform",
        "textAlign",
        "whiteSpace",
      ] as const;

      div.style.position = "absolute";
      div.style.visibility = "hidden";
      div.style.whiteSpace = "pre";
      div.style.top = "0";
      div.style.left = "-9999px";

      properties.forEach((property) => {
        div.style[property] = style[property];
      });

      div.textContent = input.value.slice(0, position);
      const span = document.createElement("span");
      span.textContent = input.value.slice(position) || ".";
      div.appendChild(span);

      document.body.appendChild(div);
      const spanRect = span.getBoundingClientRect();
      const divRect = div.getBoundingClientRect();
      document.body.removeChild(div);

      return {
        top: spanRect.top - divRect.top,
        left: spanRect.left - divRect.left,
      };
    };

    return (
      <div className="relative" ref={containerRef}>
        <div
          ref={overlayRef}
          aria-hidden="true"
          className={cn(overlayBaseClassName, className, "text-transparent")}
        >
          <div className="whitespace-pre">
            {segments.map((segment, index) => (
              <span
                key={`${index}-${segment.text}`}
                className={segment.lint ? getLintDecorationClass(segment.lint) : undefined}
              >
                {segment.text}
              </span>
            ))}
          </div>
        </div>
        {activeLint && anchorPos && (
          <div
            ref={popoverRef}
            className="absolute z-20 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md"
            style={{ top: anchorPos.top, left: anchorPos.left }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-semibold">{activeLint.kind || "Grammar"}</div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={closePopover}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">{activeLint.message}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestionOptions.map((suggestion, index) => (
                <button
                  key={`${suggestion.kind}-${suggestion.text}-${index}`}
                  type="button"
                  className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  onClick={() => applySuggestion(activeLint, suggestion)}
                  title={`Replace with "${suggestion.text}"`}
                >
                  {suggestion.text || "Remove"}
                </button>
              ))}
              <button
                type="button"
                className="rounded-md bg-muted px-3 py-1 text-xs font-medium text-foreground hover:bg-muted/80"
                onClick={() => {
                  setDismissedKeys((prev) => new Set(prev).add(lintKey(activeLint)));
                  closePopover();
                }}
              >
                Dismiss Once
              </button>
              <button
                type="button"
                className="rounded-md bg-muted px-3 py-1 text-xs font-medium text-foreground hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canAdd}
                onClick={async () => {
                  await addWord(activeLint.problemText);
                  setDismissedKeys((prev) => new Set(prev).add(lintKey(activeLint)));
                  closePopover();
                }}
                title={canAdd ? "Add to dictionary" : "Sign in to add to dictionary"}
              >
                Add to Library
              </button>
            </div>
          </div>
        )}
        <Input
          ref={setRef}
          value={value}
          defaultValue={defaultValue}
          onScroll={handleScroll}
          onClick={(event) => {
            onClickProp?.(event);
            const input = event.currentTarget;
            const position = input.selectionStart ?? 0;
            const lint = visibleLints.find(
              (candidate) => position >= candidate.start && position <= candidate.end
            );
            if (!lint) {
              closePopover();
              return;
            }
            const caret = getCaretOffset(input, position);
            const containerRect = containerRef.current?.getBoundingClientRect();
            const inputRect = input.getBoundingClientRect();
            if (containerRect) {
              setAnchorPos({
                top: inputRect.bottom - containerRect.top + 8,
                left: inputRect.left - containerRect.left + caret.left,
              });
            }
            setActiveLint(lint);
          }}
          {...props}
          className={cn("relative z-0", className)}
          spellCheck={spellCheck}
        />
        {lints.length > 0 && (
          <div className="sr-only" aria-live="polite">
            {lints.length} grammar issue{lints.length === 1 ? "" : "s"} detected.
          </div>
        )}
      </div>
    );
  }
);

GrammarInput.displayName = "GrammarInput";

export { GrammarInput };

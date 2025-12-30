import { useId, useMemo } from "react";

import { Input, type InputProps } from "@/components/ui/input";
import { GrammarInput, type GrammarInputProps } from "@/components/ui/grammar-input";
import { useUserTagSuggestions } from "@/hooks/useUserTagSuggestions";
import { mergeUserTags, type TagCategory } from "@/lib/userTags";

type TagAutocompleteInputProps = {
  category?: TagCategory;
  localTags?: string[];
  useGrammarInput?: boolean;
} & Omit<InputProps & GrammarInputProps, "type">;

export const TagAutocompleteInput = ({
  category,
  localTags = [],
  useGrammarInput = false,
  ...props
}: TagAutocompleteInputProps) => {
  const listId = useId();
  const { suggestions } = useUserTagSuggestions(category);
  const mergedSuggestions = useMemo(
    () => mergeUserTags([...suggestions, ...localTags]),
    [localTags, suggestions]
  );

  const Component = useGrammarInput ? GrammarInput : Input;

  return (
    <>
      <Component {...props} list={listId} />
      <datalist id={listId}>
        {mergedSuggestions.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
    </>
  );
};

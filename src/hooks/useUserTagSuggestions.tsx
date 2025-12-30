import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { mergeUserTags, type TagCategory, normalizeUserTagKey } from "@/lib/userTags";
import { isExternalLinksEnabled } from "@/lib/flags";
import { UserTagService } from "@/services/userTagService";

type SuggestionState = {
  suggestions: string[];
  isLoading: boolean;
  error: string | null;
};

export const useUserTagSuggestions = (category?: TagCategory) => {
  const { user } = useAuth();
  const [state, setState] = useState<SuggestionState>({
    suggestions: [],
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (!user?.id) {
      setState({ suggestions: [], isLoading: false, error: null });
      return;
    }

    let isActive = true;
    setState((prev) => ({ ...prev, isLoading: true }));

    UserTagService.fetchTags(user.id)
      .then((data) => {
        if (!isActive) return;

        const externalLinksEnabled = isExternalLinksEnabled();
        const filtered = externalLinksEnabled
          ? data
          : data.filter((tag) => tag.category !== "link");
        const categoryTags = category
          ? filtered.filter((tag) => tag.category === category)
          : filtered;
        const otherTags = category
          ? filtered.filter((tag) => tag.category !== category)
          : [];

        const suggestions = mergeUserTags([
          ...categoryTags.map((tag) => tag.tag),
          ...otherTags.map((tag) => tag.tag),
        ]);

        setState({ suggestions, isLoading: false, error: null });
      })
      .catch((error) => {
        if (!isActive) return;
        setState({
          suggestions: [],
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to load tags",
        });
      });

    return () => {
      isActive = false;
    };
  }, [category, user?.id]);

  const suggestions = useMemo(() => {
    const merged = mergeUserTags(state.suggestions);
    const seen = new Set<string>();
    return merged.filter((tag) => {
      const key = normalizeUserTagKey(tag);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [state.suggestions]);

  return { ...state, suggestions };
};

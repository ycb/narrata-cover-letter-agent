import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TagAutocompleteInput } from "@/components/ui/TagAutocompleteInput";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { mergeUserTags, normalizeUserTag, type TagCategory } from "@/lib/userTags";
import { isExternalLinksEnabled } from "@/lib/flags";
import { UserTagService, type UserTagRecord } from "@/services/userTagService";

const TAG_TABS: Array<{ value: "all" | TagCategory; label: string }> = [
  { value: "all", label: "All" },
  { value: "company", label: "Company" },
  { value: "role", label: "Role" },
  { value: "story", label: "Story" },
  { value: "saved_section", label: "Saved Sections" },
  { value: "link", label: "Links" },
];

const CATEGORY_OPTIONS: Array<{ value: TagCategory; label: string }> = [
  { value: "company", label: "Company" },
  { value: "role", label: "Role" },
  { value: "story", label: "Story" },
  { value: "saved_section", label: "Saved Section" },
  { value: "link", label: "Link" },
];

const MyTags = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tags, setTags] = useState<UserTagRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | TagCategory>("all");
  const [newTag, setNewTag] = useState("");
  const [newTagCategory, setNewTagCategory] = useState<TagCategory>("company");
  const externalLinksEnabled = isExternalLinksEnabled();

  const loadTags = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await UserTagService.fetchTags(user.id);
      setTags(data);
    } catch (error) {
      toast({
        title: "Unable to load tags",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadTags();
  }, [loadTags, user?.id]);

  useEffect(() => {
    if (!externalLinksEnabled && activeTab === "link") {
      setActiveTab("all");
    }
  }, [activeTab, externalLinksEnabled]);

  const filteredTags = useMemo(() => {
    const visibleTags = externalLinksEnabled
      ? tags
      : tags.filter((tag) => tag.category !== "link");
    if (activeTab === "all") {
      return visibleTags;
    }
    return visibleTags.filter((tag) => tag.category === activeTab);
  }, [activeTab, externalLinksEnabled, tags]);

  const availableSuggestions = useMemo(() => {
    const visibleTags = externalLinksEnabled
      ? tags
      : tags.filter((tag) => tag.category !== "link");
    return mergeUserTags(visibleTags.map((tag) => tag.tag));
  }, [externalLinksEnabled, tags]);

  const canAdd = useMemo(() => normalizeUserTag(newTag).length > 0, [newTag]);

  const handleAddTag = async () => {
    if (!user?.id || !canAdd) return;
    const normalized = normalizeUserTag(newTag);
    if (!normalized) return;

    const category = activeTab === "all" ? newTagCategory : activeTab;

    setIsSaving(true);
    try {
      await UserTagService.upsertTags(user.id, [normalized], category);
      setNewTag("");
      await loadTags();
    } catch (error) {
      toast({
        title: "Unable to add tag",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await UserTagService.removeTag(user.id, tagId);
      setTags((prev) => prev.filter((tag) => tag.id !== tagId));
    } catch (error) {
      toast({
        title: "Unable to remove tag",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const tabSuggestions = useMemo(() => {
    if (activeTab === "all") return availableSuggestions;
    const categoryTags = tags
      .filter((tag) => tag.category === activeTab)
      .map((tag) => tag.tag);
    return mergeUserTags([...categoryTags, ...availableSuggestions]);
  }, [activeTab, availableSuggestions, tags]);

  const visibleTabs = useMemo(
    () => TAG_TABS.filter((tab) => externalLinksEnabled || tab.value !== "link"),
    [externalLinksEnabled]
  );

  const visibleCategoryOptions = useMemo(
    () => CATEGORY_OPTIONS.filter((option) => externalLinksEnabled || option.value !== "link"),
    [externalLinksEnabled]
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>My Tags</CardTitle>
          <p className="text-sm text-muted-foreground">
            Reuse and organize tags across your content. Category tabs prioritize the most relevant tags first.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
              {visibleTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {visibleTabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="new-tag">Add a tag</Label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex-1">
                      <TagAutocompleteInput
                        id="new-tag"
                        value={newTag}
                        onChange={(event) => setNewTag(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleAddTag();
                          }
                        }}
                        placeholder="Add a tag and press Enter"
                        disabled={isSaving}
                        category={activeTab === "all" ? undefined : activeTab}
                        localTags={tabSuggestions}
                      />
                    </div>
                    {activeTab === "all" && (
                      <div className="min-w-[160px]">
                        <select
                          value={newTagCategory}
                          onChange={(event) => setNewTagCategory(event.target.value as TagCategory)}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          disabled={isSaving}
                        >
                          {visibleCategoryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <Button onClick={handleAddTag} disabled={!canAdd || isSaving}>
                      Add
                    </Button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-sm text-muted-foreground">Loading…</div>
                ) : filteredTags.length === 0 ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No tags yet. Add your first one above.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {filteredTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                      >
                        <span>{tag.tag}</span>
                        {activeTab === "all" && externalLinksEnabled && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {tag.category.replace("_", " ")}
                          </span>
                        )}
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => handleRemoveTag(tag.id)}
                          aria-label={`Remove ${tag.tag}`}
                          disabled={isSaving}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyTags;

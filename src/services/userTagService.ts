import { supabase } from "@/lib/supabase";
import { mergeUserTags, normalizeUserTagKey, type TagCategory } from "@/lib/userTags";
import { isExternalLinksEnabled } from "@/lib/flags";

export type UserTagRecord = {
  id: string;
  user_id: string;
  tag: string;
  normalized_tag: string;
  category: TagCategory;
  created_at: string;
  updated_at: string;
};

export const UserTagService = {
  async fetchTags(userId: string, category?: TagCategory): Promise<UserTagRecord[]> {
    let query = supabase
      .from("user_tags")
      .select("id,user_id,tag,normalized_tag,category,created_at,updated_at")
      .eq("user_id", userId);

    if (category) {
      query = query.eq("category", category);
    }

    let { data, error } = await query.order("tag", { ascending: true });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      await UserTagService.bootstrapFromContent(userId);
      const retry = await query.order("tag", { ascending: true });
      if (retry.error) throw retry.error;
      data = retry.data;
    }

    return (data ?? []) as UserTagRecord[];
  },

  async upsertTags(userId: string, tags: string[], category: TagCategory): Promise<void> {
    const merged = mergeUserTags(tags);
    if (merged.length === 0) return;

    const rows = merged.map((tag) => ({
      user_id: userId,
      tag,
      normalized_tag: normalizeUserTagKey(tag),
      category,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("user_tags")
      .upsert(rows, { onConflict: "user_id,normalized_tag,category" });

    if (error) {
      throw error;
    }
  },

  async removeTag(userId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from("user_tags")
      .delete()
      .eq("id", tagId)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  },

  async bootstrapFromContent(userId: string): Promise<void> {
    const collectTags = async (table: string) => {
      const { data, error } = await supabase
        .from(table)
        .select("tags")
        .eq("user_id", userId);
      if (error) throw error;
      const flattened = (data ?? []).flatMap((row: { tags?: string[] | null }) =>
        Array.isArray(row.tags) ? row.tags : []
      );
      return mergeUserTags(flattened);
    };

    const [companyTags, roleTags, storyTags, savedSectionTags, linkTags] = await Promise.all([
      collectTags("companies"),
      collectTags("work_items"),
      collectTags("stories"),
      collectTags("saved_sections"),
      isExternalLinksEnabled() ? collectTags("external_links") : Promise.resolve([]),
    ]);

    await Promise.all([
      companyTags.length ? UserTagService.upsertTags(userId, companyTags, "company") : Promise.resolve(),
      roleTags.length ? UserTagService.upsertTags(userId, roleTags, "role") : Promise.resolve(),
      storyTags.length ? UserTagService.upsertTags(userId, storyTags, "story") : Promise.resolve(),
      savedSectionTags.length
        ? UserTagService.upsertTags(userId, savedSectionTags, "saved_section")
        : Promise.resolve(),
      linkTags.length ? UserTagService.upsertTags(userId, linkTags, "link") : Promise.resolve(),
    ]);
  },
};

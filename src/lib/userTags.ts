export type TagCategory = 'company' | 'role' | 'story' | 'saved_section' | 'link';

export const normalizeUserTag = (value: string) =>
  value.trim().replace(/\s+/g, ' ');

export const normalizeUserTagKey = (value: string) =>
  normalizeUserTag(value).toLowerCase();

export const mergeUserTags = (tags: string[]) => {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    const normalized = normalizeUserTag(tag);
    if (!normalized) continue;
    const key = normalizeUserTagKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(normalized);
  }

  return merged;
};

export const addUserTag = (tags: string[], nextTag: string) => {
  const normalized = normalizeUserTag(nextTag);
  if (!normalized) return tags;
  const key = normalizeUserTagKey(normalized);
  const hasTag = tags.some((tag) => normalizeUserTagKey(tag) === key);
  return hasTag ? tags : [...tags, normalized];
};

export const removeUserTag = (tags: string[], tagToRemove: string) => {
  const key = normalizeUserTagKey(tagToRemove);
  return tags.filter((tag) => normalizeUserTagKey(tag) !== key);
};

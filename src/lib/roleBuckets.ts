export type RoleBucketKey =
  | 'director_plus'
  | 'principal_pm'
  | 'staff_pm'
  | 'group_pm'
  | 'senior_pm'
  | 'pm'
  | 'other';

export type RoleBucket = {
  key: RoleBucketKey;
  label: string;
};

const normalizeRoleTitle = (title: string): string => {
  return (title || '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[,:/|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

export const classifyRoleToBucket = (rawTitle: string): RoleBucket => {
  const title = normalizeRoleTitle(rawTitle);
  if (!title) return { key: 'other', label: 'Other' };

  // Director+ / exec product leadership
  if (
    /\b(cpo|chief product officer|vp|vice president|svp|evp|head of product|director|gm)\b/.test(title)
  ) {
    return { key: 'director_plus', label: 'Director+ Product' };
  }

  // PM levels (ordered)
  if (/\bprincipal\b/.test(title)) return { key: 'principal_pm', label: 'Principal PM' };
  if (/\bstaff\b/.test(title)) return { key: 'staff_pm', label: 'Staff PM' };
  if (/\b(group|gpm)\b/.test(title)) return { key: 'group_pm', label: 'Group PM' };
  if (/\b(senior|sr)\b/.test(title)) return { key: 'senior_pm', label: 'Senior PM' };

  // Baseline PM roles
  if (/\bproduct manager\b/.test(title) || /\bpm\b/.test(title)) return { key: 'pm', label: 'Product Manager' };

  return { key: 'other', label: 'Other' };
};


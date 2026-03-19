import type { CoverLetterDraftSection } from '@/types/coverLetters';

type SectionLike = Pick<CoverLetterDraftSection, 'type' | 'slug'> | { type?: string; slug?: string };

export interface NormalizedInsertionTarget {
  insertIndex: number;
  sectionType: 'body';
}

export interface NormalizedSectionsResult {
  sections: CoverLetterDraftSection[];
  changed: boolean;
}

export const isIntroSection = (section?: SectionLike | null): boolean => {
  const type = String(section?.type || '').toLowerCase();
  const slug = String(section?.slug || '').toLowerCase();
  return type === 'intro' || type === 'introduction' || slug === 'intro' || slug === 'introduction';
};

export const isClosingSection = (section?: SectionLike | null): boolean => {
  const type = String(section?.type || '').toLowerCase();
  const slug = String(section?.slug || '').toLowerCase();
  return (
    type === 'closing' ||
    type === 'closer' ||
    type === 'conclusion' ||
    slug === 'closing' ||
    slug === 'closer' ||
    slug === 'conclusion'
  );
};

export function normalizeCoverLetterInsertionTarget(
  sections: SectionLike[],
  requestedIndex: number,
): NormalizedInsertionTarget {
  const safeSections = Array.isArray(sections) ? sections : [];
  const hasIntro = isIntroSection(safeSections[0]);
  const hasClosing = safeSections.length > 0 && isClosingSection(safeSections[safeSections.length - 1]);

  let insertIndex = Number.isFinite(requestedIndex) ? Math.trunc(requestedIndex) : safeSections.length;
  if (insertIndex < 0) insertIndex = 0;
  if (insertIndex > safeSections.length) insertIndex = safeSections.length;

  if (hasIntro && insertIndex === 0) {
    insertIndex = 1;
  }

  if (hasClosing && insertIndex >= safeSections.length) {
    insertIndex = Math.max(0, safeSections.length - 1);
  }

  if (hasClosing && insertIndex === safeSections.length - 1 && safeSections.length === 1 && hasIntro) {
    insertIndex = 1;
  }

  return {
    insertIndex,
    sectionType: 'body',
  };
}

function inferBodySectionType(section: CoverLetterDraftSection): CoverLetterDraftSection['type'] {
  if (section.type === 'dynamic-story' || section.source?.kind === 'work_story') {
    return 'dynamic-story';
  }

  if (
    section.type === 'dynamic-saved' ||
    section.source?.kind === 'saved_section' ||
    section.source?.kind === 'hil_generated'
  ) {
    return 'dynamic-saved';
  }

  return 'static';
}

function coerceBoundarySectionToBody(
  section: CoverLetterDraftSection,
  bodyOrdinal: number,
): CoverLetterDraftSection {
  const nextSlug = isIntroSection(section) || isClosingSection(section)
    ? `body-${bodyOrdinal}`
    : section.slug;
  const nextType = inferBodySectionType(section);

  if (section.slug === nextSlug && section.type === nextType) {
    return section;
  }

  return {
    ...section,
    slug: nextSlug,
    type: nextType,
  };
}

export function normalizeCoverLetterSections(
  sections: CoverLetterDraftSection[] | null | undefined,
): NormalizedSectionsResult {
  const safeSections = Array.isArray(sections) ? sections : [];
  if (safeSections.length === 0) {
    return { sections: [], changed: false };
  }

  const introIndex = safeSections.findIndex(section => isIntroSection(section));
  const closingIndices = safeSections
    .map((section, index) => (isClosingSection(section) ? index : -1))
    .filter(index => index >= 0);
  const closingIndex = closingIndices.length > 0 ? closingIndices[closingIndices.length - 1] : -1;

  const normalized: CoverLetterDraftSection[] = [];
  let changed = false;
  let bodyOrdinal = 1;

  if (introIndex >= 0) {
    const introSection = safeSections[introIndex];
    normalized.push(introSection);
    if (introIndex !== 0) {
      changed = true;
    }
  }

  safeSections.forEach((section, index) => {
    const isPrimaryIntro = introIndex >= 0 && index === introIndex;
    const isPrimaryClosing = closingIndex >= 0 && index === closingIndex;
    if (isPrimaryIntro || isPrimaryClosing) {
      return;
    }

    const coerced = isIntroSection(section) || isClosingSection(section)
      ? coerceBoundarySectionToBody(section, bodyOrdinal)
      : section;

    if (coerced !== section) {
      changed = true;
    }

    normalized.push(coerced);
    bodyOrdinal += 1;
  });

  if (closingIndex >= 0) {
    const closingSection = safeSections[closingIndex];
    normalized.push(closingSection);
    if (closingIndex !== safeSections.length - 1) {
      changed = true;
    }
  }

  const reorderedSections = normalized.map((section, index) => {
    if (section.order === index) {
      return section;
    }

    changed = true;
    return {
      ...section,
      order: index,
    };
  });

  if (!changed && reorderedSections.length === safeSections.length) {
    const structurallyIdentical = reorderedSections.every((section, index) => {
      const original = safeSections[index];
      return (
        original?.id === section.id &&
        original?.type === section.type &&
        original?.slug === section.slug &&
        original?.order === section.order
      );
    });

    if (structurallyIdentical) {
      return {
        sections: safeSections,
        changed: false,
      };
    }
  }

  return {
    sections: reorderedSections,
    changed,
  };
}

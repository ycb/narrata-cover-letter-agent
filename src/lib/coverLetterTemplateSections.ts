import type { CoverLetterSection } from '@/types/workHistory';

const isIntroSection = (section: CoverLetterSection): boolean => section.type === 'intro';

const isTerminalSection = (section: CoverLetterSection): boolean =>
  section.type === 'closer' || section.type === 'signature';

const inferContentType = (section: CoverLetterSection): CoverLetterSection['contentType'] =>
  section.contentType ?? (section.savedSectionId ? 'saved' : 'work-history');

export function normalizeTemplateSectionsForDraft(
  sections: CoverLetterSection[] | null | undefined,
): CoverLetterSection[] {
  const safeSections = Array.isArray(sections)
    ? sections.filter((section): section is CoverLetterSection => Boolean(section && typeof section === 'object'))
    : [];

  if (safeSections.length === 0) {
    return [];
  }

  const sortedSections = safeSections
    .map((section, index) => ({
      ...section,
      contentType: inferContentType(section),
      order: typeof section.order === 'number' ? section.order : index + 1,
    }))
    .sort((left, right) => left.order - right.order);

  const terminalIndex = sortedSections.findIndex(isTerminalSection);
  const preTerminalSections = terminalIndex >= 0 ? sortedSections.slice(0, terminalIndex) : sortedSections;
  const introIndex = preTerminalSections.findIndex(isIntroSection);
  const introSection = introIndex >= 0 ? preTerminalSections[introIndex] : null;

  const bodySections = preTerminalSections.filter((section, index) => {
    if (introIndex >= 0 && index === introIndex) {
      return false;
    }
    return !isIntroSection(section) && !isTerminalSection(section);
  });

  const terminalSection = terminalIndex >= 0 ? sortedSections[terminalIndex] : null;

  return [
    ...(introSection ? [introSection] : []),
    ...bodySections,
    ...(terminalSection ? [terminalSection] : []),
  ].map((section, index) => ({
    ...section,
    contentType: inferContentType(section),
    order: index + 1,
  }));
}

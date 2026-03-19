import { describe, expect, it } from 'vitest';
import { normalizeCoverLetterInsertionTarget, normalizeCoverLetterSections } from '../sectionStructure';

describe('normalizeCoverLetterInsertionTarget', () => {
  const templateSections = [
    { id: 'intro-1', type: 'static', slug: 'introduction' },
    { id: 'body-1', type: 'dynamic-story', slug: 'experience' },
    { id: 'closing-1', type: 'closing', slug: 'closing' },
  ];

  it('keeps new sections before the final closing when inserting at the end', () => {
    expect(normalizeCoverLetterInsertionTarget(templateSections as any, templateSections.length)).toEqual({
      insertIndex: 2,
      sectionType: 'body',
    });
  });

  it('keeps new sections after the introduction when inserting at the top', () => {
    expect(normalizeCoverLetterInsertionTarget(templateSections as any, 0)).toEqual({
      insertIndex: 1,
      sectionType: 'body',
    });
  });

  it('leaves middle insertion points untouched while normalizing the type to body', () => {
    expect(normalizeCoverLetterInsertionTarget(templateSections as any, 2)).toEqual({
      insertIndex: 2,
      sectionType: 'body',
    });
  });
});

describe('normalizeCoverLetterSections', () => {
  it('reclassifies non-final closing sections into body content and preserves the final closing', () => {
    const malformedSections = [
      {
        id: 'intro-1',
        templateSectionId: 'intro',
        slug: 'introduction',
        title: 'Introduction',
        type: 'static',
        order: 0,
        content: 'Intro',
        source: { kind: 'template_static', entityId: null },
        metadata: { requirementsMatched: [], tags: [], wordCount: 10 },
        status: { hasGaps: false, gapIds: [], isModified: false, lastUpdatedAt: '2026-03-19T00:00:00.000Z' },
        analytics: {},
      },
      {
        id: 'buggy-section',
        templateSectionId: null,
        slug: 'closing',
        title: 'Section 6',
        type: 'closing',
        order: 1,
        content: 'Inserted body content',
        source: { kind: 'work_story', entityId: 'story-1' },
        metadata: { requirementsMatched: [], tags: [], wordCount: 42 },
        status: { hasGaps: false, gapIds: [], isModified: false, lastUpdatedAt: '2026-03-19T00:00:00.000Z' },
        analytics: {},
      },
      {
        id: 'closing-1',
        templateSectionId: 'closing',
        slug: 'closing',
        title: 'Closing',
        type: 'closing',
        order: 2,
        content: 'Thanks',
        source: { kind: 'template_static', entityId: null },
        metadata: { requirementsMatched: [], tags: [], wordCount: 8 },
        status: { hasGaps: false, gapIds: [], isModified: false, lastUpdatedAt: '2026-03-19T00:00:00.000Z' },
        analytics: {},
      },
    ];

    const result = normalizeCoverLetterSections(malformedSections as any);

    expect(result.changed).toBe(true);
    expect(result.sections).toHaveLength(3);
    expect(result.sections[1]).toMatchObject({
      id: 'buggy-section',
      type: 'dynamic-story',
      slug: 'body-1',
      title: 'Section 6',
      order: 1,
    });
    expect(result.sections[2]).toMatchObject({
      id: 'closing-1',
      type: 'closing',
      slug: 'closing',
      order: 2,
    });
  });
});

import { describe, expect, it } from 'vitest';
import { convertToSavedSections, parseCoverLetter } from './coverLetterParser';

describe('coverLetterParser', () => {
  it('parses headers + respectfully signature without bloating body sections', () => {
    const input = `Note: This cover letter was drafted with the assistance of AI (Claude by Anthropic)

February 4, 2025

Hiring Manager

General Dynamics Information Technology (GDIT)

Program Manager Position

Dear Hiring Manager,

I am writing to express my strong interest in the Program Manager position at GDIT. With over a decade of progressive experience managing complex government programs across the Department of State, Department of Defense, and Intelligence Community, I bring a proven track record of delivering mission-critical technology solutions on time and within budget.

In my current role as Global Operations Manager at ManTech International, I lead a high-performing team supporting mission-critical diplomatic security equipment across 200+ U.S. Embassies and Consulates.

My foundation in program management was built at Northrop Grumman, where I managed multi-disciplinary teams and developed major acquisition proposals.

I offer GDIT the combination of technical depth and program leadership essential for success in today's federal contracting environment.

GDIT's commitment to delivering consulting, technology, and mission services aligns perfectly with my career trajectory and passion for supporting national security.

Respectfully,

[Your Name]

[Phone Number]

[Email Address]

Top Secret/SCI Clearance`;

    const parsed = parseCoverLetter(input);
    const sections = convertToSavedSections(parsed);

    expect(parsed.greeting).toBe('Dear Hiring Manager,');
    expect(parsed.bodyParagraphs).toHaveLength(3);
    expect(parsed.closing).toContain("GDIT's commitment");
    expect(parsed.signature).toContain('Respectfully');
    expect(parsed.signature).toContain('[Email Address]');
    expect(parsed.signature).toContain('Top Secret/SCI Clearance');

    const bodySections = sections.filter((section) => section.slug.startsWith('body-'));
    const closingSection = sections.find((section) => section.slug === 'closing');

    expect(bodySections).toHaveLength(3);
    expect(closingSection?.content).toContain("GDIT's commitment");
    expect(closingSection?.content).toContain('Respectfully');
    expect(closingSection?.content).toContain('[Email Address]');
  });

  it('extracts trailing placeholder contact lines as signature even without a valediction', () => {
    const input = `Dear Hiring Team,

I have spent the past eight years building product strategy for enterprise workflows.

I led platform modernization across onboarding and analytics, improving conversion and retention.

I would welcome the chance to contribute this background to your team.

[Your Name]

[Phone Number]

[Email Address]`;

    const parsed = parseCoverLetter(input);
    const sections = convertToSavedSections(parsed);

    expect(parsed.bodyParagraphs).toHaveLength(1);
    expect(parsed.closing).toContain('I would welcome the chance');
    expect(parsed.signature).toContain('[Your Name]');
    expect(parsed.signature).toContain('[Email Address]');

    const bodySections = sections.filter((section) => section.slug.startsWith('body-'));
    const closingSection = sections.find((section) => section.slug === 'closing');

    expect(bodySections).toHaveLength(1);
    expect(closingSection?.content).toContain('[Your Name]');
    expect(closingSection?.content).toContain('[Email Address]');
  });

  it('limits body sections to a hard cap by merging overflow into the final body section', () => {
    const input = `Dear Hiring Team,

I am excited to apply for this role.

Body paragraph one with clear evidence and outcomes.

Body paragraph two with cross-functional leadership examples.

Body paragraph three with measurable product impact.

Body paragraph four with stakeholder alignment details.

Body paragraph five with execution rigor and delivery metrics.

Body paragraph six with operating cadence and risk management.

Body paragraph seven with talent leadership and coaching.

I welcome the chance to discuss how this background aligns with your needs.

Sincerely,

Alex Candidate`;

    const parsed = parseCoverLetter(input);
    const sections = convertToSavedSections(parsed);

    const bodySections = sections.filter((section) => section.slug.startsWith('body-'));
    expect(bodySections).toHaveLength(5);
    expect(bodySections[0]?.content).toContain('Body paragraph one');
    expect(bodySections[1]?.content).toContain('Body paragraph two');
    expect(bodySections[2]?.content).toContain('Body paragraph three');
    expect(bodySections[3]?.content).toContain('Body paragraph four');
    expect(bodySections[4]?.content).toContain('Body paragraph five');
    expect(bodySections[4]?.content).toContain('Body paragraph six');
    expect(bodySections[4]?.content).toContain('Body paragraph seven');
  });

  it('does not treat long body prose mentioning clearance as signature content', () => {
    const input = `Dear Hiring Manager,

I am writing to express my strong interest in the Program Manager position at GDIT.

In my current role as Global Operations Manager at ManTech International, I lead mission-critical teams across global operations.

My foundation in program management was built at Northrop Grumman and Booz Allen Hamilton, where I managed engineering teams and authored executive briefings.

I offer GDIT the combination of technical depth and program leadership essential for success in today's federal contracting environment. My experience spans the full program lifecycle and includes global technology transitions. My DoS Class 1 medical clearance for worldwide assignment further demonstrates my readiness for programs with international scope.

GDIT's commitment to delivering consulting, technology, and mission services aligns perfectly with my career trajectory and passion for supporting national security.

Respectfully,

[Your Name]

[Phone Number]

[Email Address]

Top Secret/SCI Clearance`;

    const sections = convertToSavedSections(parseCoverLetter(input));
    const bodySections = sections.filter((section) => section.slug.startsWith('body-'));
    const closingSection = sections.find((section) => section.slug === 'closing');

    expect(bodySections).toHaveLength(3);
    expect(bodySections[2]?.content).toContain('My DoS Class 1 medical clearance');
    expect(closingSection?.content).toContain("GDIT's commitment");
    expect(closingSection?.content).not.toContain('I offer GDIT the combination');
  });
});

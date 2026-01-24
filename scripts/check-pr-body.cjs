#!/usr/bin/env node
const REQUIRED_SECTIONS = [
  'Test Plan',
  'Risk',
  'ExecPlan',
  'Milestones / Commits',
  'Agent Review',
];

const PR_BODY = process.env.PR_BODY || '';

const findSection = (body, sectionTitle) => {
  const headings = [];
  const regex = /^##\s+(.+)$/gm;
  let match;
  while ((match = regex.exec(body)) !== null) {
    headings.push({ title: match[1].trim(), index: match.index });
  }

  const targetIndex = headings.findIndex(
    (heading) => heading.title.toLowerCase() === sectionTitle.toLowerCase(),
  );
  if (targetIndex === -1) return null;

  const start = headings[targetIndex].index;
  const end = targetIndex + 1 < headings.length ? headings[targetIndex + 1].index : body.length;
  return body.slice(start, end);
};

const hasCheckedBox = (text) => /-\s*\[x\]/i.test(text);

const validateTestPlan = (section) => {
  if (!section) return 'Missing "## Test Plan" section.';
  if (!hasCheckedBox(section)) return 'Test Plan must include at least one checked box.';
  return null;
};

const validateRisk = (section) => {
  if (!section) return 'Missing "## Risk" section.';
  const riskChecked = /-\s*\[x\]\s*(Low|Medium|High)/i.test(section);
  if (!riskChecked) return 'Risk must include one checked option (Low/Medium/High).';
  return null;
};

const validateExecPlan = (section) => {
  if (!section) return 'Missing "## ExecPlan" section.';
  const hasLink = /https?:\/\/\S+/i.test(section);
  const hasNA = /\bN\/A\b/i.test(section);
  if (!hasLink && !hasNA) return 'ExecPlan must include a link or "N/A".';
  return null;
};

const validateMilestones = (section, execPlanSection) => {
  if (!section) return 'Missing "## Milestones / Commits" section.';
  const execPlanIsNA = execPlanSection ? /\bN\/A\b/i.test(execPlanSection) : false;
  if (execPlanIsNA && /\bN\/A\b/i.test(section)) return null;
  const hasBullet = /-\s+\S+/.test(section);
  if (!hasBullet) return 'Milestones / Commits must include at least one bullet entry.';
  return null;
};

const validateAgentReview = (section) => {
  if (!section) return 'Missing "## Agent Review" section.';
  const agentChecked = /-\s*\[x\]\s*Agent reviewed/i.test(section);
  const humanChecked = /-\s*\[x\]\s*Human approval required/i.test(section);
  if (!agentChecked) return 'Agent Review must check "Agent reviewed".';
  if (!humanChecked) return 'Agent Review must check "Human approval required".';
  return null;
};

const main = () => {
  if (!PR_BODY.trim()) {
    console.error('[pr-body] Missing PR body.');
    process.exit(1);
  }

  const missing = REQUIRED_SECTIONS.filter(
    (section) => !findSection(PR_BODY, section),
  );
  if (missing.length) {
    console.error(`[pr-body] Missing sections: ${missing.join(', ')}`);
  }

  const execPlanSection = findSection(PR_BODY, 'ExecPlan');
  const failures = [
    validateTestPlan(findSection(PR_BODY, 'Test Plan')),
    validateRisk(findSection(PR_BODY, 'Risk')),
    validateExecPlan(execPlanSection),
    validateMilestones(findSection(PR_BODY, 'Milestones / Commits'), execPlanSection),
    validateAgentReview(findSection(PR_BODY, 'Agent Review')),
  ].filter(Boolean);

  if (missing.length || failures.length) {
    const messages = [...missing.map(section => `Missing section: ${section}`), ...failures];
    messages.forEach(message => console.error(`[pr-body] ${message}`));
    process.exit(1);
  }

  console.log('[pr-body] OK');
};

main();

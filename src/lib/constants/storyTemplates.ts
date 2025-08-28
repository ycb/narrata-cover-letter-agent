import type { StoryTemplate } from "@/types/workHistory";

export const STORY_TEMPLATES: Record<string, StoryTemplate> = {
  '0to1-launch': {
    id: '0to1-launch',
    name: '0→1 Launch',
    description: 'New product or feature you brought to life',
    prompt: `Describe a new product or feature you brought to life.
- What problem did it solve?
- Who was the target user?
- How did you validate the opportunity?
- What was your role in defining and delivering the solution?
- What was the measurable outcome?`,
    category: 'launch'
  },
  'growth-optimization': {
    id: 'growth-optimization',
    name: 'Growth or Optimization',
    description: 'Time you improved a KPI',
    prompt: `Describe a time you improved a KPI.
- What metric did you move?
- What user behavior or friction did you address?
- What levers or experiments did you use?
- What tradeoffs did you manage?
- What was the business impact?`,
    category: 'growth'
  },
  'cross-functional-leadership': {
    id: 'cross-functional-leadership',
    name: 'Cross functional Leadership',
    description: 'Time you aligned multiple teams',
    prompt: `Describe a time you aligned multiple teams.
- What was the strategic objective or challenge?
- What teams or stakeholders were involved?
- How did you drive alignment and execution?
- What conflict or ambiguity did you navigate?
- What changed as a result?`,
    category: 'leadership'
  }
};

export const STORY_TEMPLATE_CATEGORIES = {
  launch: 'Launch & Innovation',
  growth: 'Growth & Optimization', 
  leadership: 'Leadership & Collaboration'
};

import { DashboardV2Data, PMCompetency } from '@/types/dashboard';

// PM Competency Framework (based on Assessment.tsx)
export const pmCompetencies: PMCompetency[] = [
  {
    id: 'execution',
    name: 'Product Execution',
    category: 'execution',
    description: 'Delivering complex products with measurable impact',
    weight: 5
  },
  {
    id: 'insight',
    name: 'Customer Insight',
    category: 'insight', 
    description: 'Deep understanding of user needs and market validation',
    weight: 4
  },
  {
    id: 'strategy',
    name: 'Product Strategy',
    category: 'strategy',
    description: 'Strategic thinking, vision, and roadmap development',
    weight: 4
  },
  {
    id: 'influence',
    name: 'Influence & Leadership',
    category: 'influence',
    description: 'Cross-functional collaboration and team influence',
    weight: 3
  }
];

// Mock Dashboard v2 Data
export const mockDashboardV2Data: DashboardV2Data = {
  coverageMap: {
    competencies: [
      {
        competency: pmCompetencies[0], // Product Execution
        coverage: 85,
        stories: ['story-1', 'story-2', 'story-3', 'story-4'],
        averageStrength: 78,
        gap: 'low',
        lastStoryAdded: '2024-01-15'
      },
      {
        competency: pmCompetencies[1], // Customer Insight
        coverage: 70,
        stories: ['story-5', 'story-6'],
        averageStrength: 72,
        gap: 'medium',
        lastStoryAdded: '2024-01-10'
      },
      {
        competency: pmCompetencies[2], // Product Strategy
        coverage: 45,
        stories: ['story-7'],
        averageStrength: 65,
        gap: 'high',
        lastStoryAdded: '2024-01-05'
      },
      {
        competency: pmCompetencies[3], // Influence & Leadership
        coverage: 60,
        stories: ['story-8', 'story-9'],
        averageStrength: 68,
        gap: 'medium',
        lastStoryAdded: '2024-01-12'
      }
    ],
    overallCoverage: 65,
    priorityGaps: ['strategy', 'influence']
  },

  storyStrength: {
    overall: 71,
    breakdown: {
      outcomes: 24, // 24/30
      context: 20, // 20/25
      technical: 15, // 15/20
      influence: 12, // 12/15
      innovation: 8 // 8/10 (bonus)
    },
    recommendations: [
      'Add more quantified outcomes to your stories',
      'Include team size and project scope context',
      'Highlight technical methodologies and tools used',
      'Emphasize cross-functional collaboration impact'
    ],
    lastAssessed: '2024-01-15'
  },

  resumeGaps: [
    {
      competency: pmCompetencies[2], // Product Strategy
      missingStories: 3,
      suggestedActions: [
        'Add platform strategy examples',
        'Include roadmap development stories',
        'Document competitive analysis work'
      ],
      priority: 'high'
    },
    {
      competency: pmCompetencies[3], // Influence & Leadership
      missingStories: 2,
      suggestedActions: [
        'Add stakeholder management examples',
        'Include team leadership stories'
      ],
      priority: 'medium'
    }
  ],

  lastLetter: {
    id: 'letter-1',
    title: 'Senior PM at TechCorp',
    company: 'TechCorp',
    role: 'Senior Product Manager',
    sentDate: '2024-01-14',
    sections: [
      {
        id: 'intro-1',
        type: 'introduction',
        content: 'Experienced PM with 5+ years delivering...',
        competency: 'execution'
      },
      {
        id: 'body-1',
        type: 'body',
        content: 'Led cross-functional team of 8...',
        competency: 'influence'
      }
    ],
    status: 'sent'
  },

  quickActions: [
    {
      id: 'add-strategy',
      title: 'Add Strategy Story',
      description: 'Strengthen your Product Strategy competency',
      action: '/work-history?tab=stories&competency=strategy',
      priority: 'high'
    },
    {
      id: 'improve-outcomes',
      title: 'Improve Story Outcomes',
      description: 'Add quantified results to existing stories',
      action: '/work-history?tab=stories&filter=low-outcomes',
      priority: 'medium'
    },
    {
      id: 'add-leadership',
      title: 'Add Leadership Story',
      description: 'Showcase cross-functional influence',
      action: '/work-history?tab=stories&competency=influence',
      priority: 'medium'
    }
  ]
};

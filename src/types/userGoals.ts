export interface UserGoals {
  targetTitles: string[];
  minimumSalary: number;
  companyMaturity: 'startup' | 'public' | 'either';
  workType: 'remote' | 'hybrid' | 'in-person' | 'flexible';
  industries: string[];
  businessModels: string[];
  dealBreakers: {
    mustBeRemote: boolean;
    mustBeStartup: boolean;
    mustBePublicCompany: boolean;
    salaryMinimum: number | null;
  };
  preferredCities: string[];
  openToRelocation: boolean;
}

export interface UserGoalsFormData {
  targetTitles: string[];
  minimumSalary: string;
  companyMaturity: 'startup' | 'public' | 'either';
  workType: 'remote' | 'hybrid' | 'in-person' | 'flexible';
  industries: string[];
  businessModels: string[];
  dealBreakers: {
    mustBeRemote: boolean;
    mustBeStartup: boolean;
    mustBePublicCompany: boolean;
    salaryMinimum: string;
  };
  preferredCities: string[];
  openToRelocation: boolean;
}

// Predefined options for easy selection
export const PREDEFINED_TITLES = [
  'Software Engineer',
  'Senior Software Engineer',
  'Lead Software Engineer',
  'Staff Software Engineer',
  'Principal Software Engineer',
  'Engineering Manager',
  'Senior Engineering Manager',
  'Director of Engineering',
  'VP of Engineering',
  'CTO',
  'Product Manager',
  'Senior Product Manager',
  'Principal Product Manager',
  'Director of Product',
  'VP of Product',
  'CPO',
  'Data Scientist',
  'Senior Data Scientist',
  'Data Engineer',
  'ML Engineer',
  'DevOps Engineer',
  'Site Reliability Engineer',
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Engineer',
  'Mobile Engineer',
  'QA Engineer',
  'Security Engineer',
  'UX Designer',
  'UI Designer',
  'Product Designer',
  'Design Manager',
  'Marketing Manager',
  'Growth Manager',
  'Sales Manager',
  'Business Development',
  'Operations Manager',
  'Finance Manager',
  'HR Manager',
  'Recruiter'
];

export const PREDEFINED_INDUSTRIES = [
  'Fintech',
  'Healthcare',
  'E-commerce',
  'SaaS',
  'EdTech',
  'CleanTech',
  'Hardware',
  'Gaming',
  'Media & Entertainment',
  'Real Estate',
  'Transportation',
  'Food & Beverage',
  'Retail',
  'Manufacturing',
  'Consulting',
  'Banking',
  'Insurance',
  'Government',
  'Non-profit',
  'Telecommunications',
  'Energy',
  'Agriculture',
  'Travel & Hospitality',
  'Sports & Fitness',
  'Beauty & Fashion',
  'Automotive',
  'Aerospace',
  'Defense',
  'Legal',
  'Marketing & Advertising'
];

export const PREDEFINED_BUSINESS_MODELS = [
  'B2B SaaS',
  'B2C',
  'Marketplace',
  'Platform',
  'Developer Tools',
  'Enterprise Software',
  'Consumer Products',
  'E-commerce',
  'Subscription',
  'Freemium',
  'API-first',
  'Open Source',
  'Consulting',
  'Agency',
  'Media',
  'Content',
  'Gaming',
  'Hardware',
  'IoT',
  'Blockchain/Crypto'
];

export const PREDEFINED_CITIES = [
  'San Francisco, CA',
  'New York, NY',
  'Seattle, WA',
  'Austin, TX',
  'Boston, MA',
  'Los Angeles, CA',
  'Chicago, IL',
  'Denver, CO',
  'Portland, OR',
  'San Diego, CA',
  'Miami, FL',
  'Atlanta, GA',
  'Dallas, TX',
  'Phoenix, AZ',
  'Philadelphia, PA',
  'Washington, DC',
  'Nashville, TN',
  'Salt Lake City, UT',
  'Minneapolis, MN',
  'Detroit, MI',
  'Remote',
  'International'
];

export interface UserGoals {
  targetTitles: string[];
  minimumSalary: number;
  companyMaturity: 'early-stage' | 'late-stage' | 'public' | 'either';
  workType: string[];
  industries: string[];
  businessModels: string[];
  dealBreakers: {
    workType: string[];
    companyMaturity: string[];
    salaryMinimum: number | null;
  };
  preferredCities: string[];
  openToRelocation: boolean;
}

export interface UserGoalsFormData {
  targetTitles: string[];
  minimumSalary: string;
  companyMaturity: 'early-stage' | 'late-stage' | 'public' | 'either';
  workType: string[];
  industries: string[];
  businessModels: string[];
  dealBreakers: {
    workType: string[];
    companyMaturity: string[];
    salaryMinimum: string;
  };
  preferredCities: string[];
  openToRelocation: boolean;
}

// Predefined options for easy selection
export const PREDEFINED_TITLES = [
  'Product Manager',
  'Senior Product Manager',
  'Principal Product Manager',
  'Staff Product Manager',
  'Group Product Manager',
  'Director of Product',
  'VP of Product',
  'CPO',
  'Product Owner',
  'Senior Product Owner',
  'Technical Product Manager',
  'Growth Product Manager',
  'Platform Product Manager',
  'Consumer Product Manager',
  'B2B Product Manager',
  'Mobile Product Manager',
  'Data Product Manager',
  'AI/ML Product Manager',
  'Product Marketing Manager',
  'Product Operations Manager',
  'Product Strategy Manager',
  'Product Analytics Manager',
  'Product Design Manager',
  'Product Engineering Manager',
  'Associate Product Manager',
  'Junior Product Manager',
  'Lead Product Manager',
  'Head of Product',
  'Chief Product Officer',
  'Product Director'
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

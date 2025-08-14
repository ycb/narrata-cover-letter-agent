export interface WorkHistoryCompany {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  tags: string[];
  roles: WorkHistoryRole[];
}

export interface WorkHistoryRole {
  id: string;
  companyId: string;
  title: string;
  startDate: string;
  endDate?: string;
  description?: string;
  tags: string[];
  achievements: string[];
  blurbs: WorkHistoryBlurb[];
}

export interface WorkHistoryBlurb {
  id: string;
  roleId: string;
  title: string;
  content: string;
  status: 'approved' | 'draft' | 'needs-review';
  confidence: 'high' | 'medium' | 'low';
  tags: string[];
  timesUsed: number;
  lastUsed?: string;
}

export interface CoverLetterTemplate {
  id: string;
  name: string;
  type: 'introduction' | 'closer' | 'signature';
  blurbs: TemplateBlurb[];
}

export interface TemplateBlurb {
  id: string;
  templateId: string;
  title: string;
  content: string;
  status: 'approved' | 'draft' | 'needs-review';
  confidence: 'high' | 'medium' | 'low';
  tags: string[];
  timesUsed: number;
  lastUsed?: string;
}
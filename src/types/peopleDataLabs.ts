// People Data Labs API types

export interface PDLEnrichmentParams {
  name?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  linkedin?: string;
  profile?: string[];
}

export interface PDLWorkExperience {
  company?: {
    name?: string;
    website?: string;
    linkedin_url?: string;
    size?: string;
    industry?: string;
    founded?: number;
    location?: {
      name?: string;
      locality?: string;
      region?: string;
      country?: string;
      street_address?: string;
      postal_code?: string;
    };
  };
  title?: {
    name?: string;
    role?: string;
    sub_role?: string;
    levels?: string[];
    class?: string;
  };
  start_date?: string;
  end_date?: string | null;
  location?: {
    name?: string;
    locality?: string;
    region?: string;
    country?: string;
  };
  is_primary?: boolean;
  summary?: string;
}

export interface PDLEducation {
  school?: {
    name?: string;
    website?: string;
    linkedin_url?: string;
    location?: {
      name?: string;
      locality?: string;
      region?: string;
      country?: string;
    };
  };
  degrees?: string[];
  majors?: string[];
  minors?: string[];
  start_date?: string;
  end_date?: string;
  gpa?: string;
}

export interface PDLCertification {
  name?: string;
  organization?: string;
  start_date?: string;
  end_date?: string | null;
}

export interface PDLPersonData {
  id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  linkedin_url?: string;
  linkedin_username?: string;
  linkedin_id?: string;
  location_name?: string;
  location_locality?: string;
  location_region?: string;
  location_country?: string;
  summary?: string;
  headline?: string;
  email?: string;
  phone_numbers?: string[];
  experience?: PDLWorkExperience[];
  education?: PDLEducation[];
  skills?: string[];
  certifications?: PDLCertification[];
  websites?: string[];
  profiles?: {
    network?: string;
    url?: string;
    username?: string;
    id?: string;
  }[];
  job_company_name?: string;
  job_title_name?: string;
}

export interface PDLEnrichmentResponse {
  status: number;
  data?: PDLPersonData;
  error?: {
    type?: string;
    message?: string;
  };
  likelihood?: number;
}

export interface PDLEnrichmentResult {
  success: boolean;
  data?: PDLPersonData;
  error?: string;
  retryable?: boolean;
  likelihood?: number;
}

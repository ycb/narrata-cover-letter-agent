// File upload types and interfaces

export interface FileUploadMetadata {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileChecksum: string;
  storagePath: string;
  processingStatus: ProcessingStatus;
  rawText?: string;
  structuredData?: StructuredResumeData | LinkedInProfileData;
  processingError?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type FileType = 'resume' | 'coverLetter' | 'caseStudies' | 'linkedin';

export interface StructuredResumeData {
  workHistory: WorkExperience[];
  education: Education[];
  skills: string[] | SkillCategory[]; // Can be flat array or categorized
  achievements: string[];
  contactInfo: ContactInfo;
  location?: string; // Top-level geographic location (NOT contact info)
  summary?: string;
  certifications?: Certification[];
  projects?: Project[];
}

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  description?: string; // Made optional since roleSummary is preferred
  achievements?: string[]; // Deprecated in favor of stories, kept for backward compatibility
  location?: string; // Role-specific location
  current: boolean;
  // NEW: Rich schema fields from LLM prompt
  roleMetrics?: RoleMetric[];
  stories?: Story[];
  roleTags?: string[];
  roleSummary?: string; // Preferred over description
  companyTags?: string[];
}

export interface RoleMetric {
  value: string; // e.g., "+22%", "-3.5%", "30+", "+10"
  context: string; // What this metric measures
  type: 'increase' | 'decrease' | 'absolute';
  parentType: 'role' | 'story';
}

export interface Story {
  id: string;
  title: string; // Brief story title (5-8 words)
  content: string; // Full text exactly as written
  problem?: string; // What challenge or opportunity
  action?: string; // What was done
  outcome?: string; // What resulted
  tags: string[]; // Skills/competencies mentioned
  linkedToRole: boolean; // true if story clearly belongs to this workHistory entry
  company?: string; // Reference to parent company
  titleRole?: string; // Reference to parent title
  metrics?: RoleMetric[]; // Metrics associated with this story
}

export interface SkillCategory {
  category: string;
  items: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
  location?: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  linkedin?: string;
  website?: string;
  github?: string;
  substack?: string;
  // location removed - now top-level in StructuredResumeData
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  startDate: string;
  endDate?: string;
  url?: string;
}

export interface LinkedInProfileData {
  linkedinId: string;
  profileUrl: string;
  about?: string;
  experience: WorkExperience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  projects: Project[];
  rawData: any;
}

export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  status: ProcessingStatus;
  progress: number; // 0-100
  error?: string;
  retryable?: boolean;
}

export interface UploadResult {
  success: boolean;
  fileId?: string;
  error?: string;
  retryable?: boolean;
}

export interface ProcessingOptions {
  extractWorkHistory: boolean;
  extractEducation: boolean;
  extractSkills: boolean;
  extractAchievements: boolean;
  extractContactInfo: boolean;
  extractCertifications: boolean;
  extractProjects: boolean;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  fileType?: string;
  fileSize?: number;
}

export interface StorageUploadResult {
  success: boolean;
  storagePath?: string;
  error?: string;
}

export interface TextExtractionResult {
  success: boolean;
  text?: string;
  error?: string;
}

export interface LLMAnalysisResult {
  success: boolean;
  data?: StructuredResumeData;
  rawData?: Record<string, unknown>; // Full raw LLM response with all fields (roleMetrics, stories, etc.)
  error?: string;
  retryable?: boolean;
}

export interface LinkedInApiResult {
  success: boolean;
  data?: LinkedInProfileData;
  error?: string;
  retryable?: boolean;
}

// Hook types
export interface UseFileUploadOptions {
  onProgress?: (progress: FileUploadProgress) => void;
  onComplete?: (result: UploadResult) => void;
  onError?: (error: string) => void;
  maxFiles?: number;
  allowedTypes?: string[];
  maxFileSize?: number;
}

export interface UseFileUploadReturn {
  uploadFile: (file: File, type: FileType) => Promise<UploadResult>;
  uploadFiles: (files: File[], type: FileType) => Promise<UploadResult[]>;
  saveManualText: (text: string, type: FileType) => Promise<UploadResult>;
  isUploading: boolean;
  progress: FileUploadProgress[];
  error: string | null;
  clearError: () => void;
  retryUpload: (fileId: string) => Promise<UploadResult>;
  // Additional utility methods
  clearProgress: () => void;
  getFileProgress: (fileId: string) => FileUploadProgress | undefined;
  hasActiveUploads: () => boolean;
  getFailedUploads: () => FileUploadProgress[];
  getCompletedUploads: () => FileUploadProgress[];
}

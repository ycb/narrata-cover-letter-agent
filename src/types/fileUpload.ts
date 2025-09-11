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
  skills: string[];
  achievements: string[];
  contactInfo: ContactInfo;
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
  description: string;
  achievements: string[];
  location?: string;
  current: boolean;
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
  location?: string;
  website?: string;
  linkedin?: string;
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
  isUploading: boolean;
  progress: FileUploadProgress[];
  error: string | null;
  clearError: () => void;
  retryUpload: (fileId: string) => Promise<UploadResult>;
}

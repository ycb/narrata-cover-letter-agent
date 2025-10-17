// File upload configuration
export const FILE_UPLOAD_CONFIG = {
  // File size limits
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB in bytes
  IMMEDIATE_PROCESSING_THRESHOLD: 1024 * 1024, // 1MB threshold for immediate vs background processing
  
  // Allowed file types
  ALLOWED_TYPES: {
    RESUME: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ],
    COVER_LETTER: [
      'text/plain',
      'application/pdf',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    CASE_STUDIES: [
      'text/plain',
      'application/pdf',
      'text/markdown'
    ]
  },
  
  // File extensions for validation
  ALLOWED_EXTENSIONS: {
    RESUME: ['.pdf', '.docx', '.txt', '.md'],
    COVER_LETTER: ['.txt', '.pdf', '.md', '.docx'],
    CASE_STUDIES: ['.txt', '.pdf', '.md']
  },
  
  // Storage configuration
  STORAGE: {
    BUCKET_NAME: 'user-files',
    FOLDER_STRUCTURE: 'user_id/YYYY/MM/DD' // user_id/year/month/day
  },
  
  // Processing configuration
  PROCESSING: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
    TIMEOUT: 30000, // 30 seconds
    BATCH_SIZE: 5 // Process up to 5 files simultaneously
  },
  
  // File history management
  HISTORY: {
    MAX_FILES_PER_USER: 10,
    CLEANUP_INTERVAL: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  }
} as const;

// OpenAI configuration
export const OPENAI_CONFIG = {
  MODEL: import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo',
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.1,
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3
} as const;

// LinkedIn API configuration
export const LINKEDIN_CONFIG = {
  API_VERSION: 'v2',
  SCOPES: [
    'r_liteprofile',
    'r_emailaddress',
    'w_member_social'
  ],
  TIMEOUT: 15000, // 15 seconds
  MAX_RETRIES: 3
} as const;

// People Data Labs API configuration
export const PDL_CONFIG = {
  API_URL: 'https://api.peopledatalabs.com/v5/person/enrich',
  TIMEOUT: 15000, // 15 seconds
  MAX_RETRIES: 2,
  MIN_LIKELIHOOD: 0.7 // Minimum confidence score to accept results
} as const;

// Error messages
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File is too large. Please upload a file smaller than 5MB.',
  INVALID_TYPE: 'Please upload a supported file type (PDF, DOCX, TXT, or MD).',
  UPLOAD_FAILED: 'Upload failed. Please check your connection and try again.',
  PROCESSING_FAILED: 'File processing failed. Please try uploading again.',
  LINKEDIN_AUTH_FAILED: 'LinkedIn connection failed. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
} as const;

// Processing status types
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

// File type types
export type FileType = 'resume' | 'coverLetter' | 'caseStudies' | 'linkedin';

// Processing result types
export interface ProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
  retryable?: boolean;
}

# File Upload Implementation

This document describes the implementation of the file upload feature for resumes and LinkedIn profile integration.

## Overview

The file upload system allows users to:
- Upload PDF and DOCX resume files
- Connect their LinkedIn profiles
- Extract and analyze content using AI
- Store files securely in Supabase Storage
- Track processing status in real-time

## Architecture

### Components

1. **FileUploadService** - Core service for file operations
2. **TextExtractionService** - Extracts text from PDF/DOCX files
3. **LLMAnalysisService** - Analyzes content using OpenAI
4. **LinkedInService** - Fetches LinkedIn profile data
5. **useFileUpload Hook** - React hook for UI integration
6. **FileUploadCard Component** - UI component for file uploads

### Database Schema

#### Sources Table
```sql
CREATE TABLE public.sources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_checksum TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'resume' CHECK (source_type IN ('resume', 'cover_letter')),
  processing_status TEXT DEFAULT 'pending',
  raw_text TEXT,
  structured_data JSONB,
  processing_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### LinkedIn Profiles Table
```sql
CREATE TABLE public.linkedin_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  linkedin_id TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  about TEXT,
  experience JSONB,
  education JSONB,
  skills TEXT[],
  certifications JSONB,
  projects JSONB,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Configuration

### Environment Variables

```bash
# Required
VITE_OPENAI_KEY=your_openai_api_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
VITE_OPENAI_MODEL=gpt-4  # Default: gpt-4
```

### File Upload Configuration

```typescript
export const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  IMMEDIATE_PROCESSING_THRESHOLD: 1024 * 1024, // 1MB
  ALLOWED_TYPES: {
    RESUME: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    COVER_LETTER: ['text/plain', 'application/pdf', 'text/markdown'],
    CASE_STUDIES: ['text/plain', 'application/pdf', 'text/markdown']
  },
  STORAGE: {
    BUCKET_NAME: 'user-files',
    FOLDER_STRUCTURE: 'user_id/YYYY/MM/DD'
  },
  PROCESSING: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    TIMEOUT: 30000,
    BATCH_SIZE: 5
  },
  HISTORY: {
    MAX_FILES_PER_USER: 10,
    CLEANUP_INTERVAL: 24 * 60 * 60 * 1000
  }
};
```

## Usage

### Basic File Upload

```typescript
import { useFileUpload } from '@/hooks/useFileUpload';

function MyComponent() {
  const { uploadFile, isUploading, progress, error } = useFileUpload({
    onComplete: (result) => {
      console.log('Upload completed:', result);
    },
    onError: (error) => {
      console.error('Upload failed:', error);
    }
  });

  const handleFileSelect = async (file: File) => {
    await uploadFile(file, 'resume');
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleFileSelect(e.target.files[0])} />
      {isUploading && <div>Uploading...</div>}
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

### Using FileUploadCard Component

```typescript
import { FileUploadCard } from '@/components/onboarding/FileUploadCard';

function OnboardingPage() {
  const handleUploadComplete = (fileId: string, type: string) => {
    console.log('Upload completed:', { fileId, type });
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  return (
    <FileUploadCard
      type="resume"
      title="Resume"
      description="Upload your resume to get started"
      icon={FileText}
      onUploadComplete={handleUploadComplete}
      onUploadError={handleUploadError}
      required
    />
  );
}
```

### LinkedIn Integration

```typescript
import { useLinkedInUpload } from '@/hooks/useFileUpload';

function LinkedInConnect() {
  const { connectLinkedIn, isConnecting, error } = useLinkedInUpload();

  const handleLinkedInConnect = async (url: string) => {
    const result = await connectLinkedIn(url);
    if (result.success) {
      console.log('LinkedIn connected:', result.fileId);
    }
  };

  return (
    <div>
      <input 
        type="url" 
        placeholder="LinkedIn URL"
        onChange={(e) => handleLinkedInConnect(e.target.value)}
      />
      {isConnecting && <div>Connecting...</div>}
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

## Processing Flow

### File Upload Process

1. **Validation** - Check file type, size, and format
2. **Upload to Storage** - Store file in Supabase Storage with user isolation
3. **Create Database Record** - Insert metadata into sources table
4. **Text Extraction** - Extract text from PDF/DOCX files
5. **AI Analysis** - Use OpenAI to structure the content (only for uploaded documents)
6. **Update Status** - Mark processing as completed

### LinkedIn Integration Process

1. **URL Validation** - Validate LinkedIn profile URL format
2. **API Authentication** - Exchange OAuth code for access token
3. **Data Fetching** - Fetch structured data from LinkedIn API v2
4. **Direct Parsing** - Parse API response directly (no LLM analysis needed)
5. **Database Storage** - Store structured data in linkedin_profiles table

### Processing Modes

- **Immediate Processing** - Files < 1MB processed immediately
- **Background Processing** - Larger files processed asynchronously
- **Real-time Updates** - Status updates via Supabase realtime

## Error Handling

### Retry Mechanism

- Automatic retry for transient errors
- Maximum 3 retry attempts
- Exponential backoff delay
- User-initiated retry for failed uploads

### Error Types

- **Validation Errors** - Invalid file type, size, format
- **Upload Errors** - Network, storage, or permission issues
- **Processing Errors** - Text extraction or AI analysis failures
- **LinkedIn Errors** - Authentication or API issues

## Security

### Row Level Security (RLS)

- Users can only access their own files
- Storage paths include user ID for isolation
- All database operations respect RLS policies

### File Validation

- File type whitelist
- Size limits enforced
- Checksum verification for integrity
- Sanitized file names

## Monitoring

### Processing Status

- `pending` - File uploaded, waiting for processing
- `processing` - Currently being processed
- `completed` - Successfully processed
- `failed` - Processing failed with error

### Metrics

- Upload success rate
- Processing time
- Error frequency
- File size distribution

## Testing

### Unit Tests

```bash
npm run test src/services/__tests__/fileUploadService.test.ts
```

### Integration Tests

- Test file upload flow end-to-end
- Verify database records are created
- Check storage files are accessible
- Validate AI processing results

## Deployment

### Prerequisites

1. Supabase project with Storage enabled
2. OpenAI API key configured
3. Database migrations applied
4. Storage bucket created with RLS policies

### Migration

```bash
# Apply database migrations
supabase db push

# Create storage bucket
supabase storage create user-files --public false
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Add required variables
VITE_OPENAI_KEY=your_key_here
VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_key_here
```

## Troubleshooting

### Common Issues

1. **File Upload Fails**
   - Check file size and type
   - Verify Supabase Storage configuration
   - Check network connectivity

2. **Processing Stuck**
   - Check OpenAI API key and quota
   - Verify text extraction service
   - Check database connection

3. **LinkedIn Connection Fails**
   - Verify LinkedIn API credentials
   - Check OAuth configuration
   - Validate URL format

### Debug Mode

Enable debug logging by setting:
```typescript
localStorage.setItem('debug', 'fileUpload:*');
```

## Future Enhancements

- [ ] Support for more file formats (RTF, TXT)
- [ ] Batch file processing
- [ ] Advanced AI analysis features
- [ ] File versioning and history
- [ ] Integration with other job platforms
- [ ] Real-time collaboration features

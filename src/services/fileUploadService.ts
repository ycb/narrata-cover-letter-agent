// File upload service for Supabase Storage
import { supabase } from '@/lib/supabase';
import { FILE_UPLOAD_CONFIG, ERROR_MESSAGES } from '@/lib/config/fileUpload';
import type { 
  FileUploadMetadata, 
  FileValidationResult, 
  StorageUploadResult, 
  UploadResult,
  FileType,
  ProcessingStatus
} from '@/types/fileUpload';

// Interface for source data from database
interface SourceData {
  storage_path: string;
  processing_status: ProcessingStatus;
}

// Helper function to get Supabase configuration
const getSupabaseConfig = () => ({
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY
});
// Note: These services will be imported when they're available
// import { TextExtractionService } from './textExtractionService';
// import { LLMAnalysisService } from './openaiService';

export class FileUploadService {
  // Note: Services will be initialized when available
  // private textExtractionService: TextExtractionService;
  // private llmAnalysisService: LLMAnalysisService;

  constructor() {
    // this.textExtractionService = new TextExtractionService();
    // this.llmAnalysisService = new LLMAnalysisService();
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File, type: FileType): FileValidationResult {
    // Check file size
    if (file.size > FILE_UPLOAD_CONFIG.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: ERROR_MESSAGES.FILE_TOO_LARGE
      };
    }

    // Check file type
    const typeKey = type === 'coverLetter' ? 'COVER_LETTER' : 
                   type === 'caseStudies' ? 'CASE_STUDIES' : 
                   type.toUpperCase() as keyof typeof FILE_UPLOAD_CONFIG.ALLOWED_TYPES;
    const allowedTypes = FILE_UPLOAD_CONFIG.ALLOWED_TYPES[typeKey] as readonly string[];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: ERROR_MESSAGES.INVALID_TYPE
      };
    }

    return {
      valid: true,
      fileType: file.type,
      fileSize: file.size
    };
  }

  /**
   * Generate file checksum for deduplication
   */
  private async generateChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate storage path for file
   */
  private generateStoragePath(userId: string, fileName: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // Sanitize filename
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = now.getTime();
    
    return `${userId}/${year}/${month}/${day}/${timestamp}_${sanitizedFileName}`;
  }

  /**
   * Upload file to Supabase Storage
   */
  async uploadToStorage(file: File, userId: string, skipAuthCheck: boolean = false, accessToken?: string): Promise<StorageUploadResult> {
    try {
      const storagePath = this.generateStoragePath(userId, file.name);
      console.log('Uploading file:', { name: file.name, size: file.size, type: file.type });
      
      // Skip auth check since we already validated in the hook
      if (!skipAuthCheck) {
        console.log('Authentication check skipped - using user from AuthContext');
      }
      
      // Use direct fetch instead of Supabase client since it's not working
      console.log('Uploading to storage...');
      
      const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
      
      // Use the access token passed from AuthContext
      if (!accessToken) {
        console.error('No access token provided');
        return {
          success: false,
          error: 'No access token available for upload'
        };
      }
      
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${FILE_UPLOAD_CONFIG.STORAGE.BUCKET_NAME}/${storagePath}`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Content-Type': file.type,
          'Cache-Control': '3600'
        },
        body: file
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', errorText);
        return {
          success: false,
          error: `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`
        };
      }
      
      const uploadData = await uploadResponse.json();
      console.log('Storage upload successful');
      
      const data = { path: storagePath };
      const error = null;

      if (error) {
        console.error('Storage upload error:', error);
        
        // Provide more specific error messages
        if (error.message?.includes('new row violates row-level security policy')) {
          return {
            success: false,
            error: 'Permission denied. Please ensure you are logged in and have the correct permissions.'
          };
        }
        
        if (error.message?.includes('Bucket not found')) {
          return {
            success: false,
            error: `Storage bucket '${FILE_UPLOAD_CONFIG.STORAGE.BUCKET_NAME}' not found. Please contact support.`
          };
        }
        
        return {
          success: false,
          error: error.message || 'Upload failed'
        };
      }

      console.log('Storage upload successful');
      return {
        success: true,
        storagePath: data.path
      };
    } catch (error) {
      console.error('Storage upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR
      };
    }
  }

  /**
   * Create source record in database
   */
  async createSourceRecord(
    file: File, 
    userId: string, 
    storagePath: string,
    accessToken?: string
  ): Promise<string> {
    try {
      const checksum = await this.generateChecksum(file);
      
      // Use direct fetch instead of Supabase client
      const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
      
      const insertData = {
        user_id: userId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_checksum: checksum,
        storage_path: storagePath,
        processing_status: 'pending'
      };
      
      const response = await fetch(`${supabaseUrl}/rest/v1/sources`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(insertData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Database insert failed:', errorText);
        
        // Check if it's a table doesn't exist error
        if (errorText.includes('relation "sources" does not exist')) {
          throw new Error('Database not set up. Please run the migration first. See setup-database.md for instructions.');
        }
        
        throw new Error(`Database insert failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Source record created');
      
      return data[0]?.id || data.id;
    } catch (error) {
      console.error('Create source record error:', error);
      throw error;
    }
  }

  /**
   * Update source record processing status
   */
  async updateProcessingStatus(
    sourceId: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed',
    data?: string | Record<string, unknown>,
    error?: string,
    accessToken?: string
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        processing_status: status,
        updated_at: new Date().toISOString()
      };

      if (data) {
        if (typeof data === 'string') {
          updateData.raw_text = data;
        } else {
          updateData.structured_data = data;
        }
      }

      if (error) {
        updateData.processing_error = error;
      }

      // Use direct fetch instead of Supabase client
      const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
      
      const response = await fetch(`${supabaseUrl}/rest/v1/sources?id=eq.${sourceId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update processing status failed:', errorText);
        throw new Error(`Update failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Update processing status error:', error);
      throw error;
    }
  }

  /**
   * Process file (extract text and analyze with LLM)
   * Note: LLM analysis is only used for uploaded documents, not LinkedIn data
   */
  async processFile(sourceId: string, file: File, accessToken?: string): Promise<void> {
    try {
      // Update status to processing
      await this.updateProcessingStatus(sourceId, 'processing', undefined, undefined, accessToken);

      // For now, we'll simulate text extraction
      // In production, you'd use the actual text extraction service
      const mockText = `[Extracted text from ${file.name} - ${file.size} bytes]`;
      
      // Update with raw text
      await this.updateProcessingStatus(sourceId, 'processing', mockText, undefined, accessToken);

      // For now, we'll simulate LLM analysis
      // In production, you'd use the actual LLM analysis service
      const mockAnalysis = {
        workHistory: [
          {
            id: '1',
            company: 'Sample Company',
            title: 'Product Manager',
            startDate: '2022-01-01',
            endDate: null,
            description: 'Sample work experience extracted from resume',
            achievements: ['Led team of 5 engineers', 'Increased user engagement by 25%'],
            location: 'San Francisco, CA',
            current: true
          }
        ],
        education: [
          {
            id: '1',
            institution: 'Sample University',
            degree: 'MBA',
            fieldOfStudy: 'Business Administration',
            startDate: '2018-09-01',
            endDate: '2020-06-01',
            location: 'California'
          }
        ],
        skills: ['Product Management', 'Agile', 'User Research', 'Data Analysis'],
        achievements: ['Led successful product launch', 'Improved team efficiency'],
        contactInfo: {
          email: 'sample@email.com',
          phone: '(555) 123-4567',
          location: 'San Francisco, CA'
        },
        summary: 'Experienced product manager with strong background in tech startups'
      };

      // Update with structured data
      await this.updateProcessingStatus(sourceId, 'completed', mockAnalysis, undefined, accessToken);

    } catch (error) {
      console.error('File processing error:', error);
      await this.updateProcessingStatus(
        sourceId, 
        'failed', 
        undefined, 
        error instanceof Error ? error.message : 'Processing failed',
        accessToken
      );
      throw error;
    }
  }

  /**
   * Main upload method with comprehensive error handling and debugging
   */
  async uploadFile(file: File, userId: string, type: FileType, accessToken?: string): Promise<UploadResult> {
    console.log('Starting file upload:', { fileName: file.name, fileSize: file.size, type });
    
    try {
      // Validate file
      const validation = this.validateFile(file, type);
      if (!validation.valid) {
        console.error('File validation failed:', validation.error);
        return {
          success: false,
          error: validation.error,
          retryable: false
        };
      }

      // Upload to storage
      const uploadResult = await this.uploadToStorage(file, userId, true, accessToken);
      if (!uploadResult.success) {
        console.error('Storage upload failed:', uploadResult.error);
        return {
          success: false,
          error: uploadResult.error,
          retryable: true
        };
      }

      // Create source record
      const sourceId = await this.createSourceRecord(file, userId, uploadResult.storagePath!, accessToken);

      // Process file (immediate for small files, background for large)
      if (file.size < FILE_UPLOAD_CONFIG.IMMEDIATE_PROCESSING_THRESHOLD) {
        await this.processFile(sourceId, file, accessToken);
      } else {
        // For large files, process in background
        this.processFile(sourceId, file, accessToken).catch(error => {
          console.error('Background processing error:', error);
        });
      }

      console.log('Upload completed successfully');
      return {
        success: true,
        fileId: sourceId
      };

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      
      // Check if it's a database error (table doesn't exist)
      if (errorMessage.includes('relation "sources" does not exist')) {
        return {
          success: false,
          error: 'Database not set up. Please run the migration first.',
          retryable: false
        };
      }
      
      return {
        success: false,
        error: errorMessage,
        retryable: true
      };
    }
  }

  /**
   * Get user's file history
   */
  async getUserFiles(userId: string): Promise<FileUploadMetadata[]> {
    try {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get user files error:', error);
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Get user files error:', error);
      throw error;
    }
  }

  /**
   * Delete file and its record
   */
  async deleteFile(sourceId: string, userId: string): Promise<boolean> {
    try {
      // Get file info
      const { data: source, error: fetchError } = await supabase
        .from('sources')
        .select('storage_path')
        .eq('id', sourceId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !source) {
        throw new Error('File not found');
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(FILE_UPLOAD_CONFIG.STORAGE.BUCKET_NAME)
        .remove([(source as SourceData).storage_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('sources')
        .delete()
        .eq('id', sourceId)
        .eq('user_id', userId);

      if (dbError) {
        console.error('Database delete error:', dbError);
        throw new Error(dbError.message);
      }

      return true;
    } catch (error) {
      console.error('Delete file error:', error);
      throw error;
    }
  }

  /**
   * Retry failed upload
   */
  async retryUpload(sourceId: string, userId: string): Promise<UploadResult> {
    try {
      // Get source record
      const { data: source, error } = await supabase
        .from('sources')
        .select('*')
        .eq('id', sourceId)
        .eq('user_id', userId)
        .single();

      if (error || !source) {
        throw new Error('Source not found');
      }

      if ((source as SourceData).processing_status !== 'failed') {
        throw new Error('Source is not in failed state');
      }

      // Reset status and retry
      await this.updateProcessingStatus(sourceId, 'pending');
      
      // Note: For retry, we'd need to re-download the file from storage
      // This is a simplified version - in production, you might want to
      // store the file temporarily or implement a different retry strategy
      
      return {
        success: true,
        fileId: sourceId
      };
    } catch (error) {
      console.error('Retry upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
        retryable: true
      };
    }
  }
}

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
// Import real services for text extraction and LLM analysis
import { TextExtractionService } from './textExtractionService';
import { LLMAnalysisService } from './openaiService';
import { EvaluationService } from './evaluationService';

export class FileUploadService {
  private textExtractionService: TextExtractionService;
  private llmAnalysisService: LLMAnalysisService;
  private evaluationService: EvaluationService;
  
  // Simple batching state
  private pendingResume: { sourceId: string; text: string } | null = null;
  private pendingCoverLetter: { sourceId: string; text: string } | null = null;

  constructor() {
    this.textExtractionService = new TextExtractionService();
    this.llmAnalysisService = new LLMAnalysisService();
    this.evaluationService = new EvaluationService();
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
   * Look for an existing fully processed source with the same checksum
   */
  private async findExistingSourceByChecksum(
    userId: string,
    checksum: string
  ): Promise<{ id: string; structured_data?: unknown } | null> {
    try {
      const { data, error } = await supabase
        .from('sources')
        .select('id, processing_status, structured_data')
        .eq('user_id', userId)
        .eq('file_checksum', checksum)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Checksum lookup failed:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const existing = data.find(entry => entry.processing_status === 'completed');
      return existing || null;
    } catch (error) {
      console.error('Error checking for existing source by checksum:', error);
      return null;
    }
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
      window.dispatchEvent(new CustomEvent('file-upload-progress', { detail: { sourceId: '', stage: 'uploading', progress: 15, message: 'Uploading file...' } }));
      
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
    accessToken?: string,
    checksum?: string
  ): Promise<string> {
    try {
      const computedChecksum = checksum ?? await this.generateChecksum(file);
      
      // Use direct fetch instead of Supabase client
      const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
      
      const insertData = {
        user_id: userId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_checksum: computedChecksum,
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
   * Upload file or text content with unified processing
   * Handles both file uploads and manual text input
   */
  async uploadContent(
    content: File | string,
    userId: string,
    type: FileType,
    accessToken?: string
  ): Promise<UploadResult> {
    console.warn(`🚀 UPLOAD CONTENT: Starting upload for type: ${type}, content type: ${content instanceof File ? 'File' : 'String'}`);
    try {
      console.log('🚀 Starting content upload:', { 
        type, 
        isFile: content instanceof File,
        fileName: content instanceof File ? content.name : 'manual_text',
        size: content instanceof File ? content.size : content.length 
      });
      
      let file: File;
      let isManualText = false;
      
      if (content instanceof File) {
        // Handle file upload
        file = content;
      } else {
        // Handle manual text input - create virtual file
        isManualText = true;
        file = new File([content], `manual_${type}_${Date.now()}.txt`, {
          type: 'text/plain'
        });
      }
      
      // Validate file
      const validation = this.validateFile(file, type);
      if (!validation.valid) {
        console.error('Content validation failed:', validation.error);
        return {
          success: false,
          error: validation.error,
          retryable: false
        };
      }

      // Compute checksum once for deduplication and record keeping
      let checksum: string | undefined;
      try {
        checksum = await this.generateChecksum(file);
      } catch (error) {
        console.warn('Failed to compute checksum for file:', error);
      }

      // Check for duplicates AFTER batching logic
      // (We'll move this check later in the flow)

      // For manual text, skip storage upload and create virtual storage path
      let storagePath: string;
      if (isManualText) {
        storagePath = `manual/${userId}/${type}/${Date.now()}.txt`;
      } else {
        // Upload to storage for real files
        const uploadResult = await this.uploadToStorage(file, userId, true, accessToken);
        if (!uploadResult.success) {
          console.error('Storage upload failed:', uploadResult.error);
          return {
            success: false,
            error: uploadResult.error,
            retryable: true
          };
        }
        storagePath = uploadResult.storagePath!;
      }

      // Create source record
      const sourceId = await this.createSourceRecord(file, userId, storagePath, accessToken, checksum);

      
      // Process content (immediate for small content, background for large)
      const contentSize = isManualText ? (content as string).length : file.size;
      
      // Check for duplicates
      if ((type === 'resume' || type === 'coverLetter') && checksum) {
        const existingSource = await this.findExistingSourceByChecksum(userId, checksum);
        if (existingSource) {
          console.log(`♻️ Detected duplicate ${type} upload, reusing existing structured data.`);
          window.dispatchEvent(new CustomEvent('file-upload-progress', { 
            detail: { 
              sourceId: existingSource.id, 
              stage: 'duplicate', 
              progress: 100, 
              message: `${type === 'resume' ? 'Resume' : 'Cover letter'} already processed — using saved data.` 
            } 
          }));
          return {
            success: true,
            fileId: existingSource.id
          };
        }
      }
      
      // Handle batching for resume and cover letter
      if (type === 'resume' || type === 'coverLetter') {
        console.log(`🔍 DEBUG: About to call handleBatching for type: ${type}`);
        const shouldBatch = await this.handleBatching(sourceId, file, content, type, accessToken);
        console.log(`🔍 DEBUG: handleBatching returned: ${shouldBatch}`);
        if (shouldBatch) {
          console.log(`🔄 ${type} stored for batching - waiting for both files`);
          return { success: true, fileId: sourceId };
        }
      }
      
      // Process content immediately (non-batched or other types)
      if (contentSize < FILE_UPLOAD_CONFIG.IMMEDIATE_PROCESSING_THRESHOLD) {
        console.log('→ Processing IMMEDIATELY (small content)');
        await this.processContent(sourceId, file, content, type, accessToken);
      } else {
        console.log('→ Processing in BACKGROUND (large content)');
        // For large content, process in background
        this.processContent(sourceId, file, content, type, accessToken).catch(error => {
          console.error('Background processing error:', error);
        });
      }

      console.log('✅ Content upload completed successfully');
      window.dispatchEvent(new CustomEvent('file-upload-progress', { detail: { sourceId, stage: 'complete', progress: 100, message: 'Complete!' } }));
      return {
        success: true,
        fileId: sourceId
      };

    } catch (error) {
      console.error('Content upload error:', error);
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      
      return {
        success: false,
        error: errorMessage,
        retryable: true
      };
    }
  }


  /**
   * Process content (file or text) with unified LLM analysis
   */
  async processContent(
    sourceId: string, 
    file: File, 
    originalContent: File | string, 
    type: FileType, 
    accessToken?: string
  ): Promise<void> {
    try {
      // Update status to processing
      await this.updateProcessingStatus(sourceId, 'processing', undefined, undefined, accessToken);

      let extractedText: string;
      
      if (originalContent instanceof File) {
        // Extract text from uploaded file
        console.log('Extracting text from file:', file.name);
        window.dispatchEvent(new CustomEvent('file-upload-progress', { detail: { sourceId, stage: 'extracting', progress: 40, message: 'Extracting text from file...' } }));
        const extractionStartTime = performance.now();
        const extractionResult = await this.textExtractionService.extractText(file);
        const extractionEndTime = performance.now();
        const extractionDuration = (extractionEndTime - extractionStartTime).toFixed(2);
        console.warn(`⏱️ Text extraction took: ${extractionDuration}ms`);
        
        if (!extractionResult.success) {
          throw new Error(`Text extraction failed: ${extractionResult.error}`);
        }
        
        extractedText = extractionResult.text!;
        console.log('Text extraction successful, length:', extractedText.length);
        window.dispatchEvent(new CustomEvent('file-upload-progress', { detail: { sourceId, stage: 'extracted', progress: 55, message: 'Text extracted successfully...' } }));
      } else {
        // Use manual text directly
        extractedText = originalContent;
        console.log('Using manual text directly, length:', extractedText.length);
      }
      
      // Log raw extracted text
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📄 RAW EXTRACTED TEXT:');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(extractedText);
      console.log('═══════════════════════════════════════════════════════════');
      
      // Update with raw text
      await this.updateProcessingStatus(sourceId, 'processing', extractedText, undefined, accessToken);

      // Analyze text with LLM based on file type
      console.log('Analyzing text with LLM for type:', type);
      window.dispatchEvent(new CustomEvent('file-upload-progress', { detail: { sourceId, stage: 'analyzing', progress: 70, message: 'Analyzing with AI...' } }));
      let analysisResult;
      
      const llmStartTime = performance.now();
      // Determine analysis type based on file name or content
      if (file.name.toLowerCase().includes('cover') || file.name.toLowerCase().includes('letter') || type === 'coverLetter') {
        console.log('→ Using COVER LETTER analysis');
        analysisResult = await this.llmAnalysisService.analyzeCoverLetter(extractedText);
      } else if (file.name.toLowerCase().includes('case') || file.name.toLowerCase().includes('study') || type === 'caseStudies') {
        console.log('→ Using CASE STUDY analysis');
        analysisResult = await this.llmAnalysisService.analyzeCaseStudy(extractedText);
      } else {
        console.log('→ Using RESUME analysis');
        analysisResult = await this.llmAnalysisService.analyzeResume(extractedText);
      }
      const llmEndTime = performance.now();
      const llmDuration = (llmEndTime - llmStartTime).toFixed(2);
      console.warn(`⏱️ LLM analysis took: ${llmDuration}ms`);
      
      if (!analysisResult.success) {
        throw new Error(`LLM analysis failed: ${analysisResult.error}`);
      }

      const structuredData = analysisResult.data!;
      
      // Log structured data with detailed information
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📊 STRUCTURED DATA FROM OPENAI PARSING:');
      window.dispatchEvent(new CustomEvent('file-upload-progress', { detail: { sourceId, stage: 'structuring', progress: 90, message: 'Organizing data...' } }));
      console.log('═══════════════════════════════════════════════════════════');
      console.log('Summary:', {
        workHistory: structuredData.workHistory?.length || 0,
        education: structuredData.education?.length || 0,
        skills: structuredData.skills?.length || 0,
        certifications: structuredData.certifications?.length || 0,
        projects: structuredData.projects?.length || 0,
        hasContactInfo: !!structuredData.contactInfo,
        hasLinkedIn: !!structuredData.contactInfo?.linkedin
      });
      console.log('\n📧 Contact Info:');
      console.log(JSON.stringify(structuredData.contactInfo, null, 2));
      console.log('\n💼 Work History:');
      console.log(JSON.stringify(structuredData.workHistory, null, 2));
      console.log('\n🎓 Education:');
      console.log(JSON.stringify(structuredData.education, null, 2));
      console.log('\n🛠️ Skills:');
      console.log(JSON.stringify(structuredData.skills, null, 2));
      console.log('\n📜 Certifications:');
      console.log(JSON.stringify(structuredData.certifications, null, 2));
      console.log('\n🚀 Projects:');
      console.log(JSON.stringify(structuredData.projects, null, 2));
      console.log('\n📝 Summary:');
      console.log(structuredData.summary);
      console.log('═══════════════════════════════════════════════════════════');

      // Update with structured data
      const dbStartTime = performance.now();
      await this.updateProcessingStatus(sourceId, 'completed', structuredData, undefined, accessToken);
      const dbEndTime = performance.now();
      const dbDuration = (dbEndTime - dbStartTime).toFixed(2);
      console.warn(`⏱️ Database save took: ${dbDuration}ms`);

      // Run code-driven heuristics
      const heuristics = this.runHeuristics(structuredData, type);

      // Run LLM judge evaluation
      const evaluation = await this.evaluationService.evaluateStructuredData(
        structuredData, 
        extractedText, 
        type as 'resume' | 'coverLetter' | 'linkedin'
      );

      // Log for evaluation tracking
      this.logLLMGeneration({
        sessionId: `sess_${Date.now()}`,
        sourceId,
        type,
        inputTokens: extractedText.length / 4, // Rough estimate
        outputTokens: JSON.stringify(structuredData).length / 4,
        latency: llmEndTime - llmStartTime,
        model: 'gpt-3.5-turbo',
        inputText: extractedText.substring(0, 500), // First 500 chars
        outputText: JSON.stringify(structuredData).substring(0, 500),
        heuristics,
        evaluation
      });

    } catch (error) {
      console.error('Content processing error:', error);
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
   * Now uses unified uploadContent method for both files and text
   */
  async uploadFile(file: File, userId: string, type: FileType, accessToken?: string): Promise<UploadResult> {
    return this.uploadContent(file, userId, type, accessToken);
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

  /**
   * Simple batching logic for resume and cover letter
   */
  private async handleBatching(
    sourceId: string,
    file: File,
    content: File | string,
    type: FileType,
    accessToken?: string
  ): Promise<boolean> {
    console.log(`🔄 Batching: Processing ${type} upload`);
    
    // Extract text first
    let extractedText: string;
    if (content instanceof File) {
      const extractionResult = await this.textExtractionService.extractText(file);
      if (!extractionResult.success) {
        console.error('Text extraction failed for batching:', extractionResult.error);
        return false;
      }
      extractedText = extractionResult.text!;
    } else {
      extractedText = content;
    }
    
    // Store the data
    if (type === 'resume') {
      this.pendingResume = { sourceId, text: extractedText };
      console.log('📄 Resume stored for batching');
    } else if (type === 'coverLetter') {
      this.pendingCoverLetter = { sourceId, text: extractedText };
      console.log('📄 Cover letter stored for batching');
    }
    
    // Check if we have both files
    if (this.pendingResume && this.pendingCoverLetter) {
      console.log('🚀 Both files ready - starting combined analysis');
      await this.processCombinedAnalysis(accessToken);
      return true;
    }
    
    return true; // Always batch (don't process individually)
  }

  /**
   * Process both resume and cover letter together
   */
  private async processCombinedAnalysis(accessToken?: string): Promise<void> {
    if (!this.pendingResume || !this.pendingCoverLetter) return;
    
    try {
      console.log('🚀 Starting combined resume + cover letter analysis');
      
      // Update both sources to processing status
      await this.updateProcessingStatus(this.pendingResume.sourceId, 'processing', undefined, undefined, accessToken);
      await this.updateProcessingStatus(this.pendingCoverLetter.sourceId, 'processing', undefined, undefined, accessToken);
      
      const llmStartTime = performance.now();
      const combinedResult = await this.llmAnalysisService.analyzeResumeAndCoverLetter(
        this.pendingResume.text, 
        this.pendingCoverLetter.text
      );
      const llmEndTime = performance.now();
      const llmDuration = (llmEndTime - llmStartTime).toFixed(2);
      console.log(`⏱️ Combined LLM analysis took: ${llmDuration}ms`);
      
      // Update resume with structured data
      if (combinedResult.resume.success) {
        await this.updateProcessingStatus(this.pendingResume.sourceId, 'completed', combinedResult.resume.data, undefined, accessToken);
        console.log('✅ Resume analysis completed');
      } else {
        await this.updateProcessingStatus(this.pendingResume.sourceId, 'failed', undefined, combinedResult.resume.error, accessToken);
        console.error('❌ Resume analysis failed:', combinedResult.resume.error);
      }
      
      // Update cover letter with structured data
      if (combinedResult.coverLetter.success) {
        await this.updateProcessingStatus(this.pendingCoverLetter.sourceId, 'completed', combinedResult.coverLetter.data, undefined, accessToken);
        console.log('✅ Cover letter analysis completed');
      } else {
        await this.updateProcessingStatus(this.pendingCoverLetter.sourceId, 'failed', undefined, combinedResult.coverLetter.error, accessToken);
        console.error('❌ Cover letter analysis failed:', combinedResult.coverLetter.error);
      }
      
      // Clear batching data
      this.pendingResume = null;
      this.pendingCoverLetter = null;
      
    } catch (error) {
      console.error('Combined processing error:', error);
      await this.updateProcessingStatus(this.pendingResume!.sourceId, 'failed', undefined, error instanceof Error ? error.message : 'Combined processing failed', accessToken);
      await this.updateProcessingStatus(this.pendingCoverLetter!.sourceId, 'failed', undefined, error instanceof Error ? error.message : 'Combined processing failed', accessToken);
      
      // Clear batching data on error
      this.pendingResume = null;
      this.pendingCoverLetter = null;
    }
  }

  /**
   * Run code-driven heuristics for quality assessment
   */
  private runHeuristics(structuredData: any, type: FileType): any {
    const heuristics = {
      hasWorkExperience: false,
      hasEducation: false,
      hasSkills: false,
      hasContactInfo: false,
      workExperienceCount: 0,
      educationCount: 0,
      skillsCount: 0,
      hasQuantifiableMetrics: false,
      hasCompanyNames: false,
      hasJobTitles: false,
      dataCompleteness: 0
    };

    // Check work experience
    if (structuredData.workExperience && Array.isArray(structuredData.workExperience)) {
      heuristics.hasWorkExperience = true;
      heuristics.workExperienceCount = structuredData.workExperience.length;
      
      // Check for quantifiable metrics
      const workText = JSON.stringify(structuredData.workExperience);
      heuristics.hasQuantifiableMetrics = /\d+%|\d+\+|\d+[kK]|\$[\d,]+|increased|decreased|improved|reduced|saved|grew|scaled/i.test(workText);
      
      // Check for company names and job titles
      heuristics.hasCompanyNames = /company|inc|corp|ltd|llc|technologies|solutions/i.test(workText);
      heuristics.hasJobTitles = /manager|director|engineer|analyst|specialist|coordinator|lead|senior|junior/i.test(workText);
    }

    // Check education
    if (structuredData.education && Array.isArray(structuredData.education)) {
      heuristics.hasEducation = true;
      heuristics.educationCount = structuredData.education.length;
    }

    // Check skills
    if (structuredData.skills && Array.isArray(structuredData.skills)) {
      heuristics.hasSkills = true;
      heuristics.skillsCount = structuredData.skills.length;
    }

    // Check contact info
    if (structuredData.contactInfo) {
      heuristics.hasContactInfo = !!(structuredData.contactInfo.email || structuredData.contactInfo.phone || structuredData.contactInfo.linkedin);
    }

    // Calculate data completeness score (0-100)
    const checks = [
      heuristics.hasWorkExperience,
      heuristics.hasEducation,
      heuristics.hasSkills,
      heuristics.hasContactInfo,
      heuristics.hasQuantifiableMetrics,
      heuristics.hasCompanyNames,
      heuristics.hasJobTitles
    ];
    heuristics.dataCompleteness = Math.round((checks.filter(Boolean).length / checks.length) * 100);

    console.log('🔍 HEURISTICS:', heuristics);
    return heuristics;
  }

  /**
   * Log LLM generation for evaluation tracking
   */
  private logLLMGeneration(data: {
    sessionId: string;
    sourceId: string;
    type: FileType;
    inputTokens: number;
    outputTokens: number;
    latency: number;
    model: string;
    inputText: string;
    outputText: string;
    heuristics?: any;
    evaluation?: any;
  }): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...data,
      // Add evaluation metadata
      performance: {
        inputLength: data.inputText.length,
        outputLength: data.outputText.length,
        tokenEfficiency: data.outputTokens / data.inputTokens,
        processingSpeed: data.latency / 1000, // seconds
        model: data.model
      },
      // Include heuristics and evaluation results
      heuristics: data.heuristics,
      evaluation: data.evaluation
    };

    // Log to console for now (later we'll send to analytics)
    console.log('📊 EVAL LOG:', JSON.stringify(logEntry, null, 2));
    
    // Store in localStorage for now (later we'll use proper analytics)
    try {
      const existingLogs = JSON.parse(localStorage.getItem('narrata-eval-logs') || '[]');
      existingLogs.push(logEntry);
      localStorage.setItem('narrata-eval-logs', JSON.stringify(existingLogs.slice(-50))); // Keep last 50
    } catch (error) {
      console.warn('Failed to store eval log:', error);
    }
  }

  /**
   * Get evaluation logs for analysis
   */
  getEvaluationLogs(): any[] {
    try {
      return JSON.parse(localStorage.getItem('narrata-eval-logs') || '[]');
    } catch (error) {
      console.warn('Failed to retrieve eval logs:', error);
      return [];
    }
  }
}

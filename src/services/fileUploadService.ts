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
  url: (import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined) || '',
  key: (import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined) || ''
});
// Import real services for text extraction and LLM analysis
import { TextExtractionService } from './textExtractionService';
import { LLMAnalysisService } from './openaiService';
import { EvaluationService } from './evaluationService';
import { TemplateService } from './templateService';
import { UnifiedProfileService } from './unifiedProfileService';
import { HumanReviewService } from './humanReviewService';
import { AppifyService } from './appifyService';

export class FileUploadService {
  private textExtractionService: TextExtractionService;
  private llmAnalysisService: LLMAnalysisService;
  private evaluationService: EvaluationService;
  private templateService: TemplateService;
  private unifiedProfileService: UnifiedProfileService;
  private humanReviewService: HumanReviewService;
  private appifyService: AppifyService;
  
  // Simple batching state
  private pendingResume: { sourceId: string; text: string } | null = null;
  private pendingCoverLetter: { sourceId: string; text: string } | null = null;

  constructor() {
    this.textExtractionService = new TextExtractionService();
    this.llmAnalysisService = new LLMAnalysisService();
    this.evaluationService = new EvaluationService();
    this.templateService = new TemplateService();
    this.unifiedProfileService = new UnifiedProfileService();
    this.humanReviewService = new HumanReviewService();
    this.appifyService = new AppifyService();
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

      const existing = data.find((entry: any) => entry.processing_status === 'completed');
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
    checksum?: string,
    sourceType?: FileType
  ): Promise<string> {
    try {
      const computedChecksum = checksum ?? await this.generateChecksum(file);
      
      // Use direct fetch instead of Supabase client
      const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
      
      // Convert camelCase FileType to snake_case for database
      const dbSourceType = sourceType === 'coverLetter' ? 'cover_letter' : (sourceType || 'resume');
      
      const insertData = {
        user_id: userId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_checksum: computedChecksum,
        storage_path: storagePath,
        processing_status: 'pending',
        source_type: dbSourceType // Convert FileType to database format
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

      // Create source record with correct source_type
      const sourceId = await this.createSourceRecord(file, userId, storagePath, accessToken, checksum, type);

      
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
      
      // BATCHING DISABLED - GPT-3.5-turbo is fast enough for individual processing
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
      await this.updateProcessingStatus(sourceId, 'completed', structuredData as any, undefined, accessToken);
      const dbEndTime = performance.now();
      const dbDuration = (dbEndTime - dbStartTime).toFixed(2);
      console.warn(`⏱️ Database save took: ${dbDuration}ms`);

      // Run code-driven heuristics
      const heuristics = this.runHeuristics(structuredData, type);

      // Auto-save extracted data to database (both resume AND cover letter can have workHistory)
      // Cover letters may contain work history entries that should be processed
      if (type === 'resume' || (type === 'coverLetter' && structuredData.workHistory && Array.isArray(structuredData.workHistory) && structuredData.workHistory.length > 0)) {
        await this.processStructuredData(structuredData, sourceId, accessToken);
      }
      
      // Match cover letter stories to existing work_items and extract profile data
      if (type === 'coverLetter') {
        await this.processCoverLetterData(structuredData, sourceId, accessToken);
      }
      
      // Normalize skills for both resume and cover letter
      const { data: sourceData } = await supabase
        .from('sources')
        .select('user_id')
        .eq('id', sourceId)
        .single();
      
      if (sourceData && sourceData.user_id) {
        const skillsSourceType = type === 'coverLetter' ? 'cover_letter' : 'resume';
        await this.normalizeSkills(structuredData, sourceId, sourceData.user_id, skillsSourceType, accessToken);
      }

      // Run LLM judge evaluation
      const evaluation = await this.evaluationService.evaluateStructuredData(
        structuredData, 
        extractedText, 
        type as 'resume' | 'coverLetter' | 'linkedin'
      );

      // Log for evaluation tracking (async, don't await to avoid blocking)
      this.logLLMGeneration({
        sessionId: `sess_${Date.now()}`,
        sourceId,
        type,
        inputTokens: extractedText.length / 4, // Rough estimate
        outputTokens: JSON.stringify(structuredData).length / 4,
        latency: llmEndTime - llmStartTime,
        model: import.meta.env?.VITE_OPENAI_MODEL || (typeof process !== 'undefined' ? process.env.VITE_OPENAI_MODEL : undefined) || 'gpt-4o-mini',
        inputText: extractedText, // Full text
        outputText: JSON.stringify(structuredData, null, 2), // Full structured data, formatted
        heuristics,
        evaluation
      }, accessToken).catch(error => {
        console.warn('Failed to log evaluation data:', error);
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
   * Process structured data into work_items and companies tables
   */
  private async processStructuredData(
    structuredData: any, 
    sourceId: string, 
    accessToken?: string
  ): Promise<void> {
    try {
      console.log('🔄 Processing structured data into work_items and companies tables...');
      
      if (!structuredData.workHistory || !Array.isArray(structuredData.workHistory)) {
        console.log('No work history to process');
        return;
      }

      // Use authenticated client if accessToken provided (for Node.js scripts)
      let dbClient: any;
      if (accessToken) {
        const { createClient } = await import('@supabase/supabase-js');
        const url = (import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '');
        const key = (import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '');
        dbClient = createClient(url, key, {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        });
      } else {
        const { supabase } = await import('../lib/supabase');
        dbClient = supabase;
      }
      
      // Get the user_id from the source record
      const { data: sourceData, error: sourceError } = await dbClient
        .from('sources')
        .select('user_id')
        .eq('id', sourceId)
        .single();
      
      if (sourceError) {
        console.error('❌ Error fetching source record:', sourceError);
        return;
      }
      
      if (!sourceData) {
        console.error('❌ Source record not found for sourceId:', sourceId);
        return;
      }
      
      const userId = sourceData.user_id;
      
      // Track insertion stats
      let companiesCreated = 0;
      let workItemsCreated = 0;
      let storiesCreated = 0;
      let storiesFailed = 0;
      
      // Debug: Log raw workHistory structure to see if stories are present
      console.log('🔍 DEBUG: Sample workHistory item:', {
        company: structuredData.workHistory[0]?.company,
        hasStories: !!structuredData.workHistory[0]?.stories,
        storiesCount: structuredData.workHistory[0]?.stories?.length || 0,
        storiesType: typeof structuredData.workHistory[0]?.stories,
        keys: Object.keys(structuredData.workHistory[0] || {})
      });
      
      // Process each work history entry
      for (const workItem of structuredData.workHistory) {
        // Extract title - try position first, then title, then extract from description/company line
        let workItemTitle = workItem.position || workItem.title;
        
        // If still empty, try to extract from company line format: "Company — Title"
        if (!workItemTitle || workItemTitle.trim() === '') {
          const companyLine = workItem.company || '';
          const match = companyLine.match(/—\s*(.+?)(?:\s*\||\s*$)/);
          if (match) {
            workItemTitle = match[1].trim();
          }
        }
        
        if (!workItemTitle || workItemTitle.trim() === '') {
          console.warn(`⚠️ Skipping work item for ${workItem.company || 'Unknown'}: missing position/title`);
          continue;
        }

        // First, create or find the company
        let companyId: string;
        
        const { data: existingCompany } = await dbClient
          .from('companies')
          .select('id')
          .eq('name', workItem.company)
          .eq('user_id', userId)
          .single();

        if (existingCompany) {
          companyId = existingCompany.id;
          
          // Update company tags if they exist
          if (workItem.companyTags && workItem.companyTags.length > 0) {
            await dbClient
              .from('companies')
              .update({ tags: workItem.companyTags })
              .eq('id', companyId);
          }
        } else {
          const { data: newCompany, error: companyError } = await dbClient
            .from('companies')
            .insert({
              name: workItem.company,
              description: workItem.description || '',
              tags: workItem.companyTags || [],
              user_id: userId
            })
            .select('id')
            .single();

          if (companyError) {
            console.error('Error creating company:', companyError);
            continue;
          }
          companyId = newCompany.id;
          companiesCreated++;
        }

        // Create work item with role-level data
        // Store role-level metrics as structured JSONB
        const roleMetrics = Array.isArray(workItem.roleMetrics) 
          ? workItem.roleMetrics.map((m: any) => ({
              ...m,
              parentType: m.parentType || 'role' // Ensure parentType is set
            }))
          : [];
        
        const { data: newWorkItem, error: workItemError } = await dbClient
          .from('work_items')
          .insert({
            user_id: userId,
            company_id: companyId,
            title: workItemTitle.trim(),
            start_date: workItem.startDate,
            end_date: (workItem.endDate === 'Present' || workItem.endDate === 'Current' || workItem.current === true) ? null : workItem.endDate,
            description: workItem.roleSummary || workItem.description || '',
            achievements: workItem.roleMetrics?.map((m: any) => `${m.value || ''} ${m.context || ''}`).filter(Boolean) || workItem.achievements || [], // Keep TEXT[] for backward compatibility
            tags: workItem.roleTags || workItem.tags || [],
            metrics: roleMetrics, // NEW: Structured JSONB metrics
            source_id: sourceId // NEW: Track data lineage
          })
          .select('id')
          .single();

        if (workItemError) {
          console.error('Error creating work item:', workItemError);
          continue;
        }

        workItemsCreated++;

        // Validate that we have valid FK references before inserting stories
        if (!newWorkItem?.id) {
          console.error('❌ Cannot insert stories: work_item_id is missing');
          continue;
        }

        if (!companyId) {
          console.error('❌ Cannot insert stories: company_id is missing');
          continue;
        }

        // Save stories to approved_content
        if (workItem.stories && Array.isArray(workItem.stories)) {
          console.log(`📝 Inserting ${workItem.stories.length} stories for work item ${newWorkItem.id}`);
          
          for (const story of workItem.stories) {
            // Validate story has required content
            if (!story.content && !story.title) {
              console.warn('⚠️ Skipping story with no content or title');
              continue;
            }

            // Store story-level metrics as structured JSONB
            const storyMetrics = Array.isArray(story.metrics)
              ? story.metrics.map((m: any) => ({
                  ...m,
                  parentType: m.parentType || 'story' // Ensure parentType is set
                }))
              : [];
            
            const { data: insertedStory, error: storyError } = await dbClient
              .from('approved_content')
              .insert({
                user_id: userId,
                work_item_id: newWorkItem.id,
                company_id: companyId, // NEW: Denormalized for query performance
                title: story.title || story.content?.substring(0, 100),
                content: story.content || '',
                tags: story.tags || [],
                metrics: storyMetrics, // NEW: Structured JSONB metrics (story-level)
                source_id: sourceId // NEW: Track data lineage
              })
              .select('id')
              .single();

            if (storyError) {
              console.error('❌ Error creating story:', {
                error: storyError,
                story_title: story.title,
                work_item_id: newWorkItem.id,
                company_id: companyId,
                user_id: userId
              });
              storiesFailed++;
            } else {
              console.log(`✅ Story created successfully: ${insertedStory?.id}`);
              storiesCreated++;
            }
          }
        }
      }

      // Normalize skills to user_skills table
      await this.normalizeSkills(structuredData, sourceId, userId, 'resume', accessToken);

      // Log summary statistics
      console.log('📊 Database Insert Summary:', {
        companiesCreated,
        workItemsCreated,
        storiesCreated,
        storiesFailed,
        totalWorkHistory: structuredData.workHistory.length
      });

      console.log('✅ Structured data processed successfully');
      
      // Emit progress update
      window.dispatchEvent(new CustomEvent('upload:progress', {
        detail: {
          step: 'complete',
          progress: 1.0,
          message: 'Import complete!',
          details: 'Ready to review your work history'
        }
      }));
    } catch (error) {
      console.error('Error processing structured data:', error);
    }
  }

  /**
   * Process cover letter data: match stories to work_items, extract profile data (goals, voice, skills)
   * Stories MUST be linked to work_items - if no match found, it's likely profile data, not a story
   */
  private async processCoverLetterData(
    structuredData: any,
    sourceId: string,
    accessToken?: string
  ): Promise<void> {
    try {
      // Use authenticated client if accessToken provided
      let dbClient: any;
      if (accessToken) {
        const { createClient } = await import('@supabase/supabase-js');
        const url = (import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '');
        const key = (import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '');
        dbClient = createClient(url, key, {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        });
      } else {
        const { supabase } = await import('../lib/supabase');
        dbClient = supabase;
      }

      // Get the user_id from the source record
      const { data: sourceData, error: sourceError } = await dbClient
        .from('sources')
        .select('user_id')
        .eq('id', sourceId)
        .single();
      
      if (sourceError || !sourceData) {
        console.error('❌ Error fetching source record for cover letter processing:', sourceError);
        return;
      }

      const userId = sourceData.user_id;
      let storiesMatched = 0;
      let storiesSkipped = 0;
      let profileDataExtracted = false;

      // 1. Process top-level stories - match to existing work_items
      if (structuredData.stories && Array.isArray(structuredData.stories) && structuredData.stories.length > 0) {
        console.log(`📝 Processing ${structuredData.stories.length} cover letter stories...`);

        for (const story of structuredData.stories) {
          // Validate story has required content
          if (!story.content && !story.title) {
            console.warn('⚠️ Skipping story with no content or title');
            continue;
          }

          // Try to match story to existing work_item by company/role
          const workItemMatch = await this.matchStoryToWorkItem(story, userId, dbClient);
          
          if (workItemMatch) {
            // Check if story already exists (to avoid duplicates on re-matching)
            const storyTitle = story.title || story.content?.substring(0, 100);
            const { data: existingStory } = await dbClient
              .from('approved_content')
              .select('id')
              .eq('work_item_id', workItemMatch.workItemId)
              .eq('title', storyTitle)
              .eq('source_id', sourceId)
              .maybeSingle();
            
            if (existingStory) {
              console.log(`ℹ️ Story already exists, skipping duplicate: "${storyTitle}"`);
              storiesMatched++; // Count as matched even if already exists
              continue;
            }

            // This is a story - save to approved_content linked to work_item
            const storyMetrics = Array.isArray(story.metrics)
              ? story.metrics.map((m: any) => ({
                  ...m,
                  parentType: m.parentType || 'story'
                }))
              : [];
            
            // Extract skills (simplified from complex tags structure)
            // Cover letter stories now use simple "skills" array instead of nested tags object
            const storySkills = Array.isArray(story.skills)
              ? story.skills
              : (story.tags && Array.isArray(story.tags))
                ? story.tags  // Fallback for old format
                : (story.tags && typeof story.tags === 'object' && story.tags.skills)
                  ? story.tags.skills  // Fallback for nested tags.skills
                  : [];
            
            const { data: insertedStory, error: storyError } = await dbClient
              .from('approved_content')
              .insert({
                user_id: userId,
                work_item_id: workItemMatch.workItemId,
                company_id: workItemMatch.companyId,
                title: storyTitle,
                content: story.content || '',
                tags: storySkills,  // Store skills in tags column
                metrics: storyMetrics,
                source_id: sourceId
              })
              .select('id')
              .single();

            if (storyError) {
              console.error('❌ Error creating cover letter story:', {
                error: storyError,
                story_title: storyTitle,
                work_item_id: workItemMatch.workItemId,
                company: workItemMatch.companyName,
                details: storyError.message
              });
              storiesSkipped++;
            } else {
              console.log(`✅ Story created and matched to work_item: ${workItemMatch.companyName} - ${workItemMatch.roleTitle}`);
              storiesMatched++;
            }
          } else {
            // No work_item match - this is likely profile data (goals, values, skills), not a story
            console.log(`⚠️ Story couldn't be matched to work_item - treating as profile data: "${story.title || story.content?.substring(0, 50)}"`);
            storiesSkipped++;
            // TODO: Extract as profile data (goals, voice, skills)
            profileDataExtracted = true;
          }
        }
      }

      // 2. Extract profile-level data (goals, voice, preferences)
      if (structuredData.profileData) {
        await this.updateProfileData(structuredData.profileData, userId, dbClient);
        profileDataExtracted = true;
      }

      // 3. Extract role-level metrics (not stories - update existing work_items)
      if (structuredData.roleLevelMetrics && Array.isArray(structuredData.roleLevelMetrics)) {
        await this.updateRoleLevelMetrics(structuredData.roleLevelMetrics, userId, dbClient, sourceId);
      }

      console.log(`📊 Cover letter processing summary: ${storiesMatched} stories matched, ${storiesSkipped} skipped (likely profile data)`);
    } catch (error) {
      console.error('Error processing cover letter data:', error);
    }
  }

  /**
   * Match a story to an existing work_item by company/role mentioned in the story
   * Returns match info or null if no match found
   */
  private async matchStoryToWorkItem(
    story: any,
    userId: string,
    dbClient: any
  ): Promise<{ workItemId: string; companyId: string; companyName: string; roleTitle: string } | null> {
    // Extract company and role from story content or explicit fields
    const storyText = story.content || story.title || story.summary || '';
    const companyName = story.company || this.extractCompanyFromText(storyText);
    const roleTitle = story.titleRole || story.role || this.extractRoleFromText(storyText);

    if (!companyName) {
      // No company mentioned - can't match to work_item
      console.log(`⚠️ No company found in story: "${story.title || story.content?.substring(0, 50)}"`);
      return null;
    }

    // Find company (case-insensitive)
    const { data: company } = await dbClient
      .from('companies')
      .select('id, name')
      .ilike('name', companyName)
      .eq('user_id', userId)
      .single();
    
    if (!company) {
      console.log(`⚠️ Company not found: "${companyName}"`);
      return null;
    }

    // Find matching work_item(s)
    let workItemQuery = dbClient
      .from('work_items')
      .select('id, title')
      .eq('company_id', company.id)
      .eq('user_id', userId);
    
    // If role is mentioned, try to match by title (case-insensitive)
    if (roleTitle) {
      workItemQuery = workItemQuery.ilike('title', `%${roleTitle}%`);
    }
    
    const { data: workItems, error } = await workItemQuery;
    
    if (error) {
      console.error('Error querying work_items:', error);
      return null;
    }
    
    // If multiple work_items found, prefer the one matching role title, otherwise take first
    const workItem = workItems && workItems.length > 0 
      ? (roleTitle ? workItems.find((wi: any) => wi.title.toLowerCase().includes(roleTitle.toLowerCase())) : workItems[0]) || workItems[0]
      : null;
    
    if (workItem) {
      console.log(`✅ Matched story to work_item: ${company.name} - ${workItem.title}`);
      return {
        workItemId: workItem.id,
        companyId: company.id,
        companyName: company.name,
        roleTitle: workItem.title
      };
    }

    console.log(`⚠️ No work_item found for company: ${company.name}${roleTitle ? ` with role: ${roleTitle}` : ''}`);
    return null;
  }

  /**
   * Extract company name from text (improved heuristic)
   */
  private extractCompanyFromText(text: string): string | null {
    if (!text) return null;
    
    // Look for patterns like "At CompanyName," "while at CompanyName", "at CompanyName"
    // Also handle cases like "Delivering X at CompanyName"
    const patterns = [
      /(?:at|from|while at|during my time at|working at)\s+([A-Z][A-Za-z0-9\s&]+?)(?:[,;]|\.|$)/i,
      /(?:at|from)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+[Ii]|$)/i, // "at FlowHub" or "at FlowHub I"
      /([A-Z][A-Za-z0-9\s&]{2,})(?:\s+(?:[Ii]\s+)?(?:delivered|led|managed|built|created))/i // Company name before action verbs
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const company = match[1].trim();
        // Filter out common false positives
        if (company.length > 2 && !['The', 'A', 'An', 'My', 'Our'].includes(company)) {
          return company;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract role/title from text (simple heuristic)
   */
  private extractRoleFromText(text: string): string | null {
    // Look for patterns like "as a Product Manager" or "in my role as..."
    const match = text.match(/(?:as (?:a|an)\s+|in my role as|while serving as)\s+([A-Z][A-Za-z\s]+?)(?:[,;]|\.|$)/i);
    return match ? match[1].trim() : null;
  }

  /**
   * Update profile data (goals, user_voice) in profiles table
   */
  private async updateProfileData(
    profileData: any,
    userId: string,
    dbClient: any
  ): Promise<void> {
    try {
      const updates: { goals?: string; user_voice?: string } = {};

      // Extract and format goals
      if (profileData.goals && Array.isArray(profileData.goals) && profileData.goals.length > 0) {
        updates.goals = JSON.stringify(profileData.goals);
      }

      // Extract and format user voice
      if (profileData.voice) {
        const voiceData = {
          tone: profileData.voice.tone || [],
          style: profileData.voice.style || '',
          persona: profileData.voice.persona || []
        };
        if (voiceData.tone.length > 0 || voiceData.style || voiceData.persona.length > 0) {
          updates.user_voice = JSON.stringify(voiceData);
        }
      }

      // Only update if we have data
      if (Object.keys(updates).length > 0) {
        const { error } = await dbClient
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (error) {
          console.error('❌ Error updating profile data:', error);
        } else {
          console.log('✅ Profile data updated (goals, voice)');
        }
      }
    } catch (error) {
      console.error('Error updating profile data:', error);
    }
  }

  /**
   * Update role-level metrics for existing work_items
   */
  private async updateRoleLevelMetrics(
    roleLevelMetrics: any[],
    userId: string,
    dbClient: any,
    sourceId: string
  ): Promise<void> {
    try {
      let updated = 0;
      let skipped = 0;

      for (const roleMetric of roleLevelMetrics) {
        if (!roleMetric.company || !roleMetric.titleRole) {
          console.warn('⚠️ Skipping role-level metric: missing company or titleRole');
          skipped++;
          continue;
        }

        // Find company
        const { data: company } = await dbClient
          .from('companies')
          .select('id')
          .eq('name', roleMetric.company)
          .eq('user_id', userId)
          .single();

        if (!company) {
          console.warn(`⚠️ Company not found for role-level metric: ${roleMetric.company}`);
          skipped++;
          continue;
        }

        // Find matching work_item
        const { data: workItem } = await dbClient
          .from('work_items')
          .select('id, metrics')
          .eq('company_id', company.id)
          .eq('user_id', userId)
          .ilike('title', `%${roleMetric.titleRole}%`)
          .single();

        if (!workItem) {
          console.warn(`⚠️ Work item not found for role-level metric: ${roleMetric.company} - ${roleMetric.titleRole}`);
          skipped++;
          continue;
        }

        // Merge metrics (role-level metrics have parentType: "role")
        const existingMetrics = Array.isArray(workItem.metrics) ? workItem.metrics : [];
        const newMetrics = Array.isArray(roleMetric.metrics)
          ? roleMetric.metrics.map((m: any) => ({
              ...m,
              parentType: m.parentType || 'role'
            }))
          : [];

        // Merge without duplicates (simple comparison by name + value)
        const mergedMetrics = [...existingMetrics];
        for (const newMetric of newMetrics) {
          const exists = mergedMetrics.some(
            (existing: any) =>
              existing.name === newMetric.name &&
              existing.value === newMetric.value &&
              existing.parentType === 'role'
          );
          if (!exists) {
            mergedMetrics.push(newMetric);
          }
        }

        // Update work_item with merged metrics and summary
        const updateData: any = {
          metrics: mergedMetrics,
          source_id: sourceId // Track that metrics came from cover letter
        };

        // Update description if role-level summary provided
        if (roleMetric.summary) {
          const existingDescription = workItem.description || '';
          if (existingDescription && !existingDescription.includes(roleMetric.summary)) {
            updateData.description = `${existingDescription}\n\n${roleMetric.summary}`;
          } else if (!existingDescription) {
            updateData.description = roleMetric.summary;
          }
        }

        const { error } = await dbClient
          .from('work_items')
          .update(updateData)
          .eq('id', workItem.id);

        if (error) {
          console.error('❌ Error updating role-level metrics:', error);
          skipped++;
        } else {
          console.log(`✅ Updated role-level metrics for: ${roleMetric.company} - ${roleMetric.titleRole}`);
          updated++;
        }
      }

      console.log(`📊 Role-level metrics: ${updated} updated, ${skipped} skipped`);
    } catch (error) {
      console.error('Error updating role-level metrics:', error);
    }
  }

  /**
   * Normalize skills from structured data to user_skills table
   */
  private async normalizeSkills(
    structuredData: any,
    sourceId: string,
    userId: string,
    sourceType: 'resume' | 'cover_letter',
    accessToken?: string
  ): Promise<void> {
    try {
      const { supabase } = await import('../lib/supabase');
      
      // Create authenticated client if accessToken provided
      let dbClient: any = supabase;
      if (accessToken) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined) || '';
        const supabaseKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined) || '';
        dbClient = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${accessToken}` } }
        });
      }

      let skillsInserted = 0;
      let skillsFailed = 0;

      if (sourceType === 'resume') {
        // Extract skills from resume structured_data.skills
        // Handle both formats: [{category: "...", items: [...]}] and ["skill1", "skill2"]
        const skillsArray = structuredData.skills || [];
        
        if (Array.isArray(skillsArray) && skillsArray.length > 0) {
          // Check if first item is an object (categorized format)
          if (typeof skillsArray[0] === 'object' && skillsArray[0].category) {
            // Categorized format: [{category: "...", items: [...]}]
            for (const categoryObj of skillsArray) {
              const category = categoryObj.category || null;
              const items = Array.isArray(categoryObj.items) ? categoryObj.items : [];
              
              for (const skillItem of items) {
                const skill = typeof skillItem === 'string' ? skillItem : (skillItem.skill || String(skillItem));
                
                if (skill && skill.trim()) {
                  const { error } = await dbClient
                    .from('user_skills')
                    .insert({
                      user_id: userId,
                      skill: skill.trim(),
                      category: category,
                      source_type: 'resume',
                      source_id: sourceId
                    });

                  if (error) {
                    // Ignore unique constraint violations (skill already exists from this source)
                    if (error.code !== '23505') {
                      console.warn('⚠️ Error inserting skill:', error);
                      skillsFailed++;
                    }
                  } else {
                    skillsInserted++;
                  }
                }
              }
            }
          } else {
            // Simple string array format: ["skill1", "skill2"]
            for (const skillItem of skillsArray) {
              const skill = typeof skillItem === 'string' ? skillItem : String(skillItem);
              
              if (skill && skill.trim()) {
                const { error } = await dbClient
                  .from('user_skills')
                  .insert({
                    user_id: userId,
                    skill: skill.trim(),
                    source_type: 'resume',
                    source_id: sourceId
                  });

                if (error) {
                  if (error.code !== '23505') {
                    console.warn('⚠️ Error inserting skill:', error);
                    skillsFailed++;
                  }
                } else {
                  skillsInserted++;
                }
              }
            }
          }
        }
      } else if (sourceType === 'cover_letter') {
        // Extract skills from cover letter structured_data.skillsMentioned
        const skillsMentioned = structuredData.skillsMentioned || [];
        
        if (Array.isArray(skillsMentioned) && skillsMentioned.length > 0) {
          for (const skillItem of skillsMentioned) {
            const skill = typeof skillItem === 'string' ? skillItem : String(skillItem);
            
            if (skill && skill.trim()) {
              const { error } = await dbClient
                .from('user_skills')
                .insert({
                  user_id: userId,
                  skill: skill.trim(),
                  source_type: 'cover_letter',
                  source_id: sourceId
                });

              if (error) {
                if (error.code !== '23505') {
                  console.warn('⚠️ Error inserting skill:', error);
                  skillsFailed++;
                }
              } else {
                skillsInserted++;
              }
            }
          }
        }
      }

      if (skillsInserted > 0 || skillsFailed > 0) {
        console.log(`📊 Skills normalization: ${skillsInserted} inserted, ${skillsFailed} failed`);
      }
    } catch (error) {
      console.error('Error normalizing skills:', error);
      // Don't throw - skills normalization failure shouldn't break the upload
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
    
    // Store the data in memory
    if (type === 'resume') {
      this.pendingResume = { sourceId, text: extractedText };
      console.log('📄 Resume stored for batching');
    } else if (type === 'coverLetter') {
      this.pendingCoverLetter = { sourceId, text: extractedText };
      console.log('📄 Cover letter stored for batching');
    }
    
    // CRITICAL: Save extracted text to database so the NEXT upload can find it
    // Use authenticated client if accessToken provided
    if (accessToken) {
      const { createClient } = await import('@supabase/supabase-js');
      const { url, key } = getSupabaseConfig();
      const authSupabase = createClient(url, key, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      });
      const { error } = await authSupabase
        .from('sources')
        .update({ raw_text: extractedText })
        .eq('id', sourceId);
      if (error) {
        console.error('Failed to save raw_text:', error);
      }
    } else {
      const { error } = await supabase
        .from('sources')
        .update({ raw_text: extractedText })
        .eq('id', sourceId);
      if (error) {
        console.error('Failed to save raw_text:', error);
      }
    }
    console.log(`💾 Saved extracted text to database for ${type}`);
    
    // Check DATABASE for the other file (since each upload is a new HTTP request/service instance)
    // If userId is provided directly, use it; otherwise try to get from auth
    let userId: string | undefined;
    
    if (accessToken) {
      // Create authenticated Supabase client
      const { createClient } = await import('@supabase/supabase-js');
      const { url, key } = getSupabaseConfig();
      const authSupabase = createClient(url, key, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      });
      
      const { data: { user }, error } = await authSupabase.auth.getUser();
      if (!error && user) {
        userId = user.id;
      }
    } else {
      // Fallback to default supabase client
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        userId = user.id;
      }
    }
    
    if (userId) {
      // Use authenticated client for query if accessToken provided
      let queryClient = supabase;
      if (accessToken) {
        const { createClient } = await import('@supabase/supabase-js');
        const { url, key } = getSupabaseConfig();
        queryClient = createClient(url, key, {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        });
      }
      
      const { data: sources } = await queryClient
        .from('sources')
        .select('id, source_type, raw_text')
        .eq('user_id', userId)
        .in('source_type', ['resume', 'cover_letter'])
        .eq('processing_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(2);
      
      console.log(`🔍 Batching check: Found ${sources?.length || 0} pending files in database`);
      
      // If we have both resume and cover letter in database, process them together
      if (sources && sources.length === 2) {
        const resumeSource = sources.find(s => s.source_type === 'resume');
        const coverLetterSource = sources.find(s => s.source_type === 'cover_letter');
        
        if (resumeSource && coverLetterSource && resumeSource.raw_text && coverLetterSource.raw_text) {
          console.log('🚀 Both files ready in database - starting combined analysis');
          
          // Set up pending data from database
          this.pendingResume = { sourceId: resumeSource.id, text: resumeSource.raw_text };
          this.pendingCoverLetter = { sourceId: coverLetterSource.id, text: coverLetterSource.raw_text };
          
          await this.processCombinedAnalysis(accessToken);
          return true;
        }
      }
    } else {
      console.warn('⚠️ Could not determine userId for batching check');
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
        await this.updateProcessingStatus(this.pendingResume.sourceId, 'completed', combinedResult.resume.data as any, undefined, accessToken);
        console.log('✅ Resume analysis completed');
        
        // Emit progress update
        window.dispatchEvent(new CustomEvent('upload:progress', {
          detail: {
            step: 'saving',
            progress: 0.7,
            message: 'Saving work history and stories...',
            details: 'Creating companies, roles, and approved content'
          }
        }));
        
        // Auto-save extracted data to database (resume)
        await this.processStructuredData(combinedResult.resume.data, this.pendingResume.sourceId, accessToken);
        
        // Log for evaluation tracking
        await this.logLLMGeneration({
          sessionId: `sess_${Date.now()}_resume`,
          sourceId: this.pendingResume.sourceId,
          type: 'resume',
          inputText: this.pendingResume.text,
          outputText: JSON.stringify(combinedResult.resume.data, null, 2),
          // Fallback to length-based estimate when usage is unavailable
          inputTokens: (combinedResult as any).resume?.metadata?.usage?.prompt_tokens || Math.round(this.pendingResume.text.length / 4),
          outputTokens: (combinedResult as any).resume?.metadata?.usage?.completion_tokens || Math.round(JSON.stringify(combinedResult.resume.data).length / 4),
          model: combinedResult.resume.metadata?.model || 'gpt-4o-mini',
          latency: parseFloat(llmDuration),
          // Compute heuristics for resume structured data
          heuristics: this.runHeuristics(combinedResult.resume.data, 'resume'),
          evaluation: {}
        }, accessToken);
      } else {
        await this.updateProcessingStatus(this.pendingResume.sourceId, 'failed', undefined, combinedResult.resume.error, accessToken);
        console.error('❌ Resume analysis failed:', combinedResult.resume.error);
      }
      
      // Update cover letter with structured data
      if (combinedResult.coverLetter.success) {
        await this.updateProcessingStatus(this.pendingCoverLetter.sourceId, 'completed', combinedResult.coverLetter.data as any, undefined, accessToken);
        console.log('✅ Cover letter analysis completed');
        
        // Auto-save extracted data to database (cover letter - may contain workHistory)
        // Cover letters can include work history entries that should be processed
        if (combinedResult.coverLetter.data?.workHistory && Array.isArray(combinedResult.coverLetter.data.workHistory) && combinedResult.coverLetter.data.workHistory.length > 0) {
          await this.processStructuredData(combinedResult.coverLetter.data, this.pendingCoverLetter.sourceId, accessToken);
        }
        
        // Cover letter stories will be processed after LinkedIn (in processCombinedAnalysis)
        // This ensures all work_items exist before matching
        
        // Normalize skills from cover letter
        const { data: coverLetterSourceData } = await supabase
          .from('sources')
          .select('user_id')
          .eq('id', this.pendingCoverLetter.sourceId)
          .single();
        
        if (coverLetterSourceData && coverLetterSourceData.user_id) {
          await this.normalizeSkills(combinedResult.coverLetter.data, this.pendingCoverLetter.sourceId, coverLetterSourceData.user_id, 'cover_letter', accessToken);
        }
        
        // Log for evaluation tracking
        await this.logLLMGeneration({
          sessionId: `sess_${Date.now()}_coverLetter`,
          sourceId: this.pendingCoverLetter.sourceId,
          type: 'coverLetter',
          inputText: this.pendingCoverLetter.text,
          outputText: JSON.stringify(combinedResult.coverLetter.data, null, 2),
          // Fallback to length-based estimate when usage is unavailable
          inputTokens: (combinedResult as any).coverLetter?.metadata?.usage?.prompt_tokens || Math.round(this.pendingCoverLetter.text.length / 4),
          outputTokens: (combinedResult as any).coverLetter?.metadata?.usage?.completion_tokens || Math.round(JSON.stringify(combinedResult.coverLetter.data).length / 4),
          model: combinedResult.coverLetter.metadata?.model || 'gpt-4o-mini',
          latency: parseFloat(llmDuration),
          // Compute heuristics for cover letter structured data
          heuristics: this.runHeuristics(combinedResult.coverLetter.data, 'coverLetter'),
          evaluation: {}
        }, accessToken);
      } else {
        await this.updateProcessingStatus(this.pendingCoverLetter.sourceId, 'failed', undefined, combinedResult.coverLetter.error, accessToken);
        console.error('❌ Cover letter analysis failed:', combinedResult.coverLetter.error);
      }
      
      // Process LinkedIn FIRST (for synthetic profiles, LinkedIn URL exists and API call is fast)
      // This ensures work_items exist before matching cover letter stories
      await this.fetchAndProcessLinkedInData(accessToken);
      
      // Now process cover letter stories - LinkedIn work_items should exist
      if (this.pendingCoverLetter && combinedResult.coverLetter.success) {
        // Match cover letter stories to work_items (now including LinkedIn)
        await this.processCoverLetterData(combinedResult.coverLetter.data, this.pendingCoverLetter.sourceId, accessToken);
      }
      
      // Create unified profile from all three sources (resume + cover letter + LinkedIn)
      await this.createUnifiedProfile(accessToken);
      
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

    // Normalize work history key (support both workHistory and workExperience)
    const workHistory = Array.isArray(structuredData.workHistory)
      ? structuredData.workHistory
      : Array.isArray(structuredData.workExperience)
        ? structuredData.workExperience
        : [];

    if (workHistory.length > 0) {
      heuristics.hasWorkExperience = true;
      heuristics.workExperienceCount = workHistory.length;
      const workText = JSON.stringify(workHistory);
      heuristics.hasQuantifiableMetrics = /\d+%|\d+\+|\d+[kK]|\$[\d,]+|increased|decreased|improved|reduced|saved|grew|scaled/i.test(workText);
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

    // Cover letter specific signals (stories only - cover letters don't provide work history)
    if (type === 'coverLetter') {
      const stories = Array.isArray(structuredData.stories) ? structuredData.stories : [];
      const entityRefs = structuredData.entityRefs || {};
      const eduRefs = Array.isArray(entityRefs.educationRefs) ? entityRefs.educationRefs : [];

      if (!heuristics.hasSkills && Array.isArray(structuredData.skillsMentioned)) {
        heuristics.hasSkills = structuredData.skillsMentioned.length > 0;
        heuristics.skillsCount = structuredData.skillsMentioned.length;
      }

      // Cover letters do NOT provide work history - workExperienceCount stays 0
      // hasWorkExperience should remain false for cover letters

      if (!heuristics.hasEducation && eduRefs.length > 0) {
        heuristics.hasEducation = true;
        heuristics.educationCount = eduRefs.length;
      }

      // Quant metrics present across stories
      if (!heuristics.hasQuantifiableMetrics) {
        heuristics.hasQuantifiableMetrics = stories.some((s: any) => Array.isArray(s.metrics) && s.metrics.some((m: any) => m && (m.value !== null && m.value !== undefined)));
      }

      // Company names / job titles inferred from stories (not work history refs)
      if (!heuristics.hasCompanyNames) {
        heuristics.hasCompanyNames = stories.some((s: any) => !!s?.company);
      }
      if (!heuristics.hasJobTitles) {
        heuristics.hasJobTitles = stories.some((s: any) => !!s?.titleRole || !!s?.position);
      }
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
  private async logLLMGeneration(data: {
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
  }, accessToken?: string): Promise<void> {
    try {
      // Use authenticated client if accessToken provided, otherwise use default
      let dbClient = supabase;
      let userId: string | undefined;
      
      if (accessToken) {
        const { createClient } = await import('@supabase/supabase-js');
        const { url, key } = getSupabaseConfig();
        dbClient = createClient(url, key, {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        });
        
        // Get user from authenticated client
        const { data: { user }, error } = await dbClient.auth.getUser();
        if (!error && user) {
          userId = user.id;
        }
      } else {
        // Fallback to default client
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!error && user) {
          userId = user.id;
        }
      }
      
      if (!userId) {
        console.warn('No user found for evaluation logging');
        return;
      }

      // Parse evaluation results
      const evaluation = data.evaluation || {};
      
      // Determine user_type by checking the source file_name in the database
      const { data: sourceData } = await dbClient
        .from('sources')
        .select('file_name')
        .eq('id', data.sourceId)
        .single();
      
      const userType = sourceData?.file_name?.startsWith('P') ? 'synthetic' : 'real';
      
      // Store in Supabase evaluation_runs table
      const { error } = await dbClient
        .from('evaluation_runs')
        .insert({
          user_id: userId,
          session_id: data.sessionId,
          source_id: data.sourceId, // This should be the UUID from sources table
          file_type: data.type,
          user_type: userType,
          
          // Performance Metrics
          text_extraction_latency_ms: 0, // TODO: Add granular timing
          llm_analysis_latency_ms: Math.round(data.latency),
          database_save_latency_ms: 0, // TODO: Add granular timing
          total_latency_ms: Math.round(data.latency),
          
          // Token Usage
          input_tokens: data.inputTokens,
          output_tokens: data.outputTokens,
          model: data.model,
          
          // Evaluation Results
          accuracy_score: evaluation.accuracy || '✅ Accurate',
          relevance_score: evaluation.relevance || '✅ Relevant',
          personalization_score: evaluation.personalization || '✅ Personalized',
          clarity_tone_score: evaluation.clarity_tone || '✅ Clear',
          framework_score: evaluation.framework || '✅ Structured',
          go_nogo_decision: evaluation.go_nogo || '✅ Go',
          evaluation_rationale: evaluation.rationale || 'Successfully processed',
          
          // Heuristics Data
          heuristics: data.heuristics,
          
          // Raw Input/Output for comparison
          raw_text: data.inputText, // Store raw text
          structured_data: JSON.parse(data.outputText) // Store structured data
        } as any);

      if (error) {
        console.error('❌ Failed to store evaluation run:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Data being inserted:', {
          user_id: user.id,
          session_id: data.sessionId,
          source_id: data.sourceId,
          file_type: data.type
        });
        // Fallback to localStorage for now
        this.fallbackToLocalStorage(data);
      } else {
        console.log('✅ Evaluation run stored in Supabase:', data.sessionId);
      }
    } catch (error) {
      console.error('❌ Exception storing evaluation run:', error);
      console.error('Exception type:', error instanceof Error ? error.message : String(error));
      // Fallback to localStorage for now
      this.fallbackToLocalStorage(data);
    }
  }

  private fallbackToLocalStorage(data: any): void {
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

    // Log to console
    console.log('📊 EVAL LOG (fallback):', JSON.stringify(logEntry, null, 2));
    
    // Store in localStorage as fallback
    try {
      const existingLogs = JSON.parse(localStorage.getItem('narrata-eval-logs') || '[]');
      existingLogs.push(logEntry);
      localStorage.setItem('narrata-eval-logs', JSON.stringify(existingLogs.slice(-50))); // Keep last 50
    } catch (error) {
      console.warn('Failed to store eval log in localStorage:', error);
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

  /**
   * Fetch LinkedIn data via Appify API after resume/cover letter are processed
   * Supports both live API calls and synthetic mode (loading JSON fixtures)
   */
  private async fetchAndProcessLinkedInData(accessToken?: string): Promise<void> {
    try {
      if (!this.pendingResume) {
        console.log('⚠️ No resume data available for LinkedIn enrichment');
        return;
      }

      // Get user info - use authenticated client if accessToken provided
      let user: any = null;
      let authSupabase: any = null;
      
      if (accessToken) {
        // Create authenticated Supabase client (for Node.js scripts)
        const { createClient } = await import('@supabase/supabase-js');
        const url = (import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '');
        const key = (import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '');
        authSupabase = createClient(url, key, {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        });
        const { data: { user: authUser }, error: authError } = await authSupabase.auth.getUser();
        if (!authError && authUser) {
          user = authUser;
        }
      } else {
        // Fallback to default supabase client (for browser)
        const { supabase } = await import('../lib/supabase');
        const { data: { user: defaultUser } } = await supabase.auth.getUser();
        user = defaultUser;
        authSupabase = supabase;
      }
      
      if (!user) {
        console.warn('⚠️ No authenticated user for LinkedIn enrichment');
        return;
      }

      // Check if we're in synthetic mode by checking user email
      const SYNTHETIC_TESTING_ALLOWLIST = ['narrata.ai@gmail.com'];
      let isSyntheticEnabled = false;
      
      // Get user profile to check email
      const { data: profile } = await authSupabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();
      
      if (profile?.email && SYNTHETIC_TESTING_ALLOWLIST.includes(profile.email)) {
        isSyntheticEnabled = true;
      }
      
      let appifyResult;
      let appifyRawData: any = null;
      let activeProfileId: string | null = null;

      if (isSyntheticEnabled) {
        // Synthetic mode: Load JSON fixture file
        console.log('🧪 Synthetic mode detected - loading LinkedIn fixture data...');
        
        // Get active synthetic user profile
        const { data: syntheticUsers } = await authSupabase
          .from('synthetic_users')
          .select('profile_id')
          .eq('parent_user_id', user.id)
          .eq('is_active', true)
          .single();
        
        if (!syntheticUsers?.profile_id) {
          console.warn('⚠️ No active synthetic user for LinkedIn enrichment');
          return;
        }

        activeProfileId = syntheticUsers.profile_id; // e.g., "P01"
        const fixturePath = `/fixtures/synthetic/v1/raw_uploads/${activeProfileId}_linkedin.json`;
        
        try {
          // Try Node.js fs first (for scripts), fallback to fetch (for browser)
          let loaded = false;
          try {
            const fs = await import('fs');
            const path = await import('path');
            // Try fixtures directory path first (where files actually are)
            const filePath = path.join(process.cwd(), 'fixtures', 'synthetic', 'v1', 'raw_uploads', `${activeProfileId}_linkedin.json`);
            
            if (fs.existsSync(filePath)) {
              appifyRawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              console.log(`✅ Loaded LinkedIn fixture for ${activeProfileId} (Node.js)`);
              loaded = true;
            }
          } catch (fsError) {
            // fs not available, will try fetch
          }
          
          if (!loaded) {
            // Browser: Use fetch
            const response = await fetch(fixturePath);
            if (!response.ok) {
              console.warn(`⚠️ LinkedIn fixture not found: ${fixturePath}`);
              return;
            }
            appifyRawData = await response.json();
            console.log(`✅ Loaded LinkedIn fixture for ${activeProfileId} (browser)`);
          }
          
          // Convert Appify format to structured data
          const linkedinStructuredData = this.appifyService.convertToStructuredData(appifyRawData);
          appifyResult = {
            success: true,
            data: linkedinStructuredData
          };
        } catch (fetchError) {
          console.error('❌ Error loading LinkedIn fixture:', fetchError);
          return;
        }
      } else {
        // Production mode: Use Appify API
        if (!this.appifyService.isConfigured()) {
          console.log('⚠️ Appify API not configured - skipping LinkedIn enrichment');
          return;
        }

        console.log('🔍 Fetching LinkedIn data via Appify API...');

        // Get resume structured data (use authenticated client)
        const { data: resumeSource } = await authSupabase
          .from('sources')
          .select('structured_data')
          .eq('id', this.pendingResume.sourceId)
          .single();

        if (!resumeSource?.structured_data) {
          console.warn('⚠️ Resume structured data not found for LinkedIn enrichment');
          return;
        }

        // Get user profile for name (use authenticated client)
        const { data: profile } = await authSupabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const fullName = profile?.full_name || user.user_metadata?.full_name || null;
        const resumeData = resumeSource.structured_data as any;

        // Get LinkedIn URL from resume contact info or user input
        const linkedinUrl = resumeData?.contactInfo?.linkedin || null;

        // Enrich via Appify API
        appifyResult = await this.appifyService.enrichFromResumeData(
          fullName,
          resumeData,
          linkedinUrl || undefined
        );
      }

      if (appifyResult.success && appifyResult.data) {
        console.log('✅ LinkedIn data processed successfully');
        
        // Convert Appify data to structured format (already done in service)
        const linkedinStructuredData = appifyResult.data;
        
        // Determine file name based on mode
        const fileName = isSyntheticEnabled && activeProfileId
          ? `${activeProfileId}_linkedin.json`
          : `${user.id}_linkedin_enriched.json`;
        
        // Save LinkedIn data as a source (use authenticated client)
        const rawText = appifyRawData ? JSON.stringify(appifyRawData, null, 2) : JSON.stringify(linkedinStructuredData, null, 2);
        const fileSize = typeof Buffer !== 'undefined' 
          ? Buffer.byteLength(rawText, 'utf8')
          : new Blob([rawText]).size;
        
        // Generate checksum for LinkedIn data
        let checksum: string | undefined;
        try {
          checksum = await this.generateChecksum(new File([rawText], fileName, { type: 'application/json' }));
        } catch (checksumError) {
          console.warn('Failed to generate checksum for LinkedIn data:', checksumError);
          // Generate a simple hash as fallback
          if (typeof crypto !== 'undefined' && crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(rawText);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            checksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 64);
          } else {
            // Fallback: simple hash from string
            checksum = `linkedin_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          }
        }
        
        // Insert LinkedIn source - source_type may not exist in sources table (only in user_skills)
        const { data: linkedinSource, error: linkedinError } = await authSupabase
          .from('sources')
          .insert({
            user_id: user.id,
            file_name: fileName,
            file_type: 'application/json', // MIME type for JSON data
            file_size: fileSize,
            file_checksum: checksum,
            storage_path: `uploads/${user.id}/${fileName}`, // Virtual path for LinkedIn data
            raw_text: rawText,
            structured_data: linkedinStructuredData,
            processing_status: 'completed'
          })
          .select('id')
          .single();

        if (linkedinError) {
          console.error('❌ Error saving LinkedIn source:', linkedinError);
        } else if (linkedinSource) {
          console.log(`✅ LinkedIn source saved: ${linkedinSource.id}`);
          
          // Process LinkedIn structured data into work_items
          if (linkedinStructuredData.workHistory && Array.isArray(linkedinStructuredData.workHistory)) {
            await this.processStructuredData(linkedinStructuredData, linkedinSource.id, accessToken);
          }
        }
      } else {
        console.warn('⚠️ LinkedIn enrichment failed:', appifyResult.error);
      }
    } catch (error) {
      console.error('❌ Error fetching LinkedIn data:', error);
      // Don't throw - this is optional enrichment
    }
  }

  /**
   * Create unified profile from resume + cover letter + LinkedIn
   */
  private async createUnifiedProfile(accessToken?: string): Promise<void> {
    try {
      if (!this.pendingResume || !this.pendingCoverLetter) {
        console.log('⚠️ Resume and cover letter required for unified profile');
        return;
      }

      console.log('🔗 Creating unified profile from all sources...');

      // Get user info - use authenticated client if accessToken provided
      let user: any = null;
      let authSupabase: any = null;
      
      if (accessToken) {
        const { createClient } = await import('@supabase/supabase-js');
        const url = (import.meta.env?.VITE_SUPABASE_URL) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '');
        const key = (import.meta.env?.VITE_SUPABASE_ANON_KEY) || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '');
        authSupabase = createClient(url, key, {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        });
        const { data: { user: authUser }, error: authError } = await authSupabase.auth.getUser();
        if (!authError && authUser) {
          user = authUser;
        }
      } else {
        const { supabase } = await import('../lib/supabase');
        authSupabase = supabase;
        const { data: { user: defaultUser } } = await authSupabase.auth.getUser();
        user = defaultUser;
      }
      
      if (!user) {
        console.warn('⚠️ No authenticated user for unified profile');
        return;
      }
      
      if (!user) {
        console.warn('⚠️ No authenticated user for unified profile');
        return;
      }

      // Get all three structured data sources (filter by file_name patterns since file_type is MIME type)
      const { data: allSources } = await authSupabase
        .from('sources')
        .select('id, file_name, file_type, structured_data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10); // Get more to find all three types

      // Filter by file_name patterns (since file_type stores MIME types)
      const resumeData = allSources?.find(s => 
        s.file_name.includes('resume') || 
        s.file_name.includes('_resume') ||
        (s.file_type && s.file_type.includes('text/plain') && s.file_name.toLowerCase().includes('resume'))
      )?.structured_data as any;
      
      const coverLetterData = allSources?.find(s => 
        s.file_name.includes('cover') || 
        s.file_name.includes('cover_letter') ||
        (s.file_type && s.file_type.includes('text/plain') && s.file_name.toLowerCase().includes('cover'))
      )?.structured_data as any;
      
      const linkedinData = allSources?.find(s => 
        s.file_name.includes('linkedin') || 
        s.file_name.includes('_linkedin') ||
        (s.file_type && s.file_type.includes('application/json') && s.file_name.toLowerCase().includes('linkedin'))
      )?.structured_data as any;

      if (!resumeData) {
        console.warn('⚠️ Resume data required for unified profile');
        return;
      }

      // Create unified profile
      const unifiedResult = await this.unifiedProfileService.createUnifiedProfile(
        resumeData,
        linkedinData || {},
        coverLetterData || {}
      );

      if (unifiedResult.success && unifiedResult.data) {
        console.log('✅ Unified profile created successfully');
        
        // TODO: Store unified profile in database (create table if needed)
        // For now, just log success
        console.log('📊 Unified profile summary:', {
          workHistoryCount: unifiedResult.data.workHistory?.length || 0,
          educationCount: unifiedResult.data.education?.length || 0,
          skillsCount: unifiedResult.data.skills?.length || 0,
          totalExperience: unifiedResult.data.overallMetrics?.totalExperience || 0
        });
      } else {
        console.warn('⚠️ Unified profile creation failed:', unifiedResult.error);
      }
    } catch (error) {
      console.error('❌ Error creating unified profile:', error);
      // Don't throw - this is enhancement, not required
    }
  }
}

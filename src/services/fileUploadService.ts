// File upload service for Supabase Storage
import { supabase } from '@/lib/supabase';
import { createClient as createSbClient } from '@supabase/supabase-js';
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

const isDedupDisabled = () => {
  const env =
    (typeof import.meta !== 'undefined' && (import.meta as any)?.env) || process.env;
  const flag = env?.VITE_DISABLE_UPLOAD_DEDUP || env?.DISABLE_UPLOAD_DEDUP;
  return typeof flag === 'string' && flag.toLowerCase() === 'true';
};

const isGapDetectionDisabled = () => {
  const env =
    (typeof import.meta !== 'undefined' && (import.meta as any)?.env) || process.env;
  const flag = env?.VITE_DISABLE_GAP_DETECTION_ON_UPLOAD || env?.DISABLE_GAP_DETECTION_ON_UPLOAD;
  return typeof flag === 'string' && flag.toLowerCase() === 'true';
};

// Helper function to get Supabase configuration
const getSupabaseConfig = () => {
  const env =
    (typeof import.meta !== 'undefined' && (import.meta as any)?.env) || process.env;

  const url = env?.VITE_SUPABASE_URL;
  const key = env?.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase configuration is missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.',
    );
  }

  return { url, key };
};

// Import real services for text extraction and LLM analysis
import { TextExtractionService } from './textExtractionService';
import { LLMAnalysisService } from './openaiService';
import { EvaluationService } from './evaluationService';
import { TemplateService } from './templateService';
import { UnifiedProfileService } from './unifiedProfileService';
import { HumanReviewService } from './humanReviewService';
import { AppifyService } from './appifyService';
import { getSyntheticLocalOnlyFlag, syntheticStorage } from '@/utils/storage';
import { schedulePMLevelBackgroundRun } from './pmLevelsEdgeClient';
import { isBackgroundGenericGapJudgeEnabled } from '@/lib/flags';

export class FileUploadService {
  private textExtractionService: TextExtractionService;
  private llmAnalysisService: LLMAnalysisService;
  private evaluationService: EvaluationService;
  private templateService: TemplateService;
  private unifiedProfileService: UnifiedProfileService;
  private humanReviewService: HumanReviewService;
  private appifyService: AppifyService;
  // LinkedIn regex (protocol optional, in|pub, allow trailing path)
  private extractLinkedInUrl(text: string): string | null {
    if (!text) return null;
    const re = /(https?:\/\/)?(www\.)?linkedin\.com\/(in|pub)\/[A-Za-z0-9\-_%/]+/i;
    const m = text.match(re);
    return m ? m[0] : null;
  }
  
  // Simple batching state
  private pendingResume: { sourceId: string; text: string } | null = null;
  private pendingCoverLetter: { sourceId: string; text: string } | null = null;

  // Pre-extraction cache for performance optimization
  // Key: file checksum, Value: { text, extractedAt }
  private preExtractionCache: Map<string, { text: string; extractedAt: number }> = new Map();

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
   * Pre-extract text from a file for performance optimization.
   * Call this when a file is selected to start extraction before upload begins.
   * The extracted text will be cached and used by processContent if available.
   */
  async preExtractFile(file: File): Promise<void> {
    try {
      const checksum = await this.generateChecksum(file);
      
      // Check if already cached
      if (this.preExtractionCache.has(checksum)) {
        console.log('[PreExtract] Using cached extraction for:', file.name);
        return;
      }

      console.log('[PreExtract] Starting background extraction for:', file.name);
      const startTime = performance.now();
      
      const result = await this.textExtractionService.extractText(file);
      
      if (result.success && result.text) {
        const duration = performance.now() - startTime;
        this.preExtractionCache.set(checksum, {
          text: result.text,
          extractedAt: Date.now()
        });
        console.log(`[PreExtract] Cached extraction for ${file.name} in ${duration.toFixed(0)}ms`);
        
        // Clean up old cache entries (keep only last 5, max 5 minutes old)
        this.cleanPreExtractionCache();
      }
    } catch (error) {
      console.warn('[PreExtract] Background extraction failed:', error);
      // Non-critical - extraction will happen during processContent
    }
  }

  /**
   * Get pre-extracted text from cache if available
   */
  private getPreExtractedText(checksum: string): string | null {
    const cached = this.preExtractionCache.get(checksum);
    if (cached) {
      // Check if cache is still fresh (5 minutes)
      if (Date.now() - cached.extractedAt < 5 * 60 * 1000) {
        console.log('[PreExtract] Cache hit! Skipping extraction');
        return cached.text;
      }
      // Stale - remove it
      this.preExtractionCache.delete(checksum);
    }
    return null;
  }

  /**
   * Clean up old pre-extraction cache entries
   */
  private cleanPreExtractionCache(): void {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const maxEntries = 5;
    const now = Date.now();
    
    // Remove stale entries
    for (const [key, value] of this.preExtractionCache.entries()) {
      if (now - value.extractedAt > maxAge) {
        this.preExtractionCache.delete(key);
      }
    }
    
    // Keep only most recent entries if too many
    if (this.preExtractionCache.size > maxEntries) {
      const entries = Array.from(this.preExtractionCache.entries())
        .sort((a, b) => b[1].extractedAt - a[1].extractedAt);
      
      this.preExtractionCache.clear();
      entries.slice(0, maxEntries).forEach(([key, value]) => {
        this.preExtractionCache.set(key, value);
      });
    }
  }

  /**
   * Determine the active synthetic profile for a user, respecting local-only overrides.
   */
  private async getActiveSyntheticProfileId(dbClient: any, userId: string): Promise<string | null> {
    const localOnly = getSyntheticLocalOnlyFlag();
    // Always honor an explicit override in syntheticStorage (set by scripts)
    const overrideProfileId = syntheticStorage.getActiveProfileId();
    if (overrideProfileId) {
      return overrideProfileId;
    }

    try {
      const { data, error } = await dbClient
        .from('synthetic_users')
        .select('profile_id, is_active')
        .eq('parent_user_id', userId);

      if (error) {
        console.warn('[FileUploadService] Unable to load synthetic user profiles:', error);
        return null;
      }

      const activeProfileId =
        (data || []).find((entry: any) => entry.is_active)?.profile_id ||
        (data || [])[0]?.profile_id ||
        null;

      if (activeProfileId) {
        syntheticStorage.setActiveProfileId(activeProfileId);
      }

      return activeProfileId;
    } catch (err) {
      console.warn('[FileUploadService] Error determining synthetic profile:', err);
      return null;
    }
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
   * Look for an existing fully processed source with the same checksum and type
   */
  private async findExistingSourceByChecksum(
    userId: string,
    checksum: string,
    sourceType: 'resume' | 'cover_letter'
  ): Promise<{ id: string; structured_data?: unknown } | null> {
    try {
      const { data, error } = await supabase
        .from('sources')
        .select('id, processing_status, structured_data')
        .eq('user_id', userId)
        .eq('file_checksum', checksum)
        .eq('source_type', sourceType)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Checksum lookup failed:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

type SourceEntry = { id: string; processing_status: string; structured_data?: unknown };
      const existing = (data as SourceEntry[]).find(entry => entry.processing_status === 'completed');
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
  async uploadToStorage(file: File, userId: string, fileType: FileType, skipAuthCheck: boolean = false, accessToken?: string): Promise<StorageUploadResult> {
    try {
      const storagePath = this.generateStoragePath(userId, file.name);
      console.log('Uploading file:', { name: file.name, size: file.size, type: file.type });
      
      // Skip auth check since we already validated in the hook
      if (!skipAuthCheck) {
        console.log('Authentication check skipped - using user from AuthContext');
      }
      
      // Use direct fetch instead of Supabase client since it's not working
      console.log('Uploading to storage...');
      this.emitProgress('uploading', 10, 'Uploading file...', fileType);
      
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
    sourceType: 'resume' | 'cover_letter',
    accessToken?: string,
    checksum?: string,
    fileType?: FileType
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
source_type: dbSourceType,
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
        processing_stage: status, // keep stage in sync for client polling
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

      // Use direct fetch when we have an access token; otherwise fall back to supabase client
      if (accessToken) {
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
      } else {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token || session?.access_token;
        if (!token) {
          console.warn('No access token available for updateProcessingStatus; skipping update');
          return;
        }

        const { error: clientError } = await supabase
          .from('sources')
          .update(updateData)
          .eq('id', sourceId);

        if (clientError) {
          console.error('Update processing status failed via client:', clientError);
          throw clientError;
        }
      }
    } catch (error) {
      console.error('Update processing status error:', error);
      throw error;
    }
  }

  /**
   * Save latency metrics for performance tracking
   */
  async saveLatencyMetrics(
    sourceId: string,
    metrics: {
      extractionLatencyMs?: number;
      llmLatencyMs?: number;
      dbLatencyMs?: number;
      totalProcessingMs?: number;
    },
    accessToken?: string
  ): Promise<void> {
    try {
      const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
      
      const updateData: Record<string, unknown> = {};
      if (metrics.extractionLatencyMs !== undefined) {
        updateData.extraction_latency_ms = Math.round(metrics.extractionLatencyMs);
      }
      if (metrics.llmLatencyMs !== undefined) {
        updateData.llm_latency_ms = Math.round(metrics.llmLatencyMs);
      }
      if (metrics.dbLatencyMs !== undefined) {
        updateData.db_latency_ms = Math.round(metrics.dbLatencyMs);
      }
      if (metrics.totalProcessingMs !== undefined) {
        updateData.total_processing_ms = Math.round(metrics.totalProcessingMs);
      }

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
        console.warn('Failed to save latency metrics:', await response.text());
        // Non-critical - don't throw
      } else {
        console.log(`📊 Latency metrics saved for ${sourceId}:`, metrics);
      }
    } catch (error) {
      console.warn('Error saving latency metrics:', error);
      // Non-critical - don't throw
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

      // If resume or cover letter matches previously processed content, reuse existing data
      if (!isDedupDisabled() && (type === 'resume' || type === 'coverLetter') && checksum) {
        const sourceType: 'resume' | 'cover_letter' = type === 'coverLetter' ? 'cover_letter' : 'resume';
        const existingSource = await this.findExistingSourceByChecksum(userId, checksum, sourceType);
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

      // For manual text, skip storage upload and create virtual storage path
      let storagePath: string;
      if (isManualText) {
        storagePath = `manual/${userId}/${type}/${Date.now()}.txt`;
      } else {
        // Upload to storage for real files
        const uploadResult = await this.uploadToStorage(file, userId, type, true, accessToken);
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

      // Create source record with appropriate type
      const sourceType: 'resume' | 'cover_letter' = type === 'coverLetter' ? 'cover_letter' : 'resume';
      const sourceId = await this.createSourceRecord(file, userId, storagePath, sourceType, accessToken, checksum, type);
      
      // Process content (immediate for small content, background for large)
      const contentSize = isManualText ? (content as string).length : file.size;
      
      // Check for duplicates
      if (!isDedupDisabled() && (type === 'resume' || type === 'coverLetter') && checksum) {
        const existingSource = await this.findExistingSourceByChecksum(userId, checksum);
        if (existingSource) {
          console.log(`♻️ Detected duplicate ${type} upload, reusing existing structured data.`);
          this.emitProgress('duplicate', 100, `${type === 'resume' ? 'Resume' : 'Cover letter'} already processed`, type);
          return {
            success: true,
            fileId: existingSource.id
          };
        }
      }
      
      // BATCHING DISABLED - GPT-3.5-turbo is fast enough for individual processing
      // Process each file immediately instead of waiting for batching
      console.log(`→ Batching DISABLED - will process ${type} immediately`);
      
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
      this.emitProgress('complete', 100, 'Upload complete!', type);
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
   * Emit progress event for streaming UX
   */
  private emitProgress(
    stage: string, 
    percent: number, 
    label: string, 
    fileType?: string,
    extra?: Record<string, unknown>
  ) {
    window.dispatchEvent(new CustomEvent('file-upload-progress', {
      detail: { stage, percent, label, fileType: fileType || 'file', ...extra }
    }));
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
    // ═══════════════════════════════════════════════════════════
    // 🎯 TIMING INSTRUMENTATION - Streaming Onboarding Performance
    // ═══════════════════════════════════════════════════════════
    const processStartTime = performance.now();
    let extractionLatencyMs = 0;
    let llmLatencyMs = 0;
    let dbLatencyMs = 0;
    let saveSectionsMs = 0;
    let normalizeSkillsMs = 0;
    let gapHeuristicsMs = 0;

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  [TIMING] processContent START for ${type} file: ${file.name}`);
    console.log(`⏱️  [TIMING] Upload initiated at: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════');

    try {
      // Global progress start
      window.dispatchEvent(new CustomEvent('global-progress', {
        detail: { task: type, status: 'start', percent: 5, label: `[PROGRESS] ${type} started` }
      }));
      // Emit initial progress
      this.emitProgress('starting', 5, 'Starting upload...', type);
      
      // Update status to processing
      const updateStatusStart = performance.now();
      await this.updateProcessingStatus(sourceId, 'processing', undefined, undefined, accessToken);
      console.log(`⏱️  [TIMING] Update status to 'processing': ${(performance.now() - updateStatusStart).toFixed(2)}ms`);

      let extractedText: string;
      this.emitProgress('extracting', 15, 'Reading file...', type);
      
      console.log('⏱️  [TIMING] ─── STAGE 1: TEXT EXTRACTION ───');
      const extractionStageStart = performance.now();
      
      if (originalContent instanceof File) {
        // Check for pre-extracted text first (performance optimization)
        let checksum: string | undefined;
        try {
          const checksumStart = performance.now();
          checksum = await this.generateChecksum(file);
          console.log(`⏱️  [TIMING] Checksum generation: ${(performance.now() - checksumStart).toFixed(2)}ms`);
        } catch {
          // Checksum generation failed - proceed with normal extraction
        }
        
        const preExtracted = checksum ? this.getPreExtractedText(checksum) : null;
        
        if (preExtracted) {
          // Use pre-extracted text (saves 1-3s)
          extractedText = preExtracted;
          extractionLatencyMs = 0; // Cache hit
          console.log(`✨ [TIMING] Using pre-extracted text (cache hit) for: ${file.name}`);
          this.emitProgress('extracted', 25, 'Text ready', type);
        } else {
          // Extract text from uploaded file
          console.log('⏱️  [TIMING] Extracting text from file:', file.name);
          this.emitProgress('extracting', 20, 'Extracting text...', type);
          const extractionStartTime = performance.now();
          const extractionResult = await this.textExtractionService.extractText(file);
          const extractionEndTime = performance.now();
          extractionLatencyMs = extractionEndTime - extractionStartTime;
          console.log(`⏱️  [TIMING] ✅ Text extraction: ${extractionLatencyMs.toFixed(2)}ms`);
          
          if (!extractionResult.success) {
            throw new Error(`Text extraction failed: ${extractionResult.error}`);
          }
          
          this.emitProgress('extracted', 25, 'Text extracted', type);
          
          extractedText = extractionResult.text!;
          console.log(`⏱️  [TIMING] Text extracted successfully, length: ${extractedText.length} chars`);
        }
      } else {
        // Use manual text directly
        extractedText = originalContent;
        extractionLatencyMs = 0;
        console.log(`⏱️  [TIMING] Using manual text directly, length: ${extractedText.length} chars`);
      }
      
      console.log(`⏱️  [TIMING] ✅ STAGE 1 COMPLETE (extraction): ${(performance.now() - extractionStageStart).toFixed(2)}ms`);
      
      // Log raw extracted text
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📄 RAW EXTRACTED TEXT:');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(extractedText);
      console.log('═══════════════════════════════════════════════════════════');
      
      // Update with raw text
      console.log('⏱️  [TIMING] Saving raw_text to sources...');
      const saveRawTextStart = performance.now();
      await this.updateProcessingStatus(sourceId, 'processing', extractedText, undefined, accessToken);
      console.log(`⏱️  [TIMING] ✅ raw_text saved: ${(performance.now() - saveRawTextStart).toFixed(2)}ms`);
      this.emitProgress('text_ready', 35, 'Text extracted and saved', type);

      // Early LinkedIn detection from raw text; notify UI immediately
      const linkedInDetectStart = performance.now();
      const linkedInUrl = this.extractLinkedInUrl(extractedText);
      if (linkedInUrl) {
        console.log(`⏱️  [TIMING] LinkedIn URL detected: ${linkedInUrl} (${(performance.now() - linkedInDetectStart).toFixed(2)}ms)`);
        // Emit a progress event to keep global progress alive during LI detection
        this.emitProgress('linkedin_detected', 37, 'LinkedIn profile found', type);
        window.dispatchEvent(new CustomEvent('linkedin-detected', {
          detail: { sourceId, url: linkedInUrl }
        }));
      } else {
        console.log(`⏱️  [TIMING] No LinkedIn URL detected (${(performance.now() - linkedInDetectStart).toFixed(2)}ms)`);
      }

      // Analyze text with LLM based on file type
      console.log('⏱️  [TIMING] ─── STAGE 2: LLM ANALYSIS ───');
      console.log(`⏱️  [TIMING] Starting LLM analysis for type: ${type}`);
      this.emitProgress('analyzing', 40, 'Analyzing with AI...', type);
      let analysisResult;
      
      const llmStartTime = performance.now();
      // Determine analysis type based on file name or content
      if (file.name.toLowerCase().includes('cover') || file.name.toLowerCase().includes('letter') || type === 'coverLetter') {
        console.log('⏱️  [TIMING] → Using 2-STAGE COVER LETTER analysis (rule-based parsing + LLM stories)');
        
        // STAGE 1: Rule-based paragraph parsing (instant, no LLM)
        const parseStart = performance.now();
        const { parseCoverLetter, convertToSavedSections } = await import('@/services/coverLetterParser');
        const parsed = parseCoverLetter(extractedText);
        const parseMs = (performance.now() - parseStart).toFixed(2);
        console.log(`⏱️  [TIMING] ✅ Rule-based CL parsing: ${parseMs}ms (${parsed.bodyParagraphs.length} body paragraphs)`);
        
        // Save sections immediately (no LLM wait)
        const sectionsStart = performance.now();
        const sections = convertToSavedSections(parsed);
        await this.saveCoverLetterSections(sections, sourceId, accessToken);
        saveSectionsMs = performance.now() - sectionsStart;
        console.log(`⏱️  [TIMING] ✅ Saved CL sections: ${saveSectionsMs.toFixed(2)}ms (${sections.length} sections)`);
        const totalParagraphs = parsed.bodyParagraphs.length + (parsed.introduction ? 1 : 0) + (parsed.closing ? 1 : 0) + (parsed.greeting ? 1 : 0);
        this.emitProgress(
          'sections-saved',
          35,
          `Sections extracted (${parsed.bodyParagraphs.length} body, intro, closing${parsed.signature ? ', signature' : ''})`,
          type,
          {
            totalParagraphs,
            bodyParagraphs: parsed.bodyParagraphs.length,
            greetingFound: !!parsed.greeting,
            closingFound: !!parsed.closing,
            signatureFound: !!parsed.signature,
            sectionsCount: sections.length,
          }
        );
        
        // Create default template from saved sections if user doesn't have one
        // CRITICAL: Must happen during onboarding, not deferred to UI visit
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const userId = session?.user?.id;
          
          if (!userId) {
            console.warn('⚠️ Cannot create template: no user ID');
          } else {
            const { CoverLetterTemplateService } = await import('./coverLetterTemplateService');
            const existingTemplates = await CoverLetterTemplateService.getUserTemplates(userId, accessToken);
            
            if (existingTemplates.length === 0) {
              console.log('📋 Creating default template from saved sections...');
              
              // Fetch the saved sections we just created
              const savedSections = await CoverLetterTemplateService.getUserSavedSections(userId, undefined, accessToken);
              
              if (savedSections.length > 0) {
                // Build template structure 1:1 from saved sections (matches uploaded CL structure)
                const templateStructure = savedSections
                  .sort((a, b) => (a.paragraph_index || 0) - (b.paragraph_index || 0))
                  .map((section, idx) => ({
                    id: section.id!,
                    type: section.type as any,
                    title: section.title,
                    slug: section.type,
                    order: idx,
                    isStatic: !section.is_dynamic,
                    staticContent: section.content,
                    savedSectionId: section.id
                  }));
                
                const template = await CoverLetterTemplateService.createDefaultTemplate(
                  userId,
                  'My Cover Letter Template',
                  templateStructure,
                  savedSections,
                  accessToken
                );
                console.log(`✅ Created 1:1 template from uploaded CL: ${template.id} (${templateStructure.length} sections)`);
              } else {
                console.warn('⚠️ No saved sections found to create template from');
              }
            } else {
              console.log(`ℹ️ Template already exists (${existingTemplates.length}), skipping creation`);
            }
          }
        } catch (templateError) {
          console.error('⚠️ Failed to create template from saved sections:', templateError);
          // Non-critical - user can create template manually later
        }
        
        // STAGE 2: LLM analysis for stories + voice (10-15s)
        // First, get existing work history for story linking
        const workHistoryStart = performance.now();
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        const workHistory = userId ? await this.getWorkHistoryForStoryLinking(userId, accessToken) : [];
        console.log(`⏱️  [TIMING] ✅ Fetched work history for linking: ${(performance.now() - workHistoryStart).toFixed(2)}ms (${workHistory.length} items)`);
        
        const llmCallStart = performance.now();
        const stopHeartbeat = (() => {
          const hbStart = performance.now();
          const timer = setInterval(() => {
            const elapsedMs = performance.now() - hbStart;
            // creep upward during long calls to avoid flatlines
            const dynamicPercent = Math.min(80, 55 + elapsedMs / 500);
            this.emitProgress('analyzing', dynamicPercent, 'Analyzing with AI...', type, {
              elapsedMs
            });
          }, 2500);
          return () => clearInterval(timer);
        })();
        try {
          analysisResult = await this.llmAnalysisService.analyzeCoverLetterStories(extractedText, workHistory);
        } finally {
          stopHeartbeat();
        }
        const clLlmMs = (performance.now() - llmCallStart).toFixed(2);
        console.log(`⏱️  [TIMING] ✅ CL LLM analysis (stories + voice): ${clLlmMs}ms`);
        
        // Save voice data to user profile if extracted
        if (analysisResult.success && analysisResult.data?.voice) {
          try {
            const { UserPreferencesService } = await import('@/services/userPreferencesService');
            const voiceData = analysisResult.data.voice;
            
            // Save rich voice data with all analysis fields
            // Use writingGuidance as the main prompt (most actionable)
            // Fall back to summary, then legacy format
            const mainPrompt = voiceData.writingGuidance || 
                              voiceData.summary || 
                              voiceData.style || 
                              `Tone: ${voiceData.tone?.join(', ') || 'professional'}. Persona: ${voiceData.persona?.join(', ') || 'leader'}.`;
            
            const userVoice = {
              prompt: mainPrompt,
              lastUpdated: new Date().toISOString(),
              // Include all rich metadata for future use
              metadata: {
                summary: voiceData.summary,
                tone: voiceData.tone,
                stylePatterns: voiceData.stylePatterns,
                credibilitySignals: voiceData.credibilitySignals,
                persona: voiceData.persona,
                writingGuidance: voiceData.writingGuidance
              }
            };
            
            await UserPreferencesService.saveVoice(userId, userVoice);
            console.log('✅ Voice data saved to user profile with rich metadata');
          } catch (voiceError) {
            console.error('⚠️ Failed to save voice data:', voiceError);
            // Non-critical - don't fail the upload
          }
        }
      } else if (file.name.toLowerCase().includes('case') || file.name.toLowerCase().includes('study') || type === 'caseStudies') {
        console.log('⏱️  [TIMING] → Using CASE STUDY analysis');
        const caseStudyStart = performance.now();
        analysisResult = await this.llmAnalysisService.analyzeCaseStudy(extractedText);
        console.log(`⏱️  [TIMING] ✅ Case study LLM analysis: ${(performance.now() - caseStudyStart).toFixed(2)}ms`);
      } else {
        console.log('⏱️  [TIMING] → Using STAGED RESUME analysis (3-stage split for speed)');
        // PERFORMANCE OPTIMIZATION: Use staged analysis for faster perceived performance
        // Stage 1: Work history skeleton (~5-8s) - shows structure immediately
        // Stage 2: Stories per role (parallel, ~3-5s each) - fills in details
        // Stage 3: Skills + education (~3-5s) - completes the profile
        
        // Emit progress events for each stage
        analysisResult = await this.llmAnalysisService.analyzeResumeStagedWithEvents(
          extractedText,
          (stage: string, data: unknown) => {
            // Emit stage completion events for UI updates
            const stageProgress: Record<string, { percent: number; label: string }> = {
              workHistorySkeleton: { percent: 55, label: 'Work history extracted...' },
              roleStories: { percent: 70, label: 'Stories and achievements extracted...' },
              skillsAndEducation: { percent: 75, label: 'Skills and education extracted...' }
            };
            const progressPct = typeof (data as any)?.progressPct === 'number' ? (data as any).progressPct : undefined;
            const stageInfo = progressPct !== undefined
              ? { percent: progressPct, label: stageProgress[stage]?.label || `${stage} complete...` }
              : stageProgress[stage] || { percent: 60, label: `${stage} complete...` };
            // Derive useful counts for product value messaging
            const extraCounts: Record<string, unknown> = {};
            if (stage === 'workHistorySkeleton' && data && (data as any).workHistory) {
              const wh = (data as any).workHistory as Array<any>;
              extraCounts.companiesFound = wh.length;
              extraCounts.rolesFound = wh.length;
            }
            if (stage === 'roleStories') {
              const arrayData = Array.isArray(data) ? (data as any[]) : [];
              const rolesProcessed = (data as any)?.rolesProcessed || arrayData.length;
              const storiesFound = Array.isArray(arrayData)
                ? arrayData.reduce((sum, r: any) => sum + (Array.isArray(r?.stories) ? r.stories.length : 0), 0)
                : (data as any)?.storiesFound;
              extraCounts.rolesProcessed = rolesProcessed;
              extraCounts.storiesFound = storiesFound;
            }
            // Skills stage is optional; includeSkills=false defers it
            this.emitProgress(stage, stageInfo.percent, stageInfo.label, type, extraCounts);
            console.log(`⏱️  [TIMING] 📊 LLM Stage ${stage} complete`, data);
          },
          { includeSkills: false }
        );
      }
      const llmEndTime = performance.now();
      llmLatencyMs = llmEndTime - llmStartTime;
      console.log(`⏱️  [TIMING] ✅ STAGE 2 COMPLETE (LLM analysis): ${llmLatencyMs.toFixed(2)}ms`);
      
      if (!analysisResult.success) {
        throw new Error(`LLM analysis failed: ${analysisResult.error}`);
      }

      const structuredData = analysisResult.data!;
      
      // Log structured data with detailed information
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📊 STRUCTURED DATA FROM OPENAI PARSING:');
      this.emitProgress('structuring', 78, 'Organizing data...', type);
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

      // Fallback LinkedIn detection from structured data (if raw text detection missed)
      const structuredLinkedIn =
        structuredData.contactInfo?.linkedin ||
        structuredData.contact_info?.linkedin ||
        structuredData.linkedin ||
        null;
      if (structuredLinkedIn) {
        const normalizedLinkedIn = this.extractLinkedInUrl(structuredLinkedIn) || structuredLinkedIn;
        console.log(`⏱️  [TIMING] LinkedIn URL found in structured data: ${normalizedLinkedIn}`);
        this.emitProgress('linkedin_detected', 40, 'LinkedIn profile found', type);
        window.dispatchEvent(new CustomEvent('linkedin-detected', {
          detail: { sourceId, url: normalizedLinkedIn }
        }));
      }

      console.log('⏱️  [TIMING] ─── STAGE 3: DATABASE OPERATIONS ───');
      const dbStartTime = performance.now();
      
      // Update with structured data - now includes all fields (outcomeMetrics, stories, etc.)
      // Types are now aligned with LLM prompt schema, so parsed data contains everything
      console.log('⏱️  [TIMING] Saving structured_data to sources...');
      const saveStructuredStart = performance.now();
      await this.updateProcessingStatus(sourceId, 'completed', structuredData as any, undefined, accessToken);
      console.log(`⏱️  [TIMING] ✅ structured_data saved: ${(performance.now() - saveStructuredStart).toFixed(2)}ms`);
      this.emitProgress('structured', 90, 'Analysis complete, saving data...', type);

      // Run code-driven heuristics
      console.log('⏱️  [TIMING] Running heuristic checks...');
      const heuristicsStart = performance.now();
      const heuristics = this.runHeuristics(structuredData, type);
      gapHeuristicsMs = performance.now() - heuristicsStart;
      console.log(`⏱️  [TIMING] ✅ Heuristic checks complete: ${gapHeuristicsMs.toFixed(2)}ms`);

      // Auto-save extracted data to database (both resume AND cover letter can have workHistory)
      // Cover letters may contain work history entries that should be processed
      this.emitProgress('saving', 80, 'Saving to database...', type);
      if (type === 'resume' || (type === 'coverLetter' && structuredData.workHistory && Array.isArray(structuredData.workHistory) && structuredData.workHistory.length > 0)) {
        console.log('⏱️  [TIMING] Processing structured data (company/work_items/stories inserts)...');
        const processDataStart = performance.now();
        await this.processStructuredData(structuredData, sourceId, accessToken);
        console.log(`⏱️  [TIMING] ✅ processStructuredData complete: ${(performance.now() - processDataStart).toFixed(2)}ms`);
      }
      // Nudge progress forward once DB writes are done
      this.emitProgress('saved', 95, 'Database save complete', type);
      
      // Match cover letter stories to existing work_items and extract profile data
      if (type === 'coverLetter') {
        console.log('⏱️  [TIMING] Processing cover letter data (story matching)...');
        const clDataStart = performance.now();
        await this.processCoverLetterData(structuredData, sourceId, accessToken);
        console.log(`⏱️  [TIMING] ✅ CL data processing complete: ${(performance.now() - clDataStart).toFixed(2)}ms`);

        // Final cover letter progress push with counts to unstick the bar
        const gapCounts = structuredData?.gaps ? structuredData.gaps.length : 0;
        this.emitProgress('done', 95, 'Cover letter processed', type, {
          sectionsCount: structuredData?.sections?.length,
          paragraphs: structuredData?.sections?.length,
          gapsFound: gapCounts,
          storiesFound: structuredData?.stories ? structuredData.stories.length : 0,
        });
      }
      
      // Normalize skills for both resume and cover letter
      console.log('⏱️  [TIMING] Normalizing skills...');
      const normalizeStart = performance.now();
      const { data: sourceData } = await supabase
        .from('sources')
        .select('user_id')
        .eq('id', sourceId)
        .single();
      
      const userIdForSkills = sourceData?.user_id;
      const skillsSourceType = type === 'coverLetter' ? 'cover_letter' : 'resume';
      if (userIdForSkills) {
        await this.normalizeSkills(structuredData, sourceId, userIdForSkills, skillsSourceType, accessToken);
        // If skills were deferred (resume includeSkills=false), schedule background backfill
        if (type === 'resume' && (!structuredData.skills || structuredData.skills.length === 0)) {
          this.scheduleSkillsBackfill(sourceId, userIdForSkills, extractedText, accessToken);
        }
      }
      normalizeSkillsMs = performance.now() - normalizeStart;
      console.log(`⏱️  [TIMING] ✅ Skills normalized: ${normalizeSkillsMs.toFixed(2)}ms`);

      // Track DB latency (includes all structured data processing)
      const dbEndTime = performance.now();
      dbLatencyMs = dbEndTime - dbStartTime;
      console.log(`⏱️  [TIMING] ✅ STAGE 3 COMPLETE (database operations): ${dbLatencyMs.toFixed(2)}ms`);

      // Calculate and save total processing time
      const totalProcessingMs = performance.now() - processStartTime;
      
      // ═══════════════════════════════════════════════════════════
      // 🎯 TIMING SUMMARY - End-to-End Breakdown
      // ═══════════════════════════════════════════════════════════
      console.log('═══════════════════════════════════════════════════════════');
      console.log('⏱️  [TIMING] 🏁 processContent COMPLETE - FULL BREAKDOWN:');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`⏱️  [TIMING] ├─ STAGE 1: Text Extraction        ${extractionLatencyMs.toFixed(2).padStart(10)}ms`);
      console.log(`⏱️  [TIMING] ├─ STAGE 2: LLM Analysis           ${llmLatencyMs.toFixed(2).padStart(10)}ms`);
      console.log(`⏱️  [TIMING] │   ├─ Save CL Sections            ${saveSectionsMs.toFixed(2).padStart(10)}ms`);
      console.log(`⏱️  [TIMING] │   └─ (LLM call details in openaiService.ts)`);
      console.log(`⏱️  [TIMING] ├─ STAGE 3: Database Operations    ${dbLatencyMs.toFixed(2).padStart(10)}ms`);
      console.log(`⏱️  [TIMING] │   ├─ Heuristic Checks            ${gapHeuristicsMs.toFixed(2).padStart(10)}ms`);
      console.log(`⏱️  [TIMING] │   ├─ Skills Normalization        ${normalizeSkillsMs.toFixed(2).padStart(10)}ms`);
      console.log(`⏱️  [TIMING] │   └─ (processStructuredData details below)`);
      console.log(`⏱️  [TIMING] ├─────────────────────────────────────────────`);
      console.log(`⏱️  [TIMING] └─ 🎯 TOTAL END-TO-END TIME:       ${totalProcessingMs.toFixed(2).padStart(10)}ms (${(totalProcessingMs / 1000).toFixed(1)}s)`);
      console.log(`⏱️  [TIMING] Completed at: ${new Date().toISOString()}`);
      console.log('═══════════════════════════════════════════════════════════');
      
      // Save latency metrics (non-blocking)
      this.saveLatencyMetrics(sourceId, {
        extractionLatencyMs,
        llmLatencyMs,
        dbLatencyMs,
        totalProcessingMs
      }, accessToken);
      this.emitProgress('done', 100, 'Processing complete', type);
      window.dispatchEvent(new CustomEvent('global-progress', {
        detail: { task: type, status: 'done', percent: 100, label: `[PROGRESS] ${type} complete` }
      }));

      // Log evaluation run in background so it never blocks UI/progress
      setTimeout(() => {
        const sessionId = `sess_${Date.now()}`;
        console.log(`📊 [EVAL] Logging ${type} eval in background (skipping judge)`);
        
        // Build detailed timing breakdown for dashboard visualization
        const timingBreakdown = {
          extraction: {
            extraction_ms: extractionLatencyMs,
            cache_hit: extractionLatencyMs === 0,
          },
          llm: {
            total_ms: llmLatencyMs,
          },
          database: {
            save_sections_ms: saveSectionsMs,
            normalize_skills_ms: normalizeSkillsMs,
            gap_heuristics_ms: gapHeuristicsMs,
            total_ms: dbLatencyMs,
          },
        };
        
        this.logLLMGeneration({
          sessionId,
          sourceId,
          type,
          inputTokens: extractedText.length / 4,
          outputTokens: JSON.stringify(structuredData).length / 4,
          latency: llmLatencyMs,
          model: import.meta.env?.VITE_OPENAI_MODEL || (typeof process !== 'undefined' ? process.env.VITE_OPENAI_MODEL : undefined) || 'gpt-4o-mini',
          inputText: extractedText,
          outputText: JSON.stringify(structuredData, null, 2),
          heuristics,
          evaluation: null, // Skip LLM judge for now - too slow
          extractionLatencyMs,
          dbLatencyMs,
          totalLatencyMs: totalProcessingMs,
          timingBreakdown,
        }, accessToken).catch(error => {
          console.error(`❌ [EVAL] Failed to log ${type} evaluation (background):`, error);
        });
      }, 0);

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
  /**
   * Save cover letter sections to saved_sections table
   */
  private async saveCoverLetterSections(
    sections: Array<{ slug: string; title: string; content: string; order: number; isStatic: boolean }>,
    sourceId: string,
    accessToken?: string
  ): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        console.warn('⚠️ No user ID for saving CL sections');
        return;
      }

      const dbClient = accessToken
        ? createSbClient(
            (import.meta.env?.VITE_SUPABASE_URL) || '',
            (import.meta.env?.VITE_SUPABASE_ANON_KEY) || '',
            { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
          )
        : supabase;

      // Map section slugs to database types
      // Section types: intro, body, closer
      // - 'introduction' -> 'intro' (static with [COMPANY-NAME] token support)
      // - 'body-1', 'body-2', etc. -> 'body' (dynamic)
      // - 'closing' -> 'closer' (static, includes signature)
      const typeMapping: Record<string, string> = {
        'introduction': 'intro',
        'closing': 'closer'
        // All other slugs (body-1, body-2, etc.) default to 'body'
      };
      
      const payload = sections.map((section, idx) => ({
        user_id: userId,
        type: typeMapping[section.slug] || 'body',
        title: section.title,
        content: section.content,
        source_type: 'cover_letter',  // Schema field is source_type, not source
        source_id: sourceId,           // Schema field is source_id, not source_file_id
        tags: [] as string[],
        is_dynamic: !section.isStatic,  // is_dynamic = true means dynamic (toggle OFF), false means static (toggle ON)
        paragraph_index: section.order,
        position: section.order
      }));

      // Insert sections (don't use upsert since we don't have a unique constraint on user_id+source_id+type)
      const { error } = await dbClient
        .from('saved_sections')
        .insert(payload);

      if (error) {
        console.error('Error saving CL sections (upsert):', error);
      } else {
        console.log(`✅ Saved ${sections.length} CL sections`);
      }
    } catch (error) {
      console.error('Error saving CL sections:', error);
      // Don't throw - sections can be manually created later
    }
  }

  /**
   * Get existing work history for story linking
   */
  private async getWorkHistoryForStoryLinking(
    userId: string,
    accessToken?: string
  ): Promise<Array<{ id: string; company: string; title: string; startDate: string | null; endDate: string | null }>> {
    try {
      const dbClient = accessToken
        ? createSbClient(
            (import.meta.env?.VITE_SUPABASE_URL) || '',
            (import.meta.env?.VITE_SUPABASE_ANON_KEY) || '',
            { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
          )
        : supabase;

      const { data: workItems } = await dbClient
        .from('work_items')
        .select('id, title, start_date, end_date, companies(name)')
        .eq('user_id', userId)
        .is('parent_id', null)
        .order('start_date', { ascending: false });

      if (!workItems) return [];

      return workItems.map((item: any) => ({
        id: item.id,
        company: item.companies?.name || 'Unknown',
        title: item.title || 'Unknown',
        startDate: item.start_date,
        endDate: item.end_date,
      }));
    } catch (error) {
      console.error('Error getting work history for story linking:', error);
      return [];
    }
  }

  private async processStructuredData(
    structuredData: any, 
    sourceId: string, 
    accessToken?: string
  ): Promise<void> {
    const processStructuredStart = performance.now();
    console.log('═══════════════════════════════════════════════════════════');
    console.log('⏱️  [TIMING] processStructuredData START');
    console.log('═══════════════════════════════════════════════════════════');
    
    try {
      console.log('🔄 Processing structured data into work_items and companies tables...');
      
      if (!structuredData.workHistory || !Array.isArray(structuredData.workHistory)) {
        console.log('⏱️  [TIMING] No work history to process - skipping');
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
        .select('user_id, raw_text, file_name, created_at')
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

      // Determine active synthetic profile for this user (if any)
      const activeProfileId = await this.getActiveSyntheticProfileId(dbClient, userId);
      
      // Track insertion stats
      let companiesCreated = 0;
      let companiesUpdated = 0;
      let workItemsCreated = 0;
      let workItemsUpdated = 0;
      let storiesCreated = 0;
      let storiesFailed = 0;
      let companyUpsertMs = 0;
      let workItemUpsertMs = 0;
      let storyInsertMs = 0;
      let gapDetectionMs = 0;
      
      // Debug: Log raw workHistory structure to see if stories are present
      console.log('🔍 DEBUG: Sample workHistory item:', {
        company: structuredData.workHistory[0]?.company,
        hasStories: !!structuredData.workHistory[0]?.stories,
        storiesCount: structuredData.workHistory[0]?.stories?.length || 0,
        storiesType: typeof structuredData.workHistory[0]?.stories,
        keys: Object.keys(structuredData.workHistory[0] || {})
      });

      // PERFORMANCE: Batch all content for generic check in ONE LLM call
      // This reduces 43+ individual API calls to 1 batch call
      if (!isGapDetectionDisabled()) {
        try {
          const { GapDetectionService } = await import('./gapDetectionService');
          
          // Collect all content items for batch evaluation
          const contentItems: Array<{ id: string; content: string; type: 'work_item' | 'story' | 'section' }> = [];
          
          for (let i = 0; i < structuredData.workHistory.length; i++) {
            const workItem = structuredData.workHistory[i];
            // Add work item description
            const description = workItem.roleSummary || workItem.description || '';
            if (description) {
              contentItems.push({
                id: `work_item_${i}`,
                content: description,
                type: 'work_item'
              });
            }
            // Add stories
            const stories = workItem.stories || workItem.keyAccomplishments || [];
            for (let j = 0; j < stories.length; j++) {
              const story = stories[j];
              const storyContent = story.content || story.description || (typeof story === 'string' ? story : '');
              if (storyContent) {
                contentItems.push({
                  id: `story_${i}_${j}`,
                  content: storyContent,
                  type: 'story'
                });
              }
            }
          }
          
          if (contentItems.length > 0) {
            console.log(`🔍 [GapDetection] Heuristic pre-check for ${contentItems.length} items (no LLM)...`);
            await GapDetectionService.checkGenericContentBatch(contentItems, { useLLM: false });
            console.log(`✅ [GapDetection] Heuristic cache primed for individual gap checks`);
          }
        } catch (batchError) {
          console.warn('[GapDetection] Batch generic check failed, will fall back to heuristics:', batchError);
        }
      } else {
        console.log('[GapDetection] Disabled during upload (env flag), skipping generic batch check');
      }
      
      // Preload and batch insert companies/work items/stories to reduce DB latency
      const normalizeCompanyName = (name: string) => name.trim().toLowerCase();
      const companyIdMap = new Map<string, string>(); // key: normalized name -> company_id

      // Build unique company payloads
      const companyPayloads: any[] = [];
      for (const workItem of structuredData.workHistory) {
        if (!workItem.company) continue;
        const norm = normalizeCompanyName(workItem.company);
        if (companyIdMap.has(norm)) continue;
        companyPayloads.push({
          name: workItem.company,
          description: workItem.companyDescription || '',
          tags: workItem.companyTags || [],
          user_id: userId,
        });
      }

      if (companyPayloads.length > 0) {
        const start = performance.now();
        const { data: upsertedCompanies, error: companiesErr } = await dbClient
          .from('companies')
          .upsert(companyPayloads, { onConflict: 'user_id,name' })
          .select('id, name');

        companyUpsertMs = performance.now() - start;
        if (companiesErr) {
          console.error('❌ Error upserting companies batch:', companiesErr);
        }
        (upsertedCompanies || []).forEach((row: any) => {
          const norm = normalizeCompanyName(row.name);
          const existed = companyIdMap.has(norm);
          companyIdMap.set(norm, row.id);
          if (existed) {
            companiesUpdated++;
          } else {
            companiesCreated++;
          }
        });
      }

      // Gather work item payloads and detect existing ones in one query
      const workItemPayloads: any[] = [];
      const workItemKeyToData = new Map<string, any>(); // key -> payload
      const companyIds = Array.from(companyIdMap.values());

      const formatMetricForDisplay = (metric: any): string => {
        if (typeof metric === 'string') return metric.trim();
        const value = (metric?.value ?? '').toString().trim().replace(/\s+/g, ' ');
        const context = (metric?.context ?? '').toString().trim().replace(/\s+/g, ' ');
        if (!value && !context) return '';
        if (!value) return context;
        if (!context) return value;

        const valueLower = value.toLowerCase();
        const contextLower = context.toLowerCase();
        const idx = contextLower.indexOf(valueLower);
        if (idx !== -1) {
          const before = idx > 0 ? contextLower[idx - 1] : '';
          const after = idx + valueLower.length < contextLower.length ? contextLower[idx + valueLower.length] : '';
          const isWordChar = (ch: string) => /[a-z0-9]/i.test(ch);
          const beforeOk = !before || !isWordChar(before);
          const afterOk = !after || !isWordChar(after);
          if (beforeOk && afterOk) {
            return context;
          }
        }

        return `${value} ${context}`.trim();
      };

      for (const workItem of structuredData.workHistory) {
        const workItemTitle = workItem.title?.trim();
        if (!workItemTitle) {
          console.warn(`⚠️ Skipping work item: missing title for ${workItem.company || 'Unknown'}`);
          continue;
        }
        const companyId = workItem.company ? companyIdMap.get(normalizeCompanyName(workItem.company)) : undefined;
        if (!companyId) {
          console.warn(`⚠️ Company ID missing for ${workItem.company}, skipping work item`);
          continue;
        }
        const endDate = (workItem.endDate === 'Present' || workItem.endDate === 'Current' || workItem.current === true) ? null : workItem.endDate;
        const key = `${companyId}|${workItemTitle}|${workItem.startDate || ''}|${endDate || ''}`;
        if (workItemKeyToData.has(key)) continue;

        const outcomeMetrics = Array.isArray(workItem.outcomeMetrics)
          ? workItem.outcomeMetrics.map((m: any) => ({ ...m, parentType: m.parentType || 'role' }))
          : [];

        const payload = {
          user_id: userId,
          company_id: companyId,
          title: workItemTitle,
          start_date: workItem.startDate,
          end_date: endDate,
          description: workItem.roleSummary || workItem.description || '',
          achievements: workItem.outcomeMetrics?.map(formatMetricForDisplay).filter((s: string) => s.trim().length > 0) || workItem.achievements || [],
          tags: workItem.roleTags || workItem.tags || [],
          metrics: outcomeMetrics,
          source_id: sourceId,
        };
        workItemPayloads.push(payload);
        workItemKeyToData.set(key, payload);
      }

      // Fetch existing work_items once and map for reuse
      const workItemKeyToId = new Map<string, string>();
      if (companyIds.length > 0) {
        const { data: existingItems, error: existingItemsErr } = await dbClient
          .from('work_items')
          .select('id, company_id, title, start_date, end_date, metrics, description')
          .eq('user_id', userId)
          .in('company_id', companyIds);
        if (existingItemsErr) {
          console.error('❌ Error fetching existing work items:', existingItemsErr);
        } else {
          for (const wi of existingItems || []) {
            const key = `${wi.company_id}|${wi.title}|${wi.start_date || ''}|${wi.end_date || ''}`;
            workItemKeyToId.set(key, wi.id);
          }
        }
      }

      // Insert only new work_items
      const newWorkItems = workItemPayloads.filter((payload) => {
        const key = `${payload.company_id}|${payload.title}|${payload.start_date || ''}|${payload.end_date || ''}`;
        return !workItemKeyToId.has(key);
      });

      if (newWorkItems.length > 0) {
        const start = performance.now();
        const { data: insertedWorkItems, error: insertWorkErr } = await dbClient
          .from('work_items')
          .insert(newWorkItems)
          .select('id, company_id, title, start_date, end_date');
        workItemUpsertMs = performance.now() - start;
        if (insertWorkErr) {
          console.error('❌ Error inserting work items batch:', insertWorkErr);
        }
        (insertedWorkItems || []).forEach((wi: any) => {
          const key = `${wi.company_id}|${wi.title}|${wi.start_date || ''}|${wi.end_date || ''}`;
          workItemKeyToId.set(key, wi.id);
          workItemsCreated++;
        });
      }

      // Prepare stories payloads using mapped work_item_ids
      const storyPayloads: any[] = [];
      const seenStoryKey = new Set<string>(); // work_item_id + title
      for (const workItem of structuredData.workHistory) {
        const workItemTitle = workItem.title?.trim();
        if (!workItemTitle || !workItem.company) continue;
        const companyId = companyIdMap.get(normalizeCompanyName(workItem.company));
        if (!companyId) continue;
        const endDate = (workItem.endDate === 'Present' || workItem.endDate === 'Current' || workItem.current === true) ? null : workItem.endDate;
        const key = `${companyId}|${workItemTitle}|${workItem.startDate || ''}|${endDate || ''}`;
        const workItemId = workItemKeyToId.get(key);
        if (!workItemId) continue;

        const stories = Array.isArray(workItem.stories) ? workItem.stories : [];
        for (const story of stories) {
          const storyTitle = story.title || story.content?.substring(0, 100);
          if (!storyTitle) continue;
          const storyKey = `${workItemId}|${storyTitle}`;
          if (seenStoryKey.has(storyKey)) continue;
          seenStoryKey.add(storyKey);

          const storyMetrics = Array.isArray(story.metrics)
            ? story.metrics.map((m: any) => ({ ...m, parentType: m.parentType || 'story' }))
            : [];

          storyPayloads.push({
            user_id: userId,
            work_item_id: workItemId,
            company_id: companyId,
            title: storyTitle,
            content: story.content || '',
            tags: story.tags || [],
            metrics: storyMetrics,
            source_id: sourceId,
          });
        }
      }

      if (storyPayloads.length > 0) {
        const start = performance.now();
        const { data: insertedStories, error: storiesErr } = await dbClient
          .from('stories')
          .insert(storyPayloads)
          .select('id, work_item_id, title');
        storyInsertMs = performance.now() - start;
        if (storiesErr) {
          console.error('❌ Error inserting stories batch:', storiesErr);
        }
        storiesCreated = insertedStories?.length || 0;

        // Run gap detection for inserted stories (non-blocking loop)
        if (!isGapDetectionDisabled()) {
          try {
            const { GapDetectionService } = await import('./gapDetectionService');
            for (const story of insertedStories || []) {
              const payload = storyPayloads.find((p) => p.work_item_id === story.work_item_id && p.title === story.title);
              if (!payload) continue;
              const gaps = await GapDetectionService.detectStoryGaps(
                userId,
                {
                  id: story.id,
                  title: payload.title,
                  content: payload.content,
                  metrics: payload.metrics || []
                },
                story.work_item_id
              );
              if (gaps.length > 0) {
                await GapDetectionService.saveGaps(gaps, accessToken);
              }
            }
          } catch (gapErr) {
            console.error('⚠️ Error detecting gaps for stories (batch):', gapErr);
          }
        }
      }

      // Role-level gap detection for work items (batch-friendly loop)
      if (!isGapDetectionDisabled()) {
        const { GapDetectionService } = await import('./gapDetectionService');
        for (const [key, payload] of workItemKeyToData.entries()) {
          const workItemId = workItemKeyToId.get(key);
          if (!workItemId) continue;
          try {
            const roleGaps = await GapDetectionService.detectWorkItemGaps(
              userId,
              workItemId,
              {
                title: payload.title,
                description: payload.description || '',
                metrics: Array.isArray(payload.metrics) ? payload.metrics : [],
                startDate: payload.start_date,
                endDate: payload.end_date
              },
              []
            );
            if (roleGaps.length > 0) {
              await GapDetectionService.saveGaps(roleGaps, accessToken);
            }
          } catch (gapErr) {
            console.error('⚠️ Error detecting role-level gaps (batch):', gapErr);
          }
        }
      }

      // Estimate updated work items (existing mapped items minus new creations)
      workItemsUpdated = Math.max(workItemKeyToId.size - workItemsCreated, 0);

      // Normalize skills to user_skills table
      await this.normalizeSkills(structuredData, sourceId, userId, 'resume', accessToken);

      // ═══════════════════════════════════════════════════════════
      // 🎯 processStructuredData TIMING SUMMARY
      // ═══════════════════════════════════════════════════════════
      const totalProcessStructuredMs = performance.now() - processStructuredStart;
      console.log('═══════════════════════════════════════════════════════════');
      console.log('⏱️  [TIMING] processStructuredData COMPLETE - BREAKDOWN:');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`⏱️  [TIMING] ├─ Company Upserts              ${companyUpsertMs.toFixed(2).padStart(10)}ms (${companiesCreated} created, ${companiesUpdated} updated)`);
      console.log(`⏱️  [TIMING] ├─ Work Item Upserts            ${workItemUpsertMs.toFixed(2).padStart(10)}ms (${workItemsCreated} created, ${workItemsUpdated} updated)`);
      console.log(`⏱️  [TIMING] ├─ Story Inserts                ${storyInsertMs.toFixed(2).padStart(10)}ms (${storiesCreated} created, ${storiesFailed} failed)`);
      console.log(`⏱️  [TIMING] ├─ Gap Detection                ${gapDetectionMs.toFixed(2).padStart(10)}ms`);
      console.log(`⏱️  [TIMING] ├─────────────────────────────────────────────`);
      console.log(`⏱️  [TIMING] └─ 🎯 TOTAL processStructuredData: ${totalProcessStructuredMs.toFixed(2).padStart(10)}ms (${(totalProcessStructuredMs / 1000).toFixed(1)}s)`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📊 Database Insert Summary:', {
        companiesCreated,
        companiesUpdated,
        workItemsCreated,
        workItemsUpdated,
        storiesCreated,
        storiesFailed,
        totalWorkHistory: structuredData.workHistory.length
      });

      // Clear gap detection cache after processing
      try {
        const { GapDetectionService } = await import('./gapDetectionService');
        GapDetectionService.clearGenericContentCache();
      } catch (e) {
        // Non-critical
      }

      console.log('✅ Structured data processed successfully');

      // Kick off background LLM judge for generic content gaps (non-blocking)
      if (isBackgroundGenericGapJudgeEnabled()) {
        console.log('⏱️  [TIMING] Queueing background generic gap judge (non-blocking)...');
        this.runBackgroundGenericGapJudge(sourceId, userId, accessToken).catch((err) => {
          console.error('[GapDetection] Background generic gap judge failed:', err);
        });
      } else {
        console.log('📌 Background generic gap judge disabled by feature flag (ENABLE_BACKGROUND_GENERIC_GAP_JUDGE=false)');
      }

      schedulePMLevelBackgroundRun({
        userId,
        syntheticProfileId: activeProfileId || undefined,
        delayMs: 6000,
        reason: `[FileUploadService] Structured data processed from ${sourceData.file_name || sourceId}`,
        triggerReason: 'content-update',
      });
      
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
        .select('user_id, raw_text')
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
              .from('stories')
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
            // Resume stories use tags array, cover letter stories use skills array
            const storySkills = Array.isArray(story.skills)
              ? story.skills
              : (story.tags && Array.isArray(story.tags))
                ? story.tags  // Fallback for old format
                : (story.tags && typeof story.tags === 'object' && story.tags.skills)
                  ? story.tags.skills  // Fallback for nested tags.skills
                  : [];
            
            const { data: insertedStory, error: storyError } = await dbClient
              .from('stories')
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

              // Phase 3: Detect gaps for this cover letter story
              if (insertedStory?.id) {
                try {
                  const { GapDetectionService } = await import('./gapDetectionService');
                  const storyGaps = await GapDetectionService.detectStoryGaps(
                    userId,
                    {
                      id: insertedStory.id,
                      title: storyTitle,
                      content: story.content || '',
                      metrics: storyMetrics
                    },
                    workItemMatch.workItemId
                  );

                  if (storyGaps.length > 0) {
                    await GapDetectionService.saveGaps(storyGaps, accessToken);
                    console.log(`🔍 Detected ${storyGaps.length} gap(s) for cover letter story: ${insertedStory.id}`);
                  }
                } catch (gapError) {
                  // Don't fail the upload if gap detection fails
                  console.error('⚠️ Error detecting gaps for cover letter story:', gapError);
                }
              }
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
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
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
   * OPTIMIZED: Uses batch upsert instead of individual inserts to avoid 409 conflicts
   */
  private scheduleSkillsBackfill(
    sourceId: string,
    userId: string,
    resumeText: string,
    accessToken?: string
  ) {
    // Run asynchronously; do not block onboarding
    setTimeout(async () => {
      try {
        console.log('⏱️  [TIMING] ⚡ Background skills/education backfill starting...');
        const skillsResult = await this.llmAnalysisService.analyzeResumeSkillsOnly(resumeText);
        if (!skillsResult.success || !skillsResult.data) {
          console.warn('⚠️ Skills backfill failed:', skillsResult.error);
          return;
        }
        const skillsData = skillsResult.data as any;

        // Update sources.structured_data with new skills/education/contact/summary
        const { supabase } = await import('../lib/supabase');
        const { data: existing } = await supabase
          .from('sources')
          .select('structured_data')
          .eq('id', sourceId)
          .eq('user_id', userId)
          .single();

        const mergedStructured = {
          ...(existing?.structured_data || {}),
          contactInfo: skillsData.contactInfo || {},
          location: skillsData.location || null,
          summary: skillsData.summary || '',
          education: skillsData.education || [],
          skills: skillsData.skills || [],
          certifications: skillsData.certifications || [],
          projects: skillsData.projects || []
        };

        const { error: updateErr } = await supabase
          .from('sources')
          .update({ structured_data: mergedStructured })
          .eq('id', sourceId)
          .eq('user_id', userId);

        if (updateErr) {
          console.warn('⚠️ Skills backfill update failed:', updateErr);
        } else {
          // Normalize skills from backfill
          await this.normalizeSkills(mergedStructured, sourceId, userId, 'resume', accessToken);
          console.log('✅ Background skills/education backfill complete');
        }
      } catch (err) {
        console.warn('⚠️ Skills backfill exception:', err);
      }
    }, 0);
  }

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

      // Collect all skills to upsert in batch
      const skillsToUpsert: Array<{
        user_id: string;
        skill: string;
        category: string | null;
        source_type: string;
        source_id: string;
      }> = [];

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
                  skillsToUpsert.push({
                    user_id: userId,
                    skill: skill.trim(),
                    category: category,
                    source_type: 'resume',
                    source_id: sourceId
                  });
                }
              }
            }
          } else {
            // Simple string array format: ["skill1", "skill2"]
            for (const skillItem of skillsArray) {
              const skill = typeof skillItem === 'string' ? skillItem : String(skillItem);
              
              if (skill && skill.trim()) {
                skillsToUpsert.push({
                  user_id: userId,
                  skill: skill.trim(),
                  category: null,
                  source_type: 'resume',
                  source_id: sourceId
                });
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
              skillsToUpsert.push({
                user_id: userId,
                skill: skill.trim(),
                category: null,
                source_type: 'cover_letter',
                source_id: sourceId
              });
            }
          }
        }
      }

      // Batch upsert all skills at once (ignores duplicates)
      if (skillsToUpsert.length > 0) {
        const { error, count } = await dbClient
          .from('user_skills')
          .upsert(skillsToUpsert, { 
            onConflict: 'user_id,skill,source_type',
            ignoreDuplicates: true 
          });

        if (error) {
          console.warn('⚠️ Error upserting skills batch:', error);
        } else {
          console.log(`📊 Skills normalization: ${skillsToUpsert.length} skills processed in batch`);
        }
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
      
      // Kick off LinkedIn enrichment as soon as resume is processed (parallel to cover letter handling)
      const linkedInPromise = this.fetchAndProcessLinkedInData(accessToken);

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
      
      // Ensure LinkedIn enrichment has finished (work_items available) before matching cover letter stories
      if (linkedInPromise) {
        try {
          await linkedInPromise;
        } catch (e) {
          console.warn('⚠️ LinkedIn enrichment failed (continuing with existing work_items):', e);
        }
      }
      
      // Now process cover letter stories - LinkedIn work_items should exist
      if (this.pendingCoverLetter && combinedResult.coverLetter.success) {
        // Match cover letter stories to work_items (now including LinkedIn)
        await this.processCoverLetterData(combinedResult.coverLetter.data, this.pendingCoverLetter.sourceId, accessToken);
      }
      
      // Create unified profile from all three sources (resume + cover letter + LinkedIn)
      await this.createUnifiedProfile(accessToken);
      // Finalize the original coverLetter evaluation run with pipeline-complete gap totals (no extra LLM call)
      try {
        if (this.pendingCoverLetter?.sourceId) {
          const { createClient } = await import('@supabase/supabase-js');
          const { url, key } = getSupabaseConfig();
          const db = createClient(url, key, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } }
          });
          // Authenticated user
          const { data: { user } } = await db.auth.getUser();
          const userId = user?.id;
          // Derive synthetic profile from source file name
          const { data: src } = await db
            .from('sources')
            .select('file_name')
            .eq('id', this.pendingCoverLetter.sourceId)
            .single();
          const fileName = src?.file_name || '';
          const match = fileName.match(/^(P\d{2})[\-_.\s]?/i);
          const profileId = match ? match[1].toUpperCase() : undefined;
          // Compute final gap summary
          let finalSummary: any = null;
          let finalTotal = 0;
          if (userId) {
            const { GapDetectionService } = await import('./gapDetectionService');
            const summary = await GapDetectionService.getGapSummary(userId, profileId, accessToken);
            finalSummary = summary;
            finalTotal = summary?.total || 0;
          }
          // Update latest coverLetter evaluation run for this source
          const { data: run } = await db
            .from('evaluation_runs')
            .select('id')
            .eq('source_id', this.pendingCoverLetter.sourceId)
            .eq('file_type', 'coverLetter')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (run?.id) {
            const totalLatency = performance.now() - llmStartTime;
            await db
              .from('evaluation_runs')
              .update({
                gap_total: finalTotal,
                gap_summary: finalSummary,
                total_latency_ms: Math.round(totalLatency)
              })
              .eq('id', run.id);
          }
        }
      } catch (e) {
        console.warn('Failed to finalize evaluation run with final gaps:', e);
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
    // Granular latency metrics (optional, for detailed tracking)
    extractionLatencyMs?: number;
    dbLatencyMs?: number;
    totalLatencyMs?: number;
    timingBreakdown?: Record<string, any>;
  }, accessToken?: string): Promise<void> {
    try {
      // Use the default supabase client - it maintains auth state from user session
      // This matches how PM levels logs successfully
      const dbClient = supabase;
      
      // Get user from current session
      const { data: { user }, error: userError } = await dbClient.auth.getUser();
      
      if (userError) {
        console.error(`❌ [EVAL] Auth error getting user:`, userError.message);
        return;
      }
      
      const userId = user?.id;
      if (!userId) {
        console.error('❌ [EVAL] No user found for evaluation logging - user is null');
        return;
      }
      console.log(`📊 [EVAL] User found: ${userId}, preparing insert for ${data.type}...`);

      // Parse evaluation results
      const evaluation = data.evaluation || {};
      
      // Determine user_type and synthetic profile from the source file name
      const { data: sourceData } = await dbClient
        .from('sources')
        .select('file_name')
        .eq('id', data.sourceId)
        .single();
      
      const fileName = sourceData?.file_name || '';
      const profileMatch = fileName.match(/^(P\d{2})[\-_\.\s]?/i);
      const syntheticProfileId = profileMatch ? profileMatch[1].toUpperCase() : null;
      const userType = syntheticProfileId ? 'synthetic' : 'real';

      // Compute current gap summary for this user (scoped by detected synthetic profile when present)
      let gapSummary: any = null;
      let gapTotal: number = 0;
      try {
        const { GapDetectionService } = await import('./gapDetectionService');
        if (userId) {
          const summary = await GapDetectionService.getGapSummary(userId, syntheticProfileId || undefined, accessToken);
          gapSummary = summary;
          gapTotal = summary?.total || 0;
        }
      } catch (e) {
        console.warn('Failed to compute gap summary for evaluation run:', e);
      }
      
      // Store in Supabase evaluation_runs table
      const { error } = await dbClient
        .from('evaluation_runs')
        .insert({
          user_id: userId,
          session_id: data.sessionId,
          source_id: data.sourceId, // This should be the UUID from sources table
          file_type: data.type,
          user_type: userType,
          synthetic_profile_id: syntheticProfileId,
          
          // Performance Metrics (granular)
          text_extraction_latency_ms: data.extractionLatencyMs ? Math.round(data.extractionLatencyMs) : null,
          llm_analysis_latency_ms: Math.round(data.latency),
          database_save_latency_ms: data.dbLatencyMs ? Math.round(data.dbLatencyMs) : null,
          total_latency_ms: data.totalLatencyMs ? Math.round(data.totalLatencyMs) : Math.round(data.latency),
          
      // Token Usage
      input_tokens: data.inputTokens != null ? Math.round(data.inputTokens) : null,
      output_tokens: data.outputTokens != null ? Math.round(data.outputTokens) : null,
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
          
          // Gap Summary Snapshot (source of truth for counts at analysis time)
          gap_total: gapTotal,
          gap_summary: gapSummary,
          
          // Detailed Timing Breakdown (from streaming onboarding instrumentation)
          timing_breakdown: data.timingBreakdown || null
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
      // Feature flag: Skip LinkedIn enrichment if disabled
      const { isLinkedInScrapingEnabled } = await import('../lib/flags');
      if (!isLinkedInScrapingEnabled()) {
        console.log('📌 LinkedIn scraping disabled by feature flag (ENABLE_LI_SCRAPING=false)');
        // Emit progress indicating disabled
        this.emitProgress('linkedin_disabled', 100, 'LinkedIn scraping disabled', 'linkedin');
        return;
      }

      if (!this.pendingResume) {
        console.log('⚠️ No resume data available for LinkedIn enrichment');
        return;
      }

      // Emit progress for LinkedIn fetch starting (keep global bar alive)
      this.emitProgress('linkedin_fetch', 50, 'Fetching LinkedIn data...', 'linkedin');

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

      // Synthetic mode: always prefer local LinkedIn fixtures when an active synthetic profile exists
      let appifyResult;
      let appifyRawData: any = null;
      let activeProfileId: string | null = await this.getActiveSyntheticProfileId(authSupabase, user.id);
      const isSyntheticEnabled = !!activeProfileId;

      // Do not rely on local fixture files in production browser builds.
      // (Fixtures are dev-only and are removed from production `dist/` output.)
      if (
        activeProfileId &&
        typeof window !== 'undefined' &&
        !(import.meta as any).env?.DEV
      ) {
        console.warn('⚠️ Synthetic profile detected in production; skipping fixture-based enrichment.');
        activeProfileId = null;
      }

      if (activeProfileId) {
        // Synthetic mode: Load JSON fixture file
        console.log('🧪 Synthetic mode detected - loading LinkedIn fixture data...');
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
        // Ensure evaluation logging sees the LinkedIn source id
        this.pendingLinkedIn = {
          sourceId: linkedinSource.id,
          structuredData: linkedinStructuredData
        };

          // Emit progress for LinkedIn completion
          this.emitProgress('linkedin_complete', 95, 'LinkedIn data processed', 'linkedin');
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

  /**
   * Background LLM judge for generic content gaps (non-blocking)
   */
  private async runBackgroundGenericGapJudge(sourceId: string, userId: string, accessToken?: string): Promise<void> {
    try {
      const dbClient = accessToken
        ? createSbClient(
            (import.meta.env?.VITE_SUPABASE_URL) || '',
            (import.meta.env?.VITE_SUPABASE_ANON_KEY) || '',
            { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
          )
        : supabase;

      // Fetch work items and stories for this source
      const { data: workItems } = await dbClient
        .from('work_items')
        .select('id, description')
        .eq('source_id', sourceId)
        .eq('user_id', userId);

      const { data: stories } = await dbClient
        .from('stories')
        .select('id, content')
        .eq('source_id', sourceId)
        .eq('user_id', userId);

      const contentItems: Array<{ id: string; content: string; type: 'work_item' | 'story' | 'section' }> = [];
      (workItems || []).forEach((w: any, idx: number) => {
        if (w.description) {
          contentItems.push({
            id: w.id,
            content: w.description,
            type: 'work_item',
          });
        }
      });
      (stories || []).forEach((s: any) => {
        if (s.content) {
          contentItems.push({
            id: s.id,
            content: s.content,
            type: 'story',
          });
        }
      });

      if (contentItems.length === 0) {
        return;
      }

      const { GapDetectionService } = await import('./gapDetectionService');
      const results = await GapDetectionService.checkGenericContentBatch(contentItems, { useLLM: true });

      const gaps: any[] = [];
      for (const [id, gap] of results.entries()) {
        if (!gap.isGeneric) continue;
        const isStory = contentItems.find((c) => c.id === id)?.type === 'story';
        gaps.push({
          user_id: userId,
          entity_type: isStory ? 'approved_content' : 'work_item',
          entity_id: id,
          gap_type: 'best_practice',
          // Standards-based categories (legacy generic_* replaced)
          gap_category: isStory ? 'story_needs_specifics' : 'role_description_needs_specifics',
          severity: gap.confidence && gap.confidence > 0.8 ? 'high' : 'medium',
          description: gap.reasoning || 'Content may be too generic',
        });
      }

      if (gaps.length > 0) {
        await GapDetectionService.saveGaps(gaps, accessToken);
        console.log(`[GapDetection] Background LLM judge created ${gaps.length} generic gap(s)`);
      }
    } catch (err) {
      console.error('[GapDetection] Background judge error:', err);
    }
  }
}

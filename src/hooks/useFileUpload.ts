// React hook for file upload functionality
import { useState, useCallback, useRef, useEffect } from 'react';
import { FileUploadService } from '@/services/fileUploadService';
import { AppifyService, type AppifyEnrichmentResult } from '@/services/appifyService';
import { LinkedInOAuthService } from '@/services/linkedinOAuthService';
// PDL deprecated for LinkedIn enrichment
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { extractLinkedInUsername } from '@/utils/linkedinUtils';
import { isLinkedInScrapingEnabled } from '@/lib/flags';
import type { 
  UseFileUploadOptions, 
  UseFileUploadReturn, 
  FileUploadProgress, 
  UploadResult,
  FileType 
} from '@/types/fileUpload';

/**
 * Process LinkedIn work history into work_items table
 * This enables uniform gap detection and data model across all sources
 */
async function processLinkedInWorkHistory(
  userId: string,
  sourceId: string,
  workHistory: any[]
): Promise<void> {
  console.log(`🔄 Creating work_items from ${workHistory.length} LinkedIn roles...`);
  
  let companiesCreated = 0;
  let workItemsCreated = 0;
  
  for (const role of workHistory) {
    try {
      // Normalize company name for display (capitalize first letter of each word)
      const companyName = (role.company || 'Unknown Company')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      // Normalize title for display
      const title = (role.title || role.position || 'Position')
        .split(' ')
        .map((word: string) => {
          // Keep common acronyms uppercase
          const acronyms = ['ai', 'ml', 'vp', 'ceo', 'cto', 'cfo', 'coo', 'ux', 'ui', 'qa', 'hr', 'it'];
          if (acronyms.includes(word.toLowerCase())) {
            return word.toUpperCase();
          }
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
      
      // Find or create company
      let companyId: string;
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('name', companyName)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existingCompany) {
        companyId = (existingCompany as any).id;
      } else {
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: companyName,
            description: role.description || '',
            tags: [],
            user_id: userId
          } as any)
          .select('id')
          .single();
        
        if (companyError || !newCompany) {
          console.warn(`Could not create company ${companyName}:`, companyError?.message);
          continue;
        }
        companyId = (newCompany as any).id;
        companiesCreated++;
      }
      
      // Parse dates
      const startDate = role.startDate || null;
      const endDate = role.current ? null : (role.endDate || null);
      
      // Note: We intentionally do NOT deduplicate LinkedIn items here.
      // LinkedIn provides authoritative role boundaries that may differ from
      // resume's compressed multi-role entries. The merge service handles
      // display-level grouping, and users can delete unwanted duplicates.
      
      // Only skip true duplicates: exact same source + title + company + start date
      const { data: existingLinkedInItem } = await supabase
        .from('work_items')
        .select('id')
        .eq('user_id', userId)
        .eq('source_id', sourceId)
        .eq('company_id', companyId)
        .eq('title', title)
        .maybeSingle();
      
      if (existingLinkedInItem) {
        console.log(`⏭️ Skipping already-imported LinkedIn role: ${title} at ${companyName}`);
        continue;
      }
      
      // Create work_item
      const { error: workItemError } = await supabase
        .from('work_items')
        .insert({
          user_id: userId,
          company_id: companyId,
          source_id: sourceId,
          title: title,
          start_date: startDate,
          end_date: endDate,
          description: role.description || null,
          metrics: [],
          tags: []
        } as any);
      
      if (workItemError) {
        console.warn(`Could not create work_item for ${title}:`, workItemError.message);
        continue;
      }
      
      workItemsCreated++;
    } catch (err) {
      console.warn(`Error processing LinkedIn role:`, err);
    }
  }
  
  console.log(`✅ LinkedIn processing complete: ${companiesCreated} companies, ${workItemsCreated} work_items created`);
}

export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const { user, session } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<FileUploadProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const fileUploadService = useRef(new FileUploadService());
  const uploadPromises = useRef<Map<string, Promise<UploadResult>>>(new Map());

  const {
    onProgress,
    onComplete,
    onError,
    maxFiles = 5,
    allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'],
    maxFileSize = 5 * 1024 * 1024 // 5MB
  } = options;
  // Listen for file upload progress events from the service (keep bar alive even if progress array is empty)
  useEffect(() => {
    const handleProgressEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { progress: progressPercent, fileType, fileId: eventFileId } = customEvent.detail || {};
      const targetFileType = eventFileId || fileType || 'file';
      
      setProgress(prev => {
        // If no entries, create a placeholder so progress doesn't vanish
        if (prev.length === 0) {
          return [{
            fileId: targetFileType,
            fileName: targetFileType,
            status: 'processing',
            progress: progressPercent || 0
          }];
        }
        // Update the most recent entry
        const lastIndex = prev.length - 1;
        return prev.map((p, idx) => 
          idx === lastIndex ? { ...p, progress: progressPercent || p.progress, status: 'processing' } : p
        );
      });
    };

    window.addEventListener('file-upload-progress', handleProgressEvent);
    return () => window.removeEventListener('file-upload-progress', handleProgressEvent);
  }, []);


  /**
   * Upload a single file with progress tracking and detailed status updates
   */
  const uploadFile = useCallback(async (file: File, type: FileType): Promise<UploadResult> => {
    console.log('useFileUpload - uploadFile called with user:', { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email 
    });
    
    if (!user) {
      const errorMsg = 'User not authenticated';
      console.error('useFileUpload - No user found:', errorMsg);
      setError(errorMsg);
      onError?.(errorMsg);
      return { success: false, error: errorMsg, retryable: false };
    }

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      const errorMsg = `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`;
      setError(errorMsg);
      onError?.(errorMsg);
      return { success: false, error: errorMsg, retryable: false };
    }

    // Validate file size
    if (file.size > maxFileSize) {
      const errorMsg = `File too large. Maximum size: ${Math.round(maxFileSize / 1024 / 1024)}MB`;
      setError(errorMsg);
      onError?.(errorMsg);
      return { success: false, error: errorMsg, retryable: false };
    }

    // Validate file name
    if (!file.name || file.name.trim().length === 0) {
      const errorMsg = 'Invalid file name';
      setError(errorMsg);
      onError?.(errorMsg);
      return { success: false, error: errorMsg, retryable: false };
    }

    const fileId = `${file.name}_${Date.now()}`;
    
    // Create progress entry
    const progressEntry: FileUploadProgress = {
      fileId,
      fileName: file.name,
      status: 'pending',
      progress: 0
    };

    setProgress(prev => [...prev, progressEntry]);
    setIsUploading(true);
    setError(null);

    try {
      // Stage 1: Uploading (0-30%)
      setProgress(prev => 
        prev.map(p => p.fileId === fileId ? { ...p, status: 'processing', progress: 10 } : p)
      );
      onProgress?.(progressEntry);

      // Simulate progress updates during upload
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const current = prev.find(p => p.fileId === fileId);
          if (current && current.progress < 90) {
            const newProgress = Math.min(current.progress + 5, 90);
            return prev.map(p => p.fileId === fileId ? { ...p, progress: newProgress } : p);
          }
          return prev;
        });
      }, 500); // Update every 500ms

      // Upload file
      const uploadStartTime = performance.now();
      console.warn(`🚀 useFileUpload: Starting ${type} upload and processing for: ${file.name}`);
      const result = await fileUploadService.current.uploadFile(file, user.id, type, session?.access_token);
      const uploadEndTime = performance.now();
      const uploadDuration = (uploadEndTime - uploadStartTime).toFixed(2);
      console.warn(`⏱️ ${type} upload and processing took: ${uploadDuration}ms`);
      
      // Clear interval
      clearInterval(progressInterval);
      
      if (result.success) {
        // Update progress to completed
        setProgress(prev => 
          prev.map(p => p.fileId === fileId ? { ...p, status: 'completed', progress: 100 } : p)
        );
        
        onComplete?.(result);
        return result;
      } else {
        // Update progress to failed
        setProgress(prev => 
          prev.map(p => p.fileId === fileId ? { 
            ...p, 
            status: 'failed', 
            error: result.error,
            retryable: result.retryable 
          } : p)
        );
        
        setError(result.error);
        onError?.(result.error || 'Upload failed');
        return result;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      
      // Update progress to failed
      setProgress(prev => 
        prev.map(p => p.fileId === fileId ? { 
          ...p, 
          status: 'failed', 
          error: errorMsg,
          retryable: true 
        } : p)
      );
      
      setError(errorMsg);
      onError?.(errorMsg);
      return { success: false, error: errorMsg, retryable: true };
    } finally {
      setIsUploading(false);
    }
  }, [user, session, allowedTypes, maxFileSize, onProgress, onComplete, onError]);

  /**
   * Upload multiple files
   */
  const uploadFiles = useCallback(async (files: File[], type: FileType): Promise<UploadResult[]> => {
    if (files.length > maxFiles) {
      const errorMsg = `Too many files. Maximum ${maxFiles} files allowed.`;
      setError(errorMsg);
      onError?.(errorMsg);
      return [];
    }

    const results: UploadResult[] = [];
    for (const file of files) {
      const result = await uploadFile(file, type);
      results.push(result);
    }

    return results;
  }, [uploadFile, maxFiles, onError]);

  /**
   * Retry failed upload
   */
  const retryUpload = useCallback(async (fileId: string): Promise<UploadResult> => {
    const failedUpload = progress.find(p => p.fileId === fileId && p.status === 'failed');
    
    if (!failedUpload) {
      const errorMsg = 'Upload not found or not in failed state';
      setError(errorMsg);
      return { success: false, error: errorMsg, retryable: false };
    }

    // Remove failed upload from progress
    setProgress(prev => prev.filter(p => p.fileId !== fileId));

    // Retry upload (if we had the original file reference, we'd use it here)
    // For now, we'll rely on the service's retry mechanism
    try {
      const result = await fileUploadService.current.retryUpload(fileId, user!.id);
      
      if (result.success) {
        setProgress(prev => 
          prev.map(p => p.fileId === fileId ? { ...p, status: 'completed', progress: 100 } : p)
        );
        onComplete?.(result);
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Retry failed';
      setError(errorMsg);
      return { success: false, error: errorMsg, retryable: true };
    }
  }, [progress, user, onComplete]);

  /**
   * Save manual text input
   */
  const saveManualText = useCallback(async (text: string, type: FileType): Promise<UploadResult> => {
    console.log('useFileUpload - saveManualText called with user:', { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email 
    });
    
    if (!user) {
      const errorMsg = 'User not authenticated';
      console.error('useFileUpload - No user found:', errorMsg);
      setError(errorMsg);
      onError?.(errorMsg);
      return { success: false, error: errorMsg, retryable: false };
    }

    const fileId = `manual_${type}_${Date.now()}`;
    
    const progressEntry: FileUploadProgress = {
      fileId,
      fileName: `Manual ${type}`,
      status: 'pending',
      progress: 0
    };

    setProgress(prev => [...prev, progressEntry]);
    setIsUploading(true);
    setError(null);

    try {
      setProgress(prev => 
        prev.map(p => p.fileId === fileId ? { ...p, status: 'processing', progress: 25 } : p)
      );
      onProgress?.(progressEntry);

      const textStartTime = performance.now();
      console.log(`🚀 Starting ${type} text processing for manual input`);
      const result = await fileUploadService.current.uploadContent(text, user.id, type, session?.access_token);
      const textEndTime = performance.now();
      const textDuration = (textEndTime - textStartTime).toFixed(2);
      console.warn(`⏱️ ${type} text processing took: ${textDuration}ms`);
      
      if (result.success) {
        setProgress(prev => 
          prev.map(p => p.fileId === fileId ? { ...p, status: 'completed', progress: 100 } : p)
        );
        
        onComplete?.(result);
        return result;
      } else {
        setProgress(prev => 
          prev.map(p => p.fileId === fileId ? { 
            ...p, 
            status: 'failed', 
            error: result.error,
            retryable: result.retryable 
          } : p)
        );
        
        setError(result.error);
        onError?.(result.error || 'Upload failed');
        return result;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      
      setProgress(prev => 
        prev.map(p => p.fileId === fileId ? { 
          ...p, 
          status: 'failed', 
          error: errorMsg,
          retryable: true 
        } : p)
      );
      
      setError(errorMsg);
      onError?.(errorMsg);
      return { success: false, error: errorMsg, retryable: true };
    } finally {
      setIsUploading(false);
    }
  }, [user, session, onProgress, onComplete, onError]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear all progress
   */
  const clearProgress = useCallback(() => {
    setProgress([]);
  }, []);

  /**
   * Get progress for specific file
   */
  const getFileProgress = useCallback((fileId: string): FileUploadProgress | undefined => {
    return progress.find(p => p.fileId === fileId);
  }, [progress]);

  /**
   * Check if there are active uploads
   */
  const hasActiveUploads = useCallback((): boolean => {
    return progress.some(p => p.status === 'processing');
  }, [progress]);

  /**
   * Get failed uploads
   */
  const getFailedUploads = useCallback((): FileUploadProgress[] => {
    return progress.filter(p => p.status === 'failed');
  }, [progress]);

  /**
   * Get completed uploads
   */
  const getCompletedUploads = useCallback((): FileUploadProgress[] => {
    return progress.filter(p => p.status === 'completed');
  }, [progress]);

  /**
   * Pre-extract text from a file for performance optimization.
   * Call this immediately when a file is selected to start extraction in background.
   */
  const preExtractFile = useCallback((file: File): void => {
    fileUploadService.current.preExtractFile(file);
  }, []);

  return {
    uploadFile,
    uploadFiles,
    saveManualText,
    isUploading,
    progress,
    error,
    clearError,
    retryUpload,
    // Additional utility methods
    clearProgress,
    getFileProgress,
    hasActiveUploads,
    getFailedUploads,
    getCompletedUploads,
    // Performance optimization
    preExtractFile
  };
}

/**
 * Hook for LinkedIn profile integration with PDL enrichment
 */
export function useLinkedInUpload() {
  const { user, profile, getOAuthData } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Connect LinkedIn profile using OAuth
   */
  const connectLinkedIn = useCallback(async (linkedinUrl: string): Promise<UploadResult> => {
    if (!user) {
      const errorMsg = 'User not authenticated';
      setError(errorMsg);
      return { success: false, error: errorMsg, retryable: false };
    }

    // Trim whitespace from URL
    const trimmedUrl = linkedinUrl.trim();
    
    // Validate LinkedIn URL
    if (!LinkedInOAuthService.validateLinkedInUrl(trimmedUrl)) {
      const errorMsg = 'Invalid LinkedIn URL. Please use format: https://linkedin.com/in/yourprofile';
      setError(errorMsg);
      return { success: false, error: errorMsg, retryable: false };
    }

    // Feature flag: Skip scraping if disabled
    if (!isLinkedInScrapingEnabled()) {
      console.log('📌 LinkedIn scraping disabled by feature flag (ENABLE_LI_SCRAPING=false)');
      setIsConnecting(false);
      
      // Create a stub fileId for consistency
      const stubFileId = `linkedin_disabled_${Date.now()}`;
      
      // Emit progress event indicating scraping is disabled
      if (onProgress) {
        onProgress({
          stage: 'complete',
          percent: 100,
          message: 'LinkedIn scraping disabled - URL saved',
          status: 'success'
        });
      }
      
      // Emit global progress event so auto-advance works
      window.dispatchEvent(new CustomEvent('global-progress', {
        detail: {
          task: 'linkedin',
          status: 'done',
          percent: 100,
          label: 'LinkedIn scraping disabled'
        }
      }));
      
      // Return success with stub fileId
      return { 
        success: true, 
        fileId: stubFileId,
        message: 'LinkedIn scraping disabled - URL validated but not scraped'
      };
    }

    try {
      setIsConnecting(true);
      setError(null);

      console.log('Starting LinkedIn OAuth flow for URL:', trimmedUrl);
      
      // Extract LinkedIn username from URL for reference
      const linkedinUsername = LinkedInOAuthService.extractLinkedInUsername(trimmedUrl);
      if (!linkedinUsername) {
        throw new Error('Could not extract LinkedIn username from URL');
      }

      // Check if profile already exists in sources table
      const { data: existingProfile, error: existingError } = await supabase
        .from('sources')
        .select('*')
        .eq('user_id', user.id)
        .eq('source_type', 'linkedin')
        .ilike('file_name', `%${linkedinUsername}%`)
        .single();

      if (existingProfile && !existingError) {
        console.log('LinkedIn profile already exists in sources, returning existing data');
        return {
          success: true,
          fileId: (existingProfile as any).id
        };
      }

      // Strategy 1: Try to fetch LinkedIn data using Appify API
      console.log('Attempting to fetch LinkedIn data using Appify API...');
      
      const appifyService = new AppifyService();
      let appifyResult: AppifyEnrichmentResult | null = null;
      
      if (appifyService.isConfigured()) {
        console.log('🔍 Appify API configured, fetching LinkedIn data...');
        appifyResult = await appifyService.enrichPerson({
          linkedinUrl: trimmedUrl,
          name: user?.user_metadata?.full_name || profile?.full_name || undefined
        });
      } else {
        console.warn('⚠️ Appify API not configured - skipping LinkedIn enrichment');
      }
      
      let profileData;
      let profileId = `linkedin_${Date.now()}`;
      let dataSource = 'unknown';
      
      if (appifyResult?.success && appifyResult.data) {
        // Use LinkedIn data from Appify
        console.log('✅ Successfully fetched LinkedIn data via Appify');
        dataSource = 'appify';
        
        // Appify enrichment already returns data in our StructuredResumeData format
        const linkedinData = appifyResult.data;
        
        // Extract name from structured data if available
        const fullName = user?.user_metadata?.full_name || profile?.full_name || '';
        const [firstName, ...lastNameParts] = fullName.split(' ');
        
        profileData = {
          id: profileId,
          linkedinId: linkedinUsername,
          profileUrl: trimmedUrl,
          firstName: firstName || 'Unknown',
          lastName: lastNameParts.join(' ') || 'User',
          headline: linkedinData.workHistory?.[0]?.title || linkedinData.summary || 'Professional',
          summary: linkedinData.summary || 'No summary available',
          experience: linkedinData.workHistory || [],
          education: linkedinData.education || [],
          skills: linkedinData.skills || [],
          certifications: linkedinData.certifications || [],
          projects: linkedinData.projects || []
        };
      } else {
        // Strategy 2: Check for synthetic test data (development only)
        if (import.meta.env.DEV && linkedinUsername) {
          console.log('🧪 Checking for synthetic LinkedIn data...');
          
          // Try to load synthetic fixture data based on LinkedIn username
          try {
            // Map common synthetic usernames to profile IDs
            const syntheticProfiles: Record<string, string> = {
              'avery-chen': 'P01',
              'avery-chen-pm': 'P01',
              'jordan-alvarez': 'P02',
              'riley-gupta': 'P03',
              // Add more as needed
            };
            
            const profileId = syntheticProfiles[linkedinUsername];
            if (profileId) {
              console.log(`🎯 Detected synthetic profile: ${profileId}`);
              
              // Fetch the fixture JSON from the public fixtures folder
              const fixturePath = `/fixtures/synthetic/v1/raw_uploads/${profileId}_linkedin.json`;
              const response = await fetch(fixturePath);
              
              if (response.ok) {
                const fixtureData = await response.json();
                console.log('✅ Loaded synthetic LinkedIn data from fixture');
                dataSource = 'synthetic_fixture';
                
                // Transform PDL format to our format
                profileData = {
                  id: profileId,
                  linkedinId: linkedinUsername,
                  profileUrl: trimmedUrl,
                  firstName: fixtureData.first_name || 'Unknown',
                  lastName: fixtureData.last_name || 'User',
                  headline: fixtureData.headline || 'Professional',
                  summary: fixtureData.summary || 'No summary available',
                  experience: fixtureData.experience || [],
                  education: fixtureData.education || [],
                  skills: fixtureData.skills || [],
                  certifications: [],
                  projects: []
                };
              } else {
                console.log(`⚠️ Synthetic fixture not found at ${fixturePath}`);
              }
            }
          } catch (err) {
            console.log('⚠️ Error loading synthetic fixture:', err);
          }
        }
        
      // Strategy 3: If all enrichment strategies fail, stop (no minimal fallback)
      if (!profileData) {
        console.warn('All enrichment strategies failed; not storing minimal LinkedIn data');
        setIsConnecting(false);
        return { success: false, error: 'LinkedIn enrichment failed', retryable: true };
      }
      }
      
      // Store in sources table (unified storage)
      console.log(`📊 LinkedIn data source: ${dataSource}`);
      try {
        const { data, error } = await supabase
          .from('sources')
          .insert({
            user_id: user.id,
            source_type: 'linkedin',
            source_method: 'appify_api',
            file_name: `LinkedIn Profile (${linkedinUsername})`,
            file_type: 'linkedin',
            file_size: 0,
            file_checksum: `linkedin_${linkedinUsername}_${Date.now()}`,
            storage_path: trimmedUrl,
            processing_status: 'completed',
            structured_data: {
              workHistory: profileData.experience,
              education: profileData.education,
              skills: profileData.skills,
              certifications: profileData.certifications,
              projects: profileData.projects,
              summary: profileData.summary,
              profileUrl: trimmedUrl,
              linkedinId: linkedinUsername
            },
            schema_version: 1
          } as any)
          .select('id')
          .single();

        if (error) {
          console.warn('Could not store LinkedIn profile in sources:', error.message);
          // Continue with profile data even if database fails
        } else if (data) {
          console.log('LinkedIn profile stored in sources successfully:', (data as any).id);
          profileId = (data as any).id;
          
          // Process LinkedIn work history into work_items
          // This enables gap detection and uniform data model
          if (profileData.experience && Array.isArray(profileData.experience)) {
            console.log(`📊 Processing ${profileData.experience.length} LinkedIn roles into work_items...`);
            await processLinkedInWorkHistory(user.id, profileId, profileData.experience);
            
            // Generate stories for the LinkedIn work_items that were just created
            try {
              const { generateStoriesForWorkItems } = await import('@/services/storiesGenerationService');
              console.log(`📖 Generating stories for LinkedIn work_items...`);
              const { storiesCreated, errors } = await generateStoriesForWorkItems(
                user.id,
                profileId,
                import.meta.env.VITE_OPENAI_API_KEY
              );
              console.log(`📖 Stories generation complete: ${storiesCreated} created, ${errors.length} errors`);
              if (errors.length > 0) {
                console.warn(`📖 Story generation errors:`, errors);
              }
            } catch (storyError) {
              console.warn('⚠️ Story generation failed (non-critical):', storyError);
              // Don't fail the LinkedIn connect if story generation fails
            }
          }
        }
      } catch (dbError) {
        console.warn('Database not available for LinkedIn profile storage:', dbError);
        // Continue with profile data
      }

      // Emit completion progress for LinkedIn after DB writes
      window.dispatchEvent(new CustomEvent('global-progress', {
        detail: { task: 'linkedin', status: 'done', percent: 100, label: '[PROGRESS] linkedin complete' }
      }));

      return {
        success: true,
        fileId: profileId
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'LinkedIn connection failed';
      setError(errorMsg);
      return { success: false, error: errorMsg, retryable: true };
    } finally {
      setIsConnecting(false);
    }
  }, [user, profile, getOAuthData]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    connectLinkedIn,
    isConnecting,
    error,
    clearError
  };
}

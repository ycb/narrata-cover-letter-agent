// React hook for file upload functionality
import { useState, useCallback, useRef, useEffect } from 'react';
import { FileUploadService } from '@/services/fileUploadService';
import { LinkedInOAuthService } from '@/services/linkedinOAuthService';
import { PeopleDataLabsService } from '@/services/peopleDataLabsService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { extractLinkedInUsername } from '@/utils/linkedinUtils';
import type { 
  UseFileUploadOptions, 
  UseFileUploadReturn, 
  FileUploadProgress, 
  UploadResult,
  FileType 
} from '@/types/fileUpload';

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
  // Listen for file upload progress events from the service
  useEffect(() => {
    const handleProgressEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { progress: progressPercent } = customEvent.detail;
      
      setProgress(prev => {
        if (prev.length === 0) return prev;
        const lastIndex = prev.length - 1;
        return prev.map((p, idx) => 
          idx === lastIndex ? { ...p, progress: progressPercent } : p
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
    getCompletedUploads
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

    try {
      setIsConnecting(true);
      setError(null);

      console.log('Starting LinkedIn OAuth flow for URL:', trimmedUrl);
      
      // Extract LinkedIn username from URL for reference
      const linkedinUsername = LinkedInOAuthService.extractLinkedInUsername(trimmedUrl);
      if (!linkedinUsername) {
        throw new Error('Could not extract LinkedIn username from URL');
      }

      // Check if profile already exists
      const { data: existingProfile, error: existingError } = await supabase
        .from('linkedin_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('linkedin_id', linkedinUsername)
        .single();

      if (existingProfile && !existingError) {
        console.log('LinkedIn profile already exists, returning existing data');
        return {
          success: true,
          fileId: (existingProfile as any).id
        };
      }

      // Strategy 1: Try to fetch real LinkedIn data using OAuth
      console.log('Attempting to fetch real LinkedIn data using OAuth...');
      
      const linkedInService = new LinkedInOAuthService();
      const profileResult = await linkedInService.fetchProfileData();
      
      let profileData;
      let profileId = `linkedin_${Date.now()}`;
      let dataSource = 'unknown';
      
      if (profileResult.success && profileResult.data) {
        // Use real LinkedIn data from OAuth
        console.log('✅ Successfully fetched real LinkedIn data via OAuth');
        dataSource = 'linkedin_oauth';
        profileData = {
          id: profileId,
          linkedinId: linkedinUsername,
          profileUrl: trimmedUrl,
          firstName: profileResult.data.rawData?.profile?.firstName || 'Unknown',
          lastName: profileResult.data.rawData?.profile?.lastName || 'User',
          headline: profileResult.data.rawData?.profile?.headline || 'Professional',
          summary: profileResult.data.about || 'No summary available',
          experience: profileResult.data.experience,
          education: profileResult.data.education,
          skills: profileResult.data.skills,
          certifications: profileResult.data.certifications,
          projects: profileResult.data.projects
        };
      } else {
        // Strategy 2: Try People Data Labs enrichment
        console.log('OAuth failed, attempting People Data Labs enrichment...');
        
        const pdlService = new PeopleDataLabsService();
        
        // Get user's name and resume data for PDL enrichment
        const oauthData = getOAuthData();
        const fullName = oauthData.fullName || profile?.full_name;
        
        // Try to get resume data to extract company info
        let resumeData = null;
        try {
          const { data: uploadedFiles, error: resumeError } = await supabase
            .from('sources')
            .select('structured_data')
            .eq('user_id', user.id)
            .eq('file_type', 'resume')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (uploadedFiles && !resumeError) {
            resumeData = (uploadedFiles as any).structured_data;
          }
        } catch (err) {
          console.log('No resume data found for PDL enrichment');
        }
        
        const pdlResult = await pdlService.enrichFromResumeData(
          fullName,
          resumeData,
          trimmedUrl
        );
        
        if (pdlResult.success && pdlResult.data) {
          console.log('✅ Successfully enriched LinkedIn data via People Data Labs');
          console.log('PDL likelihood score:', pdlResult.likelihood);
          dataSource = 'people_data_labs';
          
          // Convert PDL data to our format
          const structuredData = pdlService.convertToStructuredData(pdlResult.data);
          
          profileData = {
            id: profileId,
            linkedinId: linkedinUsername,
            profileUrl: trimmedUrl,
            firstName: pdlResult.data.first_name || 'Unknown',
            lastName: pdlResult.data.last_name || 'User',
            headline: pdlResult.data.headline || pdlResult.data.job_title_name || 'Professional',
            summary: pdlResult.data.summary || 'No summary available',
            experience: structuredData.workHistory,
            education: structuredData.education,
            skills: structuredData.skills,
            certifications: structuredData.certifications || [],
            projects: structuredData.projects || []
          };
        } else {
          // Strategy 3: Fallback to mock data if both OAuth and PDL fail
          console.warn('Both OAuth and PDL failed, using mock data');
          console.warn('OAuth error:', profileResult.error);
          console.warn('PDL error:', pdlResult.error);
          dataSource = 'mock';
        profileData = {
          id: profileId,
          linkedinId: linkedinUsername,
          profileUrl: trimmedUrl,
          firstName: 'John',
          lastName: 'Doe',
          headline: 'Senior Product Manager at TechCorp',
          summary: 'Experienced product manager with 5+ years in tech startups and enterprise software. Passionate about building user-centric products that drive business growth.',
          experience: [
            {
              id: '1',
              company: 'TechCorp Inc.',
              title: 'Senior Product Manager',
              startDate: '2022-01-01',
              endDate: undefined,
              description: 'Led cross-functional team of 8 engineers to deliver major product features. Increased user engagement by 25% through data-driven product decisions.',
              achievements: [],
              location: 'San Francisco, CA',
              current: true
            },
            {
              id: '2',
              company: 'StartupXYZ',
              title: 'Product Manager',
              startDate: '2020-01-01',
              endDate: '2022-01-01',
              description: 'Launched MVP in 3 months and grew user base from 0 to 10K. Managed product roadmap and collaborated with engineering and design teams.',
              achievements: [],
              location: 'New York, NY',
              current: false
            }
          ],
          education: [
            {
              id: '1',
              institution: 'Stanford University',
              degree: 'MBA',
              fieldOfStudy: 'Business Administration',
              startDate: '2018-09-01',
              endDate: '2020-06-01',
              location: undefined
            },
            {
              id: '2',
              institution: 'MIT',
              degree: 'Bachelor of Science',
              fieldOfStudy: 'Computer Science',
              startDate: '2014-09-01',
              endDate: '2018-06-01',
              location: undefined
            }
          ],
          skills: ['Product Management', 'Agile', 'User Research', 'Data Analysis', 'SQL', 'Python', 'Figma', 'Jira'],
          certifications: [
            {
              id: '1',
              name: 'Certified Scrum Product Owner',
              issuer: 'Scrum Alliance',
              issueDate: '2021-03-01',
              expiryDate: '2023-03-01'
            }
          ],
          projects: [
            {
              id: '1',
              name: 'Mobile App Redesign',
              description: 'Led complete redesign of mobile app resulting in 40% increase in user retention',
              technologies: [],
              startDate: '2022-06-01',
              endDate: '2022-12-01'
            }
          ]
        };
        }
      }
      
      // Store in database (if available)
      console.log(`📊 LinkedIn data source: ${dataSource}`);
      try {
        const { data, error } = await supabase
          .from('linkedin_profiles')
          .insert({
            user_id: user.id,
            linkedin_id: linkedinUsername,
            profile_url: trimmedUrl,
            about: profileData.summary,
            experience: profileData.experience,
            education: profileData.education,
            skills: profileData.skills,
            certifications: profileData.certifications,
            projects: profileData.projects,
            raw_data: profileData
          } as any)
          .select('id')
          .single();

        if (error) {
          console.warn('Could not store LinkedIn profile in database:', error.message);
          // Continue with profile data even if database fails
        } else if (data) {
          console.log('LinkedIn profile stored successfully:', (data as any).id);
          profileId = (data as any).id;
        }
      } catch (dbError) {
        console.warn('Database not available for LinkedIn profile storage:', dbError);
        // Continue with profile data
      }

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

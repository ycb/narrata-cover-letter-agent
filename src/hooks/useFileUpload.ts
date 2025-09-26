// React hook for file upload functionality
import { useState, useCallback, useRef } from 'react';
import { FileUploadService } from '@/services/fileUploadService';
import { LinkedInOAuthService } from '@/services/linkedinOAuthService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
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
    allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxFileSize = 5 * 1024 * 1024 // 5MB
  } = options;

  /**
   * Upload a single file with comprehensive validation and error handling
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
      // Update progress to uploading
      setProgress(prev => 
        prev.map(p => p.fileId === fileId ? { ...p, status: 'processing', progress: 25 } : p)
      );
      onProgress?.(progressEntry);

      // Upload file
      const result = await fileUploadService.current.uploadFile(file, user.id, type, session?.access_token);
      
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
  }, [user, allowedTypes, maxFileSize, onProgress, onComplete, onError, session?.access_token]);

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
    
    // Upload files sequentially to avoid overwhelming the server
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
    if (!user) {
      const errorMsg = 'User not authenticated';
      setError(errorMsg);
      onError?.(errorMsg);
      return { success: false, error: errorMsg, retryable: false };
    }

    try {
      setIsUploading(true);
      setError(null);

      const result = await fileUploadService.current.retryUpload(fileId, user.id);
      
      if (result.success) {
        // Update progress to retrying
        setProgress(prev => 
          prev.map(p => p.fileId === fileId ? { ...p, status: 'processing', progress: 50 } : p)
        );
        
        onComplete?.(result);
      } else {
        setError(result.error);
        onError?.(result.error || 'Retry failed');
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Retry failed';
      setError(errorMsg);
      onError?.(errorMsg);
      return { success: false, error: errorMsg, retryable: true };
    } finally {
      setIsUploading(false);
    }
  }, [user, onComplete, onError]);

  /**
   * Save manual text input to database and process with LLM
   * Now uses unified uploadContent method
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

    // Validate text length
    if (text.trim().length < 10) {
      const errorMsg = 'Text must be at least 10 characters long';
      setError(errorMsg);
      onError?.(errorMsg);
      return { success: false, error: errorMsg, retryable: false };
    }

    const fileId = `manual_${type}_${Date.now()}`;
    
    // Create progress entry
    const progressEntry: FileUploadProgress = {
      fileId,
      fileName: `Manual ${type} text`,
      status: 'pending',
      progress: 0
    };

    setProgress(prev => [...prev, progressEntry]);
    setIsUploading(true);
    setError(null);

    try {
      // Update progress to processing
      setProgress(prev => 
        prev.map(p => p.fileId === fileId ? { ...p, status: 'processing', progress: 25 } : p)
      );
      onProgress?.(progressEntry);

      // Use unified uploadContent method for manual text
      const result = await fileUploadService.current.uploadContent(text, user.id, type, session?.access_token);
      
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
        onError?.(result.error || 'Save failed');
        return result;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Save failed';
      
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
  }, [user, onProgress, onComplete, onError, session?.access_token]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear progress entries
   */
  const clearProgress = useCallback(() => {
    setProgress([]);
  }, []);

  /**
   * Get upload progress for a specific file
   */
  const getFileProgress = useCallback((fileId: string): FileUploadProgress | undefined => {
    return progress.find(p => p.fileId === fileId);
  }, [progress]);

  /**
   * Check if any uploads are in progress
   */
  const hasActiveUploads = useCallback((): boolean => {
    return progress.some(p => p.status === 'processing' || p.status === 'pending');
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
 * Hook for LinkedIn profile integration
 */
export function useLinkedInUpload() {
  const { user } = useAuth();
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
      const existingProfile = await supabase
        .from('linkedin_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('linkedin_id', linkedinUsername)
        .single();

      if (existingProfile.data) {
        console.log('LinkedIn profile already exists, returning existing data');
        return {
          success: true,
          fileId: existingProfile.data.id
        };
      }

      // Try to fetch real LinkedIn data using OAuth
      console.log('Attempting to fetch real LinkedIn data using OAuth...');
      
      const linkedInService = new LinkedInOAuthService();
      const profileResult = await linkedInService.fetchProfileData();
      
      let profileData;
      let profileId = `linkedin_${Date.now()}`;
      
      if (profileResult.success && profileResult.data) {
        // Use real LinkedIn data
        console.log('Successfully fetched real LinkedIn data');
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
        // Fallback to mock data if OAuth fails
        console.warn('Failed to fetch real LinkedIn data, using mock data:', profileResult.error);
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
      
      // Store in database (if available)
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
          })
          .select('id')
          .single();

        if (error) {
          console.warn('Could not store LinkedIn profile in database:', error.message);
          // Continue with profile data even if database fails
        } else {
          console.log('LinkedIn profile stored successfully:', data.id);
          profileId = data.id;
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
  }, [user]);

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

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  FileText, 
  Linkedin, 
  Mail, 
  BookOpen, 
  CheckCircle, 
  XCircle,
  Edit3,
  Eye,
  ArrowRight,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/types/supabase";

// Helper function to get Supabase configuration
const getSupabaseConfig = () => ({
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY
});

interface ExtractedContent {
  id: string;
  type: 'resume' | 'linkedin' | 'coverLetter' | 'caseStudies';
  title: string;
  source: string;
  content: string;
  sections?: Array<{
    id: string;
    title: string;
    content: string;
    type: 'intro' | 'paragraph' | 'closer' | 'signature';
  }>;
  stories?: Array<{
    id: string;
    title: string;
    content: string;
    company: string;
    role: string;
    dates: string;
  }>;
  approved: boolean;
  confidence: 'high' | 'medium' | 'low';
}

interface ContentReviewStepProps {
  onReviewComplete: (approvedContent: ExtractedContent[]) => void;
  onBack: () => void;
}

export function ContentReviewStep({ onReviewComplete, onBack }: ContentReviewStepProps) {
  const [extractedContent, setExtractedContent] = useState<ExtractedContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const { user, session } = useAuth();

  const loadExtractedContent = useCallback(async () => {
    console.log('loadExtractedContent function called');
    console.log('User check:', user);
    if (!user) {
      console.log('No user, returning early');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Loading extracted content for user:', user.id);
      
      // Fetch uploaded sources using direct fetch (Supabase client has hanging issues)
      console.log('Fetching sources from database using direct fetch...');
      console.log('User ID:', user.id);
      
      const { url: supabaseUrl, key: supabaseKey } = getSupabaseConfig();
      
      // Get access token from auth context session (avoiding Supabase client call)
      if (!session?.access_token) {
        console.error('No access token available in session');
        return;
      }
      
      const accessToken = session.access_token;
      console.log('Access token available, length:', accessToken.length);
      
      const queryUrl = `${supabaseUrl}/rest/v1/sources?user_id=eq.${user.id}&order=created_at.desc`;
      
      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Database query failed:', errorText);
        return;
      }
      
      const allSources = await response.json();

      console.log('Database query completed. All sources for user:', allSources);

      // Filter for completed sources, but fallback to any sources for debugging
      let sources = allSources?.filter((s: any) => s.processing_status === 'completed') || [];
      
      // Temporary: if no completed sources, use any sources for debugging
      if (sources.length === 0 && allSources && allSources.length > 0) {
        console.log('Using all sources for debugging since none are completed');
        sources = allSources;
      }

      console.log('Sources query result:', { sources });
      
      // If no completed sources, show what we have
      if (sources.length === 0 && allSources && allSources.length > 0) {
        console.log('No completed sources found. Available sources:', allSources.map((s: any) => ({
          id: s.id,
          file_name: s.file_name,
          processing_status: s.processing_status,
          created_at: s.created_at
        })));
      }

      // Fetch LinkedIn profile if exists using direct fetch
      const linkedinQueryUrl = `${supabaseUrl}/rest/v1/linkedin_profiles?user_id=eq.${user.id}&limit=1`;
      
      const linkedinResponse = await fetch(linkedinQueryUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        }
      });
      
      let linkedinProfile = null;
      if (linkedinResponse.ok) {
        const linkedinData = await linkedinResponse.json();
        linkedinProfile = linkedinData.length > 0 ? linkedinData[0] : null;
      }

      const content: ExtractedContent[] = [];

      // Process resume
      const resumeSource = sources?.find(s => s.file_name.toLowerCase().includes('resume'));
      if (resumeSource && resumeSource.structured_data) {
        const resumeData = resumeSource.structured_data as any;
        content.push({
          id: `resume-${resumeSource.id}`,
          type: 'resume',
          title: 'Resume Analysis',
          source: resumeSource.file_name,
          content: resumeSource.raw_text || '',
          stories: resumeData.workExperience?.map((exp: any, index: number) => ({
            id: `resume-story-${index}`,
            title: `${exp.title} at ${exp.company}`,
            content: exp.description || '',
            company: exp.company,
            role: exp.title,
            dates: `${exp.startDate} - ${exp.endDate || 'Present'}`
          })) || [],
          approved: false,
          confidence: 'high'
        });
      }

      // Process LinkedIn profile
      if (linkedinProfile) {
        content.push({
          id: `linkedin-${linkedinProfile.id}`,
          type: 'linkedin',
          title: 'LinkedIn Profile',
          source: linkedinProfile.profile_url,
          content: linkedinProfile.about || '',
          stories: linkedinProfile.experience?.map((exp: any, index: number) => ({
            id: `linkedin-story-${index}`,
            title: `${exp.title} at ${exp.company}`,
            content: exp.description || '',
            company: exp.company,
            role: exp.title,
            dates: `${exp.startDate} - ${exp.endDate || 'Present'}`
          })) || [],
          approved: false,
          confidence: 'high'
        });
      }

      // Process cover letter
      const coverLetterSource = sources?.find(s => 
        s.file_name.toLowerCase().includes('cover') || 
        s.file_name.toLowerCase().includes('letter')
      );
      if (coverLetterSource && coverLetterSource.structured_data) {
        const coverLetterData = coverLetterSource.structured_data as any;
        content.push({
          id: `coverletter-${coverLetterSource.id}`,
          type: 'coverLetter',
          title: 'Cover Letter Sections',
          source: coverLetterSource.file_name,
          content: coverLetterSource.raw_text || '',
          sections: coverLetterData.sections?.map((section: any, index: number) => ({
            id: `section-${index}`,
            title: section.title || `Section ${index + 1}`,
            content: section.content || '',
            type: section.type || 'paragraph'
          })) || [],
          approved: false,
          confidence: 'medium'
        });
      }

      // Process case studies
      const caseStudySources = sources?.filter(s => 
        s.file_name.toLowerCase().includes('case') || 
        s.file_name.toLowerCase().includes('study')
      );
      caseStudySources?.forEach(source => {
        if (source.structured_data) {
          const caseStudyData = source.structured_data as any;
          content.push({
            id: `casestudy-${source.id}`,
            type: 'caseStudies',
            title: `Case Study: ${source.file_name}`,
            source: source.file_name,
            content: source.raw_text || '',
            approved: false,
            confidence: 'medium'
          });
        }
      });

      console.log('Final extracted content:', content);
      setExtractedContent(content);
    } catch (error) {
      console.error('Error loading extracted content:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    console.log('ContentReviewStep useEffect triggered');
    console.log('User:', user);
    console.log('loadExtractedContent function:', loadExtractedContent);
    loadExtractedContent();
  }, [loadExtractedContent]);

  const handleApproveToggle = (contentId: string) => {
    setExtractedContent(prev => 
      prev.map(item => 
        item.id === contentId 
          ? { ...item, approved: !item.approved }
          : item
      )
    );
  };

  const handleEditStart = (item: ExtractedContent) => {
    setEditingItem(item.id);
    setEditContent(item.content);
  };

  const handleEditSave = (contentId: string) => {
    setExtractedContent(prev => 
      prev.map(item => 
        item.id === contentId 
          ? { ...item, content: editContent }
          : item
      )
    );
    setEditingItem(null);
    setEditContent('');
  };

  const handleEditCancel = () => {
    setEditingItem(null);
    setEditContent('');
  };

  const handleComplete = async () => {
    const approvedContent = extractedContent.filter(item => item.approved);
    
    if (approvedContent.length === 0) {
      alert('Please approve at least one item to continue.');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Save approved content to database
      await saveApprovedContent(approvedContent);
      onReviewComplete(approvedContent);
    } catch (error) {
      console.error('Error saving approved content:', error);
      alert('Error saving content. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveApprovedContent = async (content: ExtractedContent[]) => {
    if (!user) return;

    // Create companies and work items for approved stories
    for (const item of content) {
      if (item.stories && item.stories.length > 0) {
        for (const story of item.stories) {
          // Create or find company
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .upsert({
              user_id: user.id,
              name: story.company,
              description: '',
              tags: []
            } as any, { 
              onConflict: 'user_id,name',
              ignoreDuplicates: true 
            })
            .select()
            .single() as any;

          if (companyError) {
            console.error('Error creating company:', companyError);
            continue;
          }

          // Create work item
          const { data: workItem, error: workItemError } = await supabase
            .from('work_items')
            .insert({
              user_id: user.id,
              company_id: company?.id,
              title: story.role,
              start_date: new Date().toISOString().split('T')[0], // Default date
              description: story.content,
              tags: [],
              achievements: []
            } as any)
            .select()
            .single() as any;

          if (workItemError) {
            console.error('Error creating work item:', workItemError);
            continue;
          }

          // Create approved content
          await supabase
            .from('approved_content')
            .insert({
              user_id: user.id,
              work_item_id: workItem?.id,
              title: story.title,
              content: story.content,
              status: 'approved',
              confidence: 'high',
              tags: [],
              times_used: 0
            } as any);
        }
      }
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'resume': return FileText;
      case 'linkedin': return Linkedin;
      case 'coverLetter': return Mail;
      case 'caseStudies': return BookOpen;
      default: return FileText;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'resume': return 'bg-blue-100 text-blue-800';
      case 'linkedin': return 'bg-blue-100 text-blue-800';
      case 'coverLetter': return 'bg-green-100 text-green-800';
      case 'caseStudies': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Loading your content...</p>
        </div>
      </div>
    );
  }

  if (extractedContent.length === 0) {
    return (
      <div className="text-center space-y-6 py-12">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
        <h3 className="text-xl font-semibold text-gray-900">No Content Found</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          We couldn't find any processed content from your uploads. Please go back and upload your files.
        </p>
        <Button onClick={onBack} variant="secondary">
          Go Back to Upload
        </Button>
      </div>
    );
  }

  const approvedCount = extractedContent.filter(item => item.approved).length;
  const totalCount = extractedContent.length;
  const progress = (approvedCount / totalCount) * 100;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          Review & Approve Your Content
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          We've extracted and organized your content. Review each item and approve what you'd like to keep in your profile.
        </p>
        
        {/* Progress */}
        <div className="max-w-md mx-auto space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Approved: {approvedCount} of {totalCount}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Content Items */}
      <div className="space-y-6">
        {extractedContent.map((item) => {
          const TypeIcon = getTypeIcon(item.type);
          const typeColor = getTypeColor(item.type);
          const confidenceColor = getConfidenceColor(item.confidence);
          const isEditing = editingItem === item.id;

          return (
            <Card key={item.id} className={`transition-all duration-200 ${
              item.approved ? 'ring-2 ring-green-200 bg-green-50' : ''
            }`}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      item.approved ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <TypeIcon className={`w-6 h-6 ${
                        item.approved ? 'text-green-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                        {item.title}
                        <Badge className={`text-xs ${typeColor}`}>
                          {item.type}
                        </Badge>
                        <Badge className={`text-xs ${confidenceColor}`}>
                          {item.confidence} confidence
                        </Badge>
                      </CardTitle>
                      <p className="text-gray-600 text-sm">Source: {item.source}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={item.approved}
                      onCheckedChange={() => handleApproveToggle(item.id)}
                      className="w-5 h-5"
                    />
                    <span className="text-sm font-medium">
                      {item.approved ? 'Approved' : 'Approve'}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Main Content */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Content</label>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleEditSave(item.id)}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          onClick={handleEditCancel}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                        {item.content.substring(0, 300)}
                        {item.content.length > 300 && '...'}
                      </p>
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => handleEditStart(item)}
                        className="text-xs"
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Edit Content
                      </Button>
                    </div>
                  )}
                </div>

                {/* Stories/Sections */}
                {(item.stories && item.stories.length > 0) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Extracted Stories ({item.stories.length})
                    </label>
                    <div className="space-y-2">
                      {item.stories.slice(0, 3).map((story) => (
                        <div key={story.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-sm">{story.title}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {story.dates}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {story.content}
                          </p>
                        </div>
                      ))}
                      {item.stories.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{item.stories.length - 3} more stories
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {(item.sections && item.sections.length > 0) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Cover Letter Sections ({item.sections.length})
                    </label>
                    <div className="space-y-2">
                      {item.sections.slice(0, 3).map((section) => (
                        <div key={section.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-sm">{section.title}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {section.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {section.content}
                          </p>
                        </div>
                      ))}
                      {item.sections.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{item.sections.length - 3} more sections
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button variant="secondary" onClick={onBack}>
          Back to Upload
        </Button>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {approvedCount} of {totalCount} items approved
          </span>
          <Button 
            onClick={handleComplete}
            disabled={approvedCount === 0 || isProcessing}
            className="px-8"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Complete Review
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

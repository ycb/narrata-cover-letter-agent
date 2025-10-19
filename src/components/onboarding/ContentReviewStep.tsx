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
  Loader2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
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
    location?: string;
    achievements?: string[];
    startDate?: string;
    endDate?: string;
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
  const [collapsedContent, setCollapsedContent] = useState<Set<string>>(new Set());
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
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 LINKEDIN PROFILE FROM DATABASE:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Full LinkedIn profile:', linkedinProfile);
        if (linkedinProfile?.experience) {
          console.log('\n💼 EXPERIENCE ARRAY:');
          console.log('Count:', linkedinProfile.experience.length);
          console.log('Full experience data:', JSON.stringify(linkedinProfile.experience, null, 2));
          linkedinProfile.experience.forEach((exp: any, idx: number) => {
            console.log(`\nExperience ${idx}:`, {
              company: exp.company,
              title: exp.title,
              startDate: exp.startDate,
              endDate: exp.endDate,
              location: exp.location,
              description: exp.description,
              achievements: exp.achievements
            });
          });
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }

      const content: ExtractedContent[] = [];

      // Process resume
      const resumeSource = sources?.find(s => s.file_name.toLowerCase().includes('resume'));
      if (resumeSource && resumeSource.structured_data) {
        const resumeData = resumeSource.structured_data as any;
        console.log('📄 Processing Resume:', resumeSource.file_name);
        console.log('Resume structured data keys:', Object.keys(resumeData));
        console.log('Work history field:', resumeData.workHistory ? 'workHistory' : resumeData.workExperience ? 'workExperience' : 'not found');
        
        // Handle both field names (workHistory from LLM, workExperience from old data)
        const workHistory = resumeData.workHistory || resumeData.workExperience || [];
        
        // Calculate confidence based on data quality
        let resumeConfidence: 'high' | 'medium' | 'low' = 'high';
        if (workHistory.length === 0) resumeConfidence = 'low';
        else if (workHistory.length < 2) resumeConfidence = 'medium';
        else if (!resumeData.skills || resumeData.skills.length < 5) resumeConfidence = 'medium';
        
        content.push({
          id: `resume-${resumeSource.id}`,
          type: 'resume',
          title: 'Resume Analysis',
          source: resumeSource.file_name,
          content: resumeSource.raw_text || '',
          stories: workHistory.map((exp: any, index: number) => ({
            id: exp.id || `resume-story-${index}`,
            title: `${exp.position} at ${exp.company}`,
            content: exp.description || '',
            company: exp.company,
            role: exp.position,
            dates: `${exp.startDate} - ${exp.endDate || 'Present'}`,
            location: exp.location,
            achievements: exp.achievements || [],
            startDate: exp.startDate,
            endDate: exp.endDate
          })),
          approved: false,
          confidence: resumeConfidence
        });
      }

      // Process LinkedIn profile
      if (linkedinProfile) {
        console.log('🌐 Processing LinkedIn Profile from database');
        
        const experiences = Array.isArray(linkedinProfile.experience) 
          ? linkedinProfile.experience 
          : [];
        
        console.log('LinkedIn experiences count:', experiences.length);
        
        // Calculate confidence based on data quality
        let linkedinConfidence: 'high' | 'medium' | 'low' = 'high';
        if (experiences.length === 0) linkedinConfidence = 'low';
        else if (experiences.length < 2) linkedinConfidence = 'medium';
        else if (!linkedinProfile.skills || linkedinProfile.skills.length < 5) linkedinConfidence = 'medium';
        
        // Format PDL structured data for nice display
        const rawData = linkedinProfile.raw_data || {};
        const formattedContent = `
          ${linkedinProfile.about}

         ${linkedinProfile.about ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` : ''}

          📊 PROFILE METRICS
          Work Experience: ${experiences.length} positions
          Education: ${linkedinProfile.education?.length || 0} institutions
          Skills: ${linkedinProfile.skills?.length || 0} total


          🏢 CURRENT POSITION
          ${rawData.job_title || 'Not specified'} at ${rawData.job_company_name || 'Not specified'}
          ${rawData.job_company_industry ? `Industry: ${rawData.job_company_industry}` : ''}
          ${rawData.job_start_date ? `Since: ${rawData.job_start_date}` : ''}

          💼 WORK EXPERIENCE
          ${experiences.map((exp: any, idx: number) => {
            const company = exp.company || 'Unknown Company';
            const title = exp.title || 'Unknown Role';
            const dates = `${exp.startDate || exp.start_date || 'N/A'} - ${exp.endDate || exp.end_date || 'Present'}`;
            const location = exp.location || '';
            return `${idx + 1}. ${title} at ${company}
            ${dates}${location ? ` | ${location}` : ''}`;
          }).join('\n') || 'No work experience data'}

          🎓 EDUCATION
          ${linkedinProfile.education?.map((edu: any, idx: number) => 
            `${idx + 1}. ${edu.degree || 'Degree'} - ${edu.institution || 'Unknown Institution'}${edu.fieldOfStudy ? ` (${edu.fieldOfStudy})` : ''}${edu.endDate ? ` - ${edu.endDate}` : ''}`
          ).join('\n') || 'No education data'}

          🛠️ SKILLS
          ${linkedinProfile.skills?.slice(0, 15).join(' • ') || 'No skills data'}
          ${linkedinProfile.skills?.length > 15 ? `\n...and ${linkedinProfile.skills.length - 15} more` : ''}
          `.trim();

        content.push({
          id: `linkedin-${linkedinProfile.id}`,
          type: 'linkedin',
          title: 'LinkedIn Profile',
          source: linkedinProfile.profile_url,
          content: formattedContent,
          stories: experiences.map((exp: any, index: number) => ({
            id: exp.id || `linkedin-story-${index}`,
            title: `${exp.title || 'Unknown Role'} at ${exp.company || 'Unknown Company'}`,
            content: exp.description || '',
            company: exp.company || '',
            role: exp.title || '',
            dates: `${exp.startDate || exp.start_date || ''} - ${exp.endDate || exp.end_date || 'Present'}`,
            location: exp.location || '',
            achievements: Array.isArray(exp.achievements) ? exp.achievements : [],
            startDate: exp.startDate || exp.start_date,
            endDate: exp.endDate || exp.end_date
          })),
          approved: false,
          confidence: linkedinConfidence
        });
      }

      // Process cover letter
      const coverLetterSource = sources?.find(s => 
        s.file_name.toLowerCase().includes('cover') || 
        s.file_name.toLowerCase().includes('letter')
      );
      if (coverLetterSource && coverLetterSource.structured_data) {
        const coverLetterData = coverLetterSource.structured_data as any;
        
        // Calculate confidence based on extracted data quality
        const sections = coverLetterData.sections || [];
        let coverLetterConfidence: 'high' | 'medium' | 'low' = 'medium';
        if (sections.length >= 3) coverLetterConfidence = 'high';
        else if (sections.length === 0) coverLetterConfidence = 'low';
        
        content.push({
          id: `coverletter-${coverLetterSource.id}`,
          type: 'coverLetter',
          title: 'Cover Letter Sections',
          source: coverLetterSource.file_name,
          content: coverLetterSource.raw_text || '',
          sections: sections.map((section: any, index: number) => ({
            id: `section-${index}`,
            title: section.title || `Section ${index + 1}`,
            content: section.content || '',
            type: section.type || 'paragraph'
          })),
          approved: false,
          confidence: coverLetterConfidence
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

  const handleEditSave = async (contentId: string) => {
    // Update local state and reprocess to update extracted items
    console.log('💾 Saving edited content and reprocessing...');
    
    try {
      const item = extractedContent.find(i => i.id === contentId);
      if (!item) return;

      // Update the content in local state
      setExtractedContent(prev => 
        prev.map(item => 
          item.id === contentId 
            ? { ...item, content: editContent }
            : item
        )
      );

      // TODO: Optionally re-run LLM analysis on edited content to update extracted items
      // For now, just update the content - extracted items remain as originally analyzed
      // This prevents unnecessary API calls and keeps the review process fast
      
      setEditingItem(null);
      setEditContent('');
      
      console.log('✅ Content updated in review state (will save on Complete Review)');
    } catch (error) {
      console.error('Error updating content:', error);
    }
  };

  const handleEditCancel = () => {
    setEditingItem(null);
    setEditContent('');
  };

  const toggleContentCollapse = (contentId: string) => {
    setCollapsedContent(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contentId)) {
        newSet.delete(contentId);
      } else {
        newSet.add(contentId);
      }
      return newSet;
    });
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
    if (!user) {
      console.error('❌ No user found, cannot save approved content');
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 SAVING APPROVED CONTENT TO DATABASE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('User ID:', user.id);
    console.log('Approved items count:', content.length);
    console.log('Approved items:', content);

    let companiesCreated = 0;
    let workItemsCreated = 0;
    let storiesCreated = 0;

    // Create companies and work items for approved stories
    for (const item of content) {
      console.log(`\n📦 Processing item: ${item.title} (type: ${item.type})`);
      console.log('Has stories:', item.stories?.length || 0);
      
      if (item.stories && item.stories.length > 0) {
        for (const story of item.stories) {
          console.log(`\n  📝 Processing story: ${story.title}`);
          console.log('  Story data:', {
            company: story.company,
            role: story.role,
            startDate: story.startDate,
            endDate: story.endDate,
            location: story.location,
            achievements: story.achievements
          });

          // First, check if company already exists
          const { data: existingCompany } = await supabase
            .from('companies')
            .select('*')
            .eq('user_id', user.id)
            .eq('name', story.company)
            .maybeSingle();

          let company = existingCompany;

          if (!company) {
            // Create new company
            console.log('  ➕ Creating new company:', story.company);
            const { data: newCompany, error: companyError } = await supabase
              .from('companies')
              .insert({
                user_id: user.id,
                name: story.company,
                description: '',
                tags: []
              })
              .select()
              .single();

            if (companyError) {
              console.error('  ❌ Error creating company:', companyError);
              continue;
            }

            company = newCompany;
            companiesCreated++;
            console.log('  ✅ Company created:', company.id);
          } else {
            console.log('  ✓ Using existing company:', company.id);
          }

          if (!company) {
            console.error('  ❌ Company is null, cannot create work item');
            continue;
          }

          // Create work item with actual dates from story
          console.log('  ➕ Creating work item...');
          const { data: workItem, error: workItemError } = await supabase
            .from('work_items')
            .insert({
              user_id: user.id,
              company_id: company.id,
              title: story.role,
              start_date: story.startDate || new Date().toISOString().split('T')[0],
              end_date: story.endDate || null,
              description: story.content,
              tags: [],
              achievements: story.achievements || []
            })
            .select()
            .single();

          if (workItemError || !workItem) {
            console.error('  ❌ Error creating work item:', workItemError);
            continue;
          }

          workItemsCreated++;
          console.log('  ✅ Work item created:', workItem.id);

          // Create approved content (story/blurb)
          console.log('  ➕ Creating approved content...');
          const { data: approvedContent, error: contentError } = await supabase
            .from('approved_content')
            .insert({
              user_id: user.id,
              work_item_id: workItem.id,
              title: story.title,
              content: story.content,
              status: 'approved',
              confidence: item.confidence, // Use confidence from the approved item
              tags: story.achievements?.slice(0, 3) || [], // Use first 3 achievements as tags
              times_used: 0
            })
            .select()
            .single();

          if (contentError || !approvedContent) {
            console.error('  ❌ Error creating approved content:', contentError);
            console.error('  Error details:', contentError);
            continue;
          }

          storiesCreated++;
          console.log('  ✅ Approved content created:', approvedContent.id);
        }
      } else {
        console.log('  ⚠️ No stories found for this item, skipping...');
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SAVE COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Companies created:', companiesCreated);
    console.log('Work items created:', workItemsCreated);
    console.log('Stories created:', storiesCreated);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
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
      <LoadingState
        isLoading={true}
        loadingText="Loading your content..."
      />
    );
  }

  if (extractedContent.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No Content Found"
        description="We couldn't find any processed content from your uploads. Please go back and upload your files."
        action={{
          label: "Go Back to Upload",
          onClick: onBack
        }}
      />
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
                          <Badge className={`text-xs ${confidenceColor} capitalize`}>
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
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">Content</label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleContentCollapse(item.id)}
                      className="h-6 px-2"
                    >
                      {collapsedContent.has(item.id) ? (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          Expand
                        </>
                      ) : (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Collapse
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {!collapsedContent.has(item.id) && (
                    <>
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[200px] max-h-[600px] resize-y"
                            style={{
                              height: 'auto',
                              minHeight: '200px'
                            }}
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
                          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">
                            {item.content}
                          </div>
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
                    </>
                  )}
                </div>

                {/* Stories/Sections */}
                {(item.stories && item.stories.length > 0) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Extracted Work Experience ({item.stories.length})
                    </label>
                    <div className="space-y-3">
                      {item.stories.map((story) => (
                        <div key={story.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm text-gray-900">{story.role}</h4>
                              <p className="text-sm text-gray-700">{story.company}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {story.dates}
                            </Badge>
                          </div>
                          
                          {story.location && (
                            <p className="text-xs text-gray-600">
                              📍 {story.location}
                            </p>
                          )}
                          
                          {story.content && (
                            <p className="text-xs text-gray-700 leading-relaxed">
                              {story.content}
                            </p>
                          )}
                          
                          {story.achievements && story.achievements.length > 0 && (
                            <div className="space-y-1 mt-2">
                              <p className="text-xs font-medium text-gray-700">Key Achievements:</p>
                              <ul className="space-y-1">
                                {story.achievements.map((achievement, idx) => (
                                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                                    <span className="text-green-600 mt-0.5">•</span>
                                    <span className="flex-1">{achievement}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
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

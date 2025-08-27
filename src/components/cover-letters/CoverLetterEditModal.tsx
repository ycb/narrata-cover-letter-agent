import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Save, 
  X, 
  FileText, 
  Building2,
  User,
  Calendar,
  Star,
  CheckCircle,
  TrendingUp,
  Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CoverLetterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  coverLetter: any;
}

export function CoverLetterEditModal({ isOpen, onClose, coverLetter }: CoverLetterEditModalProps) {
  const [editedContent, setEditedContent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("cover-letter");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Initialize edited content when cover letter changes
  useEffect(() => {
    if (coverLetter) {
      setEditedContent({
        ...coverLetter,
        content: {
          ...coverLetter.content,
          sections: coverLetter.content?.sections?.map((section: any) => ({ ...section })) || []
        }
      });
    }
  }, [coverLetter]);

  if (!coverLetter || !editedContent) return null;

  const handleSectionChange = (sectionId: string, newContent: string) => {
    setEditedContent({
      ...editedContent,
      content: {
        ...editedContent.content,
        sections: editedContent.content.sections.map((section: any) =>
          section.id === sectionId ? { ...section, content: newContent } : section
        )
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement save functionality
      console.log("Saving edited cover letter:", editedContent);
      
      toast({
        title: "Cover letter saved",
        description: "Your changes have been saved successfully.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save cover letter changes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "strong":
        return "bg-success text-success-foreground";
      case "average":
        return "bg-warning text-warning-foreground";
      case "weak":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSectionTitle = (type: string) => {
    switch (type) {
      case 'intro':
        return 'Introduction';
      case 'experience':
        return 'Experience';
      case 'closing':
        return 'Closing';
      case 'signature':
        return 'Signature';
      default:
        return type;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
                <X className="h-4 w-4" />
              </Button>
              <div>
                <DialogTitle className="text-2xl font-bold">
                  Edit Cover Letter
                </DialogTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {coverLetter.company}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {coverLetter.position}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(coverLetter.createdAt)}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                <Star className="h-3 w-3 mr-1" /> ATS Optimized
              </Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                <CheckCircle className="h-3 w-3 mr-1" /> AI Enhanced
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cover-letter" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Cover Letter
            </TabsTrigger>
            <TabsTrigger value="job-description" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Job Description
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cover-letter" className="space-y-6 mt-6">
            {/* Success Metrics */}
            <Card className="bg-gradient-to-r from-success/5 to-primary/5 border-success/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-success">Success Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-xs text-muted-foreground mb-2">MATCH WITH GOALS</div>
                    <Badge variant="outline" className={getRatingColor(coverLetter.metrics?.goalsMatch)}>
                      {coverLetter.metrics?.goalsMatch}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-xs text-muted-foreground mb-2">EXPERIENCE MATCH</div>
                    <Badge variant="outline" className={getRatingColor(coverLetter.metrics?.experienceMatch)}>
                      {coverLetter.metrics?.experienceMatch}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-xs text-muted-foreground mb-2">COVER LETTER RATING</div>
                    <Badge variant="outline" className={getRatingColor(coverLetter.metrics?.coverLetterRating)}>
                      {coverLetter.metrics?.coverLetterRating}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-xs text-muted-foreground mb-2">ATS SCORE</div>
                    <div className="text-lg font-bold text-primary">{coverLetter.atsScore}%</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-xs text-muted-foreground mb-2">CORE REQUIREMENTS</div>
                    <div className="text-lg font-bold text-success">
                      {coverLetter.metrics?.coreRequirementsMet?.met}/{coverLetter.metrics?.coreRequirementsMet?.total}
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-xs text-muted-foreground mb-2">PREFERRED REQUIREMENTS</div>
                    <div className="text-lg font-bold text-primary">
                      {coverLetter.metrics?.preferredRequirementsMet?.met}/{coverLetter.metrics?.preferredRequirementsMet?.total}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cover Letter Sections */}
            <div className="space-y-6">
              {editedContent.content?.sections?.map((section: any) => (
                <Card key={section.id} className="shadow-soft">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getSectionTitle(section.type)}
                      {section.isEnhanced && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          <CheckCircle className="h-3 w-3 mr-1" /> AI Enhanced
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={section.content}
                      onChange={(e) => handleSectionChange(section.id, e.target.value)}
                      className="min-h-[120px] resize-none"
                      placeholder={`Enter your ${getSectionTitle(section.type).toLowerCase()}...`}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button variant="link" className="flex-1 text-muted-foreground hover:text-foreground">
                Save Draft
              </Button>
              <Button 
                className="flex-1 flex items-center gap-2" 
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="job-description" className="mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Job Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/20 rounded-lg p-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Position</h4>
                      <p className="text-muted-foreground">{coverLetter.position}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Company</h4>
                      <p className="text-muted-foreground">{coverLetter.company}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Job Description</h4>
                      <p className="text-muted-foreground">
                        Senior Product Manager position requiring 5+ years of experience in product management, 
                        strong analytical skills, and experience with cross-functional team leadership. 
                        The role involves driving product strategy, analyzing user behavior, and optimizing 
                        conversion funnels. Experience with SQL/Python, Tableau/Looker, and fintech is preferred.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

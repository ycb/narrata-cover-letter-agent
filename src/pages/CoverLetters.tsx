import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Plus, Search, Calendar, Target, Edit, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import CoverLetterCreateModal from "@/components/cover-letters/CoverLetterCreateModal";

// Mock data for demonstration
const mockCoverLetters = [
  {
    id: "1",
    templateId: "template-1",
    jobDescription: {
      company: "TechCorp",
      role: "Senior Software Engineer",
      createdAt: "2024-01-15"
    },
    llmFeedback: {
      goNoGo: "go" as const,
      score: 85
    },
    status: "finalized" as const,
    createdAt: "2024-01-15",
    updatedAt: "2024-01-15"
  },
  {
    id: "2", 
    templateId: "template-1",
    jobDescription: {
      company: "InnovateLab",
      role: "Product Manager",
      createdAt: "2024-01-12"
    },
    llmFeedback: {
      goNoGo: "needs-work" as const,
      score: 72
    },
    status: "draft" as const,
    createdAt: "2024-01-12",
    updatedAt: "2024-01-14"
  }
];

const CoverLetters = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'finalized': return 'bg-success text-success-foreground';
      case 'reviewed': return 'bg-warning text-warning-foreground';
      case 'draft': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const filteredLetters = mockCoverLetters.filter(letter =>
    letter.jobDescription.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    letter.jobDescription.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Cover Letters</h1>
              <p className="text-muted-foreground">Create and manage your cover letters</p>
            </div>
            
            <div className="flex gap-3">
              <Button variant="secondary" asChild>
                <Link to="/cla/cover-letter-template">
                  Edit Template
                </Link>
              </Button>
              <Button 
                className="flex items-center gap-2"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                New Cover Letter
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Cover Letters List */}
          <div className="space-y-4">
            {filteredLetters.map((letter) => (
              <Card key={letter.id} className="hover:shadow-medium transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold">
                        {letter.jobDescription.role}
                      </CardTitle>
                      <CardDescription className="text-accent font-medium mt-1">
                        {letter.jobDescription.company}
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(letter.status)}>
                        {letter.status}
                      </Badge>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">LLM Score</div>
                        <div className={`font-semibold ${getScoreColor(letter.llmFeedback.score)}`}>
                          {letter.llmFeedback.score}%
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Created {new Date(letter.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        Updated {new Date(letter.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="tertiary" size="sm" className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button variant="tertiary" size="sm" className="flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredLetters.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No cover letters found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? "No letters match your search criteria." : "Start by creating your first cover letter."}
                  </p>
                  <Button className="flex items-center gap-2" asChild>
                    <Link to="/cla/cover-letter-create">
                      <Plus className="h-4 w-4" />
                      New Cover Letter
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Cover Letter Create Modal */}
      <CoverLetterCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};

export default CoverLetters;
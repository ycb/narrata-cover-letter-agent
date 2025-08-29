import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Mail, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Trash2, 
  Copy,
  Download,
  Share2,
  Calendar,
  Building2,
  User,
  CheckCircle,
  Clock,
  TrendingUp,
  MoreHorizontal,
  LayoutTemplate,
  Trophy
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CoverLetterCreateModal from "@/components/cover-letters/CoverLetterCreateModal";
import { CoverLetterViewModal } from "@/components/cover-letters/CoverLetterViewModal";
import { CoverLetterEditModal } from "@/components/cover-letters/CoverLetterEditModal";
import { useTour } from "@/contexts/TourContext";
import { TourBanner } from "@/components/onboarding/TourBanner";

// Mock data for cover letters
const mockCoverLetters = [
  {
    id: "cl-1",
    title: "Senior Product Manager - TechCorp",
    company: "TechCorp Inc.",
    position: "Senior Product Manager",
    status: "draft",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T14:45:00Z",
    atsScore: 92,
    overallRating: "strong",
    content: {
      sections: [
        {
          id: 'intro',
          type: 'intro',
          content: "I am writing to express my strong interest in the Senior Product Manager position at TechCorp. With over 5 years of experience in product management and a passion for data-driven decision making, I have consistently delivered measurable results that demonstrate my value.",
          isEnhanced: true
        },
        {
          id: 'experience',
          type: 'experience',
          content: "In my previous role as a Senior Product Manager at InnovateTech, I successfully led cross-functional teams of 8-12 engineers, designers, and analysts to deliver products that met both user needs and business objectives.",
          isEnhanced: true
        },
        {
          id: 'closing',
          type: 'closing',
          content: "I am particularly excited about this opportunity at TechCorp because your focus on sustainable technology solutions and commitment to innovation aligns perfectly with my values and experience.",
          isEnhanced: true
        },
        {
          id: 'signature',
          type: 'signature',
          content: "I look forward to discussing how my background aligns with your needs and how I can contribute to TechCorp's continued success.\n\nBest regards,\nJohn Smith\n(555) 123-4567\njohn.smith@email.com\nlinkedin.com/in/johnsmith",
          isEnhanced: false
        }
      ]
    },
    metrics: {
      goalsMatch: "strong",
      experienceMatch: "strong", 
      coverLetterRating: "strong",
      atsScore: 92,
      coreRequirementsMet: { met: 4, total: 4 },
      preferredRequirementsMet: { met: 3, total: 4 }
    }
  },
  {
    id: "cl-2",
    title: "Lead Product Manager - StartupXYZ",
    company: "StartupXYZ",
    position: "Lead Product Manager",
    status: "finalized",
    createdAt: "2024-01-10T09:15:00Z",
    updatedAt: "2024-01-12T16:20:00Z",
    atsScore: 88,
    overallRating: "strong",
    content: {
      sections: [
        {
          id: 'intro',
          type: 'intro',
          content: "I am writing to express my strong interest in the Lead Product Manager position at StartupXYZ. With over 6 years of experience in product management and a track record of scaling products from 0 to millions of users.",
          isEnhanced: true
        },
        {
          id: 'experience',
          type: 'experience',
          content: "In my previous role as a Product Manager at ScaleTech, I successfully scaled a SaaS product from 10,000 to 500,000 users, leading a team of 15 engineers and designers.",
          isEnhanced: true
        },
        {
          id: 'closing',
          type: 'closing',
          content: "I am particularly excited about this opportunity at StartupXYZ because your mission to democratize technology aligns perfectly with my passion for building products that make a difference.",
          isEnhanced: true
        },
        {
          id: 'signature',
          type: 'signature',
          content: "I look forward to discussing how my background aligns with your needs and how I can contribute to StartupXYZ's continued success.\n\nBest regards,\nJohn Smith\n(555) 123-4567\njohn.smith@email.com\nlinkedin.com/in/johnsmith",
          isEnhanced: false
        }
      ]
    },
    metrics: {
      goalsMatch: "strong",
      experienceMatch: "strong",
      coverLetterRating: "strong", 
      atsScore: 88,
      coreRequirementsMet: { met: 4, total: 4 },
      preferredRequirementsMet: { met: 2, total: 4 }
    }
  },
  {
    id: "cl-3",
    title: "Product Director - EnterpriseCorp",
    company: "EnterpriseCorp",
    position: "Product Director",
    status: "draft",
    createdAt: "2024-01-08T11:00:00Z",
    updatedAt: "2024-01-08T11:00:00Z",
    atsScore: 85,
    overallRating: "average",
    content: {
      sections: [
        {
          id: 'intro',
          type: 'intro',
          content: "I am writing to express my interest in the Product Director position at EnterpriseCorp. With over 7 years of experience in product management and leadership.",
          isEnhanced: false
        },
        {
          id: 'experience',
          type: 'experience',
          content: "In my previous role as a Senior Product Manager, I led product strategy and execution for enterprise software solutions.",
          isEnhanced: false
        },
        {
          id: 'closing',
          type: 'closing',
          content: "I am excited about the opportunity to contribute to EnterpriseCorp's mission of transforming enterprise software.",
          isEnhanced: false
        },
        {
          id: 'signature',
          type: 'signature',
          content: "I look forward to discussing how my background aligns with your needs.\n\nBest regards,\nJohn Smith\n(555) 123-4567\njohn.smith@email.com\nlinkedin.com/in/johnsmith",
          isEnhanced: false
        }
      ]
    },
    metrics: {
      goalsMatch: "average",
      experienceMatch: "average",
      coverLetterRating: "average",
      atsScore: 85,
      coreRequirementsMet: { met: 3, total: 4 },
      preferredRequirementsMet: { met: 1, total: 4 }
    }
  }
];

export default function CoverLetters() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "finalized">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCoverLetter, setSelectedCoverLetter] = useState<any>(null);
  const [coverLetters, setCoverLetters] = useState(mockCoverLetters);
  
  // Tour integration
  const { isActive: isTourActive, currentStep: tourStep, tourSteps, nextStep, previousStep, cancelTour } = useTour();

  // Filter cover letters based on search and status
  const filteredCoverLetters = coverLetters.filter(letter => {
    const matchesSearch = letter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         letter.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         letter.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || letter.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateNew = () => {
    setIsCreateModalOpen(true);
  };

  const handleCoverLetterCreated = (newCoverLetter: any) => {
    setCoverLetters(prev => [newCoverLetter, ...prev]);
  };

  const handleView = (coverLetter: any) => {
    setSelectedCoverLetter(coverLetter);
    setIsViewModalOpen(true);
  };

  const handleEdit = (coverLetter: any) => {
    setSelectedCoverLetter(coverLetter);
    setIsEditModalOpen(true);
  };

  const handleDelete = (coverLetter: any) => {
    // TODO: Implement delete functionality
    console.log("Delete cover letter:", coverLetter.id);
  };

  const handleCopy = (coverLetter: any) => {
    // TODO: Implement copy functionality
    console.log("Copy cover letter:", coverLetter.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "finalized":
        return "bg-success text-success-foreground";
      case "draft":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "finalized":
        return <CheckCircle className="h-4 w-4" />;
      case "draft":
        return <Clock className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pb-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground description-spacing">Manage and track your cover letter applications</p>
            <div className="flex gap-3">
              <Button variant="secondary" asChild>
                <Link to="/cover-letter-template">
                  <LayoutTemplate className="h-4 w-4 mr-2" />
                  Edit Template
                </Link>
              </Button>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Letter
              </Button>
            </div>
          </div>

          {/* Tour Text */}
          {isTourActive && (
            <Card className="bg-green-50 border-green-200 mb-6">
              <CardContent className="pt-6">
                <p className="text-green-900 text-center font-medium">
                  Creating new cover letters and tracking progress has never been easier!
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Letters</p>
                    <p className="text-2xl font-bold">{coverLetters.length}</p>
                  </div>
                  <Mail className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Finalized</p>
                    <p className="text-2xl font-bold">{coverLetters.filter(cl => cl.status === 'finalized').length}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Drafts</p>
                    <p className="text-2xl font-bold">{coverLetters.filter(cl => cl.status === 'draft').length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-warning" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg ATS Score</p>
                    <p className="text-2xl font-bold">
                      {coverLetters.length > 0 ? Math.round(coverLetters.reduce((sum, cl) => sum + cl.atsScore, 0) / coverLetters.length) : 0}%
                    </p>
                  </div>
                  <Trophy className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cover letters..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "draft" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("draft")}
              >
                Drafts
              </Button>
              <Button
                variant={statusFilter === "finalized" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("finalized")}
              >
                Finalized
              </Button>
            </div>
            

          </div>

          {/* Cover Letters Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCoverLetters.map((coverLetter) => (
              <Card key={coverLetter.id} className="shadow-soft hover:shadow-medium transition-all duration-200">
                <CardHeader className="pb-3">
                  {/* Header: Title + Status + Menu */}
                  <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-lg truncate">{coverLetter.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(coverLetter.status)}>
                        {getStatusIcon(coverLetter.status)}
                        <span className="ml-1 capitalize">{coverLetter.status}</span>
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopy(coverLetter)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(coverLetter)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* 2-Column Region: Company/Role | Created/Updated */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left Column: Company + Role */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {coverLetter.company}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        {coverLetter.position}
                      </div>
                    </div>
                    
                    {/* Right Column: Created + Updated */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Created {formatDate(coverLetter.createdAt)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Updated {formatDate(coverLetter.updatedAt)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-2 bg-muted/20 rounded">
                      <div className="text-lg font-bold text-primary">{coverLetter.atsScore}%</div>
                      <div className="text-xs text-muted-foreground">ATS Score</div>
                    </div>
                    <div className="text-center p-2 bg-muted/20 rounded">
                      <div className="text-lg font-bold text-success capitalize">{coverLetter.overallRating}</div>
                      <div className="text-xs text-muted-foreground">Rating</div>
                    </div>
                  </div>
                  

                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(coverLetter)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(coverLetter)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredCoverLetters.length === 0 && (
            <Card className="shadow-soft">
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No cover letters found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "all" 
                    ? "Try adjusting your search or filters"
                    : "Create your first cover letter to get started"
                  }
                </p>
                {!searchTerm && statusFilter === "all" && (
                  <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Cover Letter
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Modals */}
      <CoverLetterCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCoverLetterCreated={handleCoverLetterCreated}
      />
      
      <CoverLetterViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        coverLetter={selectedCoverLetter}
      />
      
      <CoverLetterEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        coverLetter={selectedCoverLetter}
      />
      
      {/* Tour Banner */}
      {isTourActive && (
        <TourBanner
          currentStep={tourStep}
          totalSteps={tourSteps.length}
          onNext={nextStep}
          onPrevious={previousStep}
          onCancel={cancelTour}
          canGoNext={tourStep < tourSteps.length - 1}
          canGoPrevious={tourStep > 0}
        />
      )}
    </div>
  );
}
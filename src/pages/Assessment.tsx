import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Users, 
  Target, 
  Lightbulb, 
  BarChart3,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  Edit,
  MessageSquare,
  Info,
  FileText,
  Link
} from "lucide-react";
import EvidenceModal from "@/components/assessment/EvidenceModal";
import LevelEvidenceModal from "@/components/assessment/LevelEvidenceModal";
import RoleEvidenceModal from "@/components/assessment/RoleEvidenceModal";

// Simplified mock data for testing
const mockAssessment = {
  currentLevel: "Senior PM" as const,
  confidence: "high" as const,
  nextLevel: "Principal PM" as const,
  levelDescription: "Experienced product manager with strong execution and growing strategic influence",
  inferenceSource: "Based on resume, LinkedIn, and 47 approved blurbs",
  
  competencies: [
    {
      domain: "Product Execution",
      level: "Strong",
      score: 85,
      evidence: "5 case studies tagged 'Execution'",
      tags: ["Execution", "Delivery", "Technical"],
      description: "Consistently delivers complex products with measurable impact",
      evidenceBlurbs: [
        {
          id: "exec-1",
          title: "Growth PM Leadership at SaaS Startup",
          content: "Led cross-functional product team of 8 to drive 40% user acquisition growth through data-driven experimentation and customer research, resulting in $2M ARR increase.",
          tags: ["Growth", "Leadership", "SaaS", "Data-Driven"],
          sourceRole: "Product Lead",
          sourceCompany: "InnovateTech",
          lastUsed: "2 days ago",
          timesUsed: 12,
          confidence: "high"
        },
        {
          id: "exec-2",
          title: "0-1 Product Development Success",
          content: "Built and launched MVP mobile platform from concept to 10K+ users in 6 months, collaborating with design and engineering to validate product-market fit.",
          tags: ["0-1", "Mobile", "MVP", "Product-Market Fit"],
          sourceRole: "Product Manager",
          sourceCompany: "StartupXYZ",
          lastUsed: "1 week ago",
          timesUsed: 8,
          confidence: "high"
        }
      ]
    },
    {
      domain: "Customer Insight",
      level: "Strong", 
      score: 80,
      evidence: "Samsung + Meta stories with user research",
      tags: ["Research", "User Experience", "Customer"],
      description: "Deep understanding of user needs and market validation",
      evidenceBlurbs: [
        {
          id: "insight-1",
          title: "Customer Research & Strategy",
          content: "Conducted 50+ customer interviews and usability studies to inform product roadmap, leading to 25% improvement in user satisfaction scores.",
          tags: ["Research", "Strategy", "Customer Experience"],
          sourceRole: "Product Manager",
          sourceCompany: "Meta",
          lastUsed: "3 days ago",
          timesUsed: 15,
          confidence: "high"
        }
      ]
    },
    {
      domain: "Product Strategy",
      level: "Emerging",
      score: 65,
      evidence: "2 strategy-related blurbs",
      tags: ["Strategy", "Vision", "Roadmap"],
      description: "Developing strategic thinking, needs more leadership examples",
      evidenceBlurbs: [
        {
          id: "strategy-1",
          title: "Platform Strategy Development",
          content: "Developed 3-year platform strategy for enterprise SaaS product, including market analysis and competitive positioning.",
          tags: ["Strategy", "Platform", "Enterprise"],
          sourceRole: "Senior PM",
          sourceCompany: "TechCorp",
          lastUsed: "2 weeks ago",
          timesUsed: 3,
          confidence: "medium"
        }
      ]
    },
    {
      domain: "Influencing People",
      level: "Solid",
      score: 75,
      evidence: "Aurora + Meta stories tagged 'XFN Collaboration'",
      tags: ["Leadership", "Collaboration", "Stakeholder"],
      description: "Effective cross-functional collaboration and team influence",
      evidenceBlurbs: [
        {
          id: "influence-1",
          title: "Cross-functional Team Leadership",
          content: "Led 15-person cross-functional team across engineering, design, and marketing to deliver major product launch on time and under budget.",
          tags: ["Leadership", "Collaboration", "Team Management"],
          sourceRole: "Product Lead",
          sourceCompany: "Aurora",
          lastUsed: "1 month ago",
          timesUsed: 6,
          confidence: "high"
        }
      ]
    }
  ],

  roleArchetypes: [
    {
      type: "Growth PM",
      match: 85,
      description: "Data-driven experimentation and user acquisition focus",
      evidence: "Growth, Leadership, SaaS tags from multiple blurbs",
      typicalProfile: "Startup or scale-up experience, PLG systems and user analytics, B2C focus, A/B testing expertise"
    },
    {
      type: "Technical PM", 
      match: 70,
      description: "Technical depth and engineering collaboration",
      evidence: "Technical, Engineering, Platform tags",
      typicalProfile: "Engineering background or technical degree, API and infrastructure products, developer tools, enterprise SaaS"
    },
    {
      type: "Founding PM",
      match: 60,
      description: "0-1 product development and market validation",
      evidence: "0-1, MVP, Product-Market Fit tags",
      typicalProfile: "Early-stage startup experience, product-market fit validation, fundraising support, end-to-end product ownership"
    },
    {
      type: "Platform PM",
      match: 45,
      description: "API and infrastructure product management",
      evidence: "Limited platform and API-related content",
      typicalProfile: "Developer platform experience, API design, infrastructure products, enterprise integration focus"
    }
  ],

  levelProgression: [
    { level: "Entry PM", description: "0-2 years, feature delivery" },
    { level: "Mid PM", description: "2-4 years, product ownership" },
    { level: "Senior PM", description: "4-7 years, strategic execution", current: true },
    { level: "Principal PM", description: "7-10 years, product strategy" },
    { level: "Director+", description: "10+ years, organizational leadership" }
  ],

  // Level Evidence Data
  levelEvidence: {
    currentLevel: "Senior PM",
    nextLevel: "Principal PM",
    confidence: "high",
    resumeEvidence: {
      roleTitles: ["Product Manager", "Senior PM", "Product Lead"],
      duration: "6+ years in product management",
      companyScale: ["Startup", "Scale-up", "Enterprise"]
    },
    blurbEvidence: {
      totalBlurbs: 47,
      relevantBlurbs: 32,
      tagDensity: [
        { tag: "Leadership", count: 15 },
        { tag: "Strategy", count: 8 },
        { tag: "Execution", count: 12 },
        { tag: "Growth", count: 10 }
      ]
    },
    levelingFramework: {
      framework: "Reforge + Market Calibration",
      criteria: [
        "Strategic thinking and roadmap development",
        "Cross-functional team leadership",
        "Complex problem solving at scale",
        "Stakeholder influence and collaboration"
      ],
      match: "Strong Match"
    },
    gaps: [
      {
        area: "Organizational Strategy",
        description: "Need more examples of company-wide strategic initiatives",
        examples: ["Company vision setting", "Portfolio strategy", "Organizational design"]
      },
      {
        area: "Executive Communication",
        description: "Limited evidence of board-level presentations and executive influence",
        examples: ["Board presentations", "C-suite collaboration", "Investor communications"]
      }
    ]
  },

  // Role Archetype Evidence Data
  roleArchetypeEvidence: {
    "Growth PM": {
      roleType: "Growth PM",
      matchScore: 85,
      description: "Data-driven experimentation and user acquisition focus",
      industryPatterns: [
        {
          pattern: "Startup/Scale-up Experience",
          match: true,
          examples: ["InnovateTech", "StartupXYZ", "Early-stage companies"]
        },
        {
          pattern: "PLG Systems",
          match: true,
          examples: ["User analytics", "A/B testing", "Growth loops"]
        },
        {
          pattern: "B2C Focus",
          match: true,
          examples: ["User acquisition", "Retention optimization", "Viral mechanics"]
        }
      ],
      problemComplexity: {
        level: "High",
        examples: ["User acquisition at scale", "Growth strategy", "Product-market fit"],
        evidence: ["Led 40% user growth", "Built MVP to 10K users", "Cross-functional leadership"]
      },
      workHistory: [
        {
          company: "InnovateTech",
          role: "Product Lead",
          relevance: "Highly Relevant",
          tags: ["Growth", "Leadership", "SaaS"]
        },
        {
          company: "StartupXYZ",
          role: "Product Manager",
          relevance: "Highly Relevant",
          tags: ["0-1", "MVP", "Product-Market Fit"]
        }
      ],
      tagAnalysis: [
        {
          tag: "Growth",
          count: 10,
          relevance: 95,
          examples: ["User acquisition", "A/B testing", "Growth strategy"]
        },
        {
          tag: "Leadership",
          count: 15,
          relevance: 90,
          examples: ["Team management", "Cross-functional collaboration"]
        }
      ],
      gaps: [
        {
          area: "Enterprise Growth",
          description: "Limited experience with enterprise sales and B2B growth",
          suggestions: ["B2B customer development", "Enterprise sales process", "Account-based marketing"]
        }
      ]
    },
    "Technical PM": {
      roleType: "Technical PM",
      matchScore: 70,
      description: "Technical depth and engineering collaboration",
      industryPatterns: [
        {
          pattern: "Engineering Background",
          match: true,
          examples: ["Technical degree", "Engineering experience", "Technical collaboration"]
        },
        {
          pattern: "Platform Products",
          match: true,
          examples: ["API design", "Infrastructure", "Developer tools"]
        },
        {
          pattern: "Enterprise SaaS",
          match: true,
          examples: ["B2B products", "Technical complexity", "Enterprise integration"]
        }
      ],
      problemComplexity: {
        level: "Medium-High",
        examples: ["Technical architecture", "API design", "Platform scalability"],
        evidence: ["Technical collaboration", "Platform strategy", "Engineering partnerships"]
      },
      workHistory: [
        {
          company: "TechCorp",
          role: "Senior PM",
          relevance: "Moderately Relevant",
          tags: ["Technical", "Platform", "Enterprise"]
        }
      ],
      tagAnalysis: [
        {
          tag: "Technical",
          count: 8,
          relevance: 75,
          examples: ["Technical collaboration", "Platform design", "API strategy"]
        },
        {
          tag: "Engineering",
          count: 6,
          relevance: 70,
          examples: ["Engineering partnerships", "Technical requirements", "Platform architecture"]
        }
      ],
      gaps: [
        {
          area: "Deep Technical Expertise",
          description: "Need more evidence of hands-on technical implementation",
          suggestions: ["Technical implementation", "Code reviews", "Technical architecture decisions"]
        }
      ]
    },
    "Founding PM": {
      roleType: "Founding PM",
      matchScore: 60,
      description: "0-1 product development and market validation",
      industryPatterns: [
        {
          pattern: "Early-stage Startup",
          match: true,
          examples: ["StartupXYZ", "0-1 products", "MVP development"]
        },
        {
          pattern: "Product-Market Fit",
          match: true,
          examples: ["Market validation", "Customer research", "Iteration"]
        },
        {
          pattern: "End-to-End Ownership",
          match: true,
          examples: ["Full product lifecycle", "Strategic decisions", "Execution"]
        }
      ],
      problemComplexity: {
        level: "Medium",
        examples: ["Product-market fit", "MVP development", "Strategic decisions"],
        evidence: ["Built MVP to 10K users", "0-1 product development", "Strategic thinking"]
      },
      workHistory: [
        {
          company: "StartupXYZ",
          role: "Product Manager",
          relevance: "Highly Relevant",
          tags: ["0-1", "MVP", "Product-Market Fit"]
        }
      ],
      tagAnalysis: [
        {
          tag: "0-1",
          count: 8,
          relevance: 80,
          examples: ["MVP development", "Product-market fit", "Strategic decisions"]
        },
        {
          tag: "MVP",
          count: 6,
          relevance: 75,
          examples: ["Product development", "Market validation", "Iteration"]
        }
      ],
      gaps: [
        {
          area: "Fundraising Experience",
          description: "Limited evidence of fundraising and investor relations",
          suggestions: ["Investor presentations", "Fundraising strategy", "Financial modeling"]
        }
      ]
    },
    "Platform PM": {
      roleType: "Platform PM",
      matchScore: 45,
      description: "API and infrastructure product management",
      industryPatterns: [
        {
          pattern: "Developer Platforms",
          match: false,
          examples: ["Limited API design", "No developer tools", "No platform focus"]
        },
        {
          pattern: "Infrastructure Products",
          match: false,
          examples: ["No infrastructure experience", "Limited technical depth", "No platform strategy"]
        },
        {
          pattern: "Enterprise Integration",
          match: false,
          examples: ["Limited enterprise focus", "No integration experience", "No platform thinking"]
        }
      ],
      problemComplexity: {
        level: "Low",
        examples: ["Basic product management", "Feature delivery", "User-facing products"],
        evidence: ["Limited platform experience", "No API design", "No infrastructure focus"]
      },
      workHistory: [
        {
          company: "Various",
          role: "Product Manager",
          relevance: "Low Relevance",
          tags: ["General PM", "Feature delivery", "User products"]
        }
      ],
      tagAnalysis: [
        {
          tag: "Platform",
          count: 2,
          relevance: 30,
          examples: ["Limited platform thinking", "No API focus", "No infrastructure"]
        },
        {
          tag: "API",
          count: 1,
          relevance: 20,
          examples: ["No API design", "No developer experience", "No platform strategy"]
        }
      ],
      gaps: [
        {
          area: "Platform Thinking",
          description: "Need to develop platform and infrastructure mindset",
          suggestions: ["API design", "Developer experience", "Platform strategy", "Infrastructure products"]
        }
      ]
    }
  }
};

const Assessment = () => {
  const [selectedCompetency, setSelectedCompetency] = useState<string | null>(null);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [levelEvidenceModalOpen, setLevelEvidenceModalOpen] = useState(false);
  const [roleEvidenceModalOpen, setRoleEvidenceModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Strong": return "text-success";
      case "Solid": return "text-primary";
      case "Emerging": return "text-warning";
      case "Needs More Evidence": return "text-muted-foreground";
      default: return "text-foreground";
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high": return "bg-success text-success-foreground";
      case "medium": return "bg-warning text-warning-foreground";
      case "low": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getArchetypeColor = (match: number) => {
    if (match >= 80) return "bg-success text-success-foreground";
    if (match >= 60) return "bg-primary text-primary-foreground";
    if (match >= 40) return "bg-warning text-warning-foreground";
    return "bg-muted text-muted-foreground";
  };

  const handleShowEvidence = (competency: any) => {
    setSelectedEvidence(competency);
    setEvidenceModalOpen(true);
  };

  const handleShowLevelEvidence = () => {
    setLevelEvidenceModalOpen(true);
  };

  const handleShowRoleEvidence = (roleType: string) => {
    setSelectedRole(roleType);
    setRoleEvidenceModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="container py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Data Sources - Tight & Inline */}
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  <div>
                    <CardTitle className="text-lg">Data Sources</CardTitle>
                    <CardDescription className="text-sm">Profile completeness</CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-success">Profile Strength</div>
                  <Badge className="bg-success text-success-foreground text-xs">Strong</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {/* LinkedIn */}
                <div className="text-center p-2 bg-muted/20 rounded border">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="h-2 w-2 rounded-full bg-success"></div>
                    <span className="text-xs text-muted-foreground">LinkedIn</span>
                  </div>
                  <div className="text-sm font-medium">Connected</div>
                </div>

                {/* Resume */}
                <div className="text-center p-2 bg-muted/20 rounded border">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="h-2 w-2 rounded-full bg-success"></div>
                    <span className="text-xs text-muted-foreground">Resume</span>
                  </div>
                  <div className="text-sm font-medium">Uploaded</div>
                </div>

                {/* Cover Letters */}
                <div className="text-center p-2 bg-muted/20 rounded border">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="h-2 w-2 rounded-full bg-warning"></div>
                    <span className="text-xs text-muted-foreground">Cover Letters</span>
                  </div>
                  <div className="text-sm font-medium">0</div>
                </div>

                {/* Stories/Blurbs */}
                <div className="text-center p-2 bg-muted/20 rounded border">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="h-2 w-2 rounded-full bg-success"></div>
                    <span className="text-xs text-muted-foreground">Stories</span>
                  </div>
                  <div className="text-sm font-medium">47</div>
                </div>

                {/* External Links */}
                <div className="text-center p-2 bg-muted/20 rounded border">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="h-2 w-2 rounded-full bg-success"></div>
                    <span className="text-xs text-muted-foreground">External</span>
                  </div>
                  <div className="text-sm font-medium">3</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overall Level Assessment */}
          <Card className="shadow-soft">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Badge className={getConfidenceColor(mockAssessment.confidence)}>
                  LLM Inferred
                </Badge>
                <Badge variant="outline">
                  {mockAssessment.confidence} confidence
                </Badge>
              </div>
              <CardTitle className="text-4xl font-bold text-foreground mb-2">
                You are a <span className="text-primary">{mockAssessment.currentLevel}</span>
              </CardTitle>
              <CardDescription className="text-lg">
                {mockAssessment.levelDescription}
              </CardDescription>
              <p className="text-sm text-muted-foreground mt-2">
                {mockAssessment.inferenceSource}
              </p>
            </CardHeader>
            
            {/* Evidence CTA Button */}
            <div className="px-6 pb-6">
              <Button 
                variant="primary" 
                size="lg" 
                className="w-full"
                onClick={handleShowLevelEvidence}
              >
                View Evidence for Overall Level
                <TrendingUp className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </Card>


          {/* PM Ladder Visualization */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                PM Career Progression
              </CardTitle>
              <CardDescription>
                Your current level and path to the next level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Progress Bar */}
                <div className="flex items-center justify-between mb-4">
                  {mockAssessment.levelProgression.map((level, index) => (
                    <div key={level.level} className="flex flex-col items-center">
                      <div className={`h-3 w-3 rounded-full mb-2 ${
                        level.current 
                          ? 'bg-foreground' 
                          : index < 2 
                            ? 'bg-muted' 
                            : 'bg-muted/30'
                      }`} />
                      <div className="text-center">
                        <div className={`text-sm font-medium ${
                          level.current ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {level.level}
                        </div>
                        <div className="text-xs text-muted-foreground w-20 text-center">
                          {level.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Connection Lines */}
                <div className="absolute top-1.5 left-6 right-6 h-px bg-muted -z-10" />
                
                {/* Next Level Indicator */}
                <div className="text-center mt-6 p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-foreground" />
                    <span className="font-medium">Next Level: {mockAssessment.nextLevel}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Focus on strategic thinking and organizational influence to advance
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps - Moved here for better flow */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Next Steps
              </CardTitle>
              <CardDescription>
                Actions to improve your assessment and advance your career
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button variant="primary" className="w-full">
                  <Edit className="h-4 w-4 mr-2" />
                  Add More Stories
                </Button>
                <Button variant="secondary" className="w-full">
                  <Link className="h-4 w-4 mr-2" />
                  Add External Links
                </Button>
                <Button variant="secondary" className="w-full">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Add Quantified Results
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Competency Breakdown */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Competency Breakdown
              </CardTitle>
              <CardDescription>
                Your strengths and areas for growth across key PM domains
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mockAssessment.competencies.map((competency) => (
                  <div key={competency.domain} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{competency.domain}</h3>
                      <Badge className={getLevelColor(competency.level)}>
                        {competency.level}
                      </Badge>
                    </div>
                    
                    <Progress value={competency.score} className="h-2" />
                    
                    <div className="text-sm text-muted-foreground">
                      {competency.description}
                    </div>
                    
                    {/* Interactive Evidence Preview */}
                    <div className="p-3 bg-muted/20 rounded-lg border">
                      <div className="mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Evidence Preview</span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mb-2">
                        {competency.evidence}
                      </div>
                      
                      {/* Sample Evidence Blurb */}
                      {competency.evidenceBlurbs && competency.evidenceBlurbs[0] && (
                        <div className="text-xs bg-background p-2 rounded border mb-2">
                          <div className="font-medium text-foreground mb-1">
                            {competency.evidenceBlurbs[0].title}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {competency.evidenceBlurbs[0].content}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-1 mb-3">
                        {competency.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      {/* Inline CTA Button */}
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleShowEvidence(competency)}
                      >
                        View Evidence for {competency.domain}
                        <TrendingUp className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Role Archetype Mapping */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Role Archetype Mapping
              </CardTitle>
              <CardDescription>
                How your profile matches different PM specializations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockAssessment.roleArchetypes.map((archetype) => (
                  <div key={archetype.type} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{archetype.type}</h4>
                      <Badge className={getArchetypeColor(archetype.match)}>
                        {archetype.match}% match
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {archetype.description}
                    </p>
                    
                    {/* Interactive Evidence Preview */}
                    <div className="p-3 bg-muted/20 rounded-lg border">
                      <div className="mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Match Analysis</span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mb-2">
                        {archetype.evidence}
                      </div>
                      
                      {/* Key Match Indicators */}
                      <div className="space-y-1 mb-2">
                        <div className="flex items-center gap-2 text-xs">
                          <CheckCircle className="h-3 w-3 text-success" />
                          <span>Experience: {archetype.type === "Growth PM" ? "High" : archetype.type === "Technical PM" ? "Medium" : "Low"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <CheckCircle className="h-3 w-3 text-success" />
                          <span>Skills: {archetype.type === "Growth PM" ? "Growth, Leadership" : archetype.type === "Technical PM" ? "Technical, Platform" : "General PM"}</span>
                        </div>
                      </div>
                      
                      <div className="p-2 bg-background rounded border mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Typical profile:
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {archetype.typicalProfile}
                        </p>
                      </div>
                      
                      {/* Inline CTA Button */}
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleShowRoleEvidence(archetype.type)}
                      >
                        View Evidence for {archetype.type}
                        <TrendingUp className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Feedback & Export */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Feedback & Export
              </CardTitle>
              <CardDescription>
                Help us improve your assessment or export your results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="secondary" className="w-full">
                <Edit className="h-4 w-4 mr-2" />
                This looks wrong
              </Button>
              <Button variant="secondary" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Summary (PDF)
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Evidence Modal */}
      {selectedEvidence && (
        <EvidenceModal
          isOpen={evidenceModalOpen}
          onClose={() => {
            setEvidenceModalOpen(false);
            setSelectedEvidence(null);
          }}
          competency={selectedEvidence.domain}
          evidence={selectedEvidence.evidenceBlurbs}
          matchedTags={selectedEvidence.tags}
          overallConfidence={selectedEvidence.level === "Strong" ? "high" : selectedEvidence.level === "Solid" ? "medium" : "low"}
        />
      )}

      {/* Level Evidence Modal */}
      <LevelEvidenceModal
        isOpen={levelEvidenceModalOpen}
        onClose={() => setLevelEvidenceModalOpen(false)}
        evidence={mockAssessment.levelEvidence}
      />

      {/* Role Evidence Modal */}
      {selectedRole && mockAssessment.roleArchetypeEvidence[selectedRole] && (
        <RoleEvidenceModal
          isOpen={roleEvidenceModalOpen}
          onClose={() => {
            setRoleEvidenceModalOpen(false);
            setSelectedRole(null);
          }}
          evidence={mockAssessment.roleArchetypeEvidence[selectedRole]}
        />
      )}
    </div>
  );
};

export default Assessment;

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
  nextLevel: "Lead Product Mgr" as const,
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
    nextLevel: "Lead Product Mgr",
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
  const [showLeadershipTrack, setShowLeadershipTrack] = useState(false);

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Strong": return "text-success border-success/20";
      case "Solid": return "text-blue-600 border-blue-200";
      case "Emerging": return "text-warning border-warning/20";
      case "Needs More Evidence": return "text-muted-foreground border-muted";
      default: return "text-foreground border-muted";
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
    if (match >= 60) return "bg-foreground text-background";
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
          
          {/* Data Sources & Next Steps - Consolidated */}
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  <div>
                    <CardTitle className="text-lg">Data Sources & Next Steps</CardTitle>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-success text-success-foreground text-xs">Strong</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
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
                    <span className="text-xs text-muted-foreground">External Links</span>
                  </div>
                  <div className="text-sm font-medium">3</div>
                </div>
              </div>
              
              {/* Action Description & CTAs - Single Line Layout */}
              <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-muted/10 rounded-lg gap-3">
                <p className="text-sm text-muted-foreground whitespace-nowrap">
                  Improve your assessment with more evidence
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm">
                    Add More Stories
                  </Button>
                  <Button variant="secondary" size="sm">
                    Add External Links
                  </Button>
                  <Button variant="secondary" size="sm">
                    Add Quantified Results
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Combined Level Assessment & Career Progression */}
          <Card className="shadow-soft">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-4xl font-bold text-foreground mb-2">
                You are a <span className="text-foreground">{mockAssessment.currentLevel}</span>
              </CardTitle>
              <CardDescription className="text-lg">
                {mockAssessment.levelDescription}
              </CardDescription>
              <p className="text-sm text-muted-foreground mt-2">
                {mockAssessment.inferenceSource}
              </p>
            </CardHeader>
            
            <CardContent>

              {/* Evidence CTA Button - Above Career Ladder */}
              <div className="flex justify-center mb-6">
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={handleShowLevelEvidence}
                >
                  View Evidence for Overall Level
                  <TrendingUp className="h-5 w-5 ml-2" />
                </Button>
              </div>
              
              {/* Dual-Track Career Path Visualization */}
              <div className="mb-6 relative overflow-hidden -mx-6">
                {/* IC Track - Full Width */}
                <div className={`transition-transform duration-500 ease-in-out ${showLeadershipTrack ? '-translate-x-full' : 'translate-x-0'}`}>
                  <div className="bg-white">
                    {/* IC Track Header */}
                    <div className="text-left mb-6 border-t-2 border-blue-500 pt-4 px-6">
                      <h4 className="text-base font-semibold text-blue-900">IC Track: Core PM skills to deep expertise</h4>
                    </div>
                    
                    {/* IC Track Steps */}
                    <div className="flex items-center justify-center relative">
                      {/* Completed Steps */}
                      <div className="flex flex-col items-center p-6 h-56 justify-center ml-6">
                        <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold mb-3">✓</div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-blue-900 mb-1">Associate PM</div>
                          <div className="text-xs text-muted-foreground text-center">0-2 years</div>
                        </div>
                      </div>
                      <div className="h-px w-6 bg-blue-200 mx-6" />
                      
                      <div className="flex flex-col items-center p-6 h-56 justify-center">
                        <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold mb-3">✓</div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-blue-900 mb-1">Product Mgr</div>
                          <div className="text-xs text-muted-foreground text-center">2-4 years</div>
                        </div>
                      </div>
                      <div className="h-px w-6 bg-blue-200 mx-6" />
                      
                      {/* Current Step - TODAY Card */}
                      <div className="flex flex-col items-center rounded-lg overflow-hidden shadow-sm border-2 border-blue-500 h-56">
                        <div className="bg-blue-500 text-white text-center py-2 px-4 w-full">
                          <div className="text-xs font-normal uppercase tracking-wide">TODAY</div>
                        </div>
                        <div className="bg-white p-6 w-full flex-1 flex flex-col justify-center">
                          <div className="text-center">
                            <div className="h-6 w-6 rounded-full bg-blue-500 mb-3 mx-auto" />
                            <div className="text-sm font-medium bg-blue-500 text-white px-3 py-1 rounded-full mb-1">Sr Product Mgr</div>
                            <div className="text-xs text-muted-foreground">4-7 years</div>
                          </div>
                        </div>
                      </div>
                      <div className="h-px w-6 bg-blue-200 mx-6" />
                      
                      {/* Next Step - NEXT STEP Card */}
                      <div className="flex flex-col items-center rounded-lg overflow-hidden shadow-sm border-2 border-blue-500 h-56">
                        <div className="bg-blue-500 text-white text-center py-2 px-4 w-full">
                          <div className="text-xs font-normal uppercase tracking-wide">NEXT STEP</div>
                        </div>
                        <div className="bg-white p-6 w-full flex-1 flex flex-col justify-center">
                          <div className="text-center">
                            <div className="h-6 w-6 rounded-full border-2 border-blue-500 mb-3 mx-auto" />
                            <div className="text-sm font-medium text-blue-900 mb-1">Lead Product Mgr</div>
                            <div className="text-xs text-muted-foreground">Technical leadership</div>
                          </div>
                        </div>
                      </div>
                      <div className="h-px w-6 bg-blue-200 mx-6" />
                      
                      {/* Future Step - Dotted Circle */}
                      <div className="flex flex-col items-center p-6 h-56 justify-center">
                        <div className="h-6 w-6 rounded-full border-2 border-dashed border-blue-500 mb-3"></div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-blue-900 mb-1">Principal Product Mgr</div>
                          <div className="text-xs text-muted-foreground text-center">Domain expert</div>
                        </div>
                      </div>
                      <div className="h-px w-6 bg-blue-200 mx-6" />
                      
                      {/* Full Height Vertical Separator - Green when viewing IC */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-green-300 border-l-2 border-dashed border-green-500 transform -translate-x-1/2"></div>
                      
                      {/* View Leadership Track Card */}
                      <div className="flex flex-col items-center rounded-lg overflow-hidden shadow-sm border-2 border-green-500 cursor-pointer h-56 mr-6" onClick={() => setShowLeadershipTrack(true)}>
                        <div className="bg-green-500 text-white text-center py-2 px-4 w-full">
                          <div className="text-xs font-normal uppercase tracking-wide">VIEW</div>
                        </div>
                        <div className="bg-white p-6 w-full flex-1 flex flex-col justify-center">
                          <div className="text-center">
                            <div className="text-xs text-green-900 font-medium">Leadership Track</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* IC Guidance Banner */}
                    <div className="bg-blue-50 border-t-2 border-b-2 border-blue-500 py-4 px-6 mt-2 mb-6">
                      <div className="text-center">
                        <p className="text-xs text-blue-900 font-medium">Demonstrate strategic thinking and organizational influence to advance</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Leadership Track - Slides in from right */}
                <div className={`absolute top-0 left-0 w-full transition-transform duration-500 ease-in-out ${showLeadershipTrack ? 'translate-x-0' : 'translate-x-full'}`}>
                  <div className="bg-white">
                    {/* Leadership Track Header */}
                    <div className="text-left mb-6 border-t-2 border-green-500 pt-4 px-6">
                      <h4 className="text-base font-semibold text-green-900">Leadership Track: Team leadership and organizational strategy</h4>
                    </div>
                    
                    {/* Leadership Track Steps */}
                    <div className="flex items-center justify-center relative">
                      {/* View IC Track Card */}
                      <div className="flex flex-col items-center rounded-lg overflow-hidden shadow-sm border-2 border-blue-500 cursor-pointer h-56 ml-6" onClick={() => setShowLeadershipTrack(false)}>
                        <div className="bg-blue-500 text-white text-center py-2 px-4 w-full">
                          <div className="text-xs font-normal uppercase tracking-wide">VIEW</div>
                        </div>
                        <div className="bg-white p-6 w-full flex-1 flex flex-col justify-center">
                          <div className="text-center">
                            <div className="text-xs text-blue-900 font-medium">IC Track</div>
                          </div>
                        </div>
                      </div>
                      <div className="h-px w-6 bg-green-200 mx-6" />
                      
                      {/* Full Height Vertical Separator - Blue when viewing Leadership */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-300 border-l-2 border-dashed border-blue-500 transform -translate-x-1/2"></div>
                      
                      {/* Future Steps - All Dotted Circles */}
                      <div className="flex flex-col items-center p-6 h-56 justify-center">
                        <div className="h-6 w-6 rounded-full border-2 border-dashed border-green-500 mb-3"></div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-green-900 mb-1">Group PM / Manager</div>
                          <div className="text-xs text-muted-foreground text-center">Portfolio oversight</div>
                        </div>
                      </div>
                      <div className="h-px w-6 bg-green-200 mx-6" />
                      
                      <div className="flex flex-col items-center p-6 h-56 justify-center">
                        <div className="h-6 w-6 rounded-full border-2 border-dashed border-green-500 mb-3"></div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-green-900 mb-1">Director of Product</div>
                          <div className="text-xs text-muted-foreground text-center">Strategic direction</div>
                        </div>
                      </div>
                      <div className="h-px w-6 bg-green-200 mx-6" />
                      
                      <div className="flex flex-col items-center p-6 h-56 justify-center">
                        <div className="h-6 w-6 rounded-full border-2 border-dashed border-green-500 mb-3"></div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-green-900 mb-1">Vice President, Product</div>
                          <div className="text-xs text-muted-foreground text-center">Executive leadership</div>
                        </div>
                      </div>
                      <div className="h-px w-6 bg-green-200 mx-6" />
                      
                      <div className="flex flex-col items-center p-6 h-56 justify-center">
                        <div className="h-6 w-6 rounded-full border-2 border-dashed border-green-500 mb-3"></div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-green-900 mb-1">Chief Product Officer</div>
                          <div className="text-xs text-muted-foreground text-center">CPO</div>
                        </div>
                      </div>
                      <div className="mr-6"></div>
                    </div>
                    
                    {/* Leadership Guidance Banner */}
                    <div className="bg-green-50 border-t-2 border-b-2 border-green-500 py-4 px-6 mt-2 mb-6">
                      <div className="text-center">
                        <p className="text-xs text-green-900 font-medium">Develop team leadership skills and strategic organizational thinking to advance</p>
                      </div>
                    </div>
                  </div>
                </div>
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
                      <Badge variant="outline" className={getLevelColor(competency.level)}>
                        {competency.level}
                      </Badge>
                    </div>
                    
                    <Progress 
                      value={competency.score} 
                      className={`h-2 ${
                        competency.level === "Strong" 
                          ? "[&>div]:bg-success" 
                          : competency.level === "Solid" 
                            ? "[&>div]:bg-blue-500" 
                            : competency.level === "Emerging" 
                              ? "[&>div]:bg-warning" 
                              : "[&>div]:bg-muted-foreground"
                      }`}
                    />
                    
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

          {/* Specialization Mapping */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Specialization Mapping
              </CardTitle>
              <CardDescription>
                How your profile matches different PM specializations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mockAssessment.roleArchetypes.map((archetype) => (
                  <div key={archetype.type} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{archetype.type}</h3>
                      <Badge variant="outline" className={`${
                        archetype.match >= 80 
                          ? "text-success border-success/20" 
                          : archetype.match >= 60 
                            ? "text-blue-600 border-blue-200" 
                            : archetype.match >= 40 
                              ? "text-warning border-warning/20" 
                              : "text-muted-foreground border-muted"
                      }`}>
                        {archetype.match}% match
                      </Badge>
                    </div>
                    
                    <Progress 
                      value={archetype.match} 
                      className={`h-2 ${
                        archetype.match >= 80 
                          ? "[&>div]:bg-success" 
                          : archetype.match >= 60 
                            ? "[&>div]:bg-blue-500" 
                            : archetype.match >= 40 
                              ? "[&>div]:bg-warning" 
                              : "[&>div]:bg-muted-foreground"
                      }`}
                    />
                    
                    <div className="text-sm text-muted-foreground">
                      {archetype.description}
                    </div>
                    
                    {/* Interactive Evidence Preview */}
                    <div className="p-3 bg-muted/20 rounded-lg border">
                      <div className="mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Evidence Preview</span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mb-2">
                        {archetype.evidence}
                      </div>
                      
                      {/* Sample Evidence Blurb */}
                      <div className="text-xs bg-background p-2 rounded border mb-2">
                        <div className="font-medium text-foreground mb-1">
                          Match Analysis
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          Experience: {archetype.type === "Growth PM" ? "High" : archetype.type === "Technical PM" ? "Medium" : "Low"} | 
                          Skills: {archetype.type === "Growth PM" ? "Growth, Leadership" : archetype.type === "Technical PM" ? "Technical, Platform" : "General PM"}
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

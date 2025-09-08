import { useState, useEffect } from "react";
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
  Edit,
  Info,
  FileText,
  Link
} from "lucide-react";
import EvidenceModal from "@/components/assessment/EvidenceModal";
import LevelEvidenceModal from "@/components/assessment/LevelEvidenceModal";
import RoleEvidenceModal from "@/components/assessment/RoleEvidenceModal";
import { SpecializationCard } from "@/components/assessment/SpecializationCard";
import { CompetencyCard } from "@/components/assessment/CompetencyCard";
import { usePrototype } from "@/contexts/PrototypeContext";
import { useNavigate, useSearchParams } from "react-router-dom";

// Simplified mock data for testing
const mockAssessment = {
  currentLevel: "Senior PM" as const,
  confidence: "high" as const,
      nextLevel: "Lead PM" as const,
  levelDescription: "Experienced product manager with strong execution and growing strategic influence",
  inferenceSource: "Based on resume, LinkedIn, and 47 approved stories",
  
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
          tags: ["Growth", "Leadership", "SaaS", "Data Driven"],
          sourceRole: "Product Lead",
          sourceCompany: "InnovateTech",
          lastUsed: "2 days ago",
          timesUsed: 12,
          confidence: "high",
          outcomeMetrics: [
            "40% user acquisition growth",
            "$2M ARR increase",
            "Led team of 8 cross-functional members"
          ]
        },
        {
          id: "exec-2",
          title: "0-1 Product Development Success",
          content: "Built and launched MVP mobile platform from concept to 10K+ users in 6 months, collaborating with design and engineering to validate product-market fit.",
          tags: ["0-1", "Mobile", "MVP", "Product Market Fit"],
          sourceRole: "Product Manager",
          sourceCompany: "StartupXYZ",
          lastUsed: "1 week ago",
          timesUsed: 8,
          confidence: "high",
          outcomeMetrics: [
            "Launched MVP in 6 months",
            "Reached 10K+ users",
            "Validated product-market fit"
          ]
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
          confidence: "high",
          outcomeMetrics: [
            "50+ customer interviews conducted",
            "25% improvement in user satisfaction",
            "Informed product roadmap decisions"
          ]
        }
      ]
    },
    {
      domain: "Product Strategy",
      level: "Emerging",
      score: 65,
      evidence: "2 strategy-related stories",
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
          confidence: "medium",
          outcomeMetrics: [
            "Developed 3-year platform strategy",
            "Completed market analysis",
            "Established competitive positioning"
          ]
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
          confidence: "high",
          outcomeMetrics: [
            "Led 15-person cross-functional team",
            "Delivered product launch on time",
            "Completed project under budget"
          ]
        }
      ]
    }
  ],

  roleArchetypes: [
    {
      type: "Growth PM",
      match: 85,
      description: "Data-driven experimentation and user acquisition focus",
      evidence: "Growth, Leadership, SaaS tags from multiple stories",
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
    nextLevel: "Lead PM",
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
    ],
    outcomeMetrics: {
      roleLevel: [
        "Led cross-functional team of 12 engineers and designers",
        "Increased user engagement by 40% through feature optimization",
        "Launched 3 major product releases ahead of schedule"
      ],
      storyLevel: [
        "Launched MVP in 6 months",
        "Hired 8 product professionals",
        "Built high-performing product team from ground up"
      ],
      analysis: {
        totalMetrics: 6,
        impactLevel: 'team' as const,
        keyAchievements: [
          "Team leadership at scale (12+ people)",
          "Significant user engagement improvement (40%)",
          "Accelerated product delivery (ahead of schedule)"
        ]
      }
    }
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
          tags: ["0-1", "MVP", "Product Market Fit"]
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
      ],
      outcomeMetrics: {
        roleLevel: [
          "Led 40% user acquisition growth",
          "Built MVP to 10K users",
          "Managed cross-functional team of 8"
        ],
        storyLevel: [
          "Launched MVP in 6 months",
          "Achieved $2M ARR increase",
          "Validated product-market fit"
        ],
        analysis: {
          totalMetrics: 6,
          impactLevel: 'team' as const,
          keyAchievements: [
            "Significant user growth (40%)",
            "Rapid MVP development (6 months)",
            "Substantial revenue impact ($2M ARR)"
          ]
        }
      }
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
      ],
      outcomeMetrics: {
        roleLevel: [
          "Designed scalable API architecture",
          "Led platform strategy development",
          "Collaborated with engineering teams"
        ],
        storyLevel: [
          "Improved API performance by 30%",
          "Reduced technical debt by 25%",
          "Enhanced platform scalability"
        ],
        analysis: {
          totalMetrics: 6,
          impactLevel: 'feature' as const,
          keyAchievements: [
            "API performance improvement (30%)",
            "Technical debt reduction (25%)",
            "Platform scalability enhancement"
          ]
        }
      }
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
          tags: ["0-1", "MVP", "Product Market Fit"]
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
      ],
      outcomeMetrics: {
        roleLevel: [
          "Built MVP from concept to launch",
          "Led product-market fit validation",
          "Made strategic product decisions"
        ],
        storyLevel: [
          "Launched MVP in 6 months",
          "Reached 10K+ users",
          "Validated product-market fit"
        ],
        analysis: {
          totalMetrics: 6,
          impactLevel: 'company' as const,
          keyAchievements: [
            "Successful MVP launch",
            "User validation (10K+)",
            "Product-market fit achieved"
          ]
        }
      }
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
      ],
      outcomeMetrics: {
        roleLevel: [
          "Limited platform strategy experience",
          "No API design or developer tools",
          "No infrastructure product management"
        ],
        storyLevel: [
          "Basic product management focus",
          "Feature delivery emphasis",
          "User-facing product experience"
        ],
        analysis: {
          totalMetrics: 3,
          impactLevel: 'feature' as const,
          keyAchievements: [
            "General product management",
            "Feature delivery",
            "User product focus"
          ]
        }
      }
    }
  }
};

interface AssessmentProps {
  initialSection?: string;
}

const Assessment = ({ initialSection }: AssessmentProps) => {
  const { setPrototypeState } = usePrototype();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [selectedCompetency, setSelectedCompetency] = useState<string | null>(null);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [levelEvidenceModalOpen, setLevelEvidenceModalOpen] = useState(false);
  const [roleEvidenceModalOpen, setRoleEvidenceModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showLeadershipTrack, setShowLeadershipTrack] = useState(false);

  // Handle initialSection prop for direct navigation
  useEffect(() => {
    if (initialSection) {
      if (initialSection === 'overall-level') {
        handleShowLevelEvidence();
      } else if (initialSection.startsWith('competency-')) {
        const competencyName = initialSection.replace('competency-', '');
        // Map URL names to actual competency names
        const competencyMap: Record<string, string> = {
          'execution': 'Product Execution',
          'customer-insight': 'Customer Insight',
          'strategy': 'Product Strategy',
          'influence': 'Influencing People'
        };
        const actualName = competencyMap[competencyName] || competencyName;
        const competencyData = mockAssessment.competencies.find(
          c => c.domain === actualName
        );
        if (competencyData) {
          handleShowEvidence(competencyData);
        }
      } else if (initialSection.startsWith('specialization-')) {
        const specializationName = initialSection.replace('specialization-', '');
        // Map URL names to actual specialization names
        const specializationMap: Record<string, string> = {
          'growth': 'Growth PM',
          'technical': 'Technical PM',
          'founding': 'Founding PM',
          'platform': 'Platform PM'
        };
        const actualName = specializationMap[specializationName] || specializationName;
        const specializationData = mockAssessment.roleArchetypes.find(
          s => s.type === actualName
        );
        if (specializationData) {
          handleShowRoleEvidence(specializationData.type);
        }
      }
    }
  }, [initialSection]);

  // Handle URL parameters for navigation from Header (legacy support)
  useEffect(() => {
    const competency = searchParams.get('competency');
    const specialization = searchParams.get('specialization');
    const level = searchParams.get('level');
    
    if (competency) {
      // Find the competency and open its evidence modal
      const competencyData = mockAssessment.competencies.find(
        c => c.domain.toLowerCase().includes(competency.toLowerCase())
      );
      if (competencyData) {
        handleShowEvidence(competencyData);
        // Clear the URL parameter
        navigate('/assessment', { replace: true });
      }
    }
    
    if (specialization) {
      // Find the specialization and open its evidence modal
      const specializationData = mockAssessment.roleArchetypes.find(
        s => s.type.toLowerCase().includes(specialization.toLowerCase())
      );
      if (specializationData) {
        handleShowRoleEvidence(specializationData.type);
        // Clear the URL parameter
        navigate('/assessment', { replace: true });
      }
    }

    if (level === 'overall') {
      // Open the level evidence modal
      handleShowLevelEvidence();
      // Clear the URL parameter
      navigate('/assessment', { replace: true });
    }
  }, [searchParams, navigate]);

  // Smart CTA logic - determine which area needs improvement
  const getSmartCTA = () => {
    const dataMetrics = {
      stories: 47,
      externalLinks: 3,
      outcomeMetrics: 5
    };
    
    // Find the metric with the lowest count
    const weakestArea = Object.entries(dataMetrics).reduce((a, b) => 
      dataMetrics[a[0]] < dataMetrics[b[0]] ? a : b
    );
    
    const ctaText = {
      stories: "Add More Stories",
      externalLinks: "Add External Links", 
      outcomeMetrics: "Add Outcome Metrics"
    };
    
    return {
      text: ctaText[weakestArea[0] as keyof typeof ctaText],
      area: weakestArea[0],
      count: weakestArea[1]
    };
  };

  const smartCTA = getSmartCTA();

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
      <main className="container mx-auto px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Page Description */}
          <p className="text-muted-foreground description-spacing">View your level, evidence and ways to progress</p>
          
          {/* Data Sources - Using new layout from DataSources page */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold tracking-tight text-lg">Data Sources</h3>
              <div className="text-right">
                <span className="text-xs text-muted-foreground mr-2">PROFILE STRENGTH:</span>
                <Badge className="bg-success text-success-foreground text-xs">Strong</Badge>
              </div>
            </div>
          </div>
          {/* Stats Overview - Using Cover Letters widget styling */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            {/* LinkedIn */}
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="h-2 w-2 rounded-full bg-success"></div>
                    <span className="text-xs text-muted-foreground">LinkedIn</span>
                  </div>
                  <div className="text-sm font-medium">Connected</div>
                </div>
              </CardContent>
            </Card>

            {/* Resume */}
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="h-2 w-2 rounded-full bg-success"></div>
                    <span className="text-xs text-muted-foreground">Resume</span>
                  </div>
                  <div className="text-sm font-medium">Uploaded</div>
                </div>
              </CardContent>
            </Card>

            {/* Outcome Metrics */}
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="h-2 w-2 rounded-full bg-success"></div>
                    <span className="text-xs text-muted-foreground">Outcome Metrics</span>
                  </div>
                  <div className="text-sm font-medium">5</div>
                </div>
              </CardContent>
            </Card>

            {/* Stories */}
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="h-2 w-2 rounded-full bg-success"></div>
                    <span className="text-xs text-muted-foreground">Stories</span>
                  </div>
                  <div className="text-sm font-medium">47</div>
                </div>
              </CardContent>
            </Card>

            {/* External Links */}
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="h-2 w-2 rounded-full bg-success"></div>
                    <span className="text-xs text-muted-foreground">External Links</span>
                  </div>
                  <div className="text-sm font-medium">3</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Combined Level Assessment & Career Progression */}
          <Card className="shadow-soft section-spacing">
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
              <div className="flex justify-center mb-4">
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
              <div className="mb-4 relative overflow-hidden -mx-6 my-4">
                {/* IC Track - Full Width */}
                <div className={`transition-transform duration-500 ease-in-out ${showLeadershipTrack ? '-translate-x-full' : 'translate-x-0'}`}>
                  <div className="bg-white">
                    {/* IC Track Header */}
                    <div className="text-left mb-4 border-t-2 border-blue-500 pt-4 px-6">
                      <h3 className="flex items-center gap-2 font-medium text-blue-900">
                        <Target className="h-5 w-5" />
                        Individual Contributor Track
                      </h3>
                    </div>
                    
                    {/* IC Track Steps */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-start">
                      {/* IC Track Items */}
                      <div className="flex flex-col lg:flex-row lg:items-center relative">
                        {/* Completed Steps */}
                        {/* Mobile: Card style */}
                        <div className="ladder-step-mobile-ic mx-4">
                          <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold mb-2">✓</div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-blue-900 mb-1">Associate PM</div>
                            <div className="text-xs text-muted-foreground text-center">0-2 years</div>
                          </div>
                        </div>
                        {/* Desktop: Original style */}
                        <div className="ladder-step-desktop ladder-step ladder-step-height">
                          <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold mb-2">✓</div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-blue-900 mb-1">Associate PM</div>
                            <div className="text-xs text-muted-foreground text-center">0-2 years</div>
                          </div>
                        </div>
                        {/* Horizontal connector (desktop) */}
                        <div className="ladder-conn-h ladder-conn-blue"></div>
                        {/* Vertical connector (mobile) */}
                        <div className="ladder-conn-v ladder-conn-blue"></div>
                        
                        {/* Mobile: Card style */}
                        <div className="ladder-step-mobile-ic mx-4">
                          <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold mb-2">✓</div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-blue-900 mb-1">PM</div>
                            <div className="text-xs text-muted-foreground text-center">2-4 years</div>
                          </div>
                        </div>
                        {/* Desktop: Original style */}
                        <div className="ladder-step-desktop ladder-step ladder-step-height">
                          <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold mb-2">✓</div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-blue-900 mb-1">PM</div>
                            <div className="text-xs text-muted-foreground text-center">2-4 years</div>
                          </div>
                        </div>
                        {/* Horizontal connector (desktop) */}
                        <div className="ladder-conn-h ladder-conn-blue"></div>
                        {/* Vertical connector (mobile) */}
                        <div className="ladder-conn-v ladder-conn-blue"></div>
                        
                        {/* Current Step - TODAY Card */}
                        <div className="ladder-card-labeled border-blue-500">
                          <div className="ladder-card-header bg-blue-600">
                            <div className="text-xs font-normal uppercase tracking-wide">TODAY</div>
                          </div>
                          <div className="ladder-card-content">
                            <div className="text-center">
                              <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold mb-3 mx-auto">✓</div>
                              <div className="text-sm font-medium bg-blue-500 text-white px-3 py-1 rounded-full mb-2">Sr PM</div>
                              <div className="text-xs text-muted-foreground">4-7 years</div>
                            </div>
                          </div>
                        </div>
                        {/* Horizontal connector (desktop) */}
                        <div className="ladder-conn-h ladder-conn-blue"></div>
                        {/* Vertical connector (mobile) */}
                        <div className="ladder-conn-v ladder-conn-blue"></div>
                        
                        {/* Next Step - NEXT STEP Card */}
                        <div className="ladder-card-labeled border-blue-500">
                          <div className="ladder-card-header bg-blue-600">
                            <div className="text-xs font-normal uppercase tracking-wide">NEXT STEP</div>
                          </div>
                          <div className="ladder-card-content">
                            <div className="text-center">
                              <div className="h-6 w-6 rounded-full border-2 border-blue-500 mb-3 mx-auto" style={{ borderColor: 'rgb(59 130 246)' }}></div>
                              <div className="text-sm font-medium text-blue-900 mb-2">Lead PM</div>
                              <div className="text-xs text-muted-foreground">Technical leadership</div>
                            </div>
                          </div>
                        </div>
                        {/* Horizontal connector (desktop) */}
                        <div className="ladder-conn-h ladder-conn-blue"></div>
                        {/* Vertical connector (mobile) */}
                        <div className="ladder-conn-v ladder-conn-blue"></div>
                        
                        {/* Future Step - Dotted Circle */}
                        {/* Mobile: Card style */}
                        <div className="ladder-step-mobile-ic mx-4">
                          <div className="h-6 w-6 rounded-full border-2 border-dashed border-blue-500 mb-2"></div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-blue-900 mb-1">Principal PM</div>
                            <div className="text-xs text-muted-foreground text-center">Domain expert</div>
                          </div>
                        </div>
                        {/* Desktop: Original style */}
                        <div className="ladder-step-desktop ladder-step ladder-step-height">
                          <div className="h-6 w-6 rounded-full border-2 border-dashed border-blue-500 mb-2"></div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-blue-900 mb-1">Principal PM</div>
                            <div className="text-xs text-muted-foreground text-center">Domain expert</div>
                          </div>
                        </div>
                        
                        {/* Full Height Vertical Separator - Blue when viewing IC (desktop only) */}
                        <div className="ladder-separator-ic"></div>
                      </div>
                      
                      {/* Spacing between tracks (desktop only) */}
                      <div className="hidden lg:block w-12"></div>
                      
                      {/* View Leadership Track Card */}
                      {/* Mobile: Primary CTA */}
                      <div className="ladder-cta-primary mt-4 lg:hidden" onClick={() => setShowLeadershipTrack(true)}>
                        <div className="text-sm font-medium flex items-center justify-center gap-2">
                          View Leadership Track
                          <TrendingUp className="h-4 w-4" />
                        </div>
                      </div>
                      {/* Desktop: Card with label */}
                      <div className="hidden lg:block ladder-card-labeled border-green-500 cursor-pointer mt-4" onClick={() => setShowLeadershipTrack(true)}>
                        <div className="ladder-card-header bg-green-600">
                          <div className="text-xs font-normal uppercase tracking-wide">VIEW</div>
                        </div>
                        <div className="ladder-card-content">
                          <div className="text-center">
                            <div className="text-xs text-green-900 font-medium">Leadership Track</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                                          {/* IC Guidance Banner */}
                      <div className="bg-blue-50 border-t-2 border-b-2 border-blue-500 py-4 px-6 mt-4 mb-4">
                      <div className="text-center">
                        <p className="text-blue-900 font-medium" style={{ fontSize: '1.1rem' }}>Demonstrate strategic thinking and organizational influence to advance</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Leadership Track - Slides in from right */}
                <div className={`absolute top-0 left-0 w-full transition-transform duration-500 ease-in-out ${showLeadershipTrack ? 'translate-x-0' : 'translate-x-full'}`}>
                  <div className="bg-white">
                    {/* Leadership Track Header */}
                    <div className="text-left mb-4 border-t-2 border-green-500 pt-4 px-6">
                      <h3 className="flex items-center gap-2 font-medium text-green-900">
                        <Users className="h-5 w-5" />
                        Leadership Track
                      </h3>
                    </div>
                    
                    {/* Leadership Track Steps */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-start px-6">
                      {/* View IC Track Card */}
                      {/* Mobile: Primary CTA */}
                      <div className="ladder-cta-primary mb-4 lg:mr-6 lg:hidden" onClick={() => setShowLeadershipTrack(false)}>
                        <div className="text-sm font-medium flex items-center justify-center gap-2">
                          View IC Track
                          <Target className="h-4 w-4" />
                        </div>
                      </div>
                      {/* Desktop: Card with label */}
                      <div className="hidden lg:block ladder-card-labeled border-blue-600 cursor-pointer mb-4 lg:mr-6" onClick={() => setShowLeadershipTrack(false)}>
                        <div className="ladder-card-header bg-blue-600">
                          <div className="text-xs font-normal uppercase tracking-wide">VIEW</div>
                        </div>
                        <div className="ladder-card-content">
                          <div className="text-center">
                            <div className="text-xs text-blue-900 font-medium">IC Track</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Leadership Track Items */}
                      <div className="flex flex-col lg:flex-row lg:items-center relative">
                        {/* Full Height Vertical Separator - Green when viewing Leadership (desktop only) */}
                        <div className="ladder-separator-leadership"></div>
                        
                        {/* First Step - Group PM / Manager */}
                        {/* Mobile: Card style */}
                        <div className="ladder-step-mobile-leadership">
                          <div className="h-6 w-6 rounded-full border-2 border-dashed border-green-500 mb-2"></div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-green-900 mb-1">Group PM / Manager</div>
                            <div className="text-xs text-muted-foreground text-center">Portfolio oversight</div>
                          </div>
                        </div>
                        {/* Desktop: Original style */}
                        <div className="ladder-step-desktop ladder-step ladder-step-height">
                          <div className="h-6 w-6 rounded-full border-2 border-dashed border-green-500 mb-2"></div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-green-900 mb-1">Group PM / Manager</div>
                            <div className="text-xs text-muted-foreground text-center">Portfolio oversight</div>
                          </div>
                        </div>
                        {/* Horizontal connector (desktop) */}
                        <div className="ladder-conn-h ladder-conn-green"></div>
                        {/* Vertical connector (mobile) */}
                        <div className="ladder-conn-v ladder-conn-green"></div>
                        
                        {/* Second Step - Director of Product */}
                        {/* Mobile: Card style */}
                        <div className="ladder-step-mobile-leadership">
                          <div className="h-6 w-6 rounded-full border-2 border-dashed border-green-500 mb-2"></div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-green-900 mb-1">Director of Product</div>
                            <div className="text-xs text-muted-foreground text-center">Strategic direction</div>
                          </div>
                        </div>
                        {/* Desktop: Original style */}
                        <div className="ladder-step-desktop ladder-step ladder-step-height">
                          <div className="h-6 w-6 rounded-full border-2 border-dashed border-green-500 mb-2"></div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-green-900 mb-1">Director of Product</div>
                            <div className="text-xs text-muted-foreground text-center">Strategic direction</div>
                          </div>
                        </div>
                        {/* Horizontal connector (desktop) */}
                        <div className="ladder-conn-h ladder-conn-green"></div>
                        {/* Vertical connector (mobile) */}
                        <div className="ladder-conn-v ladder-conn-green"></div>
                        
                        {/* Third Step - Vice President, Product */}
                        {/* Mobile: Card style */}
                        <div className="ladder-step-mobile-leadership">
                          <div className="h-6 w-6 rounded-full border-2 border-dashed border-green-500 mb-2"></div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-green-900 mb-1">Vice President, Product</div>
                            <div className="text-xs text-muted-foreground text-center">Executive leadership</div>
                          </div>
                        </div>
                        {/* Desktop: Original style */}
                        <div className="ladder-step-desktop ladder-step ladder-step-height">
                          <div className="h-6 w-6 rounded-full border-2 border-dashed border-green-500 mb-2"></div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-green-900 mb-1">Vice President, Product</div>
                            <div className="text-xs text-muted-foreground text-center">Executive leadership</div>
                          </div>
                        </div>
                        {/* Horizontal connector (desktop) */}
                        <div className="ladder-conn-h ladder-conn-green"></div>
                        {/* Vertical connector (mobile) */}
                        <div className="ladder-conn-v ladder-conn-green"></div>
                        
                        {/* Fourth Step - Chief Product Officer */}
                        {/* Mobile: Card style */}
                        <div className="ladder-step-mobile-leadership">
                          <div className="h-6 w-6 rounded-full border-2 border-dashed border-green-500 mb-2"></div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-green-900 mb-1">Chief Product Officer</div>
                            <div className="text-xs text-muted-foreground text-center">CPO</div>
                          </div>
                        </div>
                        {/* Desktop: Original style */}
                        <div className="ladder-step-desktop ladder-step ladder-step-height">
                          <div className="h-6 w-6 rounded-full border-2 border-dashed border-green-500 mb-2"></div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-green-900 mb-1">Chief Product Officer</div>
                            <div className="text-xs text-muted-foreground text-center">CPO</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                                          {/* Leadership Guidance Banner */}
                      <div className="bg-green-50 border-t-2 border-b-2 border-green-500 py-4 px-6 mb-4">
                      <div className="text-center">
                        <p className="text-green-900 font-medium" style={{ fontSize: '1.1rem' }}>Develop team leadership skills and strategic organizational thinking to advance</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
            </CardContent>
          </Card>



          {/* Competency Breakdown */}
          <Card className="shadow-soft section-spacing">
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
              <div className="assessment-grid">
                {mockAssessment.competencies.map((competency) => (
                  <CompetencyCard
                    key={competency.domain}
                    domain={competency.domain}
                    level={competency.level}
                    score={competency.score}
                    description={competency.description}
                    onViewEvidence={() => handleShowEvidence(competency)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Specialization Mapping */}
          <Card className="shadow-soft section-spacing">
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
              <div className="assessment-grid">
                {mockAssessment.roleArchetypes.map((archetype) => (
                  <SpecializationCard
                    key={archetype.type}
                    type={archetype.type}
                    match={archetype.match}
                    description={archetype.description}
                    tags={archetype.type === "Growth PM" ? ["Growth", "Leadership", "SaaS"] : 
                          archetype.type === "Technical PM" ? ["Technical", "Engineering", "Platform"] :
                          archetype.type === "Founding PM" ? ["0-1", "MVP", "Product-Market Fit"] :
                          ["Platform", "API", "Infrastructure"]}
                    experienceLevel={archetype.type === "Growth PM" ? "High" : 
                                   archetype.type === "Technical PM" ? "Medium" : "Low"}
                    onViewEvidence={() => handleShowRoleEvidence(archetype.type)}
                  />
                ))}
              </div>
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

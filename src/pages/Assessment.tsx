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
  Info
} from "lucide-react";

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
      description: "Consistently delivers complex products with measurable impact"
    },
    {
      domain: "Customer Insight",
      level: "Strong", 
      score: 80,
      evidence: "Samsung + Meta stories with user research",
      tags: ["Research", "User Experience", "Customer"],
      description: "Deep understanding of user needs and market validation"
    },
    {
      domain: "Product Strategy",
      level: "Emerging",
      score: 65,
      evidence: "2 strategy-related blurbs",
      tags: ["Strategy", "Vision", "Roadmap"],
      description: "Developing strategic thinking, needs more leadership examples"
    },
    {
      domain: "Influencing People",
      level: "Solid",
      score: 75,
      evidence: "Aurora + Meta stories tagged 'XFN Collaboration'",
      tags: ["Leadership", "Collaboration", "Stakeholder"],
      description: "Effective cross-functional collaboration and team influence"
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
  ]
};

const Assessment = () => {
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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="container py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header Summary Card */}
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
                          ? 'bg-primary' 
                          : index < 2 
                            ? 'bg-muted' 
                            : 'bg-muted/30'
                      }`} />
                      <div className="text-center">
                        <div className={`text-sm font-medium ${
                          level.current ? 'text-primary' : 'text-muted-foreground'
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
                    <Target className="h-4 w-4 text-primary" />
                    <span className="font-medium">Next Level: {mockAssessment.nextLevel}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Focus on strategic thinking and organizational influence to advance
                  </p>
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
                      <Badge className={getLevelColor(competency.level)}>
                        {competency.level}
                      </Badge>
                    </div>
                    
                    <Progress value={competency.score} className="h-2" />
                    
                    <div className="text-sm text-muted-foreground">
                      {competency.description}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {competency.evidence}
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {competency.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
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
                    <p className="text-xs text-muted-foreground mb-3">
                      {archetype.evidence}
                    </p>
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Typical profile includes:
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {archetype.typicalProfile}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Feedback & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Feedback Panel */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Feedback & Corrections
                </CardTitle>
                <CardDescription>
                  Help us improve your assessment
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

            {/* Next Actions */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Next Steps
                </CardTitle>
                <CardDescription>
                  Actions to improve your profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="primary" className="w-full">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  See Role Gaps
                </Button>
                <Button variant="secondary" className="w-full">
                  <Edit className="h-4 w-4 mr-2" />
                  Add More Stories
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Assessment;

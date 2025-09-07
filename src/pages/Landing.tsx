import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Zap, 
  Target, 
  Shield, 
  Users, 
  CheckCircle, 
  ArrowRight,
  Brain,
  FileText,
  TrendingUp,
  Lock
} from "lucide-react";

const Landing = () => {
  const features = [
    {
      icon: Shield,
      title: "Truth-Based AI",
      description: "No hallucinations. Every statement backed by your real experience and achievements."
    },
    {
      icon: Users,
      title: "Human-In-Loop Control", 
      description: "You approve every edit. Maintain complete control over your narrative."
    },
    {
      icon: Target,
      title: "Personalized Matching",
      description: "Smart story selection based on job requirements and your unique background."
    },
    {
      icon: Brain,
      title: "Learning System",
      description: "Gets smarter with every cover letter you approve and job you apply to."
    }
  ];

  const stats = [
    { value: "73%", label: "Higher Response Rate" },
    { value: "50%", label: "Faster Application Process" },
    { value: "0%", label: "Hallucination Rate" },
    { value: "95%", label: "User Satisfaction" }
  ];



  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="container py-6" style={{ backgroundColor: '#121212' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/narrata-logo.svg" 
              alt="Narrata" 
              className="h-8 w-auto"
            />
            <span className="text-white font-sans text-xl">Narrata</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/signin">
              <Button variant="tertiary">Login</Button>
            </Link>
                          <Link to="/signup">
                <Button variant="primary">Get Started</Button>
              </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-20">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-6 bg-success-light text-success">
            <Lock className="h-3 w-3 mr-1" />
            Truth-Based AI • No Hallucinations
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            The Truth-Based 
            <span className="bg-gradient-brand bg-clip-text text-transparent block">
              Narrative Engine
            </span>
            for Modern Workers
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Generate personalized, job-winning cover letters from your real experience. 
            Human-controlled AI that never invents achievements you don't have.
          </p>
          
           <div className="flex items-center justify-center gap-4 mb-12">
             <Link to="/signup">
               <Button variant="primary" size="lg" className="gap-2">
                 Start Building Your Library
                 <ArrowRight className="h-5 w-5" />
               </Button>
             </Link>
             <Button variant="secondary" size="lg">
               Watch Demo
             </Button>
           </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-accent mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Built by PMs for PMs
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Every feature designed around truth, modularity, and human control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {features.map((feature) => (
              <Card key={feature.title} className="shadow-medium hover:shadow-strong transition-all duration-300 group">
                <CardContent className="p-8">
                  <div className="h-12 w-12 rounded-lg bg-accent-light flex items-center justify-center mb-4 group-hover:bg-accent transition-colors">
                    <feature.icon className="h-6 w-6 text-accent group-hover:text-accent-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Three Steps to Truth-Based Cover Letters
            </h2>
          </div>

          <div className="space-y-8">
            <div className="flex items-start gap-6">
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Build Your Story Library
                </h3>
                <p className="text-muted-foreground">
                  Import from LinkedIn and resume. We extract real achievements and create modular content blocks you approve.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="h-10 w-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Smart Job Matching
                </h3>
                <p className="text-muted-foreground">
                  Paste any job description. Our AI suggests the best stories with confidence scores and reasoning—no guesswork.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="h-10 w-10 rounded-full bg-success text-success-foreground flex items-center justify-center font-bold text-lg flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Human-Approved Output
                </h3>
                <p className="text-muted-foreground">
                  Review, edit, and approve your draft. Export as PDF or copy to your application. Every word under your control.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <Card className="max-w-4xl mx-auto shadow-strong bg-gradient-brand text-primary-foreground">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Build Your Truth-Based Library?
            </h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Join hundreds of PMs, designers, and marketers who've transformed their job application process.
            </p>
             <Link to="/signup">
               <Button variant="secondary" size="lg" className="gap-2">
                 Get Started Free
                 <ArrowRight className="h-5 w-5" />
               </Button>
             </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container py-12 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/narrata-logo.svg" 
              alt="Narrata" 
              className="h-6 w-auto"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 Narrata. Built for authentic storytelling.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
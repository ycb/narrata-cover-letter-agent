import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { isWaitlistModeEnabled } from '@/lib/flags';

const LandingPage = () => {
  const waitlistMode = isWaitlistModeEnabled();
  const ctaHref = waitlistMode ? '/waitlist' : '/signup';
  const ctaLabel = waitlistMode ? 'Waitlist Signup' : 'Get Started (Free)';
  const headerHref = waitlistMode ? '/peter' : '/signin';
  const headerLabel = waitlistMode ? 'View Public Demo' : 'Sign In';

  // Analytics tracking helper
  const trackCTA = (location: string) => {
    // LogRocket custom event
    if (window.LogRocket) {
      window.LogRocket.track('cta_clicked', { location });
    }
    // Pendo track event
    if (window.pendo) {
      window.pendo.track('cta_clicked', { location });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-[#121212] sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Wordmark */}
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <img 
                src="/assets/narrata-logo.svg" 
                alt="Narrata" 
                className="h-12 w-auto"
              />
              <span className="text-white font-sans text-2xl">Narrata</span>
            </Link>
            
            {/* Center: Tagline */}
            <div className="hidden md:block font-medium absolute left-1/2 transform -translate-x-1/2" style={{ fontSize: '1.25rem', lineHeight: '1.75rem' }}>
              <div className="text-center" style={{ color: '#D92C94' }}>AI-Assisted Cover Letters </div>
              <div className="text-white text-center">⏩ Your Dream Job</div>
            </div>
            
            {/* Right: Sign In / Waitlist */}
            <Link to={headerHref}>
              <Button variant="outline" size="sm" className="bg-white text-[#121212] hover:bg-white/90">
                {headerLabel}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Exceptional cover letters start here
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Narrata builds cover letters from your verified experience and AI helps you refine. Never made up, always in your voice.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to={ctaHref} onClick={() => trackCTA('hero')}>
              <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 bg-cta-primary hover:bg-cta-primary-hover text-cta-primary-foreground">
                {ctaLabel}
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero Screenshot */}
        <div className="mt-8 md:mt-16 max-w-6xl mx-auto">
          <Card className="shadow-strong overflow-hidden">
            <CardContent className="p-0">
              {/* Mobile: Fade in/out carousel */}
              <div className="block md:hidden relative rounded-lg">
                <img 
                  src="/assets/screenshots/dashboard.png" 
                  alt="Narrata dashboard showing personalized insights and quick actions"
                  className="w-full h-auto animate-hero-mobile-1"
                  loading="eager"
                />
                <img 
                  src="/assets/screenshots/pm-levels-3.png" 
                  alt="PM Levels analysis showing role fit and career progression"
                  className="w-full h-auto absolute top-0 left-0 animate-hero-mobile-2"
                  loading="eager"
                />
                <img 
                  src="/assets/screenshots/work-history-2.png" 
                  alt="Work history with structured stories and achievements"
                  className="w-full h-auto absolute top-0 left-0 animate-hero-mobile-3"
                  loading="eager"
                />
                <img 
                  src="/assets/screenshots/template.png" 
                  alt="Cover letter template with dynamic story matching"
                  className="w-full h-auto absolute top-0 left-0 animate-hero-mobile-4"
                  loading="eager"
                />
              </div>
              {/* Desktop: Vertical scroll animation */}
              <div className="hidden md:block h-[500px] lg:h-[600px] overflow-hidden relative rounded-lg">
                <img 
                  src="/assets/screenshots/dashboard.png" 
                  alt="Narrata dashboard showing personalized insights and quick actions"
                  className="w-full h-auto absolute top-0 left-0 animate-hero-1"
                  loading="eager"
                />
                <img 
                  src="/assets/screenshots/pm-levels-3.png" 
                  alt="PM Levels analysis showing role fit and career progression"
                  className="w-full h-auto absolute top-0 left-0 animate-hero-2"
                  loading="eager"
                />
                <img 
                  src="/assets/screenshots/work-history-2.png" 
                  alt="Work history with structured stories and achievements"
                  className="w-full h-auto absolute top-0 left-0 animate-hero-3"
                  loading="eager"
                />
                <img 
                  src="/assets/screenshots/template.png" 
                  alt="Cover letter template with dynamic story matching"
                  className="w-full h-auto absolute top-0 left-0 animate-hero-4"
                  loading="eager"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <style>{`
          @keyframes hero-1 {
            0%, 2% {
              transform: translateY(0);
              opacity: 1;
            }
            22%, 23% {
              transform: translateY(var(--hero-scroll));
              opacity: 1;
            }
            24%, 99% {
              transform: translateY(0);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }
          
          @keyframes hero-2 {
            0%, 24% {
              transform: translateY(0);
              opacity: 0;
            }
            25%, 27% {
              transform: translateY(0);
              opacity: 1;
            }
            47%, 48% {
              transform: translateY(var(--hero-scroll));
              opacity: 1;
            }
            49%, 100% {
              transform: translateY(0);
              opacity: 0;
            }
          }
          
          @keyframes hero-3 {
            0%, 49% {
              transform: translateY(0);
              opacity: 0;
            }
            50%, 52% {
              transform: translateY(0);
              opacity: 1;
            }
            72%, 73% {
              transform: translateY(var(--hero-scroll));
              opacity: 1;
            }
            74%, 100% {
              transform: translateY(0);
              opacity: 0;
            }
          }
          
          @keyframes hero-4 {
            0%, 74% {
              transform: translateY(0);
              opacity: 0;
            }
            75%, 77% {
              transform: translateY(0);
              opacity: 1;
            }
            97%, 98% {
              transform: translateY(var(--hero-scroll));
              opacity: 1;
            }
            99% {
              transform: translateY(var(--hero-scroll));
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 0;
            }
          }
          
          .animate-hero-1,
          .animate-hero-2,
          .animate-hero-3,
          .animate-hero-4 {
            --hero-scroll: calc(-100% + 300px);
          }
          
          @media (min-width: 640px) {
            .animate-hero-1,
            .animate-hero-2,
            .animate-hero-3,
            .animate-hero-4 {
              --hero-scroll: calc(-100% + 400px);
            }
          }
          
          @media (min-width: 768px) {
            .animate-hero-1,
            .animate-hero-2,
            .animate-hero-3,
            .animate-hero-4 {
              --hero-scroll: calc(-100% + 500px);
            }
          }
          
          @media (min-width: 1024px) {
            .animate-hero-1,
            .animate-hero-2,
            .animate-hero-3,
            .animate-hero-4 {
              --hero-scroll: calc(-100% + 600px);
            }
          }
          
          .animate-hero-1 {
            animation: hero-1 40s ease-in-out infinite;
          }
          
          .animate-hero-2 {
            animation: hero-2 40s ease-in-out infinite;
          }
          
          .animate-hero-3 {
            animation: hero-3 40s ease-in-out infinite;
          }
          
          .animate-hero-4 {
            animation: hero-4 40s ease-in-out infinite;
          }
          
          /* Mobile fade in/out animations */
          @keyframes hero-mobile-1 {
            0%, 22% {
              opacity: 1;
            }
            25%, 97% {
              opacity: 0;
            }
            100% {
              opacity: 1;
            }
          }
          
          @keyframes hero-mobile-2 {
            0%, 22% {
              opacity: 0;
            }
            25%, 47% {
              opacity: 1;
            }
            50%, 100% {
              opacity: 0;
            }
          }
          
          @keyframes hero-mobile-3 {
            0%, 47% {
              opacity: 0;
            }
            50%, 72% {
              opacity: 1;
            }
            75%, 100% {
              opacity: 0;
            }
          }
          
          @keyframes hero-mobile-4 {
            0%, 72% {
              opacity: 0;
            }
            75%, 97% {
              opacity: 1;
            }
            100% {
              opacity: 0;
            }
          }
          
          .animate-hero-mobile-1 {
            animation: hero-mobile-1 20s ease-in-out infinite;
          }
          
          .animate-hero-mobile-2 {
            animation: hero-mobile-2 20s ease-in-out infinite;
          }
          
          .animate-hero-mobile-3 {
            animation: hero-mobile-3 20s ease-in-out infinite;
          }
          
          .animate-hero-mobile-4 {
            animation: hero-mobile-4 20s ease-in-out infinite;
          }
        `}</style>
      </section>

      {/* How Narrata Works Differently */}
      <section className="bg-muted/30 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-6">
              How is Narrata different from GPT or Claude?
            </h2>
            <p className="text-lg text-center text-muted-foreground mb-16 max-w-3xl mx-auto">
              General AI tools guess about your background and fill in the gaps. Narrata builds from your real experience, keeping you in control of every word.
            </p>

            {/* Comparison Grid */}
            <div className="grid md:grid-cols-2 gap-8 mb-16">
              {/* GPT/Claude Column */}
              <Card className="shadow-medium border-2 border-muted">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-foreground mb-6 text-center">GPT/Claude</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <span className="text-destructive text-2xl flex-shrink-0">✗</span>
                      <div className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Starts from scratch</strong>
                        <p>LLM generates text without understanding your career</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-destructive text-2xl flex-shrink-0">✗</span>
                      <div className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Guesses at fit</strong>
                        <p>No structured assessment of job requirements</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-destructive text-2xl flex-shrink-0">✗</span>
                      <div className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Generic output</strong>
                        <p>You spend hours rewriting hallucinations</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-destructive text-2xl flex-shrink-0">✗</span>
                      <div className="text-sm text-muted-foreground">
                        <strong className="text-foreground">No feedback loop</strong>
                        <p>Can't tell if your edits improved the letter</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Narrata Column */}
              <Card className="shadow-strong border-2 border-primary">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-foreground mb-6 text-center">Narrata</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
                      <div className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Starts with your verified content</strong>
                        <p>Your resume, stories, and strengths become approved building blocks</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
                      <div className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Intelligent assessment first</strong>
                        <p>Analyzes job, PM Level, goals, and requirements before drafting</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
                      <div className="text-sm text-muted-foreground">
                        <strong className="text-foreground">AI refines, never invents</strong>
                        <p>AI only helps polish and personalize your verified content</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
                      <div className="text-sm text-muted-foreground">
                        <strong className="text-foreground">You stay in control</strong>
                        <p>You approve every word; AI suggestions are always optional</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </section>

      {/* Core Benefits */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-16">
            Benefits of using Narrata
          </h2>

          <div className="space-y-24">
            {/* Benefit 1 - Intelligent Job Matching */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Understand your job fit instantly</h3>
                <p className="text-muted-foreground mb-6">
                  Before generating any text, Narrata performs intelligent assessment:
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span>Structured extraction of requirements</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span>Goals, strengths, and level fit analysis</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span>Real scores, real gaps</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span>No guessing</span>
                  </li>
                </ul>
              </div>
              <div>
                <img 
                  src="/assets/screenshots/metrics-toolbar.png" 
                  alt="Intelligent job matching with real scores before drafting"
                  className="w-full h-auto rounded-lg shadow-medium"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Benefit 2 - Know What to Fix */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1">
                <Card className="shadow-medium">
                  <CardContent className="p-0">
                    <img 
                      src="/assets/screenshots/HIL.png" 
                      alt="Actionable improvement suggestions during drafting"
                      className="w-full h-auto rounded-lg"
                      loading="lazy"
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="order-1 md:order-2">
                <h3 className="text-2xl font-bold text-foreground mb-4">Know exactly what to fix</h3>
                <p className="text-muted-foreground mb-6">
                  During drafting, Narrata gives you actionable guidance:
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span>Highlights missing requirements</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span>Gives actionable fixes</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span>You approve every word</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span>AI refines but never invents</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Benefit 3 - Real Experience Library */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Built from your real experience</h3>
                <p className="text-muted-foreground mb-6">
                  Your library grows with you:
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span>Stories, achievements, and role summaries become reusable blocks</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span>No guessing or made-up content</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span>Every edit strengthens your library for future applications</span>
                  </li>
                </ul>
              </div>
              <div>
                <img 
                  src="/assets/screenshots/work-history.png" 
                  alt="Reusable content library that grows with every application"
                  className="w-full h-auto rounded-lg shadow-medium"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/30 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-16">
              How it works
            </h2>

            <div className="grid md:grid-cols-2 gap-12">
              {/* Step 1 */}
              <Card className="shadow-medium">
                <CardContent className="p-8">
                  <div className="mb-6">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg mb-4">
                      1
                    </span>
                    <h3 className="text-xl font-bold text-foreground mb-3">Upload your materials</h3>
                    <p className="text-muted-foreground text-sm">
                      Narrata identifies your PM Level and extracts strengths, stories, and key accomplishments into verified content blocks.
                    </p>
                  </div>
                  <img 
                    src="/assets/screenshots/my-data.png" 
                    alt="Upload your work history and experience data"
                    className="w-full h-auto rounded-lg"
                    loading="lazy"
                  />
                </CardContent>
              </Card>

              {/* Step 2 */}
              <Card className="shadow-medium">
                <CardContent className="p-8">
                  <div className="mb-6">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg mb-4">
                      2
                    </span>
                    <h3 className="text-xl font-bold text-foreground mb-3">Set your goals</h3>
                    <p className="text-muted-foreground text-sm">
                      Tell Narrata what you're looking for in your next role so it can match your strengths to relevant opportunities.
                    </p>
                  </div>
                  <img 
                    src="/assets/screenshots/my-goals.png" 
                    alt="Define your career goals and preferences"
                    className="w-full h-auto rounded-lg"
                    loading="lazy"
                  />
                </CardContent>
              </Card>

              {/* Step 3 */}
              <Card className="shadow-medium">
                <CardContent className="p-8">
                  <div className="mb-6">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg mb-4">
                      3
                    </span>
                    <h3 className="text-xl font-bold text-foreground mb-3">See how you match</h3>
                    <p className="text-muted-foreground text-sm">
                      Narrata analyzes the job against your profile and shows exactly which of your strengths align with the role.
                    </p>
                  </div>
                  <img 
                    src="/assets/screenshots/match-with-strengths.png" 
                    alt="Intelligent job-to-profile matching showing strengths alignment"
                    className="w-full h-auto rounded-lg"
                    loading="lazy"
                  />
                </CardContent>
              </Card>

              {/* Step 4 */}
              <Card className="shadow-medium">
                <CardContent className="p-8">
                  <div className="mb-6">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg mb-4">
                      4
                    </span>
                    <h3 className="text-xl font-bold text-foreground mb-3">Refine with AI guidance</h3>
                    <p className="text-muted-foreground text-sm">
                      Edit your draft with real-time suggestions. Narrata shows what's missing and helps you strengthen each section.
                    </p>
                  </div>
                  <img 
                    src="/assets/screenshots/HIL.png" 
                    alt="Human-in-the-loop editing with AI-powered improvement suggestions"
                    className="w-full h-auto rounded-lg"
                    loading="lazy"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to save time and strengthen every application?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Get your first personalized draft in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to={ctaHref} onClick={() => trackCTA('bottom')}>
              <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 bg-cta-primary hover:bg-cta-primary-hover text-cta-primary-foreground">
                {ctaLabel}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
   
    </div>
  );
};

export default LandingPage;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Mail, Lock, User, Linkedin, AlertCircle, Loader2 } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

const SignUp = () => {
  const { signUp, signInWithGoogle, signInWithLinkedIn, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    agreeTerms: false
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);

  const redirectError = location.state?.error;

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formError) setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agreeTerms) {
      setFormError('You must agree to the terms and conditions');
      return;
    }

    setIsSubmitting(true);
    setIsSigningUp(true);
    setFormError(null);

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const result = await signUp(formData.email, formData.password, fullName);
      
      if (result.error) {
        setFormError(result.error.message || 'Sign up failed');
        setIsSigningUp(false);
      } else if (result.message) {
        // Email confirmation required
        setFormError(result.message);
        setIsSigningUp(false);
      } else {
        // User is automatically signed in, show success and redirect
        setFormError(null);
        // Small delay to show success state
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred');
      setIsSigningUp(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setFormError(error.message || 'Google sign in failed');
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred');
    }
  };

  const handleLinkedInSignIn = async () => {
    try {
      const { error } = await signInWithLinkedIn();
      if (error) {
        setFormError(error.message || 'LinkedIn sign in failed');
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">TruthLetter</h1>
          <p className="text-muted-foreground">Create your truth-based narrative engine</p>
        </div>

        <Card className="shadow-medium">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Choose your preferred sign up method
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Success Alert */}
            {isSigningUp && !formError && (
              <Alert className="mb-4" variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Account created successfully! Redirecting to dashboard...
                </AlertDescription>
              </Alert>
            )}

            {/* Error Alert */}
            {(error || formError || redirectError) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {formError || error || redirectError || 'An error occurred'}
                </AlertDescription>
              </Alert>
            )}

            {/* Social Login Buttons */}
            <div className="space-y-3">
              <Button 
                variant="secondary" 
                className="w-full gap-2"
                onClick={handleLinkedInSignIn}
                disabled={loading}
              >
                <Linkedin className="h-4 w-4" />
                Continue with LinkedIn
              </Button>
              
              <Button 
                variant="secondary" 
                className="w-full gap-2"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      placeholder="John"
                      className="pl-9"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    className="pl-9"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a secure password"
                    className="pl-9 pr-9"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreeTerms}
                  onCheckedChange={(checked) => handleInputChange("agreeTerms", checked as boolean)}
                />
                <Label htmlFor="terms" className="text-sm text-muted-foreground">
                  I agree to the{" "}
                  <Link to="/terms" className="text-accent hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-accent hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              <Button 
                type="submit"
                className="w-full" 
                variant="primary" 
                size="lg"
                disabled={isSubmitting || loading || isSigningUp}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : isSigningUp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/signin" className="text-accent hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-muted-foreground">
          <p>© 2024 TruthLetter. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
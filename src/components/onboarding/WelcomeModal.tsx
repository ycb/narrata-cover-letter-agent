import React, { useState } from 'react';
import { X, Mail, Gift, MessageCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      localStorage.setItem('narrata-beta-email', email);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting email:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetStarted = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative pb-6 pt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGetStarted}
            className="absolute right-4 top-4 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl font-bold text-center text-black">
            Welcome to Narrata
          </CardTitle>
          <CardDescription className="text-center text-lg">
            AI cover letter agent built specifically for PMs
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-3 pb-6">
          <div className="space-y-3 text-gray-700 mb-6">
            <p>
              My goal is to help job-seekers land more interviews with intelligent feedback, 
              re-usable content and objective assessment.
            </p>
            
            <p>
              <strong>V1 is a fully-functional React web app</strong> that demonstrates end-to-end 
              functionality using mock data. I'm hoping to get input from PM's looking for a job 
              or considering a career change. It's easy to provide comments via the built-in 
              feedback tool on every page.
            </p>
          </div>

          {!isSubmitted ? (
            <div className="bg-gradient-to-r from-[#E32D9A]/10 to-pink-100 p-6 rounded-lg border border-[#E32D9A]/20 space-y-6 mb-6">
              <div className="flex items-center gap-3">
                <Gift className="h-6 w-6 text-[#E32D9A]" />
                <h3 className="text-lg font-semibold text-[#E32D9A]">
                  Beta Testing Opportunity
                </h3>
              </div>
              
              <p className="text-gray-700 my-4">
                The first <strong>100 people</strong> to provide thoughtful feedback will receive
                <strong> 1 month free access</strong> during beta testing. Opt-in by providing
                your email address. In case of over-subscription, slots will be reserved based
                on the number of comments left per user.
              </p>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                    required
                  />
                  <Button 
                    type="submit" 
                    disabled={isLoading || !email}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                  >
                    {isLoading ? 'Opting In...' : 'Opt In'}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-green-50 p-6 rounded-lg border border-green-200 space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <Mail className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-800">
                  You're In! 🎉
                </h3>
              </div>
              <p className="text-green-700">
                Thanks for opting in! We'll be in touch about your beta access. 
                Start exploring and don't forget to leave feedback using the pink 
                feedback buttons throughout the app.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200 mb-6">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <p className="text-blue-800 text-sm">
              Look for the pink "Provide Feedback" buttons on every page to share your thoughts!
            </p>
          </div>

          <div className="flex justify-center pt-3">
            <Button 
              onClick={handleGetStarted}
              className="bg-[#E32D9A] hover:bg-[#E32D9A]/90 text-white px-8 py-3 text-lg"
            >
              Get Started
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
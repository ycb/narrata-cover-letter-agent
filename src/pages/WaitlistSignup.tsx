import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Gift, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const getUtmParams = (search: string) => {
  const params = new URLSearchParams(search);
  const utm: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  return Object.keys(utm).length ? utm : null;
};

const submitViaAppsScript = async (url: string, data: Record<string, unknown>): Promise<void> => {
  // Use a form submission approach to bypass CORS.
  return new Promise((resolve, reject) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.name = 'waitlist-submission-frame';
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = url;
      form.target = 'waitlist-submission-frame';
      form.style.display = 'none';

      Object.entries(data).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

      setTimeout(() => {
        try {
          document.body.removeChild(form);
          document.body.removeChild(iframe);
        } catch {
          // ignore
        }
        resolve();
      }, 1500);
    } catch (err) {
      reject(err);
    }
  });
};

const WaitlistSignup = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const utm = useMemo(() => getUtmParams(location.search), [location.search]);
  const appsScriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL as string | undefined;

  const close = () => navigate('/', { replace: true });

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    setIsSubmitting(true);
    setStatus('idle');
    setErrorMessage(null);

    try {
      const clickLocation = { x: 0, y: 0 };
      const payload = {
        // Must match Apps Script routing in doPost(e)
        submissionType: 'beta-signup',
        timestamp: new Date().toISOString(),
        pageUrl: window.location.href,
        message: 'Waitlist signup',
        email: normalizedEmail,
        clickLocation,
        userAgent: navigator.userAgent,
        category: 'beta_waitlist',
        sentiment: 'Neutral',
        source: 'landing_waitlist',
        referrer: document.referrer || null,
        utm,
      };

      if (!appsScriptUrl) {
        throw new Error(
          'Missing VITE_GOOGLE_APPS_SCRIPT_URL. Add it to your .env and restart the dev server.'
        );
      }

      await submitViaAppsScript(appsScriptUrl, payload);
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Dialog open onOpenChange={(open) => (!open ? close() : undefined)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <div className="p-8 md:p-10 space-y-6">
            <DialogHeader className="space-y-3 text-center">
              <DialogTitle className="text-3xl md:text-4xl font-bold">Welcome to Narrata</DialogTitle>
              <DialogDescription className="text-base md:text-lg">
                AI cover letter agent for PMs
              </DialogDescription>
            </DialogHeader>

            <div className="text-muted-foreground leading-relaxed">
              <p>
                Narrata help job-seekers land more interviews with intelligent feedback, re-usable content and objective level assessment              </p>
            </div>

            <Card className="border-2 border-pink-200 bg-pink-50/60 shadow-none">
              <CardContent className="p-6 md:p-7 space-y-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-pink-100 p-2">
                    <Gift className="h-5 w-5 text-pink-700" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-pink-700">Waitlist Signup</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="waitlist-email">Email Address</Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      id="waitlist-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void submit();
                        }
                      }}
                    />
                    <Button
                      onClick={() => void submit()}
                      disabled={isSubmitting || !email.trim()}
                      className="sm:w-32"
                      variant="secondary"
                    >
                      {isSubmitting ? '...' : 'Opt In'}
                    </Button>
                  </div>
                  {status === 'success' ? (
                    <div className="text-sm text-green-700 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      You’re on the waitlist. We’ll email you soon.
                    </div>
                  ) : null}
                  {status === 'error' ? (
                    <div className="text-sm text-red-600">{errorMessage}</div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            

            <div className="flex justify-center pt-2">
              <Button
                size="lg"
                className="px-10 bg-cta-primary hover:bg-cta-primary-hover text-cta-primary-foreground"
                onClick={close}
              >
                Back to Landing
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaitlistSignup;

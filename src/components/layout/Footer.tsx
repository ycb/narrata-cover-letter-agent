import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Mail } from 'lucide-react';

export function Footer() {
  const [showContactModal, setShowContactModal] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    setIsSending(true);
    try {
      // Use your existing edge function for sending support emails
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      
      if (response.ok) {
        setMessage('');
        setShowContactModal(false);
        alert('Message sent! We\'ll get back to you soon.');
      } else {
        alert('Failed to send message. Please try emailing support@narrata.co directly.');
      }
    } catch (error) {
      alert('Failed to send message. Please try emailing support@narrata.co directly.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div>
              © {new Date().getFullYear()} Narrata. All rights reserved.
            </div>
            <div className="flex gap-6">
              <Link 
                to="/terms" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-muted-foreground hover:underline transition-colors"
              >
                Terms of Service
              </Link>
              <Link 
                to="/privacy" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-muted-foreground hover:underline transition-colors"
              >
                Privacy Policy
              </Link>
              <button
                onClick={() => setShowContactModal(true)}
                className="text-muted-foreground hover:text-muted-foreground hover:underline transition-colors"
              >
                Contact
              </button>
            </div>
          </div>
        </div>
      </footer>

      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Support</DialogTitle>
            <DialogDescription>
              Send us a message or email us directly at{' '}
              <a href="mailto:support@narrata.co" className="text-primary hover:underline">
                support@narrata.co
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="How can we help you?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowContactModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
              >
                <Mail className="w-4 h-4 mr-2" />
                {isSending ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

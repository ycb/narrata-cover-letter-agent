import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

const FeedbackModal = ({ isOpen, onClose, title = "Feedback" }: FeedbackModalProps) => {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    
    setIsSubmitting(true);
    
    // TODO: Implement actual feedback submission
    console.log("Feedback submitted:", feedback);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setFeedback("");
    onClose();
  };

  const handleClose = () => {
    setFeedback("");
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-end pointer-events-none">
      {/* Modal */}
      <div className="relative bg-background border rounded-lg shadow-lg p-6 w-96 max-h-[80vh] overflow-y-auto mr-4 pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="feedback" className="text-sm font-medium">
              Tell us what seems wrong
            </label>
            <Textarea
              id="feedback"
              placeholder="Please describe what seems incorrect or needs improvement..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="mt-2 min-h-[100px] resize-none"
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground mt-1">
              {feedback.length}/500 characters
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!feedback.trim() || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;

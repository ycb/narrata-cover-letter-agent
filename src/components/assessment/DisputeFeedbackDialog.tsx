import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendSupportEmail } from "@/utils/supportEmail";

interface DisputeFeedbackDialogProps {
  subject: string;
  metadata?: Record<string, unknown>;
  contextLabel?: string;
  buttonLabel?: string;
  triggerProps?: ButtonProps;
  defaultMessage?: string;
  promptText?: string;
}

export function DisputeFeedbackDialog({
  subject,
  metadata,
  contextLabel = "Share what doesn't look right so we can investigate.",
  buttonLabel = "This doesn't look right",
  triggerProps,
  defaultMessage = "",
  promptText = "Help us understand what seems inaccurate. The more specific you can be, the faster we can resolve it.",
}: DisputeFeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(defaultMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please add a quick note so we know what to review.");
      return;
    }

    setIsSubmitting(true);
    try {
      const contextMetadata = {
        ...metadata,
        userMessage: message.trim(),
        location: typeof window !== "undefined" ? window.location.href : undefined,
      };

      const bodyLines = [
        message.trim(),
        "",
        "---",
        "Context:",
        JSON.stringify(contextMetadata, null, 2),
      ];

      const result = await sendSupportEmail({
        subject,
        body: bodyLines.join("\n"),
        metadata: contextMetadata,
        tags: ["pm-levels", "dispute"],
      });

      if (result.success) {
        toast.success(
          result.fallback
            ? "Opened your mail client—add any extra details and send."
            : "Thanks! We’ve notified support and will take a look."
        );
        setOpen(false);
        setMessage(defaultMessage);
      } else {
        toast.error(
          result.error ||
            "We couldn't send that. Please email support@narrata.co directly."
        );
      }
    } catch (error) {
      console.error("[DisputeFeedbackDialog] Failed to send dispute:", error);
      toast.error("Something went wrong. Please email support@narrata.co directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="cta-secondary"
        size="sm"
        onClick={() => setOpen(true)}
        {...triggerProps}
      >
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={(value) => !isSubmitting && setOpen(value)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tell us what feels off</DialogTitle>
            <DialogDescription>{promptText}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={6}
              placeholder="Example: The confidence jumped to 90% even though I only have one story tagged for Strategy."
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send to support"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}



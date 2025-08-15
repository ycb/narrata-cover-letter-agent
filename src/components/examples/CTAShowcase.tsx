import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Download, Edit } from "lucide-react";

export const CTAShowcase = () => {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>CTA Design System</CardTitle>
        <CardDescription>
          Three-tier button hierarchy for clear visual hierarchy and user guidance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Primary CTA Examples */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Primary CTA (Main Actions)</h3>
          <p className="text-sm text-muted-foreground">
            Filled buttons for the primary action on each page. Use sparingly - ideally one per page.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="cta-primary" size="lg">
              <Save className="h-4 w-4" />
              Save Template
            </Button>
            <Button variant="cta-primary">
              Create New
            </Button>
            <Button variant="cta-primary" size="sm">
              Get Started
            </Button>
          </div>
        </div>

        {/* Secondary CTA Examples */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Secondary CTA (Supporting Actions)</h3>
          <p className="text-sm text-muted-foreground">
            Outline buttons for important but secondary actions. Can have multiple per page.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="cta-secondary" size="lg">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="cta-secondary">
              Preview
            </Button>
            <Button variant="cta-secondary" size="sm">
              Learn More
            </Button>
          </div>
        </div>

        {/* Tertiary CTA Examples */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Tertiary CTA (Subtle Actions)</h3>
          <p className="text-sm text-muted-foreground">
            Text-only buttons for less prominent actions like navigation or optional features.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="cta-tertiary" size="lg">
              <Edit className="h-4 w-4" />
              Edit Settings
            </Button>
            <Button variant="cta-tertiary">
              Cancel
            </Button>
            <Button variant="cta-tertiary" size="sm">
              Skip for now
            </Button>
          </div>
        </div>

        {/* Usage Guidelines */}
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-semibold">Usage Guidelines</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li><strong>Primary:</strong> One per page for the main conversion action</li>
            <li><strong>Secondary:</strong> Supporting actions that are important but not primary</li>
            <li><strong>Tertiary:</strong> Navigation, cancel actions, or optional features</li>
            <li><strong>Dark Mode:</strong> All variants automatically adapt to dark mode</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Linkedin, FileText, ArrowRight, Briefcase } from "lucide-react";

interface WorkHistoryOnboardingProps {
  onConnectLinkedIn: () => void;
  onUploadResume: () => void;
}

export function WorkHistoryOnboarding({
  onConnectLinkedIn,
  onUploadResume
}: WorkHistoryOnboardingProps) {
  return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            Build Your Work History
          </h2>
          <p className="text-muted-foreground text-lg">
            Import your professional experience to create powerful, personalized cover letter content
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LinkedIn Option */}
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer group" onClick={onConnectLinkedIn}>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Linkedin className="h-6 w-6 text-blue-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Connect LinkedIn</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically import your work history, roles, and achievements from your LinkedIn profile
                </p>
              </div>
              <Button 
                onClick={onConnectLinkedIn}
                className="w-full group-hover:bg-primary/90 transition-colors"
              >
                <Linkedin className="h-4 w-4 mr-2" />
                Connect LinkedIn
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>

          {/* Resume Option */}
          <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer group" onClick={onUploadResume}>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                <FileText className="h-6 w-6 text-slate-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Upload Resume</h3>
                <p className="text-sm text-muted-foreground">
                  Extract work history and achievements from your existing resume document
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={onUploadResume}
                className="w-full group-hover:bg-muted transition-colors"
              >
                <FileText className="h-4 w-4 mr-2" />
                Upload Resume
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>

        <div className="pt-6 border-t">
          <p className="text-sm text-muted-foreground">
            You can also manually add companies and roles using the "Add Company" button above
          </p>
        </div>
      </div>
    </div>
  );
}
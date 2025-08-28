import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building, 
  Briefcase, 
  Calendar,
  FileText,
  Users,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

interface ExtractedRole {
  id: string;
  company: string;
  title: string;
  dates: string;
  source: 'resume' | 'linkedin';
  stories: Array<{
    id: string;
    content: string;
    approved: boolean;
  }>;
}

interface ContentReviewFlowProps {
  extractedRoles: ExtractedRole[];
  onReviewComplete: (approvedRoles: ExtractedRole[]) => void;
}

export function ContentReviewFlow({ extractedRoles, onReviewComplete }: ContentReviewFlowProps) {
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [approvedRoles, setApprovedRoles] = useState<ExtractedRole[]>([]);
  const [rejectedRoles, setRejectedRoles] = useState<ExtractedRole[]>([]);
  const [currentRole, setCurrentRole] = useState<ExtractedRole>(extractedRoles[0]);

  const totalRoles = extractedRoles.length;
  const progress = ((approvedRoles.length + rejectedRoles.length) / totalRoles) * 100;

  const handleApprove = () => {
    const updatedRole = { ...currentRole, stories: currentRole.stories.map(story => ({ ...story, approved: true })) };
    setApprovedRoles(prev => [...prev, updatedRole]);
    moveToNextRole();
  };

  const handleReject = () => {
    setRejectedRoles(prev => [...prev, currentRole]);
    moveToNextRole();
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    console.log('Edit role:', currentRole);
  };

  const moveToNextRole = () => {
    const nextIndex = currentRoleIndex + 1;
    if (nextIndex < totalRoles) {
      setCurrentRoleIndex(nextIndex);
      setCurrentRole(extractedRoles[nextIndex]);
    } else {
      // Review complete
      onReviewComplete(approvedRoles);
    }
  };

  const moveToPreviousRole = () => {
    if (currentRoleIndex > 0) {
      const prevIndex = currentRoleIndex - 1;
      setCurrentRoleIndex(prevIndex);
      setCurrentRole(extractedRoles[prevIndex]);
      
      // Remove from approved/rejected lists
      setApprovedRoles(prev => prev.filter(role => role.id !== extractedRoles[prevIndex].id));
      setRejectedRoles(prev => prev.filter(role => role.id !== extractedRoles[prevIndex].id));
    }
  };

  const getSourceIcon = (source: 'resume' | 'linkedin') => {
    return source === 'resume' ? FileText : Users;
  };

  const getSourceColor = (source: 'resume' | 'linkedin') => {
    return source === 'resume' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  if (!currentRole) {
    return (
      <div className="text-center space-y-4">
        <h3 className="text-xl font-semibold">No roles to review</h3>
        <p className="text-muted-foreground">Please upload your documents first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Reviewing your work history</span>
          <Badge variant="secondary">
            {currentRoleIndex + 1} of {totalRoles}
          </Badge>
        </div>
        <Progress value={progress} className="w-full max-w-md mx-auto" />
        <p className="text-sm text-muted-foreground">
          {approvedRoles.length} approved • {rejectedRoles.length} removed
        </p>
      </div>

      {/* Current Role Card */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <CardTitle className="text-xl">{currentRole.company}</CardTitle>
              <p className="text-muted-foreground">{currentRole.title}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{currentRole.dates}</span>
            </div>
            <Badge variant="secondary" className={getSourceColor(currentRole.source)}>
              {React.createElement(getSourceIcon(currentRole.source), { className: "w-3 h-3 mr-1" })}
              {currentRole.source === 'resume' ? 'Resume' : 'LinkedIn'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium text-center">Stories & Achievements</h4>
            {currentRole.stories.map((story, index) => (
              <div key={story.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{story.content}</p>
              </div>
            ))}
            <p className="text-xs text-center text-muted-foreground">
              {currentRole.stories.length} story{currentRole.stories.length !== 1 ? 's' : ''} extracted
            </p>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              You can improve or edit these later—we're just getting started.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={moveToPreviousRole}
          disabled={currentRoleIndex === 0}
          className="px-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={handleEdit}
          className="px-6"
        >
          <Clock className="w-4 h-4 mr-2" />
          Edit
        </Button>

        <Button
          variant="destructive"
          size="lg"
          onClick={handleReject}
          className="px-6"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Remove
        </Button>

        <Button
          size="lg"
          onClick={handleApprove}
          className="px-6"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Keep
        </Button>
      </div>

      {/* Navigation Info */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Use Keep to approve this role and its stories</p>
        <p>Use Remove to exclude this role from your library</p>
        <p>You can always edit or add more content later</p>
      </div>
    </div>
  );
}

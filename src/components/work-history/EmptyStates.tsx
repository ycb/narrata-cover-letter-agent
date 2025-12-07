import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Briefcase, FileText, Link as LinkIcon, Plus, Upload } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionLink?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionLink,
  onAction,
  icon
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {icon || <Briefcase className="h-6 w-6 text-muted-foreground" />}
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          {actionLink ? (
            <Button asChild>
              <Link to={actionLink}>{actionLabel || "Get Started"}</Link>
            </Button>
          ) : onAction ? (
            <Button onClick={onAction}>{actionLabel || "Get Started"}</Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function WorkHistoryEmptyState() {
  return (
    <EmptyState
      title="No work history yet"
      description="Start building your professional story by adding your work experience, stories, and achievements."
      actionLabel="Go to Onboarding"
      actionLink="/onboarding"
      icon={<Briefcase className="h-6 w-6 text-muted-foreground" />}
    />
  );
}

export function StoriesEmptyState({ onAddStory }: { onAddStory?: () => void }) {
  return (
    <EmptyState
      title="No stories found"
      description="Stories help showcase your achievements and impact. Add your first story to get started."
      actionLabel="Add Story"
      onAction={onAddStory}
      icon={<FileText className="h-6 w-6 text-muted-foreground" />}
    />
  );
}

export function LinksEmptyState({ onAddLink }: { onAddLink?: () => void }) {
  return (
    <EmptyState
      title="No links found"
      description="External links help provide context and evidence for your work. Add portfolio pieces, articles, or case studies."
      actionLabel="Add Link"
      onAction={onAddLink}
      icon={<LinkIcon className="h-6 w-6 text-muted-foreground" />}
    />
  );
}

export function DashboardEmptyState() {
  return (
    <EmptyState
      title="Complete your onboarding"
      description="Finish setting up your profile to unlock your personalized dashboard and start creating cover letters."
      actionLabel="Complete Onboarding"
      actionLink="/onboarding"
      icon={<Upload className="h-6 w-6 text-muted-foreground" />}
    />
  );
}


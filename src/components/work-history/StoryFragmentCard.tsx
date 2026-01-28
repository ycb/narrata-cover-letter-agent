import { ContentCard } from "@/components/shared/ContentCard";
import { Button } from "@/components/ui/button";
import { formatMetricText } from "@/lib/metricUtils";
import type { WorkHistoryBlurb, StoryFragment } from "@/types/workHistory";

interface StoryFragmentCardProps {
  fragment: StoryFragment;
  onGenerate?: (fragment: StoryFragment) => void;
  onDelete?: (fragment: StoryFragment) => void;
}

const toBlurb = (fragment: StoryFragment): WorkHistoryBlurb => ({
  id: fragment.id,
  roleId: fragment.workItemId || '',
  title: fragment.title || 'Untitled fragment',
  content: fragment.content,
  outcomeMetrics: Array.isArray(fragment.metrics)
    ? (fragment.metrics as any[])
        .map(formatMetricText)
        .filter((text) => text.length > 0)
    : [],
  tags: fragment.tags,
  source: 'resume',
  status: fragment.status === 'promoted' ? 'approved' : 'needs-review',
  confidence: 'medium',
  timesUsed: 0,
  lastUsed: undefined,
  createdAt: fragment.createdAt,
  updatedAt: fragment.updatedAt,
});

export function StoryFragmentCard({ fragment, onGenerate, onDelete }: StoryFragmentCardProps) {
  const fragmentAsStory = toBlurb(fragment);
  const canAct = fragment.status !== 'archived';

  return (
    <ContentCard
      title={fragmentAsStory.title}
      content={fragmentAsStory.content}
      tags={fragmentAsStory.tags}
      tagsLabel="Fragment Tags"
      showUsage={false}
      onGenerateContent={canAct ? () => onGenerate?.(fragment) : undefined}
      onDelete={canAct ? () => onDelete?.(fragment) : undefined}
      hasGaps={!canAct}
      isGapResolved={fragment.status === 'promoted'}
      className="border border-muted/60 shadow-none"
      gapSummary={null}
    >
      <div className="mt-4 pt-4 border-t border-muted/30">
        <Button
          variant="cta-secondary"
          size="sm"
          className="w-full justify-center gap-2"
          onClick={() => onGenerate?.(fragment)}
          disabled={!canAct}
        >
          Generate Content
        </Button>
      </div>
    </ContentCard>
  );
}

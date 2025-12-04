import { useResumeStreamContext } from '@/contexts/ResumeStreamContext';
import { Skeleton } from '@/components/ui/skeleton';

export function WorkHistoryList() {
  const { isProcessing, hasWorkHistory, workItems } = useResumeStreamContext();

  if (isProcessing && !hasWorkHistory) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="border rounded-lg p-4 animate-pulse">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {workItems.map(item => (
        <div key={item.id} className="border rounded-lg p-4">
          <div className="font-semibold">{item.title}</div>
          <div className="text-sm text-muted-foreground">
            {item.start_date} – {item.end_date ?? 'Present'}
          </div>
          {item.description ? (
            <div className="text-sm mt-2">{item.description}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}



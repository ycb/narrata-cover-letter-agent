import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export type FlagsSummaryPanelProps = {
  flags: Array<{
    id: string
    issue_category: string
    severity: string
    data_type: string
    data_path: string
    status?: string
  }>
  onFlagClick?: (dataType: string, dataPath: string) => void
}

export const FlagsSummaryPanel: React.FC<FlagsSummaryPanelProps> = ({ flags, onFlagClick }) => {
  if (!flags || flags.length === 0) return null
  return (
    <div className="bg-white border rounded-md p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Flags Summary</div>
        <Badge variant="outline" className="text-xs">{flags.length} open</Badge>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {flags.map((f) => (
          <div key={f.id} className="flex items-center justify-between text-xs border rounded px-2 py-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{f.issue_category}</Badge>
              <Badge variant="outline">{f.severity}</Badge>
              <span className="text-gray-600">{f.data_type}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 break-all">{f.data_path}</span>
            </div>
            {onFlagClick && (
              <Button size="sm" variant="secondary" onClick={() => onFlagClick(f.data_type, f.data_path)}>Open</Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

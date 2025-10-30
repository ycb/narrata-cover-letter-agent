import React, { useMemo, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export type FlagModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (flag: {
    issue_category: string
    severity: 'low' | 'medium' | 'high'
    data_type: string
    data_path: string
    notes?: string
    data_snapshot?: any
  }) => Promise<void> | void
  dataType: string
  dataPath: string
  dataSnapshot?: any
  existingFlags?: Array<{ id: string; issue_category: string; severity: string; status?: string }>
}

const ISSUE_CATEGORIES = [
  'hallucination',
  'missing_data',
  'incorrect_mapping',
  'normalization',
  'formatting',
  'other',
]

export const FlagModal: React.FC<FlagModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  dataType,
  dataPath,
  dataSnapshot,
  existingFlags = [],
}) => {
  const [issueCategory, setIssueCategory] = useState<string>('hallucination')
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium')
  const [notes, setNotes] = useState<string>('')
  const disabled = !isOpen

  const hasExisting = existingFlags && existingFlags.length > 0

  const handleSubmit = async () => {
    await onSubmit({
      issue_category: issueCategory,
      severity,
      data_type: dataType,
      data_path: dataPath,
      notes: notes?.trim() || undefined,
      data_snapshot: dataSnapshot,
    })
  }

  if (!isOpen) return null

  return (
    <div className="w-1/3 min-w-[500px] h-full flex flex-col border-l bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onClose} aria-label="Collapse flags drawer">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-0.5">
          <div className="text-sm font-semibold">Flag Item for Human Review</div>
          <div className="text-xs text-gray-500 break-all">{dataType} • {dataPath}</div>
          </div>
        </div>
      </div>

      {hasExisting && (
        <div className="px-4 py-3 border-b bg-gray-50">
          <div className="text-xs font-medium text-gray-600 mb-2">Existing Flags</div>
          <div className="flex flex-wrap gap-2">
            {existingFlags.map((f) => (
              <Badge key={f.id} variant="outline" className="text-xs">
                {f.issue_category} • {f.severity}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Issue Category</label>
          <select
            value={issueCategory}
            onChange={(e) => setIssueCategory(e.target.value)}
            className="w-full border rounded-md px-2 py-2 text-sm"
          >
            {ISSUE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map((s) => (
              <Button
                key={s}
                type="button"
                variant={severity === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSeverity(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            className="w-full border rounded-md px-3 py-2 text-sm resize-y"
            placeholder="Why is this incorrect or risky? Provide specific context."
          />
        </div>
        {dataSnapshot && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data Snapshot</label>
            <pre className="text-xs bg-gray-50 border rounded-md p-2 overflow-x-auto whitespace-pre-wrap break-words">
              {JSON.stringify(dataSnapshot, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Submit Flag</Button>
      </div>
    </div>
  )
}

# Gap Resolution Integration Guide

**Quick reference for integrating gap resolution into existing components**

## 1. Basic Integration in Cover Letter Editor

```typescript
import { useGapResolution } from '@/hooks/useGapResolution';
import { GapTransformService } from '@/services/gapTransformService';

function CoverLetterEditor() {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [metrics, setMetrics] = useState<HILProgressMetrics>(...);
  
  const {
    isGenerating,
    streamingContent,
    resolveGap
  } = useGapResolution({
    onMetricsUpdated: (newMetrics, delta) => {
      setMetrics(newMetrics);
      showDeltaToast(delta);
    },
    onVariationSaved: (variationId) => {
      console.log('Saved:', variationId);
    }
  });

  // When draft is generated
  useEffect(() => {
    if (detailedAnalysis && sections) {
      const generatedGaps = GapTransformService.transformAnalysisToGaps(
        detailedAnalysis,
        sections
      );
      setGaps(generatedGaps);
    }
  }, [detailedAnalysis, sections]);

  const handleResolveGap = async (gap: Gap) => {
    const result = await resolveGap(
      gap,
      jobContext,
      sections,
      metrics,
      detailedAnalysis,
      { saveVariation: true }
    );

    // Update section content
    updateSection(gap.paragraphId, result.content);
    
    // Remove resolved gap
    setGaps(gaps.filter(g => g.id !== gap.id));
  };

  return (
    <div>
      {gaps.map(gap => (
        <GapCard
          key={gap.id}
          gap={gap}
          onResolve={() => handleResolveGap(gap)}
          isGenerating={isGenerating}
        />
      ))}
      
      {isGenerating && (
        <StreamingPreview content={streamingContent} />
      )}
    </div>
  );
}
```

## 2. Integrate with Existing ContentGenerationModal

```typescript
// In CoverLetterCreateModal.tsx or similar
import { ContentGenerationModal } from '@/components/hil/ContentGenerationModal';

<ContentGenerationModal
  isOpen={showContentGenerationModal}
  onClose={() => setShowContentGenerationModal(false)}
  gap={selectedGap}
  onApplyContent={async (content) => {
    // 1. Apply the content to section
    updateSection(selectedGap.paragraphId, content);
    
    // 2. Save as variation
    await CoverLetterVariationService.saveVariation(
      userId,
      selectedGap.paragraphId,
      content,
      {
        gapId: selectedGap.id,
        gapType: selectedGap.type,
        targetSection: selectedGap.paragraphId,
        requirementsAddressed: selectedGap.addresses || [],
        createdBy: 'AI'
      }
    );
    
    // 3. Update metrics
    const { metrics, delta } = await metricsService.updateMetricsAfterGapResolution(
      currentMetrics,
      detailedAnalysis,
      selectedGap,
      updatedSections,
      coreRequirements,
      preferredRequirements
    );
    
    setMetrics(metrics);
    showDeltaNotification(delta);
    
    // 4. Remove gap
    setGaps(gaps.filter(g => g.id !== selectedGap.id));
    
    setShowContentGenerationModal(false);
  }}
/>
```

## 3. Display Gaps in Gap Analysis Panel

```typescript
import { GapAnalysisPanel } from '@/components/hil/GapAnalysisPanel';

<GapAnalysisPanel
  gaps={gaps}
  requirements={{
    core: {
      met: metrics.coreRequirementsMet.met,
      total: metrics.coreRequirementsMet.total
    },
    preferred: {
      met: metrics.preferredRequirementsMet.met,
      total: metrics.preferredRequirementsMet.total
    }
  }}
  onAddressGap={(gap) => {
    setSelectedGap(gap);
    setShowContentGenerationModal(true);
  }}
/>
```

## 4. Show Metrics Delta After Resolution

```typescript
import { MetricsUpdateService } from '@/services/metricsUpdateService';

const metricsService = new MetricsUpdateService();

function showDeltaNotification(delta: MetricsDelta) {
  const deltaStrings = metricsService.formatDelta(delta);
  
  toast.success(
    <div>
      <p className="font-semibold">Metrics Updated!</p>
      <ul className="text-sm space-y-1 mt-2">
        {deltaStrings.map((str, i) => (
          <li key={i}>{str}</li>
        ))}
      </ul>
    </div>,
    { duration: 5000 }
  );
}
```

## 5. Generate Gaps from Detailed Analysis

```typescript
import { GapTransformService } from '@/services/gapTransformService';

// After creating draft with detailedAnalysis
const gaps = GapTransformService.transformAnalysisToGaps(
  draft.detailedAnalysis,
  draft.sections
);

// Filter by severity
const highPriorityGaps = gaps.filter(g => g.severity === 'high');

// Filter by type
const requirementGaps = gaps.filter(g => 
  g.type === 'core-requirement' || g.type === 'preferred-requirement'
);

// Filter by section
const experienceGaps = GapTransformService.filterGapsBySection(
  gaps,
  'experience'
);

// Get summary statistics
const summary = GapTransformService.getGapSummary(gaps);
console.log('Total gaps:', summary.total);
console.log('By severity:', summary.bySeverity);
console.log('By type:', summary.byType);
```

## 6. Stream Content with Progress Indicator

```typescript
import { GapResolutionStreamingService } from '@/services/gapResolutionStreamingService';

const service = new GapResolutionStreamingService();
const [progress, setProgress] = useState(0);
const [content, setContent] = useState('');

const estimateProgress = (currentLength: number, estimatedTotal: number = 500) => {
  return Math.min(95, (currentLength / estimatedTotal) * 100);
};

await service.streamGapResolution(gap, jobContext, {
  onUpdate: (chunk) => {
    setContent(chunk);
    setProgress(estimateProgress(chunk.length));
  },
  onComplete: (fullContent) => {
    setContent(fullContent);
    setProgress(100);
  },
  onError: (error) => {
    toast.error(error.message);
    setProgress(0);
  }
});
```

## 7. Retrieve and Display Saved Variations

```typescript
import { CoverLetterVariationService } from '@/services/coverLetterVariationService';

async function loadVariations() {
  // Get all variations for a section
  const variations = await CoverLetterVariationService.getVariationsForSection(
    userId,
    sectionId
  );

  // Get variations that filled a specific gap
  const gapVariations = await CoverLetterVariationService.getVariationsForGap(
    userId,
    gapId
  );

  // Get usage statistics
  const stats = await CoverLetterVariationService.getVariationStats(userId);
  console.log('Total variations:', stats.total);
  console.log('Gap-filling variations:', stats.byGap);
  console.log('Most used:', stats.mostUsed);

  return variations;
}

function VariationsList({ variations }: { variations: CoverLetterVariation[] }) {
  return (
    <div className="space-y-2">
      {variations.map(variation => (
        <Card key={variation.id}>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <Badge>{variation.created_by}</Badge>
              {variation.filled_gap_id && (
                <Badge variant="outline">Fills Gap</Badge>
              )}
            </div>
            <p className="text-sm">{variation.content}</p>
            <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
              <span>Used {variation.times_used} times</span>
              {variation.gap_tags.length > 0 && (
                <span>• {variation.gap_tags.join(', ')}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## 8. Implement Custom Gap Resolution UI

```typescript
function CustomGapResolver({ gap, onResolve }: { gap: Gap; onResolve: (content: string) => void }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [variations, setVariations] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const service = new GapResolutionStreamingService();

  const generateMultiple = async () => {
    setIsGenerating(true);
    const generated = await service.generateVariations(gap, jobContext, 3);
    setVariations(generated);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted rounded-lg">
        <h4 className="font-semibold">{gap.description}</h4>
        <p className="text-sm text-muted-foreground">{gap.suggestion}</p>
      </div>

      {variations.length === 0 ? (
        <Button
          onClick={generateMultiple}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate 3 Variations'}
        </Button>
      ) : (
        <div className="space-y-2">
          <Tabs value={selectedIndex.toString()} onValueChange={(v) => setSelectedIndex(parseInt(v))}>
            <TabsList>
              {variations.map((_, i) => (
                <TabsTrigger key={i} value={i.toString()}>
                  Variation {i + 1}
                </TabsTrigger>
              ))}
            </TabsList>

            {variations.map((variation, i) => (
              <TabsContent key={i} value={i.toString()}>
                <Textarea
                  value={variation}
                  onChange={(e) => {
                    const updated = [...variations];
                    updated[i] = e.target.value;
                    setVariations(updated);
                  }}
                  rows={6}
                />
              </TabsContent>
            ))}
          </Tabs>

          <Button
            onClick={() => onResolve(variations[selectedIndex])}
          >
            Apply Variation {selectedIndex + 1}
          </Button>
        </div>
      )}
    </div>
  );
}
```

## 9. Add Gap Resolution to Existing Draft Flow

```typescript
// In coverLetterDraftService.ts or similar

import { GapTransformService } from './gapTransformService';

async createDraft(...) {
  // ... existing code ...

  // After detailed analysis
  const detailedAnalysis = await this.runDetailedAnalysis(...);

  // Generate gaps from analysis
  const gaps = GapTransformService.transformAnalysisToGaps(
    detailedAnalysis,
    sections
  );

  // Calculate metrics
  const metrics = this.calculateMetricsFromAnalysis(detailedAnalysis);

  return {
    draftId,
    sections,
    gaps, // ← Include gaps in draft
    metrics,
    detailedAnalysis,
    ...
  };
}
```

## 10. Quick Test Integration

```typescript
// For quick testing without full integration

import { GapResolutionStreamingService } from '@/services/gapResolutionStreamingService';

const testGap: Gap = {
  id: 'test-gap-1',
  type: 'core-requirement',
  severity: 'high',
  description: 'Missing SQL experience',
  suggestion: 'Add examples of SQL queries and data analysis work',
  paragraphId: 'experience',
  origin: 'ai',
  addresses: ['SQL', 'Data Analysis'],
  existingContent: 'In my previous role...'
};

const service = new GapResolutionStreamingService();

const content = await service.streamGapResolution(testGap, {
  role: 'Senior Product Manager',
  company: 'TechCorp',
  coreRequirements: ['SQL', 'Python', 'A/B testing'],
  preferredRequirements: []
}, {
  onUpdate: (chunk) => console.log('Streaming:', chunk),
  onComplete: (full) => console.log('Complete:', full),
  onError: (err) => console.error('Error:', err)
});

console.log('Generated:', content);
```

---

## Common Patterns

### Pattern 1: Modal → Streaming → Apply → Metrics
```typescript
const handleGapClick = (gap: Gap) => {
  setSelectedGap(gap);
  setShowModal(true);
};

const handleApply = async (content: string) => {
  // 1. Apply content
  updateSection(selectedGap.paragraphId, content);
  
  // 2. Save variation
  await saveVariation(content);
  
  // 3. Update metrics
  const { metrics, delta } = await updateMetrics();
  
  // 4. Show feedback
  showDeltaNotification(delta);
  
  // 5. Clean up
  setGaps(gaps.filter(g => g.id !== selectedGap.id));
  setShowModal(false);
};
```

### Pattern 2: Batch Gap Resolution
```typescript
const resolveAllHighPriorityGaps = async () => {
  const highPriorityGaps = gaps.filter(g => g.severity === 'high');
  
  for (const gap of highPriorityGaps) {
    const content = await service.streamGapResolution(gap, jobContext);
    updateSection(gap.paragraphId, content);
    await saveVariation(content, gap);
  }
  
  // Recalculate metrics once at the end
  const updatedMetrics = await recalculateAllMetrics();
  setMetrics(updatedMetrics);
};
```

### Pattern 3: Gap Preview Before Apply
```typescript
const [previewContent, setPreviewContent] = useState<string>('');

const handlePreview = async (gap: Gap) => {
  const content = await service.streamGapResolution(gap, jobContext, {
    onUpdate: setPreviewContent
  });
};

const handleApplyPreview = () => {
  updateSection(selectedGap.paragraphId, previewContent);
  // ... rest of apply logic
};
```

---

## Troubleshooting

### Issue: Streaming not working
**Solution:** Check `VITE_OPENAI_API_KEY` is set and valid

### Issue: Variation not saving
**Solution:** Verify user is authenticated and `content_variations` table exists

### Issue: Metrics not updating
**Solution:** Ensure `detailedAnalysis` and sections are passed to `updateMetricsAfterGapResolution`

### Issue: Gaps not generated
**Solution:** Verify `detailedAnalysis` has all required fields (requirementsMatch, experienceMatch, etc.)

---

## Performance Tips

1. **Debounce streaming updates** - Update UI every 50-100ms, not on every token
2. **Cache job context** - Reuse job description data across gap resolutions
3. **Batch variation saves** - If resolving multiple gaps, save variations in batch
4. **Incremental metrics only** - Use delta updates, not full recalculation
5. **Lazy load variations list** - Load variations on-demand, not upfront

---

## Next Steps

1. Review integration examples above
2. Choose pattern that fits your component
3. Import required services/hooks
4. Test with real data
5. Add error handling
6. Implement UI feedback (toasts, progress indicators)
7. Write tests for your integration

---

For complete API documentation, see:
- [HIL Gap Resolution Streaming](./HIL_GAP_RESOLUTION_STREAMING.md)
- Service files in `src/services/`
- Hook file in `src/hooks/useGapResolution.ts`


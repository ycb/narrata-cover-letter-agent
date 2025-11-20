import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GapAnalysis, ImprovementSuggestion, ContentRecommendation } from '@/types/content';
import type { BlurbVariation } from '@/types/workHistory';
import { useHIL } from '@/contexts/HILContext';

export type HilGapAnalysisStatus = 'idle' | 'loading' | 'ready' | 'error';

interface UseHilGapAnalysisOptions {
  enabled?: boolean;
  onComplete?: (analysis: GapAnalysis) => void;
}

interface UseHilGapAnalysisResult {
  status: HilGapAnalysisStatus;
  analysis: GapAnalysis | null;
  streamingMessages: string[];
  error: string | null;
  retry: () => void;
}

const STREAMING_STEPS = [
  'Initializing gap analysis…',
  'Extracting differentiator signals…',
  'Scoring paragraph coverage…',
  'Generating remediation plan…',
];

const STREAM_DELAY_MS = 220;
const MAX_RETRIES = 2;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function buildMockAnalysis(
  variation: BlurbVariation,
  targetRole: string,
  jobKeywords: string[],
): GapAnalysis {
  const baseKeywords = new Set<string>([
    ...(variation.jdTags ?? []),
    ...(variation.tags ?? []),
    ...jobKeywords,
  ]);

  const paragraphGaps: GapAnalysis['paragraphGaps'] = [
    {
      paragraphId: 'intro',
      gap: 'Missing specific metrics',
      impact: 'high',
      suggestion: 'Add quantifiable outcomes like "increased conversion by 25%"',
      relatedVariations: ['var-1', 'var-2'],
    },
    {
      paragraphId: 'body',
      gap: 'Leadership context unclear',
      impact: 'medium',
      suggestion: 'Clarify team size and reporting structure',
      relatedVariations: ['var-1'],
    },
    {
      paragraphId: 'closing',
      gap: 'Technical depth insufficient',
      impact: 'low',
      suggestion: 'Include specific technologies or methodologies used',
      relatedVariations: ['var-2'],
    },
  ];

  const suggestions: GapAnalysis['suggestions'] = [
    {
      type: 'add-metrics',
      content: 'Include specific KPIs and outcomes achieved',
      priority: 'high',
      relatedVariations: ['var-1'],
    },
    {
      type: 'clarify-ownership',
      content: 'Highlight your ownership of the leadership coaching program',
      priority: 'medium',
      relatedVariations: ['var-1'],
    },
    {
      type: 'match-keywords',
      content: `Reference ${jobKeywords.slice(0, 1).join(', ') || 'target keywords'} directly in the summary`,
      priority: 'medium',
      relatedVariations: ['var-2'],
    },
  ];

  const relatedContent: ContentRecommendation[] = [
    {
      id: 'content-1',
      title: 'Leadership Metrics Story',
      relevance: 0.85,
      source: 'work-history',
      variations: [],
    },
    {
      id: 'content-2',
      title: 'Team Management Example',
      relevance: 0.72,
      source: 'reusable',
      variations: [],
    },
  ];

  const variationsCoverage: GapAnalysis['variationsCoverage'] = {
    [variation.id]: {
      gapsCovered: ['Leadership context unclear'],
      gapsUncovered: ['Missing specific metrics', 'Technical depth insufficient'],
      relevance: 0.74,
    },
    'var-1': {
      gapsCovered: ['Missing specific metrics'],
      gapsUncovered: ['Technical depth insufficient'],
      relevance: 0.81,
    },
  };

  const generatedAt = new Date().toISOString();

  const autoTags = Array.from(baseKeywords).map(keyword => keyword.toLowerCase());

  return {
    variationId: variation.id,
    generatedAt,
    overallScore: 78,
    paragraphGaps,
    suggestions,
    relatedContent,
    variationsCoverage,
    autoTags,
    summary: {
      targetRole,
      keywordEmphasis: autoTags.slice(0, 3),
      matchedParagraphs: 2,
      totalParagraphs: 3,
    },
  };
}

export function useHilGapAnalysis(
  variation: BlurbVariation | null,
  targetRole: string,
  jobKeywords: string[],
  options: UseHilGapAnalysisOptions = {},
): UseHilGapAnalysisResult {
  const { state, dispatch } = useHIL();
  const [status, setStatus] = useState<HilGapAnalysisStatus>('idle');
  const [analysis, setAnalysis] = useState<GapAnalysis | null>(null);
  const [streamingMessages, setStreamingMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const isMountedRef = useRef(true);

  const enabled = options.enabled ?? true;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const cachedAnalysis = useMemo(() => {
    if (!variation) return null;
    if (!state.gapAnalysis) return null;
    return state.gapAnalysis.variationId === variation.id ? state.gapAnalysis : null;
  }, [state.gapAnalysis, variation]);

  const runAnalysis = useCallback(async () => {
    if (!variation || !enabled) {
      setStatus('idle');
      setAnalysis(null);
      setStreamingMessages([]);
      return;
    }

    if (cachedAnalysis) {
      setAnalysis(cachedAnalysis);
      setStatus('ready');
      setStreamingMessages([]);
      options.onComplete?.(cachedAnalysis);
      return;
    }

    setStatus('loading');
    setStreamingMessages([]);
    setError(null);

    try {
      for (const step of STREAMING_STEPS) {
        if (!isMountedRef.current) return;
        setStreamingMessages(prev => (prev.includes(step) ? prev : [...prev, step]));
        await sleep(STREAM_DELAY_MS);
      }

      if (!isMountedRef.current) return;

      const result = buildMockAnalysis(variation, targetRole, jobKeywords);
      if (!isMountedRef.current) return;

      dispatch({ type: 'SET_GAP_ANALYSIS', payload: result });
      setAnalysis(result);
      setStatus('ready');
      setStreamingMessages(prev => (prev.includes('Gap analysis complete.') ? prev : [...prev, 'Gap analysis complete.']));
      options.onComplete?.(result);
    } catch (err) {
      if (!isMountedRef.current) return;
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unable to complete gap analysis.');
    }
  }, [variation, enabled, cachedAnalysis, targetRole, jobKeywords, dispatch, options]);

  useEffect(() => {
    setStreamingMessages([]);
    setError(null);
    setAnalysis(cachedAnalysis);
    if (cachedAnalysis) {
      setStatus('ready');
      return;
    }
    if (!variation || !enabled) {
      setStatus('idle');
      return;
    }
    runAnalysis();
  }, [variation, enabled, attempt, cachedAnalysis, runAnalysis]);

  const retry = useCallback(() => {
    if (attempt >= MAX_RETRIES) return;
    setAttempt(prev => prev + 1);
  }, [attempt]);

  return {
    status,
    analysis,
    streamingMessages,
    error,
    retry,
  };
}

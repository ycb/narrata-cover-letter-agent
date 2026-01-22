import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { SyntheticUserService } from '@/services/syntheticUserService';
import { supabase } from '@/lib/supabase';
import type { PMLevelInference, PMLevelCode, RoleType } from '@/types/content';
import type { PMLevelsJobResult } from '@/types/jobs';

type JobRow = {
  id: string;
  status: string;
  result?: PMLevelsJobResult | null;
  created_at?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
  input?: Record<string, unknown> | null;
  error_message?: string | null;
  stages?: Record<string, unknown> | null;
};

type UserLevelsRow = {
  inferred_level: PMLevelCode;
  confidence: number;
  scope_score: number;
  maturity_modifier: number;
  role_type: RoleType[] | null;
  delta_summary: string | null;
  recommendations: any;
  competency_scores: any;
  signals: any;
  last_run_timestamp: string | null;
  updated_at: string | null;
  created_at: string | null;
};

const SPECIALIZATION_MAP: Record<string, RoleType> = {
  'Growth PM': 'growth',
  'Platform PM': 'platform',
  'AI/ML PM': 'ai_ml',
  'Founding PM': 'founding',
};

const LEVEL_MAP: Array<{ min: number; code: PMLevelCode; label: string }> = [
  { min: 9, code: 'M2', label: 'VP of Product' },
  { min: 7, code: 'M1', label: 'Group PM / Director' },
  { min: 6, code: 'L6', label: 'Staff Product Manager' },
  { min: 5, code: 'L5', label: 'Senior Product Manager' },
  { min: 4, code: 'L4', label: 'Product Manager' },
  { min: 0, code: 'L3', label: 'Associate Product Manager' },
];

const defaultSignals = {
  scope: { teams: 0 },
  impact: { metrics: [], quantified: false, scale: 'feature' as const },
  influence: { crossFunctional: false, executive: false, external: false },
  metrics: [],
};

const buildEmptyEvidence = (displayLevel: string, assessmentBand?: string) => ({
  currentLevel: displayLevel,
  nextLevel: '',
  confidence: assessmentBand || 'pending',
  resumeEvidence: {
    roleTitles: [],
    duration: '',
    companyScale: [],
  },
  storyEvidence: {
    totalStories: 0,
    relevantStories: 0,
    tagDensity: [],
    stories: [],
  },
  levelingFramework: {
    framework: 'PM Levels',
    criteria: [],
    match: assessmentBand || '',
  },
  gaps: [],
  outcomeMetrics: {
    roleLevel: [],
    storyLevel: [],
    analysis: {
      totalMetrics: 0,
      impactLevel: 'feature' as const,
      keyAchievements: [],
    },
  },
});

const buildEmptyCompetencyEvidence = () => ({
  execution: {
    competency: 'execution',
    evidence: [],
    matchedTags: [],
    overallConfidence: 'low' as const,
  },
  customer_insight: {
    competency: 'customer_insight',
    evidence: [],
    matchedTags: [],
    overallConfidence: 'low' as const,
  },
  strategy: {
    competency: 'strategy',
    evidence: [],
    matchedTags: [],
    overallConfidence: 'low' as const,
  },
  influence: {
    competency: 'influence',
    evidence: [],
    matchedTags: [],
    overallConfidence: 'low' as const,
  },
});

const mapIcLevelToLevel = (icLevel: number): { levelCode: PMLevelCode; displayLevel: string } => {
  const match = LEVEL_MAP.find((level) => icLevel >= level.min);
  return match
    ? { levelCode: match.code, displayLevel: match.label }
    : { levelCode: 'L3', displayLevel: 'Associate Product Manager' };
};

const LEVEL_CODE_TO_LABEL: Record<PMLevelCode, string> = {
  L3: 'Associate Product Manager',
  L4: 'Product Manager',
  L5: 'Senior Product Manager',
  L6: 'Staff Product Manager',
  M1: 'Group PM / Director',
  M2: 'VP of Product',
};

const normalizeCompetencyScore = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  // user_levels stores 0-3 scale; some other sources may already be 0-1
  if (value > 1.5) return Math.max(0, Math.min(1, value / 3));
  return Math.max(0, Math.min(1, value));
};

const mapUserLevelsToInference = (row: UserLevelsRow | null): PMLevelInference | null => {
  if (!row?.inferred_level) return null;

  const inferredLevel = row.inferred_level;
  const displayLevel = LEVEL_CODE_TO_LABEL[inferredLevel] || inferredLevel;
  const confidence = typeof row.confidence === 'number' ? Math.max(0, Math.min(1, row.confidence)) : 0;
  const competencyScoresRaw = (row.competency_scores ?? {}) as Record<string, unknown>;

  return {
    inferredLevel,
    displayLevel,
    confidence,
    scopeScore: typeof row.scope_score === 'number' ? row.scope_score : 0,
    maturityInfo: 'growth',
    roleType: Array.isArray(row.role_type) ? row.role_type : [],
    competencyScores: {
      execution: normalizeCompetencyScore(competencyScoresRaw.execution),
      strategy: normalizeCompetencyScore(competencyScoresRaw.strategy),
      customer_insight: normalizeCompetencyScore(competencyScoresRaw.customer_insight),
      influence: normalizeCompetencyScore(competencyScoresRaw.influence),
    },
    levelScore: 0,
    deltaSummary: row.delta_summary || '',
    recommendations: Array.isArray(row.recommendations) ? row.recommendations : [],
    signals: (row.signals as any) || defaultSignals,
    topArtifacts: [],
    lastAnalyzedAt: row.last_run_timestamp || row.updated_at || row.created_at || new Date().toISOString(),
    evidenceByCompetency: buildEmptyCompetencyEvidence(),
    levelEvidence: buildEmptyEvidence(displayLevel),
    roleArchetypeEvidence: {},
  };
};

const mapJobToInference = (job: JobRow | null): PMLevelInference | null => {
  if (!job?.result) return null;

  const { icLevel = 0, competencies = {}, specializations = [], assessmentBand, evidenceByCompetency, levelEvidence, roleArchetypeEvidence } = job.result as any;
  const { levelCode, displayLevel } = mapIcLevelToLevel(icLevel);

  const execution = (competencies.executionDelivery ?? 0) / 3.3;
  const strategy = (competencies.productStrategy ?? 0) / 3.3;
  const customerInsight = (competencies.technicalDepth ?? 0) / 3.3;
  const influence = (competencies.leadershipInfluence ?? 0) / 3.3;

  const avgCompetency = (execution + strategy + customerInsight + influence) / 4;
  const confidence = Math.min(1, Math.max(0, avgCompetency / 3));

  const roleType = specializations
    .map((spec: string) => SPECIALIZATION_MAP[spec])
    .filter(Boolean) as RoleType[];

  const lastAnalyzedAt =
    job.completed_at ||
    job.updated_at ||
    job.created_at ||
    new Date().toISOString();

  // Use edge-provided evidence; fallback to empty if missing
  const compEvidence = evidenceByCompetency && Object.keys(evidenceByCompetency).length > 0
    ? evidenceByCompetency
    : buildEmptyCompetencyEvidence();

  const lvlEvidence = levelEvidence || buildEmptyEvidence(displayLevel, assessmentBand);
  const archetypeEvidence = roleArchetypeEvidence || {};

  return {
    inferredLevel: levelCode,
    displayLevel,
    confidence,
    scopeScore: 0,
    maturityInfo: 'growth',
    roleType,
    competencyScores: {
      execution,
      strategy,
      customer_insight: customerInsight,
      influence,
    },
    levelScore: icLevel,
    deltaSummary: assessmentBand ? `Assessment band: ${assessmentBand}` : '',
    recommendations: [],
    signals: defaultSignals,
    topArtifacts: [],
    lastAnalyzedAt,
    evidenceByCompetency: compEvidence,
    levelEvidence: lvlEvidence,
    roleArchetypeEvidence: archetypeEvidence,
  };
};

async function fetchLatestPMLevelsResult(userId: string, profileId?: string | null) {
  let query = supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'pmLevels')
    .order('created_at', { ascending: false })
    .limit(1);

  if (profileId) {
    query = query.eq('input->>profileId', profileId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const job = Array.isArray(data) ? (data[0] as JobRow | undefined) : (data as JobRow | null);
  const inferredFromJob = mapJobToInference(job || null);
  if (inferredFromJob) return inferredFromJob;

  // Backward compatibility: older PM levels runs may be persisted to user_levels instead of jobs.result.
  const { data: userLevelsRow, error: levelsError } = await supabase
    .from('user_levels')
    .select(
      'inferred_level, confidence, scope_score, maturity_modifier, role_type, delta_summary, recommendations, competency_scores, signals, last_run_timestamp, updated_at, created_at'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (levelsError) {
    // Non-fatal: treat as no data
    return null;
  }

  return mapUserLevelsToInference((userLevelsRow as unknown as UserLevelsRow) ?? null);
}

async function startPMLevelsJob(profileId?: string | null): Promise<JobRow> {
  const { data, error } = await supabase.functions.invoke<{ jobId: string }>('create-job', {
    body: {
      type: 'pmLevels',
      input: {
        profileId: profileId || undefined,
        forceRefresh: true,
      },
    },
  });

  if (error || !data?.jobId) {
    throw new Error(error?.message || 'Failed to create PM Levels job');
  }

  const jobId = data.jobId;

  // Kick off processing (edge functions do not auto-call each other)
  supabase.functions
    .invoke('stream-job-process', { body: { jobId } })
    .catch((procErr) => console.warn('[usePMLevel] stream-job-process invoke failed (non-blocking):', procErr));

  const maxAttempts = 120; // up to ~4 minutes with 2s polling
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError) {
      throw new Error(jobError.message);
    }

    if (job?.status === 'complete') {
      return job as JobRow;
    }
    if (job?.status === 'error') {
      throw new Error(job?.error_message || 'PM Levels job failed');
    }

    // If job is stuck pending/running with no stages after some attempts, re-trigger processing once
    if (attempt === 10 && (job?.status === 'pending' || job?.status === 'running')) {
      supabase.functions
        .invoke('stream-job-process', { body: { jobId } })
        .catch((procErr) => console.warn('[usePMLevel] stream-job-process re-invoke failed (non-blocking):', procErr));
    }
  }

  throw new Error('PM Levels job timed out');
}

export function usePMLevel() {
  const { user, isDemo } = useAuth();
  const queryClient = useQueryClient();
  const [syntheticProfileId, setSyntheticProfileId] = useState<string | undefined | null>(null);
  const [isDeterminingProfile, setIsDeterminingProfile] = useState(true);
  const profileIdRef = useRef<string | undefined | null>(null);
  const [backgroundError, setBackgroundError] = useState<string | null>(null);

  useEffect(() => {
    const getSyntheticProfile = async () => {
      if (!user) {
        setSyntheticProfileId(undefined);
        profileIdRef.current = undefined;
        setIsDeterminingProfile(false);
        return;
      }

      try {
        const syntheticService = new SyntheticUserService();

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Synthetic profile check timeout')), 3000);
        });

        const context = (await Promise.race([
          syntheticService.getSyntheticUserContext(),
          timeoutPromise,
        ])) as any;

        const newProfileId =
          context?.isSyntheticTestingEnabled && context?.currentUser
            ? context.currentUser.profileId
            : undefined;

        setSyntheticProfileId(newProfileId);
        profileIdRef.current = newProfileId;
      } catch (err) {
        console.warn('[usePMLevel] Error getting synthetic profile (non-blocking):', err);
        setSyntheticProfileId(undefined);
        profileIdRef.current = undefined;
      } finally {
        setIsDeterminingProfile(false);
      }
    };

    setIsDeterminingProfile(true);
    getSyntheticProfile();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'synthetic_active_profile_id' && user) {
        getSyntheticProfile();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const pollInterval = setInterval(() => {
      if (!user) return;
      try {
        const stored = localStorage.getItem('synthetic_active_profile_id');
        const storedProfileId = stored || undefined;
        if (storedProfileId !== profileIdRef.current) {
          getSyntheticProfile();
        }
      } catch {
        // ignore
      }
    }, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [user?.id]);

  const stableProfileId = syntheticProfileId ?? undefined;

  const {
    data: levelData,
    isLoading,
    error,
    refetch,
  } = useQuery<PMLevelInference | null, Error>({
    queryKey: ['pmLevelsJob', user?.id, stableProfileId],
    enabled: !!user && !isDeterminingProfile,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      if (!user) return null;
      return fetchLatestPMLevelsResult(user.id, stableProfileId);
    },
  });

  const { mutateAsync: recalculate, isPending: isRecalculating } = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      if (isDemo) throw new Error('PM Levels recalculation is disabled in the public demo');
      setBackgroundError(null);
      const job = await startPMLevelsJob(stableProfileId);
      return mapJobToInference(job);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['pmLevelsJob', user?.id, stableProfileId], data);
      toast.success('PM Levels analysis completed');
    },
    onError: (err) => {
      console.error('Error recalculating PM level:', err);
      const message = err instanceof Error ? err.message : 'Failed to run analysis';
      toast.error(message);
      setBackgroundError(message);
    },
  });

  return {
    levelData,
    isLoading: isLoading || isDeterminingProfile,
    error: error || null,
    isRecalculating,
    refetch,
    recalculate,
    isBackgroundAnalyzing: isRecalculating,
    backgroundError,
    activeProfileId: stableProfileId,
  };
}

import type { EngagementLevel } from "@/lib/server/modules/observability/model/vocabulary";

const sessionEngagementBaseScore = {
  glance: 10,
  scan: 30,
  engaged: 70,
  completed: 90,
} as const satisfies Record<EngagementLevel, number>;

export const defaultContentQualityWeights = {
  completionRate: 0.35,
  qualifiedRatio: 0.2,
  returnRate: 0.15,
  activeTimeFit: 0.15,
  perfPenalty: -0.1,
  errorPenalty: -0.05,
} as const;

export type SessionQualityInput = {
  maxEngagementLevel: EngagementLevel;
  engagedPageCount?: number;
  completedAudioCount?: number;
  qualitativeReturnCount?: number;
  rapidBounceAfterPoorPerformance?: boolean;
  blockingErrorCount?: number;
};

export type QualityScoreBreakdown = {
  score: number;
  base: number;
  bonus: Record<string, number>;
  penalties: Record<string, number>;
};

export type ContentQualityInput = {
  totalVisits: number;
  qualifiedVisits: number;
  completedReads: number;
  significantReturns: number;
  averageActiveTimeMs: number;
  expectedReadingTimeMs: number;
  poorPerformanceSessions: number;
  errorImpactedSessions: number;
  sessions: number;
};

export type ContentQualityBreakdown = {
  score: number;
  components: Record<keyof typeof defaultContentQualityWeights, number>;
  weightedComponents: Record<keyof typeof defaultContentQualityWeights, number>;
  weights: typeof defaultContentQualityWeights;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function safeRatio(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return clamp(numerator / denominator, 0, 1);
}

export function calculateSessionQualityScore(input: SessionQualityInput): QualityScoreBreakdown {
  const base = sessionEngagementBaseScore[input.maxEngagementLevel];
  const bonus = {
    engagedPages: Math.min(Math.max((input.engagedPageCount ?? 0) - 1, 0) * 5, 10),
    completedAudio: Math.min((input.completedAudioCount ?? 0) * 5, 10),
    qualitativeReturns: Math.min((input.qualitativeReturnCount ?? 0) * 5, 10),
  };
  const penalties = {
    rapidBounceAfterPoorPerformance: input.rapidBounceAfterPoorPerformance ? 20 : 0,
    blockingErrors: Math.min((input.blockingErrorCount ?? 0) * 15, 30),
  };

  const score = clamp(
    base +
      Object.values(bonus).reduce((sum, value) => sum + value, 0) -
      Object.values(penalties).reduce((sum, value) => sum + value, 0),
    0,
    100,
  );

  return { score, base, bonus, penalties };
}

export function calculateContentQualityScore(input: ContentQualityInput): ContentQualityBreakdown {
  const components = {
    completionRate: safeRatio(input.completedReads, input.qualifiedVisits),
    qualifiedRatio: safeRatio(input.qualifiedVisits, input.totalVisits),
    returnRate: safeRatio(input.significantReturns, input.qualifiedVisits),
    activeTimeFit: safeRatio(input.averageActiveTimeMs, input.expectedReadingTimeMs),
    perfPenalty: safeRatio(input.poorPerformanceSessions, input.sessions),
    errorPenalty: safeRatio(input.errorImpactedSessions, input.sessions),
  };
  const weightedComponents = {
    completionRate: components.completionRate * defaultContentQualityWeights.completionRate,
    qualifiedRatio: components.qualifiedRatio * defaultContentQualityWeights.qualifiedRatio,
    returnRate: components.returnRate * defaultContentQualityWeights.returnRate,
    activeTimeFit: components.activeTimeFit * defaultContentQualityWeights.activeTimeFit,
    perfPenalty: components.perfPenalty * defaultContentQualityWeights.perfPenalty,
    errorPenalty: components.errorPenalty * defaultContentQualityWeights.errorPenalty,
  };
  const weightedSum = Object.values(weightedComponents).reduce((sum, value) => sum + value, 0);

  return {
    score: clamp(Math.round(weightedSum * 100), 0, 100),
    components,
    weightedComponents,
    weights: defaultContentQualityWeights,
  };
}

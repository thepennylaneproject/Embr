/**
 * Analytics Utilities
 * Track and analyze creator content performance
 */

export interface ContentStats {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}

export interface EngagementRate {
  overall: number; // percentage
  likeRate: number;
  commentRate: number;
  shareRate: number;
}

export interface DemoGraphic {
  age?: string;
  gender?: string;
  location?: string;
  interests?: string[];
}

export interface AudienceInsight {
  totalFollowers: number;
  newFollowersToday: number;
  newFollowersThisWeek: number;
  demographics: DemoGraphic[];
  topLocations: { location: string; percentage: number }[];
  topInterests: { interest: string; percentage: number }[];
}

/**
 * Calculate engagement rate
 */
export function calculateEngagementRate(
  stats: ContentStats,
  reachCount: number,
): EngagementRate {
  const engagementCount = stats.likes + stats.comments + stats.shares + stats.saves;
  const overall = reachCount > 0 ? (engagementCount / reachCount) * 100 : 0;

  return {
    overall: Math.round(overall * 100) / 100,
    likeRate: reachCount > 0 ? (stats.likes / reachCount) * 100 : 0,
    commentRate: reachCount > 0 ? (stats.comments / reachCount) * 100 : 0,
    shareRate: reachCount > 0 ? (stats.shares / reachCount) * 100 : 0,
  };
}

/**
 * Categorize engagement rate
 */
export function getEngagementCategory(engagementRate: number): 'low' | 'medium' | 'high' | 'viral' {
  if (engagementRate < 1) return 'low';
  if (engagementRate < 3) return 'medium';
  if (engagementRate < 8) return 'high';
  return 'viral';
}

/**
 * Calculate reach and impressions
 */
export function calculateReach(stats: ContentStats): {
  reach: number;
  impressions: number;
  averageViewsPerImpression: number;
} {
  // Impressions are typically 3-5x reach (same content shown to multiple people)
  const impressions = stats.views * 1.5;
  const reach = stats.views; // Conservative estimate

  return {
    reach,
    impressions,
    averageViewsPerImpression: reach > 0 ? impressions / reach : 0,
  };
}

/**
 * Get content performance benchmark
 */
export function getBenchmark(
  engagementRate: number,
  contentType: string,
): {
  yourRate: number;
  averageRate: number;
  topRate: number;
  percentile: number;
} {
  // These are example benchmarks - would come from database
  const benchmarks: Record<string, { average: number; top: number }> = {
    post: { average: 2, top: 8 },
    track: { average: 5, top: 15 },
    gig: { average: 3, top: 10 },
    video: { average: 4, top: 12 },
  };

  const benchmark = benchmarks[contentType] || benchmarks.post;

  const percentile = Math.min(
    100,
    (engagementRate / benchmark.top) * 100,
  );

  return {
    yourRate: engagementRate,
    averageRate: benchmark.average,
    topRate: benchmark.top,
    percentile: Math.round(percentile),
  };
}

/**
 * Predict trend based on recent activity
 */
export function predictTrend(
  current: number,
  previous: number,
): {
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
} {
  const change = current - previous;
  const changePercent = previous > 0 ? (change / previous) * 100 : 0;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (changePercent > 5) trend = 'up';
  if (changePercent < -5) trend = 'down';

  return {
    change,
    changePercent: Math.round(changePercent * 10) / 10,
    trend,
  };
}

/**
 * Group analytics by time period
 */
export function groupAnalyticsByPeriod(
  data: Array<{ date: Date; value: number }>,
  period: 'day' | 'week' | 'month',
): Map<string, number[]> {
  const grouped = new Map<string, number[]>();

  data.forEach(({ date, value }) => {
    let key: string;

    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = date.toISOString().substring(0, 7);
        break;
    }

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(value);
  });

  return grouped;
}

/**
 * Calculate average from grouped data
 */
export function calculateGroupedAverages(
  grouped: Map<string, number[]>,
): Map<string, number> {
  const averages = new Map<string, number>();

  grouped.forEach((values, key) => {
    const sum = values.reduce((a, b) => a + b, 0);
    averages.set(key, Math.round(sum / values.length));
  });

  return averages;
}

/**
 * Creator Insights & Recommendations
 * Growth recommendations, content suggestions, and performance insights
 */

export interface CreatorInsight {
  type: 'opportunity' | 'warning' | 'trend' | 'recommendation';
  title: string;
  description: string;
  actionItems?: string[];
  impact: 'low' | 'medium' | 'high';
  timeframe?: string;
}

/**
 * Generate insights from creator data
 */
export function generateCreatorInsights(
  stats: any,
  history: any[],
): CreatorInsight[] {
  const insights: CreatorInsight[] = [];

  // Check for growth opportunities
  if (stats.engagementRate < 2) {
    insights.push({
      type: 'opportunity',
      title: 'Low Engagement Rate',
      description:
        'Your content has lower engagement than average. Try posting at peak hours.',
      actionItems: [
        'Post during peak engagement hours (2-4 PM on weekdays)',
        'Use more engaging hashtags',
        'Ask questions in captions to encourage comments',
      ],
      impact: 'high',
    });
  }

  // Check for audience growth
  if (stats.followersAdded < stats.avgMonthlyFollowers * 0.1) {
    insights.push({
      type: 'warning',
      title: 'Slowing Follower Growth',
      description: 'Your follower growth rate has slowed this month.',
      actionItems: [
        'Collaborate with other creators',
        'Host a giveaway or contest',
        'Create more shareable content',
      ],
      impact: 'medium',
    });
  }

  // Check for content type performance
  const typePerformance = analyzeContentTypePerformance(history);
  const bestType = Object.entries(typePerformance).sort(([, a], [, b]) => b - a)[0];

  if (bestType) {
    insights.push({
      type: 'trend',
      title: `"${bestType[0]}" Content is Your Best Performer`,
      description: `Your ${bestType[0]} content gets ${Math.round(bestType[1] as number)}% more engagement.`,
      impact: 'medium',
      timeframe: 'Last 30 days',
    });
  }

  // Revenue opportunity
  if (stats.supporters < stats.followers * 0.05) {
    insights.push({
      type: 'opportunity',
      title: 'Untapped Supporter Potential',
      description: `Only ${((stats.supporters / stats.followers) * 100).toFixed(1)}% of your followers support you with tips.`,
      actionItems: [
        'Create exclusive content for supporters',
        'Highlight your most loyal fans',
        'Enable tips on your top-performing content',
      ],
      impact: 'high',
    });
  }

  return insights;
}

/**
 * Analyze performance by content type
 */
function analyzeContentTypePerformance(history: any[]): Record<string, number> {
  const performance: Record<string, number> = {};

  history.forEach((item) => {
    if (!performance[item.type]) {
      performance[item.type] = 0;
    }
    performance[item.type] += item.engagement || 0;
  });

  return performance;
}

/**
 * Get growth recommendations
 */
export function getGrowthRecommendations(stats: any): string[] {
  const recommendations: string[] = [];

  // Posting frequency
  if (stats.postsPerWeek < 3) {
    recommendations.push('Increase posting frequency to 3-5 times per week');
  }

  if (stats.postsPerWeek > 10) {
    recommendations.push('You might be posting too frequently - focus on quality');
  }

  // Content types
  if (!stats.hasVideoContent) {
    recommendations.push('Add video content - it gets 10x more engagement');
  }

  // Collaboration
  if (stats.collaborations < 2) {
    recommendations.push('Collaborate with 2-3 creators in your niche this month');
  }

  // Call to action
  if (stats.avgCTA < 30) {
    recommendations.push('Add stronger calls-to-action in your captions');
  }

  // Hashtag strategy
  if (stats.avgHashtags < 5) {
    recommendations.push('Use 15-20 relevant hashtags per post');
  }

  // Response rate
  if (stats.commentResponseRate < 50) {
    recommendations.push('Respond to 80%+ of comments - it boosts algorithm reach');
  }

  return recommendations;
}

/**
 * Calculate creator health score (0-100)
 */
export function calculateCreatorHealthScore(stats: any): {
  score: number;
  category: 'struggling' | 'growing' | 'established' | 'thriving';
  breakdown: Record<string, number>;
} {
  let score = 0;

  // Growth (20 points)
  const growthScore = Math.min(20, (stats.monthlyFollowerGrowth / stats.totalFollowers) * 100);
  score += growthScore;

  // Engagement (25 points)
  const engagementScore = Math.min(25, stats.engagementRate * 3);
  score += engagementScore;

  // Consistency (20 points)
  const consistency = stats.postsPerWeek >= 3 ? 20 : (stats.postsPerWeek / 3) * 20;
  score += consistency;

  // Monetization (25 points)
  const monetizationRate = stats.supporters > 0 ? 25 : 0;
  score += monetizationRate;

  // Determine category
  let category: 'struggling' | 'growing' | 'established' | 'thriving' = 'struggling';
  if (score >= 75) category = 'thriving';
  else if (score >= 50) category = 'established';
  else if (score >= 25) category = 'growing';

  return {
    score: Math.round(score),
    category,
    breakdown: {
      growth: Math.round(growthScore),
      engagement: Math.round(engagementScore),
      consistency: Math.round(consistency),
      monetization: Math.round(monetizationRate),
    },
  };
}

/**
 * Project future earnings based on trends
 */
export function projectEarnings(
  currentMonthlyEarnings: number,
  growthRate: number, // percentage
  months: number = 12,
): {
  projections: { month: number; earnings: number }[];
  totalProjected: number;
  averageMonthly: number;
} {
  const projections = [];
  let totalProjected = 0;
  const monthlyGrowth = 1 + growthRate / 100;

  for (let i = 1; i <= months; i++) {
    const earnings = Math.round(currentMonthlyEarnings * Math.pow(monthlyGrowth, i - 1));
    projections.push({ month: i, earnings });
    totalProjected += earnings;
  }

  return {
    projections,
    totalProjected,
    averageMonthly: Math.round(totalProjected / months),
  };
}

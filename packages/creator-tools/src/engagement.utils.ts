/**
 * Engagement Utilities
 * Track audience interactions and engagement patterns
 */

export interface EngagementEvent {
  type: 'view' | 'like' | 'comment' | 'share' | 'follow' | 'tip';
  userId: string;
  contentId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AudienceMember {
  userId: string;
  username: string;
  engagementCount: number;
  lastEngagementAt: Date;
  engagementTypes: string[];
  isSupporter: boolean; // Has tipped or subscribed
}

export interface TopEngagers {
  mostLikes: AudienceMember[];
  mostComments: AudienceMember[];
  mostShares: AudienceMember[];
  topSupporters: AudienceMember[]; // By tip amount
}

/**
 * Calculate engagement frequency
 */
export function getEngagementFrequency(events: EngagementEvent[]): {
  daily: number;
  weekly: number;
  monthly: number;
} {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const daily = events.filter((e) => e.timestamp > dayAgo).length;
  const weekly = events.filter((e) => e.timestamp > weekAgo).length;
  const monthly = events.filter((e) => e.timestamp > monthAgo).length;

  return { daily, weekly, monthly };
}

/**
 * Identify top engagers
 */
export function identifyTopEngagers(
  events: EngagementEvent[],
  topN: number = 10,
): TopEngagers {
  const engagers = new Map<string, { count: number; types: Set<string> }>();

  events.forEach((event) => {
    const existing = engagers.get(event.userId) || { count: 0, types: new Set() };
    existing.count++;
    existing.types.add(event.type);
    engagers.set(event.userId, existing);
  });

  const sorted = Array.from(engagers.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, topN);

  return {
    mostLikes: sorted
      .filter(([, data]) => data.types.has('like'))
      .map(([userId]) => createAudienceMember(userId, 0, [])),
    mostComments: sorted
      .filter(([, data]) => data.types.has('comment'))
      .map(([userId]) => createAudienceMember(userId, 0, [])),
    mostShares: sorted
      .filter(([, data]) => data.types.has('share'))
      .map(([userId]) => createAudienceMember(userId, 0, [])),
    topSupporters: sorted
      .filter(([, data]) => data.types.has('tip'))
      .map(([userId]) => createAudienceMember(userId, 1, ['tip'])),
  };
}

/**
 * Helper to create audience member
 */
function createAudienceMember(
  userId: string,
  engagementCount: number,
  engagementTypes: string[],
): AudienceMember {
  return {
    userId,
    username: '', // Would be populated from database
    engagementCount,
    lastEngagementAt: new Date(),
    engagementTypes,
    isSupporter: engagementTypes.includes('tip'),
  };
}

/**
 * Detect engagement patterns
 */
export function detectEngagementPattern(events: EngagementEvent[]): {
  peakHour: number;
  peakDay: string;
  mostCommonType: string;
  engagementPattern: 'steady' | 'growing' | 'declining' | 'viral';
} {
  const hourCounts = new Map<number, number>();
  const dayCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();

  events.forEach((event) => {
    // Hour analysis
    const hour = new Date(event.timestamp).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);

    // Day analysis
    const day = new Date(event.timestamp).toLocaleDateString();
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);

    // Type analysis
    typeCounts.set(event.type, (typeCounts.get(event.type) || 0) + 1);
  });

  // Find peak hour
  let peakHour = 0;
  let maxHourCount = 0;
  hourCounts.forEach((count, hour) => {
    if (count > maxHourCount) {
      maxHourCount = count;
      peakHour = hour;
    }
  });

  // Find peak day
  let peakDay = '';
  let maxDayCount = 0;
  dayCounts.forEach((count, day) => {
    if (count > maxDayCount) {
      maxDayCount = count;
      peakDay = day;
    }
  });

  // Find most common type
  let mostCommonType = 'view';
  let maxTypeCount = 0;
  typeCounts.forEach((count, type) => {
    if (count > maxTypeCount) {
      maxTypeCount = count;
      mostCommonType = type;
    }
  });

  // Determine pattern
  const days = Array.from(dayCounts.values());
  const avg = days.reduce((a, b) => a + b, 0) / days.length;
  const latest = days[days.length - 1];
  let pattern: 'steady' | 'growing' | 'declining' | 'viral' = 'steady';

  if (latest > avg * 2) pattern = 'viral';
  else if (latest > avg) pattern = 'growing';
  else if (latest < avg / 2) pattern = 'declining';

  return { peakHour, peakDay, mostCommonType, engagementPattern: pattern };
}

/**
 * Calculate supporter lifetime value
 */
export function calculateSupporterValue(
  tipAmount: number,
  engagementMonths: number,
): {
  totalValue: number;
  monthlyAverage: number;
  predictedYearlyValue: number;
} {
  const totalValue = tipAmount;
  const monthlyAverage = engagementMonths > 0 ? tipAmount / engagementMonths : tipAmount;
  const predictedYearlyValue = monthlyAverage * 12;

  return {
    totalValue,
    monthlyAverage: Math.round(monthlyAverage),
    predictedYearlyValue: Math.round(predictedYearlyValue),
  };
}

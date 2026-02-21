/**
 * Shared Creator Tools Types
 */

export interface CreatorDashboard {
  overview: DashboardOverview;
  earnings: EarningsOverview;
  analytics: AnalyticsOverview;
  insights: CreatorInsight[];
}

export interface DashboardOverview {
  totalFollowers: number;
  totalPosts: number;
  totalEngagement: number;
  followerGrowth: number; // percentage
  engagementRate: number;
  healthScore: number; // 0-100
}

export interface EarningsOverview {
  thisMonth: number; // cents
  lastMonth: number;
  monthlyAverage: number;
  totalEarnings: number;
  topEarningSource: string; // 'tips', 'streams', 'gigs', etc.
  supporterCount: number;
}

export interface AnalyticsOverview {
  topContent: ContentAnalytics[];
  audienceGrowth: { date: string; followers: number }[];
  engagementTrend: { date: string; engagement: number }[];
  contentPerformance: ContentTypePerformance[];
}

export interface ContentAnalytics {
  id: string;
  title: string;
  type: string;
  views: number;
  engagement: number;
  engagementRate: number;
  revenue: number;
  createdAt: Date;
}

export interface ContentTypePerformance {
  type: string;
  count: number;
  averageEngagement: number;
  averageRevenue: number;
}

export interface CreatorInsight {
  type: 'opportunity' | 'warning' | 'trend' | 'recommendation';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionItems?: string[];
}

export interface CreatorStats {
  userId: string;
  period: 'day' | 'week' | 'month' | 'all-time';
  views: number;
  likes: number;
  comments: number;
  shares: number;
  follows: number;
  revenue: number;
  supporterCount: number;
}

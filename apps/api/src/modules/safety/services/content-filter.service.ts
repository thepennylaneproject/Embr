import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContentFilterDto, CreateContentRuleDto, FilterAction } from '../dto/safety.dto';
import { FilterAction as PrismaFilterAction } from '@prisma/client';

export interface FilterResult {
  allowed: boolean;
  action: PrismaFilterAction | null;
  matchedRules: string[];
  score: number;
}

@Injectable()
export class ContentFilterService {
  constructor(private prisma: PrismaService) {}

  // Spam patterns
  private readonly SPAM_PATTERNS = [
    /\b(viagra|cialis|casino|lottery|winner|prize|free\s+money)\b/i,
    /\b(click\s+here|buy\s+now|limited\s+time|act\s+now)\b/i,
    /\b(make\s+money|work\s+from\s+home|easy\s+cash)\b/i,
    /https?:\/\/[^\s]+\.(tk|ml|ga|cf|gq)/i, // Suspicious TLDs
  ];

  // Harassment patterns
  private readonly HARASSMENT_PATTERNS = [
    /\b(kill\s+yourself|kys|hang\s+yourself)\b/i,
    /\b(worthless|pathetic|loser)\b.*\b(die|suicide)\b/i,
  ];

  // Explicit content patterns (adjust based on your community standards)
  private readonly NSFW_PATTERNS = [
    /\b(porn|xxx|nsfw|18\+)\b/i,
  ];

  // Suspicious link patterns
  private readonly SUSPICIOUS_LINK_PATTERNS = [
    /bit\.ly|tinyurl|shorturl/i, // URL shorteners
    /\b(discord\.gg|t\.me)\b/i, // External community invites
  ];

  /**
   * Filter content and determine if it should be allowed
   */
  async filterContent(content: string, userId?: string): Promise<FilterResult> {
    const result: FilterResult = {
      allowed: true,
      action: null,
      matchedRules: [],
      score: 0,
    };

    // Get active content rules
    const rules = await this.prisma.contentRule.findMany({
      where: { enabled: true },
    });

    // Check built-in patterns
    const builtInChecks = [
      { patterns: this.SPAM_PATTERNS, name: 'Spam Detection', weight: 50 },
      { patterns: this.HARASSMENT_PATTERNS, name: 'Harassment Detection', weight: 100 },
      { patterns: this.NSFW_PATTERNS, name: 'NSFW Detection', weight: 30 },
      { patterns: this.SUSPICIOUS_LINK_PATTERNS, name: 'Suspicious Links', weight: 40 },
    ];

    for (const check of builtInChecks) {
      for (const pattern of check.patterns) {
        if (pattern.test(content)) {
          result.matchedRules.push(check.name);
          result.score += check.weight;
        }
      }
    }

    // Check custom rules
    for (const rule of rules) {
      const matched = this.checkRule(content, rule);
      if (matched) {
        result.matchedRules.push(rule.name);
        result.score += this.getActionWeight(rule.action);
        
        // Use the most severe action
        if (!result.action || this.getActionSeverity(rule.action) > this.getActionSeverity(result.action)) {
          result.action = rule.action;
        }
      }
    }

    // Check for excessive caps (yelling)
    if (this.hasExcessiveCaps(content)) {
      result.matchedRules.push('Excessive Caps');
      result.score += 20;
    }

    // Check for excessive repeated characters
    if (this.hasRepeatedChars(content)) {
      result.matchedRules.push('Spam Characters');
      result.score += 15;
    }

    // Check for suspicious patterns (too many links)
    if (this.hasExcessiveLinks(content)) {
      result.matchedRules.push('Excessive Links');
      result.score += 30;
    }

    // Determine final action based on score
    if (result.score >= 100) {
      result.action = PrismaFilterAction.BLOCK;
      result.allowed = false;
    } else if (result.score >= 50) {
      result.action = PrismaFilterAction.FLAG;
      result.allowed = true; // Allow but flag for review
    } else if (result.score >= 30) {
      result.action = PrismaFilterAction.HIDE;
      result.allowed = true; // Allow but hide from sensitive users
    }

    // Log filtering event for analytics
    if (result.score > 0 && userId) {
      await this.logFilterEvent(userId, content, result);
    }

    return result;
  }

  /**
   * Create a custom content rule
   */
  async createRule(dto: CreateContentRuleDto) {
    const rule = await this.prisma.contentRule.create({
      data: {
        name: dto.name,
        description: dto.description,
        keywords: dto.keywords,
        action: dto.action as unknown as PrismaFilterAction,
        caseSensitive: dto.caseSensitive,
        enabled: dto.enabled,
      },
    });

    return rule;
  }

  /**
   * Get all content rules
   */
  async getRules(includeDisabled: boolean = false) {
    const where = includeDisabled ? {} : { enabled: true };

    const rules = await this.prisma.contentRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return rules;
  }

  /**
   * Update a content rule
   */
  async updateRule(ruleId: string, updates: Partial<CreateContentRuleDto>) {
    const data: any = { ...updates };
    if (updates.action) {
      data.action = updates.action as unknown as PrismaFilterAction;
    }

    const rule = await this.prisma.contentRule.update({
      where: { id: ruleId },
      data,
    });

    return rule;
  }

  /**
   * Delete a content rule
   */
  async deleteRule(ruleId: string) {
    await this.prisma.contentRule.delete({
      where: { id: ruleId },
    });

    return { success: true };
  }

  /**
   * Get filtering statistics
   */
  async getStats(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalFiltered, blocked, flagged, hidden, byRule] = await Promise.all([
      this.prisma.filterLog.count({
        where: { createdAt: { gte: since } },
      }),
      this.prisma.filterLog.count({
        where: {
          createdAt: { gte: since },
          action: PrismaFilterAction.BLOCK,
        },
      }),
      this.prisma.filterLog.count({
        where: {
          createdAt: { gte: since },
          action: PrismaFilterAction.FLAG,
        },
      }),
      this.prisma.filterLog.count({
        where: {
          createdAt: { gte: since },
          action: PrismaFilterAction.HIDE,
        },
      }),
      this.prisma.filterLog.groupBy({
        by: ['matchedRules'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
    ]);

    return {
      period: `Last ${days} days`,
      total: totalFiltered,
      byAction: {
        blocked,
        flagged,
        hidden,
      },
      topRules: this.aggregateRuleMatches(byRule),
    };
  }

  /**
   * Check if user is exhibiting spam-like behavior
   */
  async checkUserSpamScore(userId: string): Promise<number> {
    const recentContent = await this.prisma.filterLog.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24h
      },
    });

    // Score factors:
    // - Number of filtered posts
    // - Severity of actions
    // - Frequency

    let score = 0;
    score += recentContent.length * 10; // 10 points per filtered item

    for (const log of recentContent) {
      if (log.action === PrismaFilterAction.BLOCK) score += 50;
      if (log.action === PrismaFilterAction.FLAG) score += 30;
      if (log.action === PrismaFilterAction.HIDE) score += 15;
    }

    // Penalty for high frequency
    if (recentContent.length > 10) {
      score += (recentContent.length - 10) * 20;
    }

    return Math.min(score, 1000); // Cap at 1000
  }

  /**
   * Private helper methods
   */

  private checkRule(content: string, rule: any): boolean {
    const text = rule.caseSensitive ? content : content.toLowerCase();

    for (const keyword of rule.keywords) {
      const searchTerm = rule.caseSensitive ? keyword : keyword.toLowerCase();
      
      // Check for whole word match
      const regex = new RegExp(`\\b${this.escapeRegex(searchTerm)}\\b`, 'g');
      if (regex.test(text)) {
        return true;
      }
    }

    return false;
  }

  private hasExcessiveCaps(content: string): boolean {
    const letters = content.replace(/[^a-zA-Z]/g, '');
    if (letters.length < 10) return false;

    const capsCount = (content.match(/[A-Z]/g) || []).length;
    const ratio = capsCount / letters.length;

    return ratio > 0.7; // More than 70% caps
  }

  private hasRepeatedChars(content: string): boolean {
    return /(.)\1{4,}/.test(content); // Same character 5+ times in a row
  }

  private hasExcessiveLinks(content: string): boolean {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlRegex) || [];
    return urls.length > 3;
  }

  private getActionWeight(action: PrismaFilterAction): number {
    switch (action) {
      case PrismaFilterAction.BLOCK:
        return 100;
      case PrismaFilterAction.FLAG:
        return 50;
      case PrismaFilterAction.HIDE:
        return 30;
      default:
        return 0;
    }
  }

  private getActionSeverity(action: PrismaFilterAction): number {
    switch (action) {
      case PrismaFilterAction.BLOCK:
        return 3;
      case PrismaFilterAction.FLAG:
        return 2;
      case PrismaFilterAction.HIDE:
        return 1;
      default:
        return 0;
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async logFilterEvent(userId: string, content: string, result: FilterResult) {
    await this.prisma.filterLog.create({
      data: {
        userId,
        content: content.substring(0, 500), // Store truncated version
        action: result.action!,
        score: result.score,
        matchedRules: result.matchedRules,
      },
    });
  }

  private aggregateRuleMatches(byRule: any[]): any[] {
    const ruleCounts: { [key: string]: number } = {};

    for (const item of byRule) {
      for (const rule of item.matchedRules) {
        ruleCounts[rule] = (ruleCounts[rule] || 0) + item._count;
      }
    }

    return Object.entries(ruleCounts)
      .map(([rule, count]) => ({ rule, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }
}

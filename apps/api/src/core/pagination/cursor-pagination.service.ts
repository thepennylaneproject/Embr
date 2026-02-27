/**
 * Cursor Pagination Service
 * Provides cursor-based pagination utilities for efficient feed pagination
 */

import { Injectable } from '@nestjs/common';

export interface CursorPaginationParams {
  cursor?: string; // Base64 encoded cursor
  limit: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPaginationResult {
  data: any[];
  cursor: {
    before?: string; // Cursor for previous page
    after?: string; // Cursor for next page
  };
  meta: {
    limit: number;
    hasMore: boolean;
  };
}

@Injectable()
export class CursorPaginationService {
  /**
   * Encode cursor from timestamp and ID
   */
  encodeCursor(id: string, timestamp: Date): string {
    const data = JSON.stringify({
      id,
      ts: timestamp.getTime(),
    });
    return Buffer.from(data).toString('base64');
  }

  /**
   * Decode cursor to get timestamp and ID
   */
  decodeCursor(cursor: string): { id: string; timestamp: Date } {
    try {
      const data = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      return {
        id: data.id,
        timestamp: new Date(data.ts),
      };
    } catch (error) {
      throw new Error('Invalid cursor format');
    }
  }

  /**
   * Generate where clause for Prisma based on cursor
   * Works with createdAt timestamp (descending order)
   */
  getCursorWhereClause(cursor?: string, direction: 'forward' | 'backward' = 'forward') {
    if (!cursor) return {};

    const decoded = this.decodeCursor(cursor);

    // For forward pagination (showing newer posts)
    // We want posts created before the cursor timestamp
    if (direction === 'forward') {
      return {
        OR: [
          { createdAt: { lt: decoded.timestamp } },
          {
            createdAt: decoded.timestamp,
            id: { lt: decoded.id }, // For tie-breaking
          },
        ],
      };
    }

    // For backward pagination (showing older posts)
    return {
      OR: [
        { createdAt: { gt: decoded.timestamp } },
        {
          createdAt: decoded.timestamp,
          id: { gt: decoded.id }, // For tie-breaking
        },
      ],
    };
  }

  /**
   * Build cursor pagination response
   */
  buildResponse(
    items: any[],
    limit: number,
    hasMore: boolean,
  ): Partial<CursorPaginationResult> {
    const result: Partial<CursorPaginationResult> = {
      cursor: {},
      meta: {
        limit,
        hasMore,
      },
    };

    if (items.length > 0) {
      const firstItem = items[0];
      const lastItem = items[items.length - 1];

      // Encode cursors from the first and last items
      result.cursor!.before = this.encodeCursor(firstItem.id, firstItem.createdAt);
      result.cursor!.after = this.encodeCursor(lastItem.id, lastItem.createdAt);
    }

    return result;
  }
}

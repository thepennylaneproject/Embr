/**
 * Analytics Events API
 * Receives and stores analytics events
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface AnalyticsEvent {
  userId?: string;
  event: string;
  timestamp?: number;
  [key: string]: any;
}

interface EventsPayload {
  events: AnalyticsEvent[];
}

/**
 * POST /api/analytics/events
 * Receive analytics events from client
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { events } = req.body as EventsPayload;

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'No events provided' });
  }

  try {
    // TODO: Store events in database
    // For Phase 1, we can log them or store in a simple table
    // Example: await analyticsDb.insertMany(events);

    // Return success
    res.status(200).json({
      success: true,
      count: events.length
    });
  } catch (error) {
    console.error('[Analytics] Error storing events:', error);
    // Don't expose error details to client
    res.status(500).json({ error: 'Failed to store events' });
  }
}

export default handler;

type ReliabilityEvent = {
  name: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

const RELIABILITY_STORAGE_KEY = 'embr_reliability_events';
const MAX_EVENTS = 200;

export function trackReliabilityEvent(name: string, metadata?: Record<string, unknown>) {
  if (typeof window === 'undefined') {
    return;
  }

  const event: ReliabilityEvent = {
    name,
    metadata,
    createdAt: new Date().toISOString(),
  };

  try {
    const existingRaw = window.localStorage.getItem(RELIABILITY_STORAGE_KEY);
    const existing: ReliabilityEvent[] = existingRaw ? JSON.parse(existingRaw) : [];
    const next = [...existing, event].slice(-MAX_EVENTS);
    window.localStorage.setItem(RELIABILITY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore telemetry persistence errors to avoid blocking UX.
  }
}

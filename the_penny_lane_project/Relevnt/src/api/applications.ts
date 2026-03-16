import { Application } from '../types/application';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

// Test-harness hook — set window.__relevnt_scenario to control behaviour in dev mode.
declare global {
  interface Window {
    __relevnt_scenario?: 'global-empty' | 'filter-empty' | 'populated' | 'error';
    __relevnt_mock_apps?: Application[];
  }
}

function mockDelay<T>(value: T, ms = 600): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function fetchApplications(): Promise<Application[]> {
  // Dev-only scenario shim
  const scenario = window.__relevnt_scenario;
  if (scenario) {
    if (scenario === 'error') {
      await mockDelay(null);
      throw new Error('Network error — could not reach the server.');
    }
    if (scenario === 'global-empty') {
      return mockDelay([]);
    }
    if (scenario === 'filter-empty') {
      // Return applications that only have 'applied' status — selecting any
      // other filter tab (e.g. 'interviewing') will produce an empty filtered list.
      return mockDelay(
        (window.__relevnt_mock_apps ?? []).filter((a) => a.status === 'applied')
      );
    }
    // 'populated' — return all mock data
    return mockDelay(window.__relevnt_mock_apps ?? []);
  }

  const response = await fetch(`${API_BASE}/applications`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Failed to load applications (${response.status})`);
  }

  return response.json();
}

import { useState } from 'react';
import ApplicationsPage from './pages/ApplicationsPage';

/**
 * Dev-only test harness for visualising ApplicationsPage states.
 * Remove this wrapper before production build and replace with proper routing.
 */
type Scenario = 'global-empty' | 'filter-empty' | 'populated' | 'error';

const MOCK_APPLICATIONS = [
  {
    id: '1',
    companyName: 'Stripe',
    role: 'Senior Frontend Engineer',
    status: 'interviewing' as const,
    appliedAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-02-20T10:00:00Z',
    location: 'Remote — US',
    salary: '$180k–$220k',
  },
  {
    id: '2',
    companyName: 'Linear',
    role: 'Product Designer',
    status: 'reviewing' as const,
    appliedAt: '2026-02-18T10:00:00Z',
    updatedAt: '2026-02-19T10:00:00Z',
    location: 'San Francisco, CA',
  },
  {
    id: '3',
    companyName: 'Vercel',
    role: 'Developer Advocate',
    status: 'applied' as const,
    appliedAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    location: 'Remote — Global',
    notes: 'Referred by a friend on the DX team.',
  },
];

// Override fetch so the test harness works without a real API
function patchFetch(scenario: Scenario) {
  window.__relevnt_scenario = scenario;
  window.__relevnt_mock_apps = MOCK_APPLICATIONS;
}

export default function App() {
  const [scenario, setScenario] = useState<Scenario>('populated');

  patchFetch(scenario);

  return (
    <>
      {/* Scenario switcher bar — dev-only */}
      <div className="sticky top-0 z-50 bg-indigo-950 text-white px-4 py-2 flex items-center gap-3 text-sm flex-wrap">
        <span className="font-semibold opacity-60 uppercase tracking-wide text-xs">
          Test scenario
        </span>
        {(['populated', 'global-empty', 'filter-empty', 'error'] as Scenario[]).map((s) => (
          <button
            key={s}
            onClick={() => setScenario(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              scenario === s
                ? 'bg-indigo-400 text-white'
                : 'bg-indigo-800 text-indigo-200 hover:bg-indigo-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <ApplicationsPage key={scenario} />
    </>
  );
}

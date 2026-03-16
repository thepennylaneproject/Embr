/**
 * scoring/index.ts
 *
 * Public surface of the scoring library.  Import from here rather than
 * directly from individual modules so that internal refactors don't break
 * consumers.
 */

export {
  aggregateUserProfile,
  batchAggregateUserProfiles,
  emptyAggregatedProfile,
} from './profileAggregator';

export type {
  AggregatedProfile,
  JobPreference,
  PersonaPreference,
  ProfessionalProfile,
  Resume,
} from './profileAggregator';

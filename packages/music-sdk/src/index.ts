/**
 * EMBR Music SDK
 *
 * Official TypeScript SDK for the EMBR Music API
 *
 * @packageDocumentation
 */

export {
  EmbrtMusicClient,
  MusicApiError,
  // Types
  type ClientConfig,
  type Artist,
  type Track,
  type LicensingInfo,
  type VideoUsage,
  type CreatorRevenue,
  type ApiError,
  // API Groups
  type ArtistsAPI,
  type TracksAPI,
  type LicensingAPI,
  type UsageAPI,
  type RevenueAPI,
} from './client';

export { default } from './client';

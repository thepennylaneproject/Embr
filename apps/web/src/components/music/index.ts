// Hooks
export { useArtist, useArtistTracks, useTrack, useSearchTracks, useLicensing } from './hooks/useMusic';
export { useRecordUsage, useRecordStream, useTrackUsageHistory } from './hooks/useMusic';
export { useArtistRevenue, useCreatorRevenue } from './hooks/useMusic';

// Components
export { MusicPlayer } from './player/MusicPlayer';
export { TrackDiscovery } from './discovery/TrackDiscovery';
export { ArtistDashboard } from './artist/ArtistDashboard';
export { MusicLicensingFlow } from './licensing/MusicLicensingFlow';
export { CreatorRevenueDashboard } from './dashboard/CreatorRevenueDashboard';

/**
 * Module 5: Gigs & Jobs Marketplace
 * Component Index
 * 
 * Export all components, hooks, and utilities for easy importing
 */

// Components
export { GigPostForm } from './GigPostForm';
export { GigCard } from './GigCard';
export { GigDiscovery } from './GigDiscovery';
export { ApplicationForm } from './ApplicationForm';
export { GigManagementDashboard } from './GigManagementDashboard';

// Hooks
export { useGig, useApplication, useMilestones } from '@/hooks/useGig';

// Types
export * from '@embr/types';

// API
export { gigsApi, applicationsApi, escrowApi, milestonesApi } from '@shared/api/gigs.api';

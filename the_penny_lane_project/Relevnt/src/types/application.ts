export type ApplicationStatus =
  | 'all'
  | 'applied'
  | 'reviewing'
  | 'interviewing'
  | 'in_review'
  | 'offer'
  | 'accepted'
  | 'rejected';

export interface Application {
  id: string;
  companyName: string;
  role: string;
  status: Exclude<ApplicationStatus, 'all'>;
  appliedAt: string;
  updatedAt: string;
  location?: string;
  salary?: string;
  notes?: string;
  url?: string;
}

export interface FilterOption {
  value: ApplicationStatus;
  label: string;
}

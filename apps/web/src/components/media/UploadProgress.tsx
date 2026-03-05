/**
 * UploadProgress Component
 * Displays upload progress with retry and cancel capabilities
 */

'use client';

import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle, Loader, RefreshCw } from 'lucide-react';

export interface UploadProgressItem {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled';
  error?: string;
  speed?: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
  uploadedBytes?: number;
}

interface UploadProgressProps {
  uploads: UploadProgressItem[];
  onCancel?: (uploadId: string) => void;
  onRetry?: (uploadId: string) => void;
  onDismiss?: (uploadId: string) => void;
  position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
  maxVisible?: number;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  uploads,
  onCancel,
  onRetry,
  onDismiss,
  position = 'bottom-right',
  maxVisible = 3,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Filter out dismissed uploads
  const visibleUploads = uploads.filter((u) => !dismissed.has(u.id));

  // Show only the most recent uploads
  const displayedUploads = visibleUploads.slice(0, maxVisible);
  const hiddenCount = visibleUploads.length - displayedUploads.length;

  const handleDismiss = (uploadId: string) => {
    setDismissed((prev) => new Set([...prev, uploadId]));
    onDismiss?.(uploadId);
  };

  if (visibleUploads.length === 0) {
    return null;
  }

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-left': 'top-4 left-4',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 w-96 max-w-full space-y-2 p-4`}
    >
      {displayedUploads.map((upload) => (
        <UploadProgressCard
          key={upload.id}
          upload={upload}
          expanded={expandedId === upload.id}
          onToggleExpand={() =>
            setExpandedId(expandedId === upload.id ? null : upload.id)
          }
          onCancel={onCancel}
          onRetry={onRetry}
          onDismiss={handleDismiss}
        />
      ))}

      {hiddenCount > 0 && (
        <div className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-300">
          +{hiddenCount} more upload{hiddenCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

interface UploadProgressCardProps {
  upload: UploadProgressItem;
  expanded: boolean;
  onToggleExpand: () => void;
  onCancel?: (uploadId: string) => void;
  onRetry?: (uploadId: string) => void;
  onDismiss: (uploadId: string) => void;
}

const UploadProgressCard: React.FC<UploadProgressCardProps> = ({
  upload,
  expanded,
  onToggleExpand: _onToggleExpand,
  onCancel,
  onRetry,
  onDismiss,
}) => {
  const { id, fileName, fileSize, progress, status, error, speed, estimatedTimeRemaining } =
    upload;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
      case 'uploading':
        return <Loader className="h-5 w-5 animate-spin text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Waiting...';
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return '';
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'error':
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const canCancel = status === 'pending' || status === 'uploading';
  const canRetry = status === 'error' || status === 'cancelled';
  const canDismiss = status === 'completed' || status === 'error' || status === 'cancelled';

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {fileName}
            </p>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <span>{getStatusText()}</span>
              {status === 'uploading' && speed && (
                <>
                  <span>•</span>
                  <span>{formatBytes(speed)}/s</span>
                </>
              )}
              {status === 'uploading' && estimatedTimeRemaining && (
                <>
                  <span>•</span>
                  <span>{formatTime(estimatedTimeRemaining)} left</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-2">
          {canCancel && onCancel && (
            <button
              onClick={() => onCancel(id)}
              className="text-gray-400 hover:text-white transition-colors"
              title="Cancel upload"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {canRetry && onRetry && (
            <button
              onClick={() => onRetry(id)}
              className="text-blue-400 hover:text-blue-300 transition-colors"
              title="Retry upload"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          {canDismiss && (
            <button
              onClick={() => onDismiss(id)}
              className="text-gray-400 hover:text-white transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(status === 'uploading' || status === 'processing') && (
        <div className="px-4 pb-3">
          <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>{formatBytes(upload.uploadedBytes || 0)}</span>
            <span>{progress.toFixed(0)}%</span>
            <span>{formatBytes(fileSize)}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {status === 'error' && error && expanded && (
        <div className="px-4 pb-3">
          <div className="rounded bg-red-500/10 border border-red-500/20 p-2">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadProgress;

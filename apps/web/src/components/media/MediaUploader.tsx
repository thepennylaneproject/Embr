/**
 * MediaUploader Component
 * Drag-and-drop file uploader with multipart upload support
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image, Video, FileText, AlertCircle } from 'lucide-react';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { UploadProgress } from './UploadProgress';

interface MediaUploaderProps {
  accept?: string;
  maxSize?: number; // in bytes
  maxFiles?: number;
  contentType?: 'image' | 'video' | 'document';
  onUploadComplete?: (media: any[]) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  accept,
  maxSize = 100 * 1024 * 1024, // 100MB default
  maxFiles = 5,
  contentType,
  onUploadComplete,
  onUploadError,
  disabled = false,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    uploads,
    uploadFiles,
    cancelUpload,
    retryUpload,
  } = useMediaUpload({
    onComplete: (results) => {
      onUploadComplete?.(results);
      // Clear selected files after successful upload
      setSelectedFiles([]);
    },
    onError: (error) => {
      onUploadError?.(error);
    },
  });

  // Determine accepted file types
  const getAcceptedTypes = () => {
    if (accept) return accept;
    
    switch (contentType) {
      case 'image':
        return 'image/jpeg,image/png,image/gif,image/webp';
      case 'video':
        return 'video/mp4,video/quicktime,video/webm';
      case 'document':
        return 'application/pdf,.doc,.docx';
      default:
        return '*';
    }
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `${file.name} exceeds maximum size of ${formatBytes(maxSize)}`;
    }

    // Check file type if contentType specified
    if (contentType) {
      const fileType = file.type;
      const isValid = (() => {
        switch (contentType) {
          case 'image':
            return fileType.startsWith('image/');
          case 'video':
            return fileType.startsWith('video/');
          case 'document':
            return fileType === 'application/pdf' || 
                   fileType.includes('document') || 
                   fileType.includes('msword');
          default:
            return true;
        }
      })();

      if (!isValid) {
        return `${file.name} is not a valid ${contentType} file`;
      }
    }

    return null;
  };

  // Handle file selection
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const newErrors: string[] = [];
      const validFiles: File[] = [];

      // Validate each file
      fileArray.forEach((file) => {
        const error = validateFile(file);
        if (error) {
          newErrors.push(error);
        } else {
          validFiles.push(file);
        }
      });

      // Check max files limit
      const currentFileCount = selectedFiles.length + validFiles.length;
      if (currentFileCount > maxFiles) {
        newErrors.push(`Maximum ${maxFiles} files allowed`);
        const allowedCount = maxFiles - selectedFiles.length;
        validFiles.splice(allowedCount);
      }

      setErrors(newErrors);

      if (validFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...validFiles]);
      }
    },
    [selectedFiles, maxFiles, maxSize, contentType],
  );

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  // Remove file from selection
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload selected files
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    await uploadFiles(selectedFiles, contentType || 'image');
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Get file icon
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-8 w-8 text-blue-400" />;
    } else if (file.type.startsWith('video/')) {
      return <Video className="h-8 w-8 text-purple-400" />;
    } else {
      return <FileText className="h-8 w-8 text-gray-400" />;
    }
  };

  const hasActiveUploads = uploads.some(
    (u) => u.status === 'uploading' || u.status === 'processing',
  );

  return (
    <div className={`w-full ${className}`}>
      {/* Drop Zone */}
      <div
        className={`
          relative rounded-lg border-2 border-dashed transition-all
          ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 bg-gray-800/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-500'}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={getAcceptedTypes()}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center py-12 px-6">
          <Upload
            className={`h-12 w-12 mb-4 ${isDragging ? 'text-blue-400' : 'text-gray-400'}`}
          />
          <p className="text-lg font-medium text-white mb-2">
            {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
          </p>
          <p className="text-sm text-gray-400 text-center">
            {contentType
              ? `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} files up to ${formatBytes(maxSize)}`
              : `Files up to ${formatBytes(maxSize)}`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Maximum {maxFiles} files
          </p>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-4 space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-start space-x-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3"
            >
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ))}
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">
              Selected Files ({selectedFiles.length})
            </p>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg bg-gray-800 p-3"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="text-gray-400 hover:text-white transition-colors ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleUpload}
            disabled={disabled || hasActiveUploads}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {hasActiveUploads ? 'Uploading...' : `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Upload Progress */}
      <UploadProgress
        uploads={uploads}
        onCancel={cancelUpload}
        onRetry={retryUpload}
        onDismiss={(_id) => {
          // Handle dismiss
        }}
        position="bottom-right"
      />
    </div>
  );
};

export default MediaUploader;

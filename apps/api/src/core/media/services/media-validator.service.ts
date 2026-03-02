/**
 * Media Validator Service
 * Validates media uploads for security and compliance
 */

import { Injectable, BadRequestException } from '@nestjs/common';

export interface MediaValidationConfig {
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

@Injectable()
export class MediaValidatorService {
  private readonly imageConfig: MediaValidationConfig = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  };

  private readonly videoConfig: MediaValidationConfig = {
    maxFileSize: 500 * 1024 * 1024, // 500MB
    allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    allowedExtensions: ['.mp4', '.webm', '.mov'],
  };

  private readonly audioConfig: MediaValidationConfig = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/aac', 'audio/ogg'],
    allowedExtensions: ['.mp3', '.wav', '.aac', '.ogg'],
  };

  /**
   * Validate media file
   */
  validateMedia(
    filename: string,
    mimeType: string,
    fileSize: number,
    mediaType: 'image' | 'video' | 'audio',
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = this.getConfigForType(mediaType);

    // Check file extension
    const ext = this.getFileExtension(filename).toLowerCase();
    if (!config.allowedExtensions.includes(ext)) {
      errors.push(`Invalid file extension. Allowed: ${config.allowedExtensions.join(', ')}`);
    }

    // Check MIME type
    if (!config.allowedMimeTypes.includes(mimeType)) {
      errors.push(`Invalid MIME type. Allowed: ${config.allowedMimeTypes.join(', ')}`);
    }

    // Check file size
    if (fileSize > config.maxFileSize) {
      errors.push(
        `File too large. Maximum size: ${this.formatBytes(config.maxFileSize)}`,
      );
    }

    // Check minimum file size (prevent empty files)
    if (fileSize < 100) {
      errors.push('File is too small or empty');
    }

    // Security: Check for suspicious patterns in filename
    if (this.hasSuspiciousFilename(filename)) {
      errors.push('Invalid filename. Filename contains suspicious characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate image dimensions
   */
  validateImageDimensions(
    width: number,
    height: number,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const minDimension = 100;
    const maxDimension = 8000;

    if (width < minDimension || height < minDimension) {
      errors.push(
        `Image dimensions too small. Minimum: ${minDimension}x${minDimension}`,
      );
    }

    if (width > maxDimension || height > maxDimension) {
      errors.push(
        `Image dimensions too large. Maximum: ${maxDimension}x${maxDimension}`,
      );
    }

    // Check aspect ratio (shouldn't be extremely skewed)
    const aspectRatio = Math.max(width, height) / Math.min(width, height);
    if (aspectRatio > 10) {
      errors.push('Image aspect ratio is too extreme');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate video duration
   */
  validateVideoDuration(durationSeconds: number): { valid: boolean; error?: string } {
    const minDuration = 1; // 1 second
    const maxDuration = 3600; // 60 minutes

    if (durationSeconds < minDuration) {
      return { valid: false, error: 'Video is too short' };
    }

    if (durationSeconds > maxDuration) {
      return {
        valid: false,
        error: `Video exceeds maximum duration of ${maxDuration / 60} minutes`,
      };
    }

    return { valid: true };
  }

  /**
   * Check for malicious content signatures
   */
  checkForMalicious(buffer: Buffer, mimeType: string): { safe: boolean; reason?: string } {
    // Check for common malware signatures
    const signatures = [
      { name: 'ELF', bytes: [0x7f, 0x45, 0x4c, 0x46] }, // ELF executable
      { name: 'PE', bytes: [0x4d, 0x5a] }, // Windows PE/MZ
      { name: 'Zip', bytes: [0x50, 0x4b, 0x03, 0x04] }, // ZIP archive disguised as image
      { name: 'Script', bytes: [0x3c, 0x3f, 0x70, 0x68, 0x70] }, // PHP tag
    ];

    for (const sig of signatures) {
      if (buffer.length >= sig.bytes.length) {
        let matches = true;
        for (let i = 0; i < sig.bytes.length; i++) {
          if (buffer[i] !== sig.bytes[i]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          return { safe: false, reason: `File contains ${sig.name} executable code` };
        }
      }
    }

    // Additional checks based on MIME type
    if (mimeType.startsWith('image/')) {
      // Check for polyglot files (image + executable)
      if (buffer.includes(Buffer.from('<?php'))) {
        return { safe: false, reason: 'File contains PHP code' };
      }
      if (buffer.includes(Buffer.from('<%'))) {
        return { safe: false, reason: 'File contains script code' };
      }
    }

    return { safe: true };
  }

  /**
   * Sanitize filename for safe storage
   */
  sanitizeFilename(filename: string): string {
    // Remove path components
    let sanitized = filename.split(/[\\/]+/).pop() || filename;

    // Keep only safe characters: alphanumeric, dash, underscore, and extension
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Remove multiple consecutive dots (prevent directory traversal)
    sanitized = sanitized.replace(/\.+/g, '.');

    // Remove leading dots
    sanitized = sanitized.replace(/^\.+/, '');

    // Limit length
    if (sanitized.length > 255) {
      const ext = this.getFileExtension(sanitized);
      const nameWithoutExt = sanitized.slice(0, sanitized.lastIndexOf('.'));
      sanitized = nameWithoutExt.slice(0, 250 - ext.length) + ext;
    }

    return sanitized || 'file';
  }

  /**
   * Generate safe upload path
   */
  generateUploadPath(userId: string, mediaType: 'image' | 'video' | 'audio'): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `uploads/${mediaType}/${year}/${month}/${day}/${userId}`;
  }

  /**
   * Validate upload batch (multiple files)
   */
  validateBatch(
    files: Array<{ filename: string; mimeType: string; size: number }>,
    mediaType: 'image' | 'video' | 'audio',
    maxFiles: number = 10,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (files.length > maxFiles) {
      errors.push(`Too many files. Maximum: ${maxFiles}`);
      return { valid: false, errors };
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = this.validateMedia(file.filename, file.mimeType, file.size, mediaType);
      if (!result.valid) {
        errors.push(`File ${i + 1} (${file.filename}): ${result.errors.join('; ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Private helpers

  private getConfigForType(mediaType: 'image' | 'video' | 'audio'): MediaValidationConfig {
    switch (mediaType) {
      case 'image':
        return this.imageConfig;
      case 'video':
        return this.videoConfig;
      case 'audio':
        return this.audioConfig;
      default:
        return this.imageConfig;
    }
  }

  private getFileExtension(filename: string): string {
    const match = filename.match(/\.[^.]*$/);
    return match ? match[0] : '';
  }

  private hasSuspiciousFilename(filename: string): boolean {
    // Check for directory traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return true;
    }

    // Check for null bytes
    if (filename.includes('\0')) {
      return true;
    }

    // Check for control characters
    if (/[\x00-\x1f]/.test(filename)) {
      return true;
    }

    return false;
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

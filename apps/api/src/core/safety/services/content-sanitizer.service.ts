/**
 * Content Sanitizer Service
 * Sanitizes user-generated content to prevent XSS vulnerabilities
 */

import { Injectable } from '@nestjs/common';
import DOMPurify from 'isomorphic-dompurify';

@Injectable()
export class ContentSanitizerService {
  /**
   * Sanitize post content
   * Removes all HTML tags and scripts
   */
  sanitizePostContent(content: string | undefined): string {
    if (!content) return '';

    // Remove all HTML tags and dangerous content
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });

    return sanitized.trim();
  }

  /**
   * Sanitize comment content
   * Same as post content but with shorter limit
   */
  sanitizeCommentContent(content: string): string {
    if (!content) return '';

    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });

    return sanitized.trim();
  }

  /**
   * Sanitize hashtags array
   * Removes special characters and lowercase
   */
  sanitizeHashtags(hashtags: string[] | undefined): string[] {
    if (!hashtags || hashtags.length === 0) return [];

    return hashtags
      .map((tag) => {
        // Remove # prefix if present
        let clean = tag.replace(/^#+/, '').trim();
        // Keep only alphanumeric, underscores, and hyphens
        clean = clean.replace(/[^a-z0-9_-]/gi, '');
        return clean.toLowerCase();
      })
      .filter((tag) => tag.length > 0) // Remove empty tags
      .slice(0, 10); // Max 10 hashtags
  }

  /**
   * Sanitize user input for storage
   * General purpose sanitization
   */
  sanitizeInput(input: string | undefined, maxLength?: number): string {
    if (!input) return '';

    let sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });

    sanitized = sanitized.trim();

    // Apply max length if specified
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }
}

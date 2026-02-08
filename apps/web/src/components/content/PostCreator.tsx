/**
 * PostCreator Component
 * Full-featured post creation with media upload, preview, and validation
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { X, Image, Video, Loader2, Upload } from 'lucide-react';
import { usePost } from '@/hooks/usePost';
import { PostType, PostVisibility, CreatePostInput } from '@shared/types/content.types';

interface PostCreatorProps {
  onPostCreated?: (postId: string) => void;
  onCancel?: () => void;
  defaultVisibility?: PostVisibility;
  className?: string;
}

export const PostCreator: React.FC<PostCreatorProps> = ({
  onPostCreated,
  onCancel,
  defaultVisibility = PostVisibility.PUBLIC,
  className = '',
}) => {
  const {
    isCreating,
    isUploading,
    uploadProgress,
    error,
    createPost,
    uploadMedia,
    reset,
  } = usePost();

  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState(defaultVisibility);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelect = useCallback((file: File) => {
    const type = file.type.startsWith('image/') ? 'image' : 'video';
    setMediaFile(file);
    setMediaType(type);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleMediaSelect(file);
      }
    },
    [handleMediaSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
        handleMediaSelect(file);
      }
    },
    [handleMediaSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const removeMedia = useCallback(() => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const extractHashtagsAndMentions = useCallback((text: string) => {
    const hashtagMatches = text.match(/#\w+/g) || [];
    
    setHashtags(hashtagMatches.map(tag => tag.slice(1)));
  }, []);

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setContent(newContent);
      extractHashtagsAndMentions(newContent);
    },
    [extractHashtagsAndMentions]
  );

  const handleSubmit = useCallback(async () => {
    if (!content.trim() && !mediaFile) {
      return;
    }

    try {
      let postData: CreatePostInput = {
        type: PostType.TEXT,
        content: content.trim(),
        visibility,
        hashtags,
      };

      // Upload media if present
      if (mediaFile && mediaType) {
        const mediaResult = await uploadMedia(mediaFile, mediaType);
        postData = {
          ...postData,
          type: mediaType === 'image' ? PostType.IMAGE : PostType.VIDEO,
          mediaUrl: mediaResult.mediaUrl,
          thumbnailUrl: mediaResult.thumbnailUrl,
        };
      }

      const post = await createPost(postData);
      
      // Reset form
      setContent('');
      removeMedia();
      setHashtags([]);
      
      onPostCreated?.(post.id);
    } catch (err) {
      console.error('Failed to create post:', err);
    }
  }, [content, mediaFile, mediaType, visibility, hashtags, uploadMedia, createPost, removeMedia, onPostCreated]);

  const handleCancel = useCallback(() => {
    setContent('');
    removeMedia();
    setHashtags([]);
    reset();
    onCancel?.();
  }, [removeMedia, reset, onCancel]);

  const isSubmitDisabled = (!content.trim() && !mediaFile) || isCreating || isUploading;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {/* Content Input */}
      <textarea
        value={content}
        onChange={handleContentChange}
        placeholder="What's on your mind?"
        className="w-full min-h-[120px] text-gray-900 placeholder-gray-400 resize-none focus:outline-none text-lg"
        maxLength={500}
        disabled={isCreating || isUploading}
      />

      {/* Character Count */}
      <div className="flex justify-end mt-1">
        <span
          className={`text-sm ${
            content.length > 450 ? 'text-red-500' : 'text-gray-400'
          }`}
        >
          {content.length}/500
        </span>
      </div>

      {/* Media Preview */}
      {mediaPreview && (
        <div className="mt-4 relative rounded-xl overflow-hidden bg-gray-50">
          {mediaType === 'image' ? (
            <img
              src={mediaPreview}
              alt="Preview"
              className="w-full max-h-96 object-contain"
            />
          ) : (
            <video
              src={mediaPreview}
              className="w-full max-h-96"
              controls
            />
          )}
          <button
            onClick={removeMedia}
            className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
            disabled={isUploading}
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && uploadProgress && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Uploading...</span>
            <span>{uploadProgress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#E8998D] h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Drag & Drop Zone */}
      {!mediaPreview && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragging
              ? 'border-[#E8998D] bg-[#E8998D]/5'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <Upload className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-gray-600">
            Drag and drop an image or video, or{' '}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[#E8998D] hover:underline font-medium"
            >
              browse
            </button>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!mediaPreview && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                disabled={isCreating || isUploading}
                title="Add image"
              >
                <Image size={20} />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                disabled={isCreating || isUploading}
                title="Add video"
              >
                <Video size={20} />
              </button>
            </>
          )}

          {/* Visibility Selector */}
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as PostVisibility)}
            className="ml-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#E8998D]"
            disabled={isCreating || isUploading}
          >
            <option value={PostVisibility.PUBLIC}>Public</option>
            <option value={PostVisibility.FOLLOWERS}>Followers</option>
            <option value={PostVisibility.PRIVATE}>Private</option>
          </select>
        </div>

        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              disabled={isCreating || isUploading}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="px-6 py-2.5 bg-[#E8998D] hover:bg-[#d88a7e] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isCreating || isUploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {isUploading ? 'Uploading...' : 'Posting...'}
              </>
            ) : (
              'Post'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostCreator;

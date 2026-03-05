/**
 * PostCreator Component
 * Full-featured post creation with media upload, preview, and validation
 * Design: Follow DESIGN_SYSTEM - clean, minimal, typography hierarchy
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { usePost } from '@/hooks/usePost';
import { useAnalytics } from '@/hooks/useAnalytics';
import { PostType, PostVisibility, CreatePostInput } from '@shared/types/content.types';
import { MusicSelectorModal } from '@/components/music/MusicSelectorModal';
import { AnalyticsEvent } from '@/lib/analytics';
import { clearDraft, readDraft, writeDraft } from '@/lib/draft';
import { trackReliabilityEvent } from '@/lib/reliability';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

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
  const draftKey = 'draft_post_creator_v1';
  const analytics = useAnalytics();
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
  const [selectedMusic, setSelectedMusic] = useState<any | null>(null);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved' | 'error' | 'restored'>('idle');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const draft = readDraft<{
      content: string;
      visibility: PostVisibility;
      hashtags: string[];
      selectedMusic: any | null;
    }>(draftKey);

    if (!draft) {
      return;
    }

    if (draft.content) setContent(draft.content);
    if (draft.visibility) setVisibility(draft.visibility);
    if (Array.isArray(draft.hashtags)) setHashtags(draft.hashtags);
    if (draft.selectedMusic) setSelectedMusic(draft.selectedMusic);
    setDraftStatus('restored');
    trackReliabilityEvent('draft_restored', { flow: 'post_creator' });
  }, []);

  useEffect(() => {
    const hasDraftableContent = Boolean(content.trim() || mediaPreview || selectedMusic);
    if (!hasDraftableContent) {
      return;
    }

    const didSave = writeDraft(draftKey, { content, visibility, hashtags, selectedMusic });
    setDraftStatus(didSave ? 'saved' : 'error');
  }, [content, visibility, hashtags, selectedMusic, mediaPreview]);

  useUnsavedChangesGuard({
    enabled: Boolean(content.trim() || mediaPreview || selectedMusic),
  });

  const handleMediaSelect = useCallback((file: File) => {
    const type = file.type.startsWith('image/') ? 'image' : 'video';
    setMediaFile(file);
    setMediaType(type);

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

      if (mediaFile && mediaType) {
        const mediaResult = await uploadMedia(mediaFile, mediaType);
        postData = {
          ...postData,
          type: mediaType === 'image' ? PostType.IMAGE : PostType.VIDEO,
          mediaUrl: mediaResult.mediaUrl,
          thumbnailUrl: mediaResult.thumbnailUrl,
        };
      }

      if (selectedMusic) {
        postData.musicTrackId = selectedMusic.id;
      }

      const post = await createPost(postData);

      // Track analytics
      analytics.track(AnalyticsEvent.POST_CREATED, {
        postType: postData.type,
        hasMedia: !!mediaFile,
        visibility: visibility,
        tagCount: hashtags.length,
      });

      setContent('');
      removeMedia();
      setHashtags([]);
      setSelectedMusic(null);
      clearDraft(draftKey);
      setDraftStatus('idle');

      onPostCreated?.(post.id);
    } catch (err) {
      console.error('Failed to create post:', err);
      trackReliabilityEvent('post_create_failed', { flow: 'post_creator' });
    }
  }, [content, mediaFile, mediaType, visibility, hashtags, selectedMusic, uploadMedia, createPost, removeMedia, onPostCreated]);

  const handleCancel = useCallback(() => {
    setContent('');
    removeMedia();
    setHashtags([]);
    setSelectedMusic(null);
    clearDraft(draftKey);
    setDraftStatus('idle');
    reset();
    onCancel?.();
  }, [removeMedia, reset, onCancel]);

  const isSubmitDisabled = (!content.trim() && !mediaFile) || isCreating || isUploading;

  return (
    <div className={className} style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      padding: '24px',
    }}>
      {/* CONTENT INPUT */}
      <textarea
        value={content}
        onChange={handleContentChange}
        placeholder="What's on your mind?"
        maxLength={500}
        disabled={isCreating || isUploading}
        style={{
          width: '100%',
          minHeight: '120px',
          fontSize: '16px',
          color: '#000',
          padding: 0,
          border: 'none',
          outline: 'none',
          resize: 'none',
          fontFamily: 'inherit',
          backgroundColor: 'transparent',
        }}
      />

      {/* CHARACTER COUNT */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {draftStatus !== 'idle' && (
            <span style={{ fontSize: '12px', color: draftStatus === 'error' ? '#ef4444' : '#9ca3af' }}>
              {draftStatus === 'restored' && 'Draft restored'}
              {draftStatus === 'saved' && 'Draft saved locally'}
              {draftStatus === 'error' && 'Draft save failed'}
            </span>
          )}
          <span style={{
            fontSize: '12px',
            color: content.length > 450 ? '#ef4444' : '#ccc',
          }}>
            {content.length}/500
          </span>
        </div>
      </div>

      {/* MEDIA PREVIEW */}
      {mediaPreview && (
        <div style={{
          position: 'relative',
          marginBottom: '16px',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#f5f5f5',
        }}>
          {mediaType === 'image' ? (
            <img
              src={mediaPreview}
              alt="Preview"
              style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }}
            />
          ) : (
            <video
              src={mediaPreview}
              style={{ width: '100%', maxHeight: '400px' }}
              controls
            />
          )}
          <button
            onClick={removeMedia}
            disabled={isUploading}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '36px',
              height: '36px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* UPLOAD PROGRESS */}
      {isUploading && uploadProgress && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginBottom: '8px' }}>
            <span>Uploading...</span>
            <span>{uploadProgress.percentage}%</span>
          </div>
          <div style={{ width: '100%', height: '4px', backgroundColor: '#e0e0e0', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                backgroundColor: '#E8998D',
                width: `${uploadProgress.percentage}%`,
                transition: 'width 300ms',
              }}
            />
          </div>
        </div>
      )}

      {/* DRAG & DROP ZONE */}
      {!mediaPreview && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            marginBottom: '16px',
            padding: '32px',
            border: `2px dashed ${isDragging ? '#E8998D' : '#e0e0e0'}`,
            backgroundColor: isDragging ? 'rgba(232, 153, 141, 0.05)' : 'transparent',
            borderRadius: '8px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 200ms',
          }}
        >
          <p style={{ fontSize: '16px', color: '#666', margin: '0 0 8px 0' }}>
            Drag and drop an image or video, or{' '}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                color: '#E8998D',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              browse
            </button>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#991b1b',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* MUSIC PREVIEW */}
      {selectedMusic && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '6px',
          marginBottom: '16px',
        }}>
          <span style={{ fontSize: '20px' }}>🎵</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#000', fontSize: '14px' }}>
              {selectedMusic.title}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {selectedMusic.artistName}
            </div>
          </div>
          <button
            onClick={() => setSelectedMusic(null)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#ccc',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ACTIONS */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!mediaPreview && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isCreating || isUploading}
                title="Add image"
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: isCreating || isUploading ? 'not-allowed' : 'pointer',
                  color: '#666',
                  fontSize: '18px',
                  opacity: isCreating || isUploading ? 0.5 : 1,
                }}
              >
                🖼️
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isCreating || isUploading}
                title="Add video"
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: isCreating || isUploading ? 'not-allowed' : 'pointer',
                  color: '#666',
                  fontSize: '18px',
                  opacity: isCreating || isUploading ? 0.5 : 1,
                }}
              >
                📹
              </button>
              <button
                onClick={() => setShowMusicModal(true)}
                disabled={isCreating || isUploading}
                title="Add music"
                style={{
                  padding: '8px',
                  backgroundColor: selectedMusic ? '#fef3c7' : 'transparent',
                  border: 'none',
                  cursor: isCreating || isUploading ? 'not-allowed' : 'pointer',
                  color: selectedMusic ? '#d97706' : '#666',
                  fontSize: '18px',
                  opacity: isCreating || isUploading ? 0.5 : 1,
                  borderRadius: '4px',
                }}
              >
                🎵
              </button>
            </>
          )}

          {/* VISIBILITY SELECTOR */}
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as PostVisibility)}
            disabled={isCreating || isUploading}
            style={{
              marginLeft: '12px',
              padding: '6px 12px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#333',
              backgroundColor: 'white',
              cursor: isCreating || isUploading ? 'not-allowed' : 'pointer',
              opacity: isCreating || isUploading ? 0.5 : 1,
            }}
          >
            <option value={PostVisibility.PUBLIC}>Public</option>
            <option value={PostVisibility.FOLLOWERS}>Followers</option>
            <option value={PostVisibility.PRIVATE}>Private</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {onCancel && (
            <button
              onClick={handleCancel}
              disabled={isCreating || isUploading}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                backgroundColor: 'transparent',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                cursor: isCreating || isUploading ? 'not-allowed' : 'pointer',
                opacity: isCreating || isUploading ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'white',
              backgroundColor: isSubmitDisabled ? '#ccc' : '#E8998D',
              border: 'none',
              borderRadius: '6px',
              cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {isCreating || isUploading
              ? isUploading ? '⟳ Uploading...' : '⟳ Posting...'
              : 'Post'
            }
          </button>
        </div>
      </div>

      {/* MUSIC SELECTOR MODAL */}
      <MusicSelectorModal
        isOpen={showMusicModal}
        onClose={() => setShowMusicModal(false)}
        onSelect={setSelectedMusic}
        selectedTrackId={selectedMusic?.id}
      />
    </div>
  );
};

export default PostCreator;

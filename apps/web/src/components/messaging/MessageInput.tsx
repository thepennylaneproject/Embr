/**
 * MessageInput Component
 * Text input with media upload capabilities and typing indicator
 */

import React, { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSendMessage: (content: string, file?: File) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = 'Type a message…',
}) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [fileError, setFileError] = useState<string>('');
  const [sendError, setSendError] = useState<string>('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    if (value.trim().length > 0 && !isTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping(false);
    }, 1000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError('');

    if (file.size > 50 * 1024 * 1024) {
      setFileError('File size must be less than 50 MB. Please choose a smaller file.');
      return;
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      setFileError('Unsupported file type. Please select an image (JPG, PNG, GIF, WebP), video (MP4, MOV, WebM), or document (PDF, Word).');
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedFile) || isSending || disabled) return;

    if (isTyping) { setIsTyping(false); onTyping(false); }
    setIsSending(true);

    try {
      await onSendMessage(message.trim(), selectedFile || undefined);
      setMessage('');
      setSendError('');
      handleRemoveFile();
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (error) {
      console.error('Failed to send message:', error);
      setSendError('Failed to send message. Please check your connection and try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canSend = (message.trim().length > 0 || !!selectedFile) && !disabled && !isSending;

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: '0.75rem 1rem',
        borderTop: '1px solid var(--embr-border)',
        background: 'var(--embr-bg)',
      }}
    >
      {/* File error */}
      {fileError && (
        <div style={{ marginBottom: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--embr-radius-md)', background: 'color-mix(in srgb, var(--embr-error) 10%, white)', border: '1px solid var(--embr-error)', fontSize: '0.82rem', color: 'var(--embr-error)' }}>
          {fileError}
        </div>
      )}
      {/* Send error */}
      {sendError && (
        <div style={{ marginBottom: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--embr-radius-md)', background: 'color-mix(in srgb, var(--embr-error) 10%, white)', border: '1px solid var(--embr-error)', fontSize: '0.82rem', color: 'var(--embr-error)' }}>
          {sendError}
        </div>
      )}
      {/* File preview */}
      {selectedFile && (
        <div style={{
          marginBottom: '0.75rem',
          padding: '0.6rem 0.75rem',
          background: 'var(--embr-surface)',
          border: '1px solid var(--embr-border)',
          borderRadius: 'var(--embr-radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
            {filePreview ? (
              <img
                src={filePreview}
                alt="Preview"
                style={{ width: '40px', height: '40px', borderRadius: 'var(--embr-radius-sm)', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: '40px', height: '40px', borderRadius: 'var(--embr-radius-sm)',
                background: 'var(--embr-neutral-200)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg style={{ width: '18px', height: '18px', color: 'var(--embr-muted-text)' }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600', color: 'var(--embr-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedFile.name}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--embr-muted-text)' }}>
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveFile}
            style={{
              padding: '0.25rem', borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer',
              display: 'flex', flexShrink: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--embr-neutral-200)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
          >
            <svg style={{ width: '16px', height: '16px', color: 'var(--embr-muted-text)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
        {/* Attach */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isSending}
          style={{
            padding: '0.5rem',
            borderRadius: '50%',
            border: 'none',
            background: 'none',
            cursor: disabled || isSending ? 'not-allowed' : 'pointer',
            color: 'var(--embr-muted-text)',
            flexShrink: 0,
            display: 'flex',
            opacity: disabled ? 0.5 : 1,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.color = 'var(--embr-accent)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--embr-muted-text)'; }}
          title="Attach file"
        >
          <svg style={{ width: '22px', height: '22px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="image/*,video/*,.pdf,.doc,.docx"
          style={{ display: 'none' }}
        />

        {/* Textarea */}
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            rows={1}
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              background: 'var(--embr-surface)',
              border: '1px solid var(--embr-border)',
              borderRadius: 'var(--embr-radius-lg)',
              resize: 'none',
              outline: 'none',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              color: 'var(--embr-text)',
              minHeight: '42px',
              maxHeight: '120px',
              boxSizing: 'border-box',
              opacity: disabled ? 0.5 : 1,
              cursor: disabled ? 'not-allowed' : 'text',
              transition: 'border-color 0.15s',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--embr-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--embr-border)'; }}
          />
        </div>

        {/* Send */}
        <button
          type="submit"
          disabled={!canSend}
          style={{
            padding: '0.6rem',
            borderRadius: '50%',
            border: 'none',
            background: canSend ? 'var(--embr-accent)' : 'var(--embr-neutral-300)',
            color: '#fff',
            cursor: canSend ? 'pointer' : 'not-allowed',
            flexShrink: 0,
            display: 'flex',
            transition: 'background 0.15s',
          }}
          title="Send message"
        >
          {isSending ? (
            <svg style={{ width: '20px', height: '20px', animation: 'spin 0.7s linear infinite' }}
              fill="none" viewBox="0 0 24 24">
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path style={{ opacity: 0.75 }} fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg style={{ width: '20px', height: '20px', transform: 'rotate(90deg)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>

      <p style={{ margin: '0.35rem 0 0', fontSize: '0.72rem', color: 'var(--embr-muted-text)' }}>
        Enter to send · Shift+Enter for new line
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </form>
  );
};

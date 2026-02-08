import { PropsWithChildren, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function Modal({ isOpen, onClose, title, children }: PropsWithChildren<ModalProps>) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="ui-modal-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="ui-modal" role="dialog" aria-modal="true" aria-label={title || 'Modal'}>
        {title ? <h2 style={{ marginTop: 0 }}>{title}</h2> : null}
        {children}
      </section>
    </div>,
    document.body,
  );
}

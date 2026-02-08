import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';

export type ToastKind = 'info' | 'error';

interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const nextToast: ToastMessage = { id, ...toast };
    setToasts((current) => [...current, nextToast]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <article key={toast.id} className="ui-toast" data-kind={toast.kind}>
            <strong>{toast.title}</strong>
            {toast.description ? <div style={{ marginTop: 4, color: 'var(--embr-muted-text)' }}>{toast.description}</div> : null}
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}

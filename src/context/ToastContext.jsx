import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

/**
 * In-app toast notification system.
 *
 * Not related to the native Notification API - these are plain DOM elements
 * rendered inside <ToastStack /> at the bottom of the viewport. No permission
 * prompts, no OS integration, consistent across every browser / OS.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Build created');
 *   toast.info('Switched to: My Build');
 *   toast.error('Failed to import build');
 */

const ToastContext = createContext(null);

const DEFAULT_DURATION_MS = 2500;
const ERROR_DURATION_MS = 5000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextIdRef = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((type, message, durationMs) => {
    const id = nextIdRef.current++;
    const duration = durationMs ?? (type === 'error' ? ERROR_DURATION_MS : DEFAULT_DURATION_MS);
    setToasts(prev => [...prev, { id, type, message, duration }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const toast = useMemo(() => ({
    success: (msg, ms) => push('success', msg, ms),
    info:    (msg, ms) => push('info',    msg, ms),
    error:   (msg, ms) => push('error',   msg, ms),
    dismiss,
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail soft: if a component accidentally renders outside the provider,
    // return no-op functions instead of crashing. Logged once so bugs are findable.
    // eslint-disable-next-line no-console
    console.warn('useToast called outside ToastProvider - toasts will be no-ops');
    return { success: () => {}, info: () => {}, error: () => {}, dismiss: () => {} };
  }
  return ctx.toast;
}

/** Internal - used by ToastStack to read the current list */
export function useToastState() {
  const ctx = useContext(ToastContext);
  return ctx ?? { toasts: [], dismiss: () => {} };
}

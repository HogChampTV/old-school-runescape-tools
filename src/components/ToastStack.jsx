import { useToastState } from '../context/ToastContext';
import './ToastStack.css';

export default function ToastStack() {
  const { toasts, dismiss } = useToastState();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map(t => (
        <button
          type="button"
          key={t.id}
          className={`toast toast--${t.type}`}
          onClick={() => dismiss(t.id)}
          title="Click to dismiss"
        >
          <span className="toast-icon" aria-hidden="true">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'ℹ'}
          </span>
          <span className="toast-message">{t.message}</span>
        </button>
      ))}
    </div>
  );
}

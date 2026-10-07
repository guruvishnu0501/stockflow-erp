import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (arg1: string, arg2?: ToastType | string, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (arg1: string, arg2?: ToastType | string, title?: string) => {
      let type: ToastType = 'info';
      let message = '';

      if (['success', 'error', 'warning', 'info'].includes(arg1)) {
        type = arg1 as ToastType;
        message = (arg2 as string) || '';
      } else {
        message = arg1;
        type = (arg2 as ToastType) || 'info';
      }

      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, type, title, message };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        dismissToast(id);
      }, 5000);
    },
    [dismissToast]
  );

  const success = useCallback((msg: string, title?: string) => showToast('success', msg, title), [showToast]);
  const error = useCallback((msg: string, title?: string) => showToast('error', msg, title), [showToast]);
  const warning = useCallback((msg: string, title?: string) => showToast('warning', msg, title), [showToast]);
  const info = useCallback((msg: string, title?: string) => showToast('info', msg, title), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, success, error, warning, info, dismissToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map((t) => {
          const bgColors = {
            success: 'bg-emerald-50 border-emerald-500 text-emerald-900',
            error: 'bg-rose-50 border-rose-500 text-rose-900',
            warning: 'bg-amber-50 border-amber-500 text-amber-900',
            info: 'bg-blue-50 border-blue-500 text-blue-900',
          }[t.type];

          const IconComponent = {
            success: CheckCircle2,
            error: AlertCircle,
            warning: AlertTriangle,
            info: Info,
          }[t.type];

          return (
            <div
              key={t.id}
              className={`flex items-start p-4 rounded-xl border-l-4 shadow-lg pointer-events-auto transition-all animate-in slide-in-from-bottom-5 duration-300 ${bgColors}`}
            >
              <IconComponent className="w-5 h-5 shrink-0 mt-0.5 mr-3" />
              <div className="flex-1 mr-2 text-sm">
                {t.title && <div className="font-bold text-xs uppercase tracking-wider mb-0.5">{t.title}</div>}
                <div className="font-medium text-xs leading-relaxed">{t.message}</div>
              </div>
              <button
                onClick={() => dismissToast(t.id)}
                className="text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;

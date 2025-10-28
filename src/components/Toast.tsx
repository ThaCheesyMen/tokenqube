import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: (id: string) => void;
}

export function Toast({ id, type, message, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />,
    info: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
  };

  const styles = {
    success: 'bg-emerald-50 dark:bg-emerald-900/90 border-emerald-200 dark:border-emerald-500 shadow-emerald-900/50',
    error: 'bg-red-50 dark:bg-red-900/90 border-red-200 dark:border-red-500 shadow-red-900/50',
    warning: 'bg-yellow-50 dark:bg-yellow-900/90 border-yellow-200 dark:border-yellow-500 shadow-yellow-900/50',
    info: 'bg-blue-50 dark:bg-blue-900/90 border-blue-200 dark:border-blue-500 shadow-blue-900/50',
  };

  return (
    <div
      className={`${styles[type]} border-2 rounded-xl p-4 shadow-2xl backdrop-blur-sm mb-3 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">{icons[type]}</div>
        <div className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{message}</div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(id), 300);
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string }>;
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 w-96 space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}

// Global toast manager
let toastIdCounter = 0;
const toastListeners: Array<(toasts: Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string }>) => void> = [];
const toasts: Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string }> = [];

export const toast = {
  success: (message: string) => {
    const id = `toast-${++toastIdCounter}`;
    toasts.push({ id, type: 'success', message });
    toastListeners.forEach((listener) => listener([...toasts]));
  },
  error: (message: string) => {
    const id = `toast-${++toastIdCounter}`;
    toasts.push({ id, type: 'error', message });
    toastListeners.forEach((listener) => listener([...toasts]));
  },
  warning: (message: string) => {
    const id = `toast-${++toastIdCounter}`;
    toasts.push({ id, type: 'warning', message });
    toastListeners.forEach((listener) => listener([...toasts]));
  },
  info: (message: string) => {
    const id = `toast-${++toastIdCounter}`;
    toasts.push({ id, type: 'info', message });
    toastListeners.forEach((listener) => listener([...toasts]));
  },
  close: (id: string) => {
    const index = toasts.findIndex((t) => t.id === id);
    if (index > -1) {
      toasts.splice(index, 1);
      toastListeners.forEach((listener) => listener([...toasts]));
    }
  },
  subscribe: (listener: (toasts: Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string }>) => void) => {
    toastListeners.push(listener);
    return () => {
      const index = toastListeners.indexOf(listener);
      if (index > -1) toastListeners.splice(index, 1);
    };
  },
};

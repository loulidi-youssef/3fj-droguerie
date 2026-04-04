"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastItem = {
  id: number;
  message: string;
  primaryAction?: ToastAction;
  secondaryAction?: ToastAction;
};

type ToastAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type ToastOptions = {
  durationMs?: number;
  primaryAction?: ToastAction;
  secondaryAction?: ToastAction;
};

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const hasActions = Boolean(options?.primaryAction || options?.secondaryAction);
    const durationMs = options?.durationMs ?? (hasActions ? 5200 : 2200);

    setToasts((current) => [
      ...current,
      {
        id,
        message,
        primaryAction: options?.primaryAction,
        secondaryAction: options?.secondaryAction,
      },
    ]);

    window.setTimeout(() => {
      dismissToast(id);
    }, durationMs);
  }, [dismissToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const handleActionClick = useCallback(
    (id: number, action?: ToastAction) => {
      if (action?.onClick) {
        action.onClick();
      }

      if (action?.href) {
        router.push(action.href);
      }

      dismissToast(id);
    },
    [dismissToast, router],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 top-3 z-[80] px-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-[min(92vw,360px)] sm:px-0">
        <div className="mx-auto flex w-full max-w-[360px] flex-col gap-2 sm:mx-0">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto animate-fade-in-up rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-lg"
            >
              <p>{toast.message}</p>

              {toast.primaryAction || toast.secondaryAction ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {toast.primaryAction ? (
                    <button
                      type="button"
                      onClick={() => handleActionClick(toast.id, toast.primaryAction)}
                      className="inline-flex h-8 items-center justify-center rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      {toast.primaryAction.label}
                    </button>
                  ) : null}

                  {toast.secondaryAction ? (
                    <button
                      type="button"
                      onClick={() => handleActionClick(toast.id, toast.secondaryAction)}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      {toast.secondaryAction.label}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
};

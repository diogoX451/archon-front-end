// Centralized feedback primitives for the app:
//
//   * useToast()    → emit transient notifications (info / success /
//                     warning / error) that auto-dismiss after a few
//                     seconds. Replaces window.alert across the app.
//   * useConfirm()  → ask the user a yes/no question via a styled
//                     modal. Returns a Promise<boolean>, so it's a
//                     drop-in replacement for window.confirm.
//
// Both rely on context providers wired once at the AppRouter root
// (<FeedbackProvider />); call sites just import the hook.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

// ─── Toast ───────────────────────────────────────────────────────────

export type ToastKind = "info" | "success" | "warning" | "error";

export interface ToastInput {
  kind?: ToastKind;
  message: string;
  // Auto-dismiss timeout in ms. Defaults to 4_000 for info/success and
  // 6_000 for warning/error. Pass 0 to keep it sticky.
  duration?: number;
  // Optional title above the message.
  title?: string;
}

interface ToastEntry extends ToastInput {
  id: number;
  kind: ToastKind;
}

interface ToastContextValue {
  push: (t: ToastInput) => void;
  // Convenience helpers — sugar over push().
  info: (msg: string, opts?: Partial<ToastInput>) => void;
  success: (msg: string, opts?: Partial<ToastInput>) => void;
  warning: (msg: string, opts?: Partial<ToastInput>) => void;
  error: (msg: string, opts?: Partial<ToastInput>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <FeedbackProvider>");
  return ctx;
}

function defaultDuration(kind: ToastKind): number {
  return kind === "warning" || kind === "error" ? 6000 : 4000;
}

function Toaster({ items, dismiss }: { items: ToastEntry[]; dismiss: (id: number) => void }) {
  return (
    <div className="toaster" role="region" aria-label="Notificações">
      {items.map((t) => (
        <div key={t.id} className="toast" data-kind={t.kind} role="status">
          <div className="toast-body">
            {t.title && <div className="toast-title">{t.title}</div>}
            <div className="toast-message">{t.message}</div>
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => dismiss(t.id)}
            aria-label="Fechar notificação"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Confirm ─────────────────────────────────────────────────────────

export interface ConfirmInput {
  title?: string;
  message: string;
  // Defaults to "Confirmar" / "Cancelar".
  confirmLabel?: string;
  cancelLabel?: string;
  // Marks the action as destructive: the confirm button picks up the
  // error palette and the focus stays on cancel.
  destructive?: boolean;
}

interface ConfirmContextValue {
  confirm: (input: ConfirmInput) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue["confirm"] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <FeedbackProvider>");
  return ctx.confirm;
}

interface PendingConfirm extends ConfirmInput {
  resolve: (v: boolean) => void;
}

function ConfirmDialog({ pending, close }: { pending: PendingConfirm; close: (v: boolean) => void }) {
  // Keyboard affordances: Esc → cancel, Enter → confirm (unless the
  // destructive flag is on, in which case we don't auto-confirm so the
  // user has to make an explicit click).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      } else if (e.key === "Enter" && !pending.destructive) {
        e.preventDefault();
        close(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, pending.destructive]);

  return (
    <div className="confirm-overlay" onClick={() => close(false)}>
      <div className="confirm-card card" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        {pending.title && <div className="confirm-title">{pending.title}</div>}
        <div className="confirm-message">{pending.message}</div>
        <div className="confirm-actions">
          <button type="button" className="btn" onClick={() => close(false)} autoFocus={pending.destructive}>
            {pending.cancelLabel || "Cancelar"}
          </button>
          <button
            type="button"
            className={pending.destructive ? "btn danger" : "btn primary"}
            onClick={() => close(true)}
            autoFocus={!pending.destructive}
          >
            {pending.confirmLabel || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Provider ────────────────────────────────────────────────────────

export function FeedbackProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const idRef = useRef(1);
  // Timer handles per toast id so we can clear them on manual dismiss
  // and on provider unmount (defense against React-strict double-fire).
  const timersRef = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const handle = timersRef.current.get(id);
    if (handle !== undefined) {
      window.clearTimeout(handle);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const kind = input.kind || "info";
      const id = idRef.current++;
      const entry: ToastEntry = { ...input, kind, id };
      setToasts((prev) => [...prev, entry]);
      const ttl = input.duration ?? defaultDuration(kind);
      if (ttl > 0) {
        const handle = window.setTimeout(() => dismiss(id), ttl);
        timersRef.current.set(id, handle);
      }
    },
    [dismiss],
  );

  useEffect(() => {
    return () => {
      for (const h of timersRef.current.values()) window.clearTimeout(h);
      timersRef.current.clear();
    };
  }, []);

  const toastValue = useMemo<ToastContextValue>(
    () => ({
      push,
      info: (message, opts) => push({ ...opts, kind: "info", message }),
      success: (message, opts) => push({ ...opts, kind: "success", message }),
      warning: (message, opts) => push({ ...opts, kind: "warning", message }),
      error: (message, opts) => push({ ...opts, kind: "error", message }),
    }),
    [push],
  );

  const confirm = useCallback((input: ConfirmInput) => {
    return new Promise<boolean>((resolve) => {
      setPendingConfirm({ ...input, resolve });
    });
  }, []);

  const closeConfirm = useCallback(
    (value: boolean) => {
      if (pendingConfirm) {
        pendingConfirm.resolve(value);
        setPendingConfirm(null);
      }
    },
    [pendingConfirm],
  );

  const confirmValue = useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm]);

  return (
    <ToastContext.Provider value={toastValue}>
      <ConfirmContext.Provider value={confirmValue}>
        {children}
        <Toaster items={toasts} dismiss={dismiss} />
        {pendingConfirm && <ConfirmDialog pending={pendingConfirm} close={closeConfirm} />}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

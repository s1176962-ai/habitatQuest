import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

export interface Toast { id: number; text: string; tone: 'ok' | 'warn' | 'bad' | 'info' }

const ICON = {
  ok: CheckCircle2, warn: AlertTriangle, bad: XCircle, info: Info,
};
const COLOR = { ok: 'var(--ok)', warn: 'var(--warn)', bad: 'var(--bad)', info: 'var(--accent)' };

export function ToastList({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-wrap" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <div key={t.id} className="toast fade-in" onClick={() => onDismiss(t.id)} role="status">
            <Icon size={15} style={{ color: COLOR[t.tone], flexShrink: 0, marginTop: 1 }} />
            <span style={{ lineHeight: 1.5 }}>{t.text}</span>
          </div>
        );
      })}
    </div>
  );
}

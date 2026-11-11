import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

const STATUS_LABEL = { HELD: 'HELD', CONFIRMED: 'CONFIRMED', EXPIRED: 'EXPIRED', CANCELLED: 'CANCELLED' };

export function Pill({ status, large }) {
  return (
    <span className={`pill pill--${status.toLowerCase()}${large ? ' pill--lg' : ''}`}>
      <i />
      {STATUS_LABEL[status] || status}
    </span>
  );
}

// One square per desk; very large classes use one square per few seats so the card stays readable.
export function SeatPlan({ totalSeats, heldSeats, confirmedSeats, availableSeats, intro }) {
  const per = totalSeats > 240 ? Math.ceil(totalSeats / 240) : 1;
  const cells = Math.ceil(totalSeats / per);
  let c = Math.round(confirmedSeats / per);
  let h = Math.round(heldSeats / per);
  if (c + h > cells) h = Math.max(0, cells - c);
  if (availableSeats === 0 && c + h < cells) c = cells - h;
  if (availableSeats > 0 && c + h >= cells) {
    if (h > 0) h -= 1;
    else if (c > 0) c -= 1;
  }
  return (
    <div>
      <div
        className={`seats${intro ? ' seats--intro' : ''}`}
        role="img"
        aria-label={`Seat plan: ${totalSeats} seats, ${confirmedSeats} confirmed, ${heldSeats} held, ${availableSeats} available`}
      >
        {Array.from({ length: cells }, (_, i) => (
          <i key={i} className={`s${i < c ? ' c' : i < c + h ? ' h' : ''}`} style={intro ? { '--d': Math.min(i * 4, 520) } : undefined} />
        ))}
      </div>
      {per > 1 && <p className="seats__note">Each square is {per} seats.</p>}
    </div>
  );
}

function Fig({ label, value, tone, zero }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (prev.current === value) return undefined;
    prev.current = value;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1200);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <span className={`fig${zero ? ' fig--zero' : ''}${flash ? ' flash' : ''}`}>
      <b className={tone ? `k-${tone}` : undefined}>{value}</b>
      <span>{label}</span>
    </span>
  );
}

export function Figures({ seats }) {
  return (
    <div className="figs">
      <Fig label="Total" value={seats.totalSeats} />
      <Fig label="Confirmed" value={seats.confirmedSeats} tone="c" />
      <Fig label="Held" value={seats.heldSeats} tone="h" />
      <Fig label="Available" value={seats.availableSeats} zero={seats.availableSeats === 0} />
    </div>
  );
}

export function Message({ kind, title, text, action }) {
  return (
    <div className={`msg msg--${kind}`} role={kind === 'err' || kind === 'off' ? 'alert' : 'status'}>
      <Icon name={kind} />
      <div>
        <b>{title}</b>
        {text}
      </div>
      {action && (
        <span className="act">
          <button type="button" className={`btn btn--sm${action.ghost ? ' btn--ghost' : ''}`} onClick={action.onClick}>
            {action.label}
          </button>
        </span>
      )}
    </div>
  );
}

export function Empty({ icon, title, children, action }) {
  return (
    <div className="empty">
      <div className="ic">
        <Icon name={icon} sw={1.7} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Toasts({ toasts, onDismiss }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`} role={t.kind === 'err' ? 'alert' : 'status'}>
          <Icon name={t.kind === 'ok' ? 'ok' : 'err'} />
          <span>{t.text}</span>
          <button type="button" className="toast__x" aria-label="Dismiss" onClick={() => onDismiss(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function Dialog({ title, children, confirmLabel, cancelLabel, danger, busy, onConfirm, onClose }) {
  const first = useRef(null);
  useEffect(() => {
    first.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="modal__b">
          <h3 id="dialog-title">{title}</h3>
          <p>{children}</p>
        </div>
        <div className="modal__f">
          <button ref={first} type="button" className="btn btn--ghost" onClick={onClose}>
            {cancelLabel}
          </button>
          <button type="button" className={`btn${danger ? ' btn--brick' : ''}`} lang="bn" disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

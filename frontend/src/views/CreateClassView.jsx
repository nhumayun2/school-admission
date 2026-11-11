import { useRef, useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Figures, Message, SeatPlan } from '../components/ui.jsx';
import { errorTitle } from '../lib/labels.js';

const MAX_NAME = 100;
const MAX_SEATS = 10_000;
const SUGGESTIONS = ['Class 6 - Morning Shift', 'Class 6 - Day Shift', 'Class 7 - Morning Shift', 'Class 9 - Day Shift (Science)'];

function checkName(name) {
  const n = name.trim();
  if (!n) return 'Enter a class name, for example "Class 6 - Morning Shift".';
  if (n.length > MAX_NAME) return `The class name can be at most ${MAX_NAME} characters.`;
  return null;
}

function checkSeats(raw) {
  if (!raw.trim()) return 'Enter the number of seats.';
  if (!/^\d+$/.test(raw.trim())) return 'Total seats must be a whole number, such as 120.';
  const n = Number(raw);
  if (n < 1 || n > MAX_SEATS) return `The number of seats must be between 1 and ${MAX_SEATS.toLocaleString('en')}.`;
  return null;
}

function FieldError({ text }) {
  return (
    <span className="err" role="alert">
      <Icon name="err" />
      {text}
    </span>
  );
}

function Preview({ name, seats }) {
  const n = /^\d+$/.test(seats.trim()) ? Number(seats) : 0;
  if (n < 1 || n > MAX_SEATS) {
    return <p className="muted" style={{ fontSize: 14 }}>Enter a seat count to see the seat plan parents will get.</p>;
  }
  const t = { totalSeats: n, confirmedSeats: 0, heldSeats: 0, availableSeats: n };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="room__h">
        <div>
          <h3 style={{ fontSize: 17 }}>{name.trim() || 'Untitled class'}</h3>
          <span className="id">new class</span>
        </div>
      </div>
      <SeatPlan {...t} />
      <Figures seats={t} />
      <p className="dim" style={{ fontSize: 12.5 }}>
        A new class starts with every seat available.
      </p>
    </div>
  );
}

function ClassTable({ classes }) {
  return (
    <table className="tbl">
      <colgroup>
        <col />
        <col style={{ width: 90 }} />
        <col style={{ width: 240 }} />
        <col style={{ width: 90 }} />
        <col style={{ width: 110 }} />
        <col style={{ width: 100 }} />
      </colgroup>
      <thead>
        <tr>
          <th>Class</th>
          <th>Total</th>
          <th>Seats taken</th>
          <th>Held</th>
          <th>Confirmed</th>
          <th className="r">Available</th>
        </tr>
      </thead>
      <tbody>
        {classes.map((c) => (
          <tr key={c.id}>
            <td data-k="Class">
              <span className="nm">{c.name}</span>
              <span className="sub">{c.id}</span>
            </td>
            <td data-k="Total">
              <span className="num">{c.totalSeats}</span>
            </td>
            <td data-k="Seats taken">
              <div className="bar" aria-hidden="true">
                <i className="c" style={{ width: `${((c.confirmedSeats / c.totalSeats) * 100).toFixed(1)}%` }} />
                <i className="h" style={{ width: `${((c.heldSeats / c.totalSeats) * 100).toFixed(1)}%` }} />
              </div>
            </td>
            <td data-k="Held">
              <span className="num" style={{ color: 'var(--marigold-ink)' }}>
                {c.heldSeats}
              </span>
            </td>
            <td data-k="Confirmed">
              <span className="num" style={{ color: 'var(--board)' }}>
                {c.confirmedSeats}
              </span>
            </td>
            <td data-k="Available" className="r">
              <span className="num" style={{ fontWeight: 600, color: c.availableSeats === 0 ? 'var(--brick)' : undefined }}>
                {c.availableSeats}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CreateClassView({ classes, msg, onCreate, onNavigate }) {
  const [name, setName] = useState('');
  const [seats, setSeats] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(null);
  const seatsRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    const nameErr = checkName(name);
    const seatsErr = checkSeats(seats);
    setErrors({ name: nameErr, seats: seatsErr });
    setFormError(null);
    if (nameErr) return nameRef.current?.focus();
    if (seatsErr) return seatsRef.current?.focus();

    setSaving(true);
    try {
      await onCreate(name.trim(), Number(seats));
      setName('');
      setSeats('');
    } catch (err) {
      if (err.code === 'INVALID_NAME') {
        setErrors({ name: err.message });
        nameRef.current?.focus();
      } else if (err.code === 'INVALID_TOTAL_SEATS') {
        setErrors({ seats: err.message });
        seatsRef.current?.focus();
      } else {
        setFormError({
          kind: err.offline ? 'off' : 'err',
          title: errorTitle(err),
          text: err.offline ? 'The class was not saved. Check the connection and press Create class again.' : err.message,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="head">
        <div>
          <span className="eyebrow">School admin</span>
          <h1>Create a class</h1>
          <p>
            Each shift is a separate class with its own seats, for example &ldquo;Class 6 - Morning Shift&rdquo; and &ldquo;Class 6 - Day
            Shift&rdquo;. Put the shift in the name so parents can tell them apart.
          </p>
        </div>
      </div>
      {msg}
      <div className="split">
        <form className="card" onSubmit={submit} noValidate>
          <div className="card__h">
            <h2>Class details</h2>
          </div>
          <div className="card__b">
            {formError && <Message kind={formError.kind} title={formError.title} text={formError.text} />}
            <label className="field">
              <span className="field__l">Class name</span>
              <input
                ref={nameRef}
                className={`inp${errors.name ? ' is-bad' : ''}`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((x) => ({ ...x, name: null }));
                }}
                placeholder="Class 6 - Morning Shift"
                autoComplete="off"
                maxLength={MAX_NAME + 20}
                aria-invalid={!!errors.name}
              />
              {errors.name && <FieldError text={errors.name} />}
            </label>
            <div className="sugg" aria-label="Suggested names">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setName(s);
                    setErrors((x) => ({ ...x, name: null }));
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <label className="field">
              <span className="field__l">
                Total seats<span className="field__h">Whole number, 1 to {MAX_SEATS.toLocaleString('en')}</span>
              </span>
              <input
                ref={seatsRef}
                className={`inp inp--mono${errors.seats ? ' is-bad' : ''}`}
                value={seats}
                onChange={(e) => {
                  setSeats(e.target.value);
                  if (errors.seats) setErrors((x) => ({ ...x, seats: null }));
                }}
                inputMode="numeric"
                placeholder="120"
                autoComplete="off"
                aria-invalid={!!errors.seats}
              />
              {errors.seats && <FieldError text={errors.seats} />}
            </label>
            <div className="btnrow">
              <button type="submit" className="btn btn--lg" disabled={saving}>
                {saving ? 'Creating…' : 'Create class'}
              </button>
              <button type="button" className="btn btn--quiet btn--lg" onClick={() => onNavigate('/')}>
                Back to classes
              </button>
            </div>
          </div>
        </form>
        <aside className="side">
          <div className="card">
            <div className="card__h">
              <h3>How parents will see it</h3>
            </div>
            <div className="card__b">
              <Preview name={name} seats={seats} />
            </div>
          </div>
        </aside>
      </div>

      <div className="group" style={{ marginTop: 36 }}>
        <h2>Open classes</h2>
        <span className="n">{classes.length}</span>
      </div>
      {classes.length ? (
        <ClassTable classes={classes} />
      ) : (
        <div className="empty" style={{ padding: '32px 20px' }}>
          <h3 style={{ fontSize: 17 }}>No classes yet</h3>
          <p style={{ marginBottom: 0 }}>Create the first one above.</p>
        </div>
      )}
    </>
  );
}

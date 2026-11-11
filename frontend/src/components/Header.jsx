import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import { isValidStudentId, plural } from '../lib/format.js';

export const NAV = [
  { to: '/', label: 'Classes', section: 'classes', icon: 'grid' },
  { to: '/applications', label: 'My applications', section: 'me', icon: 'docLines' },
  { to: '/admin', label: 'Create class', section: 'admin', icon: 'plus', admin: true },
];

function NavLink({ item, section, onNavigate, className, children }) {
  return (
    <a
      href={`#${item.to}`}
      className={className}
      aria-current={section === item.section ? 'page' : undefined}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(item.to);
      }}
    >
      {children}
    </a>
  );
}

function Brand({ onNavigate }) {
  return (
    <a
      className="brand"
      href="#/"
      aria-label="Admissions 2027: classes"
      onClick={(e) => {
        e.preventDefault();
        onNavigate('/');
      }}
    >
      <span className="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 36 36">
          <rect width="36" height="36" rx="10" fill="#fff" />
          <rect x="9" y="9" width="7.4" height="7.4" rx="2" fill="#173B33" />
          <rect x="19.6" y="9" width="7.4" height="7.4" rx="2" fill="#173B33" />
          <rect x="9" y="19.6" width="7.4" height="7.4" rx="2" fill="#173B33" opacity=".22" />
          <rect x="19.6" y="19.6" width="7.4" height="7.4" rx="2" fill="#E5A11A" />
        </svg>
      </span>
      <span className="brand__t">
        <b>Admissions</b>
        <span className="brand__yr">2027</span>
      </span>
    </a>
  );
}

function IdentityField({ studentId, onChange, inputRef, setIdBar, askedAt }) {
  const [draft, setDraft] = useState(studentId);
  const [touched, setTouched] = useState(false);
  const [asked, setAsked] = useState(false);
  const ok = isValidStudentId(draft);

  useEffect(() => {
    if (!askedAt) return undefined;
    setAsked(false);
    const frame = requestAnimationFrame(() => setAsked(true));
    return () => cancelAnimationFrame(frame);
  }, [askedAt]);

  const update = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 17);
    setDraft(digits);
    if (isValidStudentId(digits)) {
      setTouched(false);
      setIdBar(null);
      onChange(digits);
    } else if (studentId) {
      onChange('');
    }
  };

  const clear = (e) => {
    e.preventDefault();
    setDraft('');
    setTouched(false);
    setIdBar(null);
    onChange('');
    inputRef.current?.focus();
  };

  const cls = ['idf', ok && 'is-ok', !draft && 'is-empty', touched && draft && !ok && 'is-bad', asked && 'is-asked']
    .filter(Boolean)
    .join(' ');

  return (
    <label className={cls} onAnimationEnd={() => setAsked(false)}>
      <span className="idf__l">Birth registration no.</span>
      <input
        ref={inputRef}
        id="student-id"
        value={draft}
        onChange={(e) => update(e.target.value)}
        onBlur={() => {
          if (draft.length > 0 && draft.length < 17) {
            setTouched(true);
            setIdBar({
              kind: 'bad',
              text: `A birth registration number has exactly 17 digits; ${plural(draft.length, 'digit has', 'digits have')} been entered.`,
            });
          }
        }}
        inputMode="numeric"
        maxLength={17}
        autoComplete="off"
        spellCheck="false"
        placeholder="17-digit number"
        aria-label="Student's birth registration number"
        aria-describedby="idbar-text"
      />
      <span className="idf__s">{draft.length}/17</span>
      <span className="idf__ok" aria-hidden="true">
        <Icon name="check" sw={3} />
      </span>
      {draft && (
        <button type="button" className="idf__x" aria-label="Clear number" onClick={clear}>
          <Icon name="x" />
        </button>
      )}
    </label>
  );
}

export function Header({ section, onNavigate, studentId, onStudentIdChange, inputRef, idBar, setIdBar }) {
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const mark = () => setStuck(window.scrollY > 6);
    window.addEventListener('scroll', mark, { passive: true });
    mark();
    return () => window.removeEventListener('scroll', mark);
  }, []);

  // Keep the last message while the bar folds shut so the text does not vanish mid-animation.
  const last = useRef(null);
  if (idBar) last.current = idBar;
  const shown = idBar || last.current;

  return (
    <>
      <div className="band__util">
        <div className="wrap band__util-in">
          <span className="band__org">School Admission System</span>
          <i className="band__dot" aria-hidden="true" />
          <span>First come, first served &mdash; no lottery, no queue at the gate</span>
        </div>
      </div>
      <header className={`band${stuck ? ' is-stuck' : ''}`}>
        <div className="wrap band__in">
          <Brand onNavigate={onNavigate} />
          <nav className="nav" aria-label="Main">
            {NAV.map((item) => (
              <NavLink key={item.to} item={item} section={section} onNavigate={onNavigate} className={item.admin ? 'nav__admin' : undefined}>
                {item.label}
                {item.admin && <span className="tag">Admin</span>}
              </NavLink>
            ))}
          </nav>
          <IdentityField
            studentId={studentId}
            onChange={onStudentIdChange}
            inputRef={inputRef}
            setIdBar={setIdBar}
            askedAt={idBar?.askedAt}
          />
        </div>
        <div className={`idbar${idBar ? ' is-on' : ''}${shown?.kind === 'bad' ? ' is-bad' : ''}`} role="status">
          <div className="idbar__clip" aria-hidden={!idBar}>
            <div className="wrap idbar__in">
              <Icon name="info" />
              <span id="idbar-text">{shown?.text}</span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export function TabBar({ section, onNavigate, heldCount = 0 }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {NAV.map((item) => (
        <NavLink key={item.to} item={item} section={section} onNavigate={onNavigate}>
          <Icon name={item.icon} sw={1.8} />
          {item.label}
          {item.section === 'me' && heldCount > 0 && <span className="b">{heldCount}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

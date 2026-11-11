import { Icon } from '../components/Icon.jsx';
import { Empty, Figures, Message, Pill, SeatPlan } from '../components/ui.jsx';
import { APPLY, CANCEL, PAY } from '../lib/labels.js';
import { countdown, day, dayTime, fullDay, grouped, hhmm, mmss, plural } from '../lib/format.js';

function Back({ onNavigate }) {
  return (
    <a
      href="#/"
      className="back"
      onClick={(e) => {
        e.preventDefault();
        onNavigate('/');
      }}
    >
      <Icon name="back" sw={2} />
      All classes
    </a>
  );
}

export function ApplicationView({ hold, mine, loading, notFound, seats, now, studentId, msg, busy, onConfirm, onAskCancel, onApply, onNavigate }) {
  if (!hold) {
    return (
      <>
        <Back onNavigate={onNavigate} />
        {msg}
        {loading ? (
          <div className="app" aria-label="Loading application">
            <div className="app__b">
              <div className="sk" style={{ height: 26, width: '40%' }} />
              <div className="sk" style={{ height: 70, width: '55%', marginTop: 22 }} />
            </div>
          </div>
        ) : (
          <Empty
            icon="clock"
            title={notFound ? 'Application not found' : 'No application is open'}
            action={
              <button type="button" className="btn" onClick={() => onNavigate('/')}>
                Browse classes
              </button>
            }
          >
            {notFound ? (
              'This application does not exist. My applications lists every application of this student.'
            ) : (
              <>
                Choose a class and press <span lang="bn">{APPLY}</span>. The seat is held in the student&rsquo;s name and the timer
                appears here.
              </>
            )}
          </Empty>
        )}
      </>
    );
  }

  const k = countdown(hold, now);
  const live = hold.status === 'HELD' && mine;
  const confirming = busy === `confirm:${hold.holdId}`;
  const owner = mine ? grouped(studentId) : 'Another birth registration number';

  const payBtn = (
    <button type="button" className="btn btn--lg" lang="bn" disabled={!live || confirming} onClick={() => onConfirm(hold.holdId)}>
      <Icon name="card" />
      {confirming ? 'Confirming…' : PAY}
    </button>
  );
  const cancelBtn = (
    <button type="button" className="btn btn--danger btn--lg" lang="bn" disabled={!live || confirming} onClick={() => onAskCancel(hold.holdId)}>
      {CANCEL}
    </button>
  );

  let body;
  let note;
  if (hold.status === 'HELD') {
    body = (
      <>
        <div className={`clock${k.urgent ? ' is-urgent' : ''}`}>
          <b className="num" aria-label={`${mmss(k.left)} left`}>
            {mmss(k.left)}
          </b>
          <span>
            <strong>
              {k.urgent ? (
                <>
                  <span className="pip" />
                  Almost out of time
                </>
              ) : (
                'Left to pay the admission fee'
              )}
            </strong>
            The hold ends at {hhmm(hold.expiresAt)}, then the seat goes back to other applicants.
          </span>
        </div>
        <div className="track" style={{ height: 6, marginTop: 22 }}>
          <i style={{ width: `${k.pct.toFixed(1)}%`, background: k.urgent ? 'var(--brick)' : undefined }} />
        </div>
        <ol className="steps">
          <li className="done">
            <b>1</b>
            <div>
              <span className="st-t">Applied</span>
              <span className="st-s">Seat held at {hhmm(hold.createdAt)}</span>
            </div>
          </li>
          <li className="now">
            <b>2</b>
            <div>
              <span className="st-t">Pay the admission fee</span>
              <span className="st-s">Before {hhmm(hold.expiresAt)}</span>
            </div>
          </li>
          <li>
            <b>3</b>
            <div>
              <span className="st-t">Admission confirmed</span>
              <span className="st-s">The seat is permanently the student&rsquo;s</span>
            </div>
          </li>
        </ol>
      </>
    );
    note = mine ? (
      <>
        Payment is simulated in this system: pressing <span lang="bn">{PAY}</span> confirms the admission straight away.
      </>
    ) : (
      'This application belongs to a different birth registration number, so it cannot be paid or cancelled here.'
    );
  } else if (hold.status === 'CONFIRMED') {
    body = (
      <>
        <div className="slip">
          <span className="stamp" aria-hidden="true">
            Admitted<small>{fullDay(hold.updatedAt || hold.createdAt)}</small>
          </span>
          <h3>Admission confirmed</h3>
          <p>The admission fee is paid and this seat is permanently held in the student&rsquo;s name. Nothing else is needed.</p>
          <dl>
            <dt>Class</dt>
            <dd>{hold.className}</dd>
            <dt>Student</dt>
            <dd className="mono">{owner}</dd>
            <dt>Application</dt>
            <dd className="mono">{hold.holdId}</dd>
          </dl>
        </div>
        <div className="after">
          <button type="button" className="btn btn--ghost" onClick={() => onNavigate('/applications')}>
            My applications
          </button>
          <button type="button" className="btn btn--quiet" onClick={() => onNavigate('/')}>
            Browse classes
          </button>
        </div>
      </>
    );
    note = 'The fee is paid, so there is nothing left to pay, and a confirmed admission cannot be cancelled.';
  } else {
    const expired = hold.status === 'EXPIRED';
    const canApplyAgain = seats && seats.availableSeats > 0;
    body = (
      <>
        <div className="clock is-dead">
          <b className="num">00:00</b>
          <span>
            <strong>{expired ? 'The hold expired' : 'Application cancelled'}</strong>
            {expired ? `The fee wasn’t paid by ${hhmm(hold.expiresAt)}.` : 'The seat was given back.'}
          </span>
        </div>
        <div className="track" style={{ height: 6, marginTop: 22 }}>
          <i style={{ width: 0 }} />
        </div>
        <div style={{ marginTop: 22 }}>
          <Message
            kind={expired ? 'warn' : 'info'}
            title="The seat has been released"
            text={`${expired ? 'Holds release themselves when the time runs out. ' : ''}${
              canApplyAgain
                ? `This class still has ${plural(seats.availableSeats, 'seat', 'seats')} available, so you can apply again.`
                : 'This class has no seats available right now.'
            }`}
          />
          <div className="after">
            {canApplyAgain ? (
              <>
                <button type="button" className="btn" disabled={busy === `apply:${hold.classId}`} onClick={() => onApply(hold.classId)}>
                  <span lang="bn">{APPLY}</span>
                </button>
                <button type="button" className="btn btn--quiet" onClick={() => onNavigate('/')}>
                  All classes
                </button>
              </>
            ) : (
              <button type="button" className="btn btn--ghost" onClick={() => onNavigate('/')}>
                See other classes
              </button>
            )}
          </div>
        </div>
      </>
    );
    note = expired ? 'The hold expired, so the fee can no longer be paid.' : 'This application was cancelled, so it can no longer be paid.';
  }

  return (
    <>
      <Back onNavigate={onNavigate} />
      {msg}
      <div className="split">
        <section className="app">
          <div className="app__h">
            <div>
              <h2>{hold.className}</h2>
              <div className="meta">
                Application {hold.holdId} · applied {dayTime(hold.createdAt)}
              </div>
            </div>
            <Pill status={hold.status} large />
          </div>
          <div className="app__b">{body}</div>
          <div className="app__f">
            {payBtn}
            {cancelBtn}
            <span className="note">{note}</span>
          </div>
        </section>
        <aside className="side">
          {seats && (
            <div className="card">
              <div className="card__h">
                <h3>Seats in this class</h3>
                <span className="r">
                  <span className="live__d" style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                    <span className="dot" />
                    Live
                  </span>
                </span>
              </div>
              <div className="card__b" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <SeatPlan {...seats} />
                <Figures seats={seats} />
              </div>
            </div>
          )}
          <div className="kv">
            <div className="kv__r">
              <span className="kv__k">Application</span>
              <span className="kv__v">{hold.holdId}</span>
            </div>
            <div className="kv__r">
              <span className="kv__k">Class</span>
              <span className="kv__v">{hold.classId}</span>
            </div>
            <div className="kv__r">
              <span className="kv__k">Student</span>
              <span className="kv__v">{owner}</span>
            </div>
            <div className="kv__r">
              <span className="kv__k">Applied</span>
              <span className="kv__v">{dayTime(hold.createdAt)}</span>
            </div>
            {(hold.status === 'HELD' || hold.status === 'EXPIRED') && (
              <div className="kv__r">
                <span className="kv__k">{hold.status === 'HELD' ? 'Hold ends' : 'Expired'}</span>
                <span className="kv__v" title={hold.expiresAt}>
                  {day(hold.expiresAt)}, {hhmm(hold.expiresAt)}
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

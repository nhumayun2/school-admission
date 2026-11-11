import { useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Empty, Figures, Message, Pill, SeatPlan } from '../components/ui.jsx';
import { APPLY, PAY } from '../lib/labels.js';
import { countdown, hhmm, isValidStudentId, mmss } from '../lib/format.js';

function Ticket({ hold, now, onOpen }) {
  const k = countdown(hold, now);
  return (
    <div className={`ticket${k.urgent ? ' is-urgent' : ''}`}>
      <div className="ticket__main">
        <div className="ticket__top">
          <Pill status="HELD" />
          <h3>{hold.className}</h3>
        </div>
        <div className="ticket__clock">
          <b className="num">{mmss(k.left)}</b>
          <span>
            {k.urgent ? (
              <>
                <span className="pip" />
                Almost out of time. Pay now to keep this seat.
              </>
            ) : (
              'left to pay the admission fee and keep this seat.'
            )}
          </span>
        </div>
        <div className="track">
          <i style={{ width: `${k.pct.toFixed(1)}%`, background: k.urgent ? 'var(--brick)' : undefined }} />
        </div>
      </div>
      <div className="ticket__stub">
        <button type="button" className="btn btn--block" lang="bn" onClick={() => onOpen(hold.holdId)}>
          {PAY}
        </button>
        <button type="button" className="btn btn--quiet btn--sm btn--block" onClick={() => onOpen(hold.holdId)}>
          View application
        </button>
      </div>
    </div>
  );
}

function Room({ seats, mine, busy, error, intro, onApply, onOpen }) {
  const full = seats.availableSeats === 0;
  let foot;
  if (mine?.status === 'CONFIRMED') {
    foot = (
      <button type="button" className="btn btn--ghost btn--block" onClick={() => onOpen(mine.holdId)}>
        View admission
      </button>
    );
  } else if (mine) {
    foot = (
      <button type="button" className="btn btn--block" lang="bn" onClick={() => onOpen(mine.holdId)}>
        {PAY}
      </button>
    );
  } else if (full) {
    foot = (
      <>
        <button type="button" className="btn btn--block" disabled>
          No seats left
        </button>
        <p>A seat reopens if someone&rsquo;s hold expires.</p>
      </>
    );
  } else {
    foot = (
      <button type="button" className="btn btn--block" disabled={busy} onClick={() => onApply(seats.id)}>
        {busy ? 'Holding a seat…' : <span lang="bn">{APPLY}</span>}
      </button>
    );
  }
  return (
    <article className={`room${full ? ' is-full' : ''}${mine ? ' is-mine' : ''}`}>
      <div className="room__h">
        <div>
          <h3>{seats.name}</h3>
          {mine && (
            <span className="mine">
              <Pill status={mine.status} />
              Your application
            </span>
          )}
        </div>
      </div>
      <SeatPlan {...seats} intro={intro} />
      <Figures seats={seats} />
      {error && (
        <div className="room__err">
          <Message kind="err" title={error.title} text={error.text} />
        </div>
      )}
      <div className="room__f">{foot}</div>
    </article>
  );
}

function Skeleton() {
  return (
    <div className="rooms" aria-label="Loading classes">
      {[54, 63, 72].map((w) => (
        <div key={w} className="room">
          <div>
            <div className="sk" style={{ height: 20, width: `${w}%` }} />
            <div className="sk" style={{ height: 11, width: 60, marginTop: 9 }} />
          </div>
          <div className="sk" style={{ height: 84 }} />
          <div className="sk" style={{ height: 46 }} />
          <div className="sk" style={{ height: 42, marginTop: 'auto' }} />
        </div>
      ))}
    </div>
  );
}

export function ClassesView({ classes, loaded, myHolds, now, studentId, msg, roomError, busy, synced, offline, intro, idAsked, onApply, onOpen, onRefresh, askId, onNavigate }) {
  const [query, setQuery] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState('default');

  const active = myHolds.find((h) => h.status === 'HELD');
  const total = classes.reduce((n, c) => n + c.totalSeats, 0);
  const free = classes.reduce((n, c) => n + c.availableSeats, 0);

  let list = classes.slice();
  const q = query.trim().toLowerCase();
  if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));
  if (openOnly) list = list.filter((c) => c.availableSeats > 0);
  if (sort === 'most') list.sort((a, b) => b.availableSeats - a.availableSeats);
  if (sort === 'least') list.sort((a, b) => a.availableSeats - b.availableSeats);

  let body;
  if (!loaded) {
    body = <Skeleton />;
  } else if (!list.length) {
    const none = !classes.length;
    body = (
      <Empty
        icon="grid"
        title={none ? 'No classes are open yet' : q ? `No class matches "${query.trim()}"` : 'Every class is full right now'}
        action={
          none ? (
            <button type="button" className="btn" onClick={() => onNavigate('/admin')}>
              Create a class
            </button>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={() => { setQuery(''); setOpenOnly(false); }}>
              Show all classes
            </button>
          )
        }
      >
        {none
          ? 'Classes appear here as soon as the school admin creates them.'
          : q
            ? 'Check the spelling, or search for a class number such as "Class 6".'
            : 'A seat reopens when someone’s hold expires. This page checks again every few seconds.'}
      </Empty>
    );
  } else {
    body = (
      <div className="rooms">
        {list.map((c) => (
          <Room
            key={c.id}
            seats={c}
            mine={myHolds.find((h) => h.classId === c.id && (h.status === 'HELD' || h.status === 'CONFIRMED'))}
            busy={busy === `apply:${c.id}`}
            error={roomError?.classId === c.id ? roomError : null}
            intro={intro}
            onApply={onApply}
            onOpen={onOpen}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>Choose a class</h1>
          <p>
            Seats go to whoever applies first; there is no lottery. Applying holds a seat for a limited time. Pay the admission fee
            before the timer runs out to confirm it.
          </p>
          {classes.length > 0 && (
            <p className="avail">
              Right now <b>{free}</b> of <b>{total}</b> seats are available across <b>{classes.length}</b>{' '}
              {classes.length === 1 ? 'class' : 'classes'}.
            </p>
          )}
        </div>
        <div className="head__r">
          <span className="live__d">
            <span className={`dot${offline ? ' dot--off' : ''}`} />
            {offline ? 'Offline · retrying' : synced ? `Live · updated ${hhmm(synced)}` : 'Connecting…'}
          </span>
          <button type="button" className="btn btn--sm btn--ghost" onClick={onRefresh}>
            <Icon name="refresh" />
            Refresh
          </button>
        </div>
      </div>

      {msg}

      {!isValidStudentId(studentId) && !idAsked && (
        <Message
          kind="info"
          title="Enter the student's birth registration number to apply"
          text="Type the 17-digit number in the box at the top of the page. You can browse seats without it."
          action={{ label: 'Enter number', ghost: true, onClick: () => askId("Type the student's 17-digit birth registration number here.") }}
        />
      )}

      {active && <Ticket hold={active} now={now} onOpen={onOpen} />}

      {loaded && classes.length > 0 && (
        <div className="bar-top">
          <label className="search">
            <span className="sr">Search classes</span>
            <Icon name="search" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search classes or shifts" autoComplete="off" />
          </label>
          <button type="button" className="chipbtn" aria-pressed={openOnly} onClick={() => setOpenOnly((v) => !v)}>
            <span className="box">
              <Icon name="check" sw={3.2} />
            </span>
            Open seats only
          </button>
          <select className="sel" aria-label="Sort classes" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="default">Sort: class order</option>
            <option value="most">Sort: most seats available</option>
            <option value="least">Sort: fewest seats available</option>
          </select>
          <span className="legend" aria-hidden="true">
            <span>
              <i className="key c" />
              Confirmed
            </span>
            <span>
              <i className="key h" />
              Held
            </span>
            <span>
              <i className="key f" />
              Available
            </span>
          </span>
        </div>
      )}

      {body}
    </>
  );
}

import { Fragment } from 'react';
import { Empty, Pill } from '../components/ui.jsx';
import { PAY } from '../lib/labels.js';
import { countdown, dayTime, isValidStudentId, mmss } from '../lib/format.js';

const GROUPS = [
  { title: 'Waiting for payment', match: (s) => s === 'HELD' },
  { title: 'Confirmed admissions', match: (s) => s === 'CONFIRMED' },
  { title: 'Expired and cancelled', match: (s) => s === 'EXPIRED' || s === 'CANCELLED', past: true },
];

function HoldTable({ rows, past, withHead, now, onOpen }) {
  return (
    <table className="tbl">
      <colgroup>
        <col />
        <col style={{ width: 150 }} />
        <col style={{ width: 130 }} />
        <col style={{ width: 150 }} />
        <col style={{ width: 170 }} />
      </colgroup>
      {withHead && (
        <thead>
          <tr>
            <th>Class</th>
            <th>Status</th>
            <th>Time left</th>
            <th>Expires</th>
            <th className="r">
              <span className="sr">Action</span>
            </th>
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((h) => {
          const k = countdown(h, now);
          return (
            <tr key={h.holdId} className={past ? 'past' : undefined}>
              <td data-k="Class">
                <span className="nm">{h.className}</span>
                <span className="sub">{h.holdId}</span>
              </td>
              <td data-k="Status">
                <Pill status={h.status} />
              </td>
              <td data-k="Time left">
                {h.status === 'HELD' ? (
                  <span className="num" style={{ fontSize: 16, fontWeight: 500, color: k.urgent ? 'var(--brick)' : undefined }}>
                    {mmss(k.left)}
                  </span>
                ) : (
                  <span className="dim">—</span>
                )}
              </td>
              <td data-k="Expires">
                {h.status === 'HELD' || h.status === 'EXPIRED' ? (
                  <span className="num dim" style={{ fontSize: 13 }}>
                    {dayTime(h.expiresAt)}
                  </span>
                ) : (
                  <span className="dim">—</span>
                )}
              </td>
              <td className="r">
                {h.status === 'HELD' ? (
                  <button type="button" className="btn btn--sm" lang="bn" onClick={() => onOpen(h.holdId)}>
                    {PAY}
                  </button>
                ) : (
                  <button type="button" className="btn btn--sm btn--ghost" onClick={() => onOpen(h.holdId)}>
                    View
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function MyApplicationsView({ myHolds, loaded, now, studentId, msg, askId, onOpen, onNavigate }) {
  let body;
  if (!isValidStudentId(studentId)) {
    body = (
      <Empty
        icon="docLines"
        title="Enter a birth registration number"
        action={
          <button type="button" className="btn" onClick={() => askId("Type the student's 17-digit birth registration number here.")}>
            Enter number
          </button>
        }
      >
        Type the student&rsquo;s 17-digit number in the box at the top of the page to see their applications. No login is needed.
      </Empty>
    );
  } else if (!loaded) {
    body = (
      <div className="card" style={{ padding: 22 }} aria-label="Loading applications">
        {[40, 58, 48].map((w, i) => (
          <div key={w} className="sk" style={{ height: 16, width: `${w}%`, marginTop: i ? 16 : 0 }} />
        ))}
      </div>
    );
  } else if (!myHolds.length) {
    body = (
      <Empty
        icon="docLines"
        title="No applications for this number yet"
        action={
          <button type="button" className="btn" onClick={() => onNavigate('/')}>
            Browse classes
          </button>
        }
      >
        Check the number at the top of the page, or choose a class to apply for.
      </Empty>
    );
  } else {
    let first = true;
    body = GROUPS.map((g) => {
      const rows = myHolds.filter((h) => g.match(h.status));
      if (!rows.length) return null;
      const withHead = first;
      first = false;
      return (
        <Fragment key={g.title}>
          <div className="group">
            <h2>{g.title}</h2>
            <span className="n">{rows.length}</span>
          </div>
          <HoldTable rows={rows} past={g.past} withHead={withHead} now={now} onOpen={onOpen} />
        </Fragment>
      );
    });
  }

  return (
    <>
      <div className="head">
        <div>
          <h1>My applications</h1>
          <p>
            Every application made with this birth registration number, and where each one stands. They stay here after a refresh or
            after closing the browser.
          </p>
        </div>
      </div>
      {msg}
      {body}
    </>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header, TabBar } from './components/Header.jsx';
import { Dialog, Message, Toasts } from './components/ui.jsx';
import { api, serverNow } from './lib/api.js';
import { effectiveStatus, isValidStudentId } from './lib/format.js';
import { CANCEL, errorTitle } from './lib/labels.js';
import { useRoute } from './lib/useRoute.js';
import { ApplicationView } from './views/ApplicationView.jsx';
import { ClassesView } from './views/ClassesView.jsx';
import { MyApplicationsView } from './views/MyApplicationsView.jsx';

const STUDENT_KEY = 'admission.studentId';
const POLL_MS = 3000;

const TITLES = { classes: 'Classes', application: 'Application', me: 'My applications', admin: 'Create a class' };

const PLACEHOLDERS = {
  admin: { title: 'Create a class', lede: 'Each shift is its own class, with its own number of seats.' },
};

function readStudentId() {
  try {
    return localStorage.getItem(STUDENT_KEY) || '';
  } catch {
    return '';
  }
}

function glideToTop(then) {
  const atTop = window.scrollY < 4;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!atTop) {
    try {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    } catch {
      /* no scrolling available */
    }
  }
  if (atTop || reduced) return then();
  const started = Date.now();
  const wait = setInterval(() => {
    if (window.scrollY < 4 || Date.now() - started > 800) {
      clearInterval(wait);
      then();
    }
  }, 40);
}

export default function App() {
  const [route, navigate] = useRoute();
  const [studentId, setStudentId] = useState(readStudentId);
  const studentRef = useRef(studentId);
  const [idBar, setIdBar] = useState(null);
  const idInput = useRef(null);

  const [classes, setClasses] = useState([]);
  const [classesLoaded, setClassesLoaded] = useState(false);
  const [holds, setHolds] = useState([]);
  const [holdsLoaded, setHoldsLoaded] = useState(false);
  const [synced, setSynced] = useState(null);
  const [connError, setConnError] = useState(null);
  const [now, setNow] = useState(serverNow);
  const [intro, setIntro] = useState(true);

  const [msg, setMsg] = useState(null);
  const [roomError, setRoomError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [cancelId, setCancelId] = useState(null);
  const [lookup, setLookup] = useState(null);

  const toast = useCallback((kind, text) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list, { id, kind, text }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 5000);
  }, []);
  const dismissToast = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const refresh = useCallback(async () => {
    const sid = studentRef.current;
    try {
      const [cls, mine] = await Promise.all([api.listClasses(), isValidStudentId(sid) ? api.myHolds(sid) : Promise.resolve(null)]);
      setClasses(cls);
      setClassesLoaded(true);
      if (studentRef.current === sid) {
        setHolds(mine || []);
        setHoldsLoaded(true);
      }
      setSynced(new Date(serverNow()).toISOString());
      setConnError(null);
    } catch (e) {
      if (e.offline) setConnError(e);
      else setMsg({ kind: 'err', title: errorTitle(e), text: e.message });
    }
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, POLL_MS);
    return () => clearInterval(poll);
  }, [refresh]);

  useEffect(() => {
    const tick = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (classesLoaded) setTimeout(() => setIntro(false), 900);
  }, [classesLoaded]);

  const changeStudentId = useCallback(
    (value) => {
      studentRef.current = value;
      setStudentId(value);
      setHolds([]);
      setHoldsLoaded(false);
      try {
        localStorage.setItem(STUDENT_KEY, value);
      } catch {
        /* storage blocked: the number still works for this visit */
      }
      if (value) refresh();
    },
    [refresh],
  );

  const askId = useCallback((text) => {
    setIdBar({ kind: 'warn', text, askedAt: Date.now() });
    // Focus after the glide; focusing first would cancel the smooth scroll.
    glideToTop(() => idInput.current?.focus({ preventScroll: true }));
  }, []);

  const myHolds = useMemo(() => holds.map((h) => ({ ...h, status: effectiveStatus(h, now) })), [holds, now]);
  const heldCount = myHolds.filter((h) => h.status === 'HELD').length;

  const markHold = (holdId, status) => setHolds((list) => list.map((h) => (h.holdId === holdId ? { ...h, status } : h)));

  const apply = useCallback(
    async (classId) => {
      const sid = studentRef.current;
      if (!isValidStudentId(sid)) {
        askId("Enter the student's 17-digit birth registration number first. The seat is held in the student's name.");
        return;
      }
      setBusy(`apply:${classId}`);
      setRoomError(null);
      setMsg(null);
      try {
        const hold = await api.apply(classId, sid);
        const cls = classes.find((c) => c.id === classId);
        const at = new Date(serverNow()).toISOString();
        setHolds((list) => [{ ...hold, className: cls ? cls.name : '', createdAt: at }, ...list]);
        toast('ok', 'Seat held. Pay the admission fee before the timer runs out.');
        navigate(`/applications/${hold.holdId}`);
      } catch (e) {
        if (e.offline) setConnError(e);
        else if (route.page === 'classes') setRoomError({ classId, title: errorTitle(e), text: e.message });
        else setMsg({ kind: 'err', title: errorTitle(e), text: e.message });
      } finally {
        setBusy(null);
        refresh();
      }
    },
    [askId, classes, navigate, refresh, route.page, toast],
  );

  const confirm = useCallback(
    async (holdId) => {
      setBusy(`confirm:${holdId}`);
      setMsg(null);
      try {
        await api.confirm(holdId, studentRef.current);
        markHold(holdId, 'CONFIRMED');
        toast('ok', 'Admission confirmed. The seat now belongs to this student.');
      } catch (e) {
        if (e.offline) setConnError(e);
        else setMsg({ kind: 'err', title: errorTitle(e), text: e.message });
      } finally {
        setBusy(null);
        refresh();
      }
    },
    [refresh, toast],
  );

  const cancel = useCallback(
    async (holdId) => {
      setBusy(`cancel:${holdId}`);
      setMsg(null);
      try {
        await api.cancel(holdId, studentRef.current);
        markHold(holdId, 'CANCELLED');
        toast('ok', 'Application cancelled. The seat went back to the pool.');
      } catch (e) {
        if (e.offline) setConnError(e);
        else setMsg({ kind: 'err', title: errorTitle(e), text: e.message });
      } finally {
        setBusy(null);
        setCancelId(null);
        refresh();
      }
    },
    [refresh, toast],
  );

  const openHold = useCallback((holdId) => navigate(`/applications/${holdId}`), [navigate]);

  const viewedId = route.page === 'application' ? route.holdId : null;
  const ownHold = viewedId ? myHolds.find((h) => h.holdId === viewedId) : null;
  const waitingForMine = isValidStudentId(studentId) && !holdsLoaded;

  // A hold that is not in this student's list (another number, or none typed yet) is fetched on its own.
  useEffect(() => {
    if (!viewedId || ownHold || waitingForMine) return undefined;
    let stop = false;
    const load = async () => {
      try {
        const hold = await api.getHold(viewedId);
        if (!stop) setLookup({ holdId: viewedId, hold });
      } catch (e) {
        if (!stop) setLookup({ holdId: viewedId, error: e });
      }
    };
    load();
    const poll = setInterval(load, POLL_MS);
    return () => {
      stop = true;
      clearInterval(poll);
    };
  }, [viewedId, !!ownHold, waitingForMine]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setMsg(null);
    setRoomError(null);
    document.title = `${TITLES[route.page]} · Admissions`;
    window.scrollTo?.(0, 0);
  }, [route.page, route.holdId]);

  const pageMessage = connError ? (
    <Message
      kind="off"
      title={errorTitle(connError)}
      text="Your applications are safe. This page updates on its own once the connection is back."
      action={{ label: 'Try again', ghost: true, onClick: refresh }}
    />
  ) : msg ? (
    <Message kind={msg.kind} title={msg.title} text={msg.text} />
  ) : null;

  let page;
  if (route.page === 'classes') {
    page = (
      <ClassesView
        classes={classes}
        loaded={classesLoaded}
        myHolds={myHolds}
        now={now}
        studentId={studentId}
        msg={pageMessage}
        roomError={roomError}
        busy={busy}
        synced={synced}
        offline={!!connError}
        intro={intro}
        idAsked={idBar?.kind === 'warn'}
        onApply={apply}
        onOpen={openHold}
        onRefresh={refresh}
        askId={askId}
        onNavigate={navigate}
      />
    );
  } else if (route.page === 'application') {
    const looked = lookup?.holdId === viewedId ? lookup : null;
    const shown = ownHold || (looked?.hold ? { ...looked.hold, status: effectiveStatus(looked.hold, now) } : null);
    page = (
      <ApplicationView
        hold={shown}
        mine={!!ownHold}
        loading={!shown && (waitingForMine || !looked)}
        notFound={looked?.error?.status === 404}
        seats={shown ? classes.find((c) => c.id === shown.classId) : null}
        now={now}
        studentId={studentId}
        msg={pageMessage}
        busy={busy}
        onConfirm={confirm}
        onAskCancel={setCancelId}
        onApply={apply}
        onNavigate={navigate}
      />
    );
  } else if (route.page === 'me') {
    page = (
      <MyApplicationsView
        myHolds={myHolds}
        loaded={holdsLoaded}
        now={now}
        studentId={studentId}
        msg={pageMessage}
        askId={askId}
        onOpen={openHold}
        onNavigate={navigate}
      />
    );
  } else {
    const p = PLACEHOLDERS[route.page];
    page = (
      <div className="head">
        <div>
          <h1>{p.title}</h1>
          <p>{p.lede}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        section={route.section}
        onNavigate={navigate}
        studentId={studentId}
        onStudentIdChange={changeStudentId}
        inputRef={idInput}
        idBar={idBar}
        setIdBar={setIdBar}
      />
      <main>
        <div className="wrap">{page}</div>
      </main>
      <footer className="foot">
        <div className="wrap foot__in">
          <span>Admissions 2027</span>
          <span>·</span>
          <span>First come, first served. No lottery.</span>
        </div>
      </footer>
      <TabBar section={route.section} onNavigate={navigate} heldCount={heldCount} />
      <Toasts toasts={toasts} onDismiss={dismissToast} />
      {cancelId && (
        <Dialog
          title="Cancel this application?"
          confirmLabel={CANCEL}
          cancelLabel="Keep it"
          danger
          busy={busy === `cancel:${cancelId}`}
          onConfirm={() => cancel(cancelId)}
          onClose={() => setCancelId(null)}
        >
          The seat goes back to other applicants straight away. If seats are left, the student can apply again.
        </Dialog>
      )}
    </>
  );
}

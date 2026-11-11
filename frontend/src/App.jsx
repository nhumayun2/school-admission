import { useCallback, useEffect, useRef, useState } from 'react';
import { Header, TabBar } from './components/Header.jsx';
import { useRoute } from './lib/useRoute.js';

const STUDENT_KEY = 'admission.studentId';

const PAGES = {
  classes: { title: 'Choose a class', lede: 'Seats go to whoever applies first; there is no lottery.' },
  me: { title: 'My applications', lede: 'Every application made with this birth registration number.' },
  application: { title: 'Application', lede: 'The state of one application and the time left to pay.' },
  admin: { title: 'Create a class', lede: 'Each shift is its own class, with its own number of seats.' },
};

function readStudentId() {
  try {
    return localStorage.getItem(STUDENT_KEY) || '';
  } catch {
    return '';
  }
}

export default function App() {
  const [route, navigate] = useRoute();
  const [studentId, setStudentId] = useState(readStudentId);
  const [idBar, setIdBar] = useState(null);
  const idInput = useRef(null);

  const changeStudentId = useCallback((value) => {
    setStudentId(value);
    try {
      localStorage.setItem(STUDENT_KEY, value);
    } catch {
      /* storage blocked: the number still works for this visit */
    }
  }, []);

  useEffect(() => {
    document.title = `${PAGES[route.page].title} · Admissions`;
    window.scrollTo?.(0, 0);
  }, [route.page, route.holdId]);

  const page = PAGES[route.page];

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
        <div className="wrap">
          <div className="head">
            <div>
              <h1>{page.title}</h1>
              <p>{page.lede}</p>
            </div>
          </div>
        </div>
      </main>
      <footer className="foot">
        <div className="wrap foot__in">
          <span>Admissions 2027</span>
          <span>·</span>
          <span>First come, first served. No lottery.</span>
        </div>
      </footer>
      <TabBar section={route.section} onNavigate={navigate} />
    </>
  );
}

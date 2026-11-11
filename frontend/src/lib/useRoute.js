import { useCallback, useEffect, useState } from 'react';

export function parseRoute(hash) {
  const path = (hash || '').replace(/^#/, '') || '/';
  const one = path.match(/^\/applications\/([^/]+)$/);
  if (one) return { page: 'application', section: 'me', holdId: decodeURIComponent(one[1]) };
  if (path === '/applications') return { page: 'me', section: 'me' };
  if (path === '/admin') return { page: 'admin', section: 'admin' };
  return { page: 'classes', section: 'classes' };
}

// Hash routes, so a refresh stays on the same screen without any server setup.
export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = useCallback((to) => {
    if (window.location.hash !== `#${to}`) window.location.hash = to;
  }, []);
  return [route, navigate];
}

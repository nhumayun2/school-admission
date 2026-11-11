const PATHS = {
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  docLines: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  plus: 'M12 5v14M5 12h14',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 7.6h.01',
  err: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5v5M12 16.2h.01',
  warn: 'M12 9.5v4M12 17h.01M10.3 3.9 2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  ok: 'M20 6L9 17l-5-5',
  off: 'M2 2l20 20M8.5 16.4a5 5 0 0 1 7 0M5 13a9 9 0 0 1 3.3-2.1M19 13a9 9 0 0 0-5-2.5M12 20h.01',
  x: 'M18 6L6 18M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
  back: 'M15 18l-6-6 6-6',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.3-4.3',
  refresh: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V12l3 2',
  card: 'M4.5 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM2.5 10h19',
};

export function Icon({ name, sw = 1.9 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

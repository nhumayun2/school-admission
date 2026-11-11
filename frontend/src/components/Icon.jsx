const PATHS = {
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  docLines: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  plus: 'M12 5v14M5 12h14',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v4.5M12 16h.01',
  x: 'M18 6L6 18M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
};

export function Icon({ name, sw = 2 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

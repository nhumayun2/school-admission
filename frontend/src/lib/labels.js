// The three button labels quoted in Bangla by the brief, used exactly as written.
export const APPLY = 'আবেদন করুন';
export const PAY = 'ভর্তি ফি দিন';
export const CANCEL = 'বাতিল';

export const ERROR_TITLES = {
  NO_SEATS_AVAILABLE: 'Someone took the last seat',
  ALREADY_APPLIED: 'Already applied to this class',
  ALREADY_ADMITTED: 'Already admitted to this class',
  HOLD_EXPIRED: 'The hold has expired',
  HOLD_CANCELLED: 'This application was cancelled',
  ALREADY_CONFIRMED: 'The fee is already paid',
  NOT_YOUR_APPLICATION: 'Not this student’s application',
  APPLICATION_NOT_FOUND: 'Application not found',
  CLASS_NOT_FOUND: 'Class not found',
  INVALID_STUDENT_ID: 'Check the birth registration number',
  STUDENT_ID_REQUIRED: 'Birth registration number needed',
  INVALID_NAME: 'Check the class name',
  INVALID_TOTAL_SEATS: 'Check the number of seats',
  INVALID_REQUEST: 'Check the form',
  DATABASE_UNAVAILABLE: 'The server is having trouble',
  OFFLINE: "Can't reach the server",
};

export const errorTitle = (e) => ERROR_TITLES[e?.code] || 'That didn’t go through';

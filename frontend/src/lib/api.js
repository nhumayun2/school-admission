const runtimeUrl = typeof window !== 'undefined' && window.__ENV && window.__ENV.API_BASE_URL;
export const API_BASE_URL = String(runtimeUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details || null;
  }

  get offline() {
    return this.status === 0 || this.code === 'DATABASE_UNAVAILABLE';
  }
}

// Countdowns follow the server's clock (from the Date header), not the device's.
let clockOffset = 0;
export const serverNow = () => Date.now() + clockOffset;

function learnClock(response, sentAt, receivedAt) {
  const server = Date.parse(response.headers.get('Date') || '');
  if (Number.isNaN(server)) return;
  const offset = server + 500 - (sentAt + receivedAt) / 2;
  if (Math.abs(offset - clockOffset) > 1500) clockOffset = offset;
}

const FALLBACK = {
  400: 'Some of the information is not valid. Check it and try again.',
  403: 'This action is not allowed for this birth registration number.',
  404: 'That item could not be found.',
  409: 'This could not be done right now. Refresh and try again.',
};

async function request(method, path, { body, studentId } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (studentId) headers['X-Student-Id'] = studentId;

  const sentAt = Date.now();
  let response;
  try {
    response = await fetch(API_BASE_URL + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'OFFLINE', "Can't reach the server. Check the connection; this page keeps retrying on its own.");
  }
  learnClock(response, sentAt, Date.now());

  if (response.status === 204) return null;
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error || `HTTP_${response.status}`,
      data?.message || FALLBACK[response.status] || 'Something went wrong on the server. Try again in a moment.',
      data?.details,
    );
  }
  return data;
}

const enc = encodeURIComponent;

export const api = {
  createClass: (name, totalSeats) => request('POST', '/classes', { body: { name, totalSeats } }),
  listClasses: () => request('GET', '/classes'),
  getClass: (classId) => request('GET', `/classes/${enc(classId)}`),
  apply: (classId, studentId) => request('POST', `/classes/${enc(classId)}/holds`, { studentId }),
  getHold: (holdId) => request('GET', `/holds/${enc(holdId)}`),
  confirm: (holdId, studentId) => request('POST', `/holds/${enc(holdId)}/confirm`, { studentId }),
  cancel: (holdId, studentId) => request('DELETE', `/holds/${enc(holdId)}`, { studentId }),
  myHolds: (studentId) => request('GET', '/me/holds', { studentId }),
};

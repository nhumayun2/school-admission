import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

const ME = '20152691234567890';

function fakeBackend({ lastSeatTaken = false } = {}) {
  const cls = { id: 'c1', name: 'Class 6 - Morning Shift', totalSeats: 5, heldSeats: 0, confirmedSeats: 0, availableSeats: 5 };
  const holds = [];
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  return vi.fn(async (url, init = {}) => {
    const path = new URL(url).pathname;
    const method = init.method || 'GET';
    if (method === 'GET' && path === '/classes') return json(200, [cls]);
    if (method === 'GET' && path === '/me/holds') return json(200, holds);
    if (method === 'POST' && path === '/classes/c1/holds') {
      if (lastSeatTaken) return json(409, { error: 'NO_SEATS_AVAILABLE', message: 'All seats in this class are taken.' });
      const hold = { holdId: 'h1', classId: 'c1', status: 'HELD', expiresAt: new Date(Date.now() + 600_000).toISOString() };
      holds.push({ ...hold, className: cls.name, createdAt: new Date().toISOString() });
      cls.heldSeats += 1;
      cls.availableSeats -= 1;
      return json(201, hold);
    }
    if (method === 'POST' && path === '/holds/h1/confirm') {
      holds[0].status = 'CONFIRMED';
      cls.heldSeats -= 1;
      cls.confirmedSeats += 1;
      return json(200, { holdId: 'h1', classId: 'c1', status: 'CONFIRMED', expiresAt: holds[0].expiresAt });
    }
    return json(404, { error: 'NOT_FOUND', message: 'Not found' });
  });
}

const applyButton = () => screen.findByRole('button', { name: 'আবেদন করুন' });

describe('admission flow', () => {
  beforeEach(() => {
    window.location.hash = '#/';
  });

  it('asks for the birth registration number before applying', async () => {
    const fetch = fakeBackend();
    vi.stubGlobal('fetch', fetch);
    render(<App />);

    await userEvent.click(await applyButton());

    expect(await screen.findByText(/Enter the student's 17-digit birth registration number first/)).toBeInTheDocument();
    expect(fetch.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('holds a seat, then confirms it with the fee button', async () => {
    localStorage.setItem('admission.studentId', ME);
    const fetch = fakeBackend();
    vi.stubGlobal('fetch', fetch);
    render(<App />);

    await userEvent.click(await applyButton());

    const pay = await screen.findByRole('button', { name: /ভর্তি ফি দিন/ });
    expect(window.location.hash).toBe('#/applications/h1');
    expect(screen.getAllByText('HELD').length).toBeGreaterThan(0);
    const applyCall = fetch.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(applyCall[1].headers['X-Student-Id']).toBe(ME);

    await userEvent.click(pay);

    expect(await screen.findByText('Admission confirmed. The seat now belongs to this student.')).toBeInTheDocument();
    expect(screen.getAllByText('CONFIRMED').length).toBeGreaterThan(0);
  });

  it('explains when someone else took the last seat first', async () => {
    localStorage.setItem('admission.studentId', ME);
    vi.stubGlobal('fetch', fakeBackend({ lastSeatTaken: true }));
    render(<App />);

    await userEvent.click(await applyButton());

    expect(await screen.findByText('Someone took the last seat')).toBeInTheDocument();
    expect(screen.getByText('All seats in this class are taken.')).toBeInTheDocument();
    expect(window.location.hash).toBe('#/');
  });
});

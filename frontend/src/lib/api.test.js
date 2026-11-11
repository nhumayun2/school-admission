import { describe, expect, it, vi } from 'vitest';
import { api } from './api.js';

function reply(status, body) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

describe('api client', () => {
  it('sends the birth registration number in the X-Student-Id header', async () => {
    const fetch = reply(201, { holdId: 'h1', classId: 'c1', status: 'HELD', expiresAt: '2026-11-11T10:10:00Z' });
    vi.stubGlobal('fetch', fetch);

    const hold = await api.apply('c1', '20152691234567890');

    expect(hold.status).toBe('HELD');
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://localhost:8080/classes/c1/holds');
    expect(init.method).toBe('POST');
    expect(init.headers['X-Student-Id']).toBe('20152691234567890');
  });

  it('posts a new class as JSON', async () => {
    const fetch = reply(201, { id: 'c1', name: 'Class 6 - Morning Shift', totalSeats: 120 });
    vi.stubGlobal('fetch', fetch);

    await api.createClass('Class 6 - Morning Shift', 120);

    const [, init] = fetch.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ name: 'Class 6 - Morning Shift', totalSeats: 120 });
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('turns a JSON error into an ApiError with code and message', async () => {
    vi.stubGlobal('fetch', reply(409, { error: 'NO_SEATS_AVAILABLE', message: 'All seats in this class are taken.' }));

    await expect(api.apply('c1', '20152691234567890')).rejects.toMatchObject({
      status: 409,
      code: 'NO_SEATS_AVAILABLE',
      message: 'All seats in this class are taken.',
      offline: false,
    });
  });

  it('marks a network failure as offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(api.listClasses()).rejects.toMatchObject({ status: 0, offline: true });
  });
});

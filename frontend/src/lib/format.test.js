import { describe, expect, it } from 'vitest';
import { countdown, effectiveStatus, grouped, isValidStudentId, mmss } from './format.js';

describe('isValidStudentId', () => {
  it('accepts exactly 17 digits', () => {
    expect(isValidStudentId('20152691234567890')).toBe(true);
  });

  it.each(['', '2015269123456789', '201526912345678901', '2015269123456789a', ' 20152691234567890', null])('rejects %j', (v) => {
    expect(isValidStudentId(v)).toBe(false);
  });
});

describe('mmss', () => {
  it('formats milliseconds as mm:ss and never goes below zero', () => {
    expect(mmss(600_000)).toBe('10:00');
    expect(mmss(61_999)).toBe('01:01');
    expect(mmss(-5000)).toBe('00:00');
  });
});

describe('effectiveStatus', () => {
  const hold = { status: 'HELD', expiresAt: '2026-11-11T10:00:00Z' };
  const at = (iso) => Date.parse(iso);

  it('shows a held seat as expired once its time is up', () => {
    expect(effectiveStatus(hold, at('2026-11-11T09:59:59Z'))).toBe('HELD');
    expect(effectiveStatus(hold, at('2026-11-11T10:00:00Z'))).toBe('EXPIRED');
  });

  it('never changes a confirmed or cancelled application', () => {
    expect(effectiveStatus({ ...hold, status: 'CONFIRMED' }, at('2026-11-12T00:00:00Z'))).toBe('CONFIRMED');
    expect(effectiveStatus({ ...hold, status: 'CANCELLED' }, at('2026-11-12T00:00:00Z'))).toBe('CANCELLED');
  });
});

describe('countdown', () => {
  it('reports time left and marks the last minute as urgent', () => {
    const hold = { createdAt: '2026-11-11T10:00:00Z', expiresAt: '2026-11-11T10:10:00Z' };
    const half = countdown(hold, Date.parse('2026-11-11T10:05:00Z'));
    expect(half.left).toBe(300_000);
    expect(half.pct).toBe(50);
    expect(half.urgent).toBe(false);
    expect(countdown(hold, Date.parse('2026-11-11T10:09:30Z')).urgent).toBe(true);
  });
});

it('groups a 17-digit number for reading', () => {
  expect(grouped('20152691234567890')).toBe('2015 2691 2345 67890');
});

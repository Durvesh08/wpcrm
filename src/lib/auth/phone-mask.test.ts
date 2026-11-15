import { describe, expect, it } from 'vitest';
import { maskPhoneNumber, formatContactIdentifier } from './phone-mask';

describe('maskPhoneNumber', () => {
  it('returns raw phone when canViewRaw is true (Super Admin)', () => {
    expect(maskPhoneNumber('+919876543210', true)).toBe('+919876543210');
    expect(maskPhoneNumber('+1 (555) 019-2831', true)).toBe('+1 (555) 019-2831');
  });

  it('masks sensitive digits when canViewRaw is false (Admin/Agent)', () => {
    const masked = maskPhoneNumber('+919876543210', false);
    expect(masked).toBe('+9198 •••••');
    expect(masked).not.toContain('3210');
  });

  it('handles null/undefined gracefully', () => {
    expect(maskPhoneNumber(null, false)).toBe('No phone');
    expect(maskPhoneNumber(undefined, true)).toBe('No phone');
  });

  it('masks short numbers properly', () => {
    expect(maskPhoneNumber('1234', false)).toBe('••••••');
  });
});

describe('formatContactIdentifier', () => {
  it('returns contact name if present regardless of role', () => {
    expect(formatContactIdentifier('Alice Johnson', '+919876543210', false)).toBe('Alice Johnson');
    expect(formatContactIdentifier('Bob Smith', '+919876543210', true)).toBe('Bob Smith');
  });

  it('falls back to masked phone if name is missing and user is not Super Admin', () => {
    expect(formatContactIdentifier('', '+919876543210', false)).toBe('+9198 •••••');
    expect(formatContactIdentifier(null, '+919876543210', false)).toBe('+9198 •••••');
  });

  it('falls back to raw phone if name is missing and user is Super Admin', () => {
    expect(formatContactIdentifier('', '+919876543210', true)).toBe('+919876543210');
  });
});

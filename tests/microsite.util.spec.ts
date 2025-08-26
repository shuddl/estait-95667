import { describe, it, expect } from 'vitest';

function pickIdFromSlug(slug: string) {
  let id = "";
  for (let i = 0; i < slug.length; i++) {
    const c = slug[i];
    if (c >= "0" && c <= "9") id += c; else break;
  }
  return id.length >= 5 ? id : null;
}

describe('pickIdFromSlug', () => {
  it('extracts leading numeric id', () => {
    expect(pickIdFromSlug('12345-main-st')).toBe('12345');
  });
  it('returns null for short numeric prefixes', () => {
    expect(pickIdFromSlug('123-abcd')).toBeNull();
  });
  it('returns null for non-numeric strings', () => {
    expect(pickIdFromSlug('main-street')).toBeNull();
  });
  it('extracts long numeric ids correctly', () => {
    expect(pickIdFromSlug('1234567890-property')).toBe('1234567890');
  });
});
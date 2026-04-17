import { describe, it, expect } from 'vitest';
import { buildDefaultPuppyName } from './puppyNaming';

describe('buildDefaultPuppyName', () => {
  it('formats "{dam} x {sire} #{n}" when both parents are known', () => {
    expect(
      buildDefaultPuppyName({ damName: 'Star', sireName: 'Bruno', index: 1 })
    ).toBe('Star x Bruno #1');
  });

  it('uses only the dam when sire is missing', () => {
    expect(buildDefaultPuppyName({ damName: 'Luna', sireName: null, index: 2 })).toBe('Luna #2');
    expect(buildDefaultPuppyName({ damName: 'Luna', sireName: '', index: 3 })).toBe('Luna #3');
    expect(buildDefaultPuppyName({ damName: 'Luna', index: 4 })).toBe('Luna #4');
  });

  it('uses only the sire when dam is missing', () => {
    expect(buildDefaultPuppyName({ damName: null, sireName: 'Bruno', index: 1 })).toBe('Bruno #1');
  });

  it('falls back to "Puppy {n}" when neither parent name is known', () => {
    expect(buildDefaultPuppyName({ index: 1 })).toBe('Puppy 1');
    expect(buildDefaultPuppyName({ damName: null, sireName: null, index: 7 })).toBe('Puppy 7');
    expect(buildDefaultPuppyName({ damName: '   ', sireName: '   ', index: 2 })).toBe('Puppy 2');
  });

  it('trims whitespace around parent names', () => {
    expect(
      buildDefaultPuppyName({ damName: '  Star  ', sireName: ' Bruno ', index: 1 })
    ).toBe('Star x Bruno #1');
  });
});

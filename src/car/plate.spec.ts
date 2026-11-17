import { normalizePlate, PLATE_PATTERN } from './plate.js';

describe('normalizePlate', () => {
  it('removes spaces and dashes and upper-cases', () => {
    expect(normalizePlate('TM 54 ATM')).toBe('TM54ATM');
    expect(normalizePlate('tm-54-atm')).toBe('TM54ATM');
    expect(normalizePlate(' b\t12 abc ')).toBe('B12ABC');
  });

  it('leaves a clean plate as it is', () => {
    expect(normalizePlate('B123ABC')).toBe('B123ABC');
  });
});

describe('PLATE_PATTERN', () => {
  it('takes letters, diacritics included, and digits only', () => {
    expect(PLATE_PATTERN.test('TM54ATM')).toBe(true);
    expect(PLATE_PATTERN.test('ȘB12')).toBe(true);
    expect(PLATE_PATTERN.test('TM54ATM!')).toBe(false);
    expect(PLATE_PATTERN.test('')).toBe(false);
  });
});

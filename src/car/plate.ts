/**
 * Plates are stored as plain upper-case letters and digits ("TM54ATM"), whatever spacing
 * people type ("tm 54-atm"), so the same plate always reads and matches the same.
 */
export const normalizePlate = (value: string) =>
  value.replace(/[\s-]/g, '').toUpperCase();

/** Letters (diacritics included) and digits only */
export const PLATE_PATTERN = /^[\p{L}\d]+$/u;

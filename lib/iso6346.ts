/** ISO 6346 container number: 4-letter owner+category, 6-digit serial, 1 check digit. */

const LETTER_VALUES: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  let value = 10;
  for (let i = 0; i < 26; i += 1) {
    if (value % 11 === 0) value += 1;
    map[String.fromCharCode(65 + i)] = value;
    value += 1;
  }
  return map;
})();

export function normalizeContainerNumber(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, "");
}

export function isContainerNumberShape(raw: string): boolean {
  return /^[A-Z]{3}[UJZ]\d{7}$/.test(normalizeContainerNumber(raw));
}

export function checkDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    const ch = body[i];
    const n = /[A-Z]/.test(ch) ? LETTER_VALUES[ch] : Number(ch);
    sum += n * 2 ** i;
  }
  const remainder = sum % 11;
  return remainder === 10 ? 0 : remainder;
}

export function isValidContainerNumber(raw: string): boolean {
  const value = normalizeContainerNumber(raw);
  if (!isContainerNumberShape(value)) return false;
  return checkDigit(value.slice(0, 10)) === Number(value[10]);
}

export function parseContainerNumber(raw: string): {
  number: string;
  ownerCode: string;
  category: string;
  serial: string;
  check: string;
  validCheckDigit: boolean;
} | null {
  const number = normalizeContainerNumber(raw);
  if (!isContainerNumberShape(number)) return null;
  return {
    number,
    ownerCode: number.slice(0, 3),
    category: number[3],
    serial: number.slice(4, 10),
    check: number[10],
    validCheckDigit: checkDigit(number.slice(0, 10)) === Number(number[10]),
  };
}

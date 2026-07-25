/** Flexible JSON field parsers matching iOS `KeyedDecodingContainer` helpers. */

export function asFlexibleString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return undefined;
}

export function asFlexibleInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string') {
    const int = Number.parseInt(value, 10);
    if (!Number.isNaN(int)) return int;
    const double = Number.parseFloat(value);
    if (!Number.isNaN(double)) return Math.trunc(double);
  }
  return undefined;
}

export function requireFlexibleInt(value: unknown, field: string): number {
  const parsed = asFlexibleInt(value);
  if (parsed === undefined) {
    throw new Error(`Expected Int-compatible value for ${field}`);
  }
  return parsed;
}

export function asFlexibleDouble(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const double = Number.parseFloat(value);
    if (!Number.isNaN(double)) return double;
  }
  return undefined;
}

export function requireFlexibleDouble(value: unknown, field: string): number {
  const parsed = asFlexibleDouble(value);
  if (parsed === undefined) {
    throw new Error(`Expected Double-compatible value for ${field}`);
  }
  return parsed;
}

export function asFlexibleBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    switch (value.toLowerCase()) {
      case '1':
      case 'true':
      case 'yes':
      case 'y':
        return true;
      case '0':
      case 'false':
      case 'no':
      case 'n':
        return false;
      default:
        return undefined;
    }
  }
  return undefined;
}

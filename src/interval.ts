export interface Interval {
  min: number;
  max: number;
}

export function interval(min: number, max: number): Interval {
  return { min, max };
}

export function intervalContains(i: Interval, x: number): boolean {
  return i.min <= x && x <= i.max;
}

export function intervalSurrounds(i: Interval, x: number): boolean {
  return i.min < x && x < i.max;
}

export function intervalClamp(i: Interval, x: number): number {
  if (x < i.min) return i.min;
  if (x > i.max) return i.max;
  return x;
}

export const INTERVAL_EMPTY: Interval = { min: Infinity, max: -Infinity };
export const INTERVAL_UNIVERSE: Interval = { min: -Infinity, max: Infinity };

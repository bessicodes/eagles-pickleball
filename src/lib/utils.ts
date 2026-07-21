// =====================================================================
//  Small utilities: className merge, currency, avatars, haptics.
// =====================================================================

/** Tiny className joiner (no clsx dependency). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** 5500 -> "R55". Keeps cents only when needed. */
export function zar(cents: number): string {
  const rand = cents / 100;
  return Number.isInteger(rand) ? `R${rand}` : `R${rand.toFixed(2)}`;
}

/** Deterministic hash from a string (for stable avatar gradients). */
export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Two-stop gradient derived from an id — used for letter avatars. */
export function avatarGradient(id: string): string {
  const h = hash(id);
  const a = h % 360;
  const b = (a + 40 + (h % 60)) % 360;
  return `linear-gradient(135deg, hsl(${a} 70% 45%), hsl(${b} 75% 30%))`;
}

/** Initials from a display name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Fire device haptics when supported (Android / some browsers). Safe no-op elsewhere. */
export function haptic(pattern: number | number[] = 10): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

/** Random int in [min, max]. */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a random element. */
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** "2m ago" style relative time. */
export function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

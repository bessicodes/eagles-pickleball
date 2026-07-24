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

/** Deterministic hash from a string (for stable avatar accents). */
export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Curated accent palette — intentional, not random rainbow. */
export const ACCENTS = [
  '#D6FF00', // lime
  '#8A5CFF', // violet
  '#22D3EE', // cyan
  '#FB7185', // rose
  '#F59E0B', // amber
  '#34D399', // emerald
  '#60A5FA', // blue
  '#F472B6', // pink
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function withAlpha(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Stable accent for a player (their choice, else a deterministic palette pick). */
export function accentFor(seed: string, chosen?: string | null): string {
  return chosen || ACCENTS[hash(seed) % ACCENTS.length];
}

/** Dark monogram tile tinted with the accent — clean, real, not template-y. */
export function monogramBg(accent: string): string {
  return `radial-gradient(120% 120% at 28% 20%, ${withAlpha(accent, 0.42)}, #17171b 68%)`;
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

/**
 * Turn an uploaded image File into a small, centre-cropped square data URL.
 * Downscaling is essential: raw phone photos would blow the localStorage
 * quota and break persistence. Output is ~30–80 KB JPEG.
 */
export function fileToSquareDataUrl(file: File, size = 400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Not an image'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = (img.naturalHeight - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas unsupported'));
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (e) {
        reject(e as Error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

// ── Player tiers (level system based on all-time points) ─────────────
export interface Tier {
  name: string;
  min: number;
  color: string;
}
const TIERS: Tier[] = [
  { name: 'Rookie', min: 0, color: '#9CA3AF' },
  { name: 'Contender', min: 25, color: '#34D399' },
  { name: 'Challenger', min: 75, color: '#22D3EE' },
  { name: 'Pro', min: 150, color: '#8A5CFF' },
  { name: 'Elite', min: 300, color: '#D6FF00' },
];

export function tierFor(points: number): {
  name: string;
  color: string;
  min: number;
  next: Tier | null;
  progress: number;
  toNext: number;
} {
  let current = TIERS[0];
  let next: Tier | null = TIERS[1] ?? null;
  for (let i = 0; i < TIERS.length; i++) {
    if (points >= TIERS[i].min) {
      current = TIERS[i];
      next = TIERS[i + 1] ?? null;
    }
  }
  const ceil = next ? next.min : current.min;
  const progress = next ? Math.min(1, (points - current.min) / (ceil - current.min)) : 1;
  return { name: current.name, color: current.color, min: current.min, next, progress, toNext: next ? next.min - points : 0 };
}

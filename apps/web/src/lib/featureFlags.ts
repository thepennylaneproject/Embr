/**
 * Build-time feature gates (`NEXT_PUBLIC_*` are inlined at compile time).
 *
 * Music phase-2: discovery, nav entry, and composer integration. In production,
 * off unless `NEXT_PUBLIC_FEATURE_MUSIC_PHASE2` is `true` or `1`. In development,
 * on by default so local work does not require the variable.
 */
export function isMusicPhase2Enabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_FEATURE_MUSIC_PHASE2;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return process.env.NODE_ENV !== 'production';
}

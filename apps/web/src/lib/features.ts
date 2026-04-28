export const FEATURE_FLAGS = {
  music:
    process.env.NEXT_PUBLIC_ENABLE_MUSIC === 'true' ||
    process.env.NEXT_PUBLIC_ENABLE_MUSIC === '1',
} as const;

export function isMusicEnabled(): boolean {
  return FEATURE_FLAGS.music;
}

export function isMusicPath(pathname: string): boolean {
  return pathname === '/music' || pathname.startsWith('/music/');
}

import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string | null;
  size?: number;
  className?: string;
}

function initialsFromName(name?: string | null) {
  if (!name) return 'E';
  const pieces = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return pieces.map((piece) => piece[0]?.toUpperCase()).join('') || 'E';
}

export function Avatar({ src, alt, name, size = 36, className }: AvatarProps) {
  const style: CSSProperties = { width: size, height: size, fontSize: Math.max(12, size * 0.35) };

  return (
    <span className={cn('ui-avatar', className)} style={style} aria-label={alt || name || 'User avatar'}>
      {src ? <img src={src} alt={alt || name || 'Avatar'} /> : initialsFromName(name)}
    </span>
  );
}

import type { CSSProperties } from 'react';
import { useState } from 'react';
import Image from 'next/image';
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
  const [imageError, setImageError] = useState(false);
  const style: CSSProperties = { width: size, height: size, fontSize: Math.max(12, size * 0.35) };
  const isData = typeof src === 'string' && src.startsWith('data:');

  return (
    <span
      className={cn('ui-avatar relative inline-flex shrink-0', className)}
      style={style}
      aria-label={alt || name || 'User avatar'}
    >
      {src && !imageError ? (
        <Image
          src={src}
          alt={alt || name || 'Avatar'}
          fill
          className="object-cover"
          sizes={`${size}px`}
          unoptimized={isData}
          onError={() => setImageError(true)}
        />
      ) : (
        initialsFromName(name)
      )}
    </span>
  );
}

import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '@/lib/cn';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
}

export function Card({ padding = 'md', className, children, ...props }: PropsWithChildren<CardProps>) {
  return (
    <div className={cn('ui-card', className)} data-padding={padding} {...props}>
      {children}
    </div>
  );
}

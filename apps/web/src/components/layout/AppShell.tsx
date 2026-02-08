import Link from 'next/link';
import { PropsWithChildren } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, Button } from '@/components/ui';
import type { CSSProperties } from 'react';

const navItems = [
  { href: '/feed', label: 'Feed' },
  { href: '/messages', label: 'Messages' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/profile', label: 'Profile' },
];

interface AppShellProps {
  title?: string;
  subtitle?: string;
  accent?: 'warm1' | 'warm2' | 'sun' | 'seaGlass';
}

const accentMap = {
  warm1: 'var(--embr-warm-1)',
  warm2: 'var(--embr-warm-2)',
  sun: 'var(--embr-sun)',
  seaGlass: 'var(--embr-sea-glass)',
};

export function AppShell({ title, subtitle, accent = 'warm1', children }: PropsWithChildren<AppShellProps>) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const shellStyle = { ['--embr-accent' as '--embr-accent']: accentMap[accent] } as CSSProperties;

  return (
    <div className="embr-shell" style={shellStyle}>
      <header className="embr-header">
        <div className="embr-container embr-header-row">
          <Link href="/feed" className="embr-brand" aria-label="Embr home">
            <span className="embr-brand-dot" aria-hidden="true" />
            <span>Embr</span>
          </Link>

          <nav className="embr-main-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="embr-nav-link"
                data-active={router.pathname === item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Avatar
              src={user?.profile?.avatarUrl}
              name={user?.profile?.displayName || user?.username || 'User'}
              size={34}
            />
            <Button type="button" variant="ghost" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="embr-content">
        <div className="embr-container">
          {title ? <h1 className="ui-page-title">{title}</h1> : null}
          {subtitle ? <p className="ui-page-subtitle">{subtitle}</p> : null}
          <div style={{ marginTop: title ? '1.2rem' : 0 }}>{children}</div>
        </div>
      </main>
    </div>
  );
}

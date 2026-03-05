'use client';

import Link from 'next/link';
import { PropsWithChildren, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@embr/ui';
import type { CSSProperties } from 'react';

const navItems = [
  { href: '/feed', label: 'Feed' },
  { href: '/discover', label: 'Discover' },
  { href: '/create', label: 'Create' },
  { href: '/groups', label: 'Groups' },
  { href: '/events', label: 'Events' },
  { href: '/mutual-aid', label: 'Mutual Aid' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/music', label: 'Music' },
  { href: '/gigs', label: 'Gigs' },
  { href: '/earnings', label: 'Earnings' },
  { href: '/messages', label: 'Messages' },
  { href: '/profile', label: 'Profile' },
];

const quickCreateItems = [
  { href: '/events/create', label: 'Host Event' },
  { href: '/groups/create', label: 'Create Group' },
  { href: '/marketplace/sell', label: 'Sell' },
];

export interface AppShellProps {
  title?: string;
  subtitle?: string;
  accent?: 'warm1' | 'warm2' | 'sun' | 'seaGlass';
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

const accentMap = {
  warm1: 'var(--embr-warm-1)',
  warm2: 'var(--embr-warm-2)',
  sun: 'var(--embr-sun)',
  seaGlass: 'var(--embr-sea-glass)',
};

export function AppShell({
  title: _title,
  subtitle: _subtitle,
  accent = 'warm1',
  breadcrumbs: _breadcrumbs,
  children,
}: PropsWithChildren<AppShellProps>) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const shellStyle = { ['--embr-accent' as '--embr-accent']: accentMap[accent] } as CSSProperties;

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [router.pathname]);

  const isNavActive = (href: string) => {
    return router.pathname === href || router.pathname.startsWith(href + '/');
  };

  return (
    <div className="embr-shell" style={shellStyle}>
      <header className="embr-header">
        <div className="embr-container embr-header-row">
          <Link href="/feed" className="embr-brand" aria-label="Embr home">
            <span className="embr-brand-dot" aria-hidden="true" />
            <span className="embr-brand-text">Embr</span>
          </Link>

          {/* Mobile menu button */}
          <button
            className="embr-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          {/* Main navigation */}
          <nav
            className="embr-main-nav"
            aria-label="Primary navigation"
            data-mobile-open={mobileMenuOpen}
          >
            {navItems.map((item) => {
              const isActive = isNavActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="embr-nav-link"
                  data-active={isActive}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User menu */}
          <div className="embr-user-menu" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {quickCreateItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--embr-radius-md)',
                    border: '1px solid var(--embr-border)',
                    color: 'var(--embr-muted-text)',
                    fontSize: '0.72rem',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <button
              className="embr-user-button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-label="User menu"
              aria-expanded={userMenuOpen}
            >
              <Avatar
                src={user?.profile?.avatarUrl}
                name={user?.profile?.displayName || user?.username || 'User'}
                size={34}
              />
            </button>

            {/* Dropdown menu */}
            {userMenuOpen && (
              <div className="embr-user-dropdown">
                <div className="embr-dropdown-item">
                  <div className="embr-user-name">{user?.profile?.displayName || user?.username}</div>
                  <div className="embr-user-handle">@{user?.username}</div>
                </div>
                <hr className="embr-dropdown-divider" />
                <Link href="/profile" className="embr-dropdown-item embr-dropdown-link">
                  View Profile
                </Link>
                <Link href="/profile/edit" className="embr-dropdown-item embr-dropdown-link">
                  Edit Profile
                </Link>
                <Link href="/settings" className="embr-dropdown-item embr-dropdown-link">
                  Settings
                </Link>
                <hr className="embr-dropdown-divider" />
                <button
                  onClick={logout}
                  className="embr-dropdown-item embr-dropdown-button embr-dropdown-danger"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="embr-content">
        <div className="embr-container">
          {children}
        </div>
      </main>
    </div>
  );
}

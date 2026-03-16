'use client';

import Link from 'next/link';
import { PropsWithChildren, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@embr/ui';
import type { CSSProperties } from 'react';
import { copy } from '@/lib/copy';

const navItems = [
  { href: '/feed', label: copy.nav.feed },
  { href: '/discover', label: copy.nav.discover },
  { href: '/create', label: copy.nav.create },
  { href: '/groups', label: copy.nav.groups },
  { href: '/events', label: copy.nav.events },
  { href: '/mutual-aid', label: copy.nav.mutualAid },
  { href: '/marketplace', label: copy.nav.marketplace },
  { href: '/music', label: copy.nav.music },
  { href: '/gigs', label: copy.nav.gigs },
  { href: '/earnings', label: copy.nav.earnings },
  { href: '/messages', label: copy.nav.messages },
  { href: '/profile', label: copy.nav.profile },
];

const quickCreateItems = [
  { href: '/events/create', label: copy.nav.quickCreate.hostEvent },
  { href: '/groups/create', label: copy.nav.quickCreate.createGroup },
  { href: '/marketplace/sell', label: copy.nav.quickCreate.sell },
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
          <Link href="/feed" className="embr-brand" aria-label={copy.brand.ariaLabel}>
            <span className="embr-brand-dot" aria-hidden="true" />
            <span className="embr-brand-text">Embr</span>
          </Link>

          {/* Mobile menu button */}
          <button
            className="embr-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={copy.nav.toggleMenu}
            aria-expanded={mobileMenuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          {/* Main navigation */}
          <nav
            className="embr-main-nav"
            aria-label={copy.nav.primaryNav}
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
              aria-label={copy.nav.userMenu}
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
                  {copy.profile.editProfile}
                </Link>
                <Link href="/settings" className="embr-dropdown-item embr-dropdown-link">
                  {copy.nav.settings}
                </Link>
                <hr className="embr-dropdown-divider" />
                <button
                  onClick={logout}
                  className="embr-dropdown-item embr-dropdown-button embr-dropdown-danger"
                >
                  {copy.nav.signOut}
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

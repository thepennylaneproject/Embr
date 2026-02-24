'use client';

import Link from 'next/link';
import { PropsWithChildren, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, Button } from '@/components/ui';
import type { CSSProperties } from 'react';

const navItems = [
  { href: '/feed', label: 'Feed' },
  { href: '/create', label: 'Create' },
  { href: '/messages', label: 'Messages' },
  { href: '/music', label: 'Music' },
  { href: '/gigs', label: 'Gigs' },
  { href: '/wallet', label: 'Wallet' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/profile', label: 'Profile' },
];

interface AppShellProps {
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
  title,
  subtitle,
  accent = 'warm1',
  breadcrumbs,
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
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="embr-nav-link"
                data-active={isNavActive(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <div className="embr-user-menu">
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

      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="embr-breadcrumbs">
          <div className="embr-container">
            <nav aria-label="Breadcrumb" className="embr-breadcrumb-nav">
              {breadcrumbs.map((item, index) => (
                <div key={index} className="embr-breadcrumb-item">
                  {item.href ? (
                    <>
                      <Link href={item.href} className="embr-breadcrumb-link">
                        {item.label}
                      </Link>
                      {index < breadcrumbs.length - 1 && (
                        <span className="embr-breadcrumb-separator">/</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="embr-breadcrumb-current">{item.label}</span>
                    </>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

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

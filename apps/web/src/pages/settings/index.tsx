import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ProtectedPageShell } from '@/components/layout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@embr/ui';
import { usersApi, UpdateSettingsPayload } from '@/lib/api/users';
import { copy } from '@/lib/copy';

// ─── Toggle ──────────────────────────────────────────────────────────────────

interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ id, checked, onChange, disabled }) => (
  <label
    htmlFor={id}
    style={{
      position: 'relative',
      display: 'inline-block',
      width: '44px',
      height: '24px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      flexShrink: 0,
    }}
  >
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => !disabled && onChange(e.target.checked)}
      disabled={disabled}
      style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
    />
    <span
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '12px',
        backgroundColor: checked ? 'var(--embr-accent)' : 'var(--embr-neutral-300)',
        transition: 'background-color 0.2s',
      }}
    />
    <span
      style={{
        position: 'absolute',
        top: '3px',
        left: checked ? '23px' : '3px',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        backgroundColor: '#fff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}
    />
  </label>
);

// ─── SettingRow ───────────────────────────────────────────────────────────────

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({ label, description, children }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1.5rem',
      padding: '1rem 0',
      borderBottom: '1px solid var(--embr-border)',
    }}
  >
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--embr-text)' }}>{label}</div>
      {description && (
        <div style={{ fontSize: '0.82rem', color: 'var(--embr-muted-text)', marginTop: '0.2rem' }}>
          {description}
        </div>
      )}
    </div>
    {children}
  </div>
);

// ─── SectionCard ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, children }) => (
  <div className="ui-card" data-padding="lg">
    <h2
      style={{
        margin: '0 0 0.25rem',
        fontSize: '1rem',
        fontWeight: '700',
        color: 'var(--embr-text)',
        letterSpacing: '-0.01em',
      }}
    >
      {title}
    </h2>
    <div>{children}</div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const profile = user.profile;

  // ── Auto-save a settings field ────────────────────────────────────────────

  const saveSetting = async (field: keyof UpdateSettingsPayload, value: boolean | string) => {
    setSaving(field);
    try {
      const updated = await usersApi.updateSettings({ [field]: value });
      updateUser({ ...user, profile: { ...profile, ...updated } });
      showToast({ title: copy.settings.saved, kind: 'info' });
    } catch {
      showToast({ title: copy.settings.couldNotSave, description: copy.settings.couldNotSaveDesc, kind: 'error' });
    } finally {
      setSaving(null);
    }
  };

  // ── Avatar upload ─────────────────────────────────────────────────────────

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setSaving('avatar');

    try {
      const updated = await usersApi.updateAvatar(file);
      updateUser({ ...user, profile: { ...profile, ...updated } });
      showToast({ title: copy.success.profilePhotoUpdated, kind: 'info' });
    } catch {
      setAvatarPreview(null);
      showToast({ title: copy.settings.uploadFailed, description: copy.settings.uploadFailedDesc, kind: 'error' });
    } finally {
      setSaving(null);
    }
  };

  // ── Account deletion ──────────────────────────────────────────────────────

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== user.username) return;
    setDeleting(true);
    try {
      await usersApi.deleteAccount();
      router.push('/auth/login');
    } catch {
      showToast({ title: copy.settings.deletionFailed, description: copy.settings.deletionFailedDesc, kind: 'error' });
      setDeleting(false);
    }
  };

  const avatarUrl = avatarPreview || profile.avatarUrl;
  const avatarInitial = (profile.displayName || user.username || '?')[0].toUpperCase();

  return (
    <ProtectedPageShell>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Page title */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 0.25rem', fontWeight: '700', fontSize: '1.5rem' }}>{copy.settings.title}</h1>
          <p style={{ margin: 0, color: 'var(--embr-muted-text)', fontSize: '0.95rem' }}>
            Manage your account, privacy, and notification preferences.
          </p>
        </div>

        <div style={{ display: 'grid', gap: '1.25rem' }}>

          {/* ── Account ─────────────────────────────────────────────── */}
          <SectionCard title={copy.settings.account}>
            {/* Avatar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 0',
                borderBottom: '1px solid var(--embr-border)',
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => avatarInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); avatarInputRef.current?.click(); } }}
                aria-label="Change profile photo"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '2px solid var(--embr-border)',
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'var(--embr-neutral-300)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '1.4rem',
                      color: '#fff',
                    }}
                  >
                    {avatarInitial}
                  </div>
                )}
                {saving === 'avatar' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        border: '2px solid #fff',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                  </div>
                )}
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              <div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  style={{
                    padding: '0.4rem 0.9rem',
                    borderRadius: 'var(--embr-radius-md)',
                    border: '1px solid var(--embr-border)',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: 'var(--embr-text)',
                  }}
                >
                  Change photo
                </button>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: 'var(--embr-muted-text)' }}>
                  JPG or PNG, max 5 MB
                </p>
              </div>
            </div>

            {/* Email */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.9rem 0',
                borderBottom: '1px solid var(--embr-border)',
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--embr-text)' }}>Email</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--embr-muted-text)' }}>{user.email}</div>
            </div>

            {/* Username */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.9rem 0',
                borderBottom: '1px solid var(--embr-border)',
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--embr-text)' }}>Username</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--embr-muted-text)' }}>@{user.username}</div>
            </div>

            {/* Edit profile link */}
            <div style={{ paddingTop: '0.9rem' }}>
              <Link
                href="/profile/edit"
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--embr-accent)',
                  fontWeight: '600',
                  textDecoration: 'none',
                }}
              >
                Edit display name, bio & links →
              </Link>
            </div>
          </SectionCard>

          {/* ── Privacy & Monetization ───────────────────────────────── */}
          <SectionCard title={copy.settings.privacyMonetization}>
            <SettingRow
              label={copy.settings.privateAccount}
              description={copy.settings.privateAccountDesc}
            >
              <Toggle
                id="isPrivate"
                checked={profile.isPrivate}
                onChange={(v) => saveSetting('isPrivate', v)}
                disabled={saving === 'isPrivate'}
              />
            </SettingRow>

            <SettingRow
              label={copy.personas.creatorMode}
              description={copy.personas.creatorModeDesc}
            >
              <Toggle
                id="isCreator"
                checked={profile.isCreator}
                onChange={(v) => saveSetting('isCreator', v)}
                disabled={saving === 'isCreator'}
              />
            </SettingRow>

            <SettingRow
              label={copy.settings.allowTips}
              description={copy.settings.allowTipsDesc}
            >
              <Toggle
                id="allowTips"
                checked={profile.allowTips}
                onChange={(v) => saveSetting('allowTips', v)}
                disabled={saving === 'allowTips'}
              />
            </SettingRow>
          </SectionCard>

          {/* ── Notifications ────────────────────────────────────────── */}
          <SectionCard title={copy.settings.notifications}>
            <SettingRow
              label={copy.settings.emailNotifications}
              description={copy.settings.emailNotificationsDesc}
            >
              <Toggle
                id="emailNotifications"
                checked={profile.emailNotifications}
                onChange={(v) => saveSetting('emailNotifications', v)}
                disabled={saving === 'emailNotifications'}
              />
            </SettingRow>

            <SettingRow
              label={copy.settings.pushNotifications}
              description={copy.settings.pushNotificationsDesc}
            >
              <Toggle
                id="pushNotifications"
                checked={profile.pushNotifications}
                onChange={(v) => saveSetting('pushNotifications', v)}
                disabled={saving === 'pushNotifications'}
              />
            </SettingRow>

            {/* Notification level */}
            <div style={{ padding: '1rem 0' }}>
              <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--embr-text)' }}>
                Notification level
              </div>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {(['all', 'mentions', 'none'] as const).map((level) => {
                  const isActive = profile.notificationPreference === level;
                  return (
                    <label
                      key={level}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        borderRadius: 'var(--embr-radius-md)',
                        border: `2px solid ${isActive ? 'var(--embr-accent)' : 'var(--embr-border)'}`,
                        background: isActive ? 'color-mix(in srgb, var(--embr-accent) 6%, white)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="radio"
                        name="notificationPreference"
                        value={level}
                        checked={isActive}
                        onChange={() => saveSetting('notificationPreference', level)}
                        disabled={saving === 'notificationPreference'}
                        style={{ marginTop: '2px', accentColor: 'var(--embr-accent)' }}
                      />
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.88rem' }}>{copy.settings.notificationLevel[level].label}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--embr-muted-text)', marginTop: '0.1rem' }}>
                          {copy.settings.notificationLevel[level].desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </SectionCard>

          {/* ── Danger Zone ──────────────────────────────────────────── */}
          <div
            className="ui-card"
            data-padding="lg"
            style={{ borderColor: 'var(--embr-error)', borderWidth: '1px' }}
          >
            <h2
              style={{
                margin: '0 0 0.25rem',
                fontSize: '1rem',
                fontWeight: '700',
                color: 'var(--embr-error)',
              }}
            >
              {copy.settings.dangerZone}
            </h2>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--embr-muted-text)' }}>
              These actions are permanent and cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{
                padding: '0.5rem 1.1rem',
                borderRadius: 'var(--embr-radius-md)',
                border: '1px solid var(--embr-error)',
                background: 'none',
                color: 'var(--embr-error)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--embr-error) 8%, white)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              {copy.settings.deleteAccount}
            </button>
          </div>

        </div>
      </div>

      {/* ── Delete Confirmation Modal ──────────────────────────────── */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
        >
          <div
            className="ui-card"
            data-padding="lg"
            style={{ width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
          >
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: '700', color: 'var(--embr-error)' }}>
              {copy.settings.deleteAccount}
            </h2>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: 'var(--embr-muted-text)' }}>
              This will permanently delete your account, posts, followers, and all associated data.
              This cannot be undone.
            </p>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: '600', color: 'var(--embr-text)' }}>
              Type <strong>@{user.username}</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={user.username}
              className="ui-field"
              style={{ width: '100%', marginBottom: '1rem', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--embr-radius-md)',
                  border: '1px solid var(--embr-border)',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                }}
              >
                {copy.actions.cancel}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== user.username || deleting}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--embr-radius-md)',
                  border: 'none',
                  background: deleteConfirmText === user.username ? 'var(--embr-error)' : 'var(--embr-neutral-300)',
                  color: '#fff',
                  cursor: deleteConfirmText === user.username ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'background 0.15s',
                }}
              >
                {deleting ? copy.settings.deleting : copy.settings.deletePermanently}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </ProtectedPageShell>
  );
}

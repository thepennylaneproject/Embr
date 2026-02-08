import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { authApi } from '@/lib/api/auth';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { getApiErrorMessage } from '@/lib/api/error';
import { Button, Card, Input, PageState } from '@/components/ui';

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!token) {
      nextErrors.general = 'Reset token is missing.';
    }

    if (formData.newPassword.length < 8) {
      nextErrors.newPassword = 'Password must be at least 8 characters.';
    }

    if (formData.newPassword !== formData.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(token, formData.newPassword);
      setSuccess(true);
      window.setTimeout(() => {
        router.push('/auth/login');
      }, 2200);
    } catch (err: any) {
      setErrors({ general: getApiErrorMessage(err, 'Failed to reset password.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <main className="embr-page" style={{ display: 'grid', placeItems: 'center', padding: '1rem' }}>
        <Card padding="lg" style={{ width: 'min(460px, 100%)' }}>
          {success ? (
            <PageState title="Password reset" description="Your password was updated. Redirecting to sign in." />
          ) : (
            <>
              <h1 className="ui-page-title" style={{ marginBottom: '0.4rem' }}>
                Set a new password
              </h1>
              <p className="ui-page-subtitle" style={{ marginBottom: '1rem' }}>
                Choose a secure password for your Embr account.
              </p>

              {!token && (
                <PageState
                  title="Missing reset token"
                  description="Open the password reset link from your email again."
                />
              )}

              {token ? (
                <form onSubmit={handleSubmit} noValidate>
                  <div style={{ display: 'grid', gap: '0.9rem' }}>
                    <Input
                      id="newPassword"
                      label="New password"
                      type="password"
                      required
                      autoComplete="new-password"
                      error={errors.newPassword}
                      value={formData.newPassword}
                      onChange={(event) => setFormData((prev) => ({ ...prev, newPassword: event.target.value }))}
                    />
                    <Input
                      id="confirmPassword"
                      label="Confirm password"
                      type="password"
                      required
                      autoComplete="new-password"
                      error={errors.confirmPassword}
                      value={formData.confirmPassword}
                      onChange={(event) => setFormData((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                    />
                    {errors.general ? <p className="ui-error-text">{errors.general}</p> : null}
                    <Button type="submit" disabled={loading} fullWidth>
                      {loading ? 'Resetting...' : 'Reset password'}
                    </Button>
                  </div>
                </form>
              ) : null}
            </>
          )}

          <p style={{ marginTop: '1rem' }}>
            <Link href="/auth/login" style={{ color: 'var(--embr-muted-text)', textDecoration: 'underline' }}>
              Back to sign in
            </Link>
          </p>
        </Card>
      </main>
    </ProtectedRoute>
  );
}

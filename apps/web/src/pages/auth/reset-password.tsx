import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { authApi } from '@/lib/api/auth';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import AuthShell from '@/components/auth/AuthShell';
import { getApiErrorMessage } from '@/lib/api/error';
import { copy } from '@/lib/copy';
import { Button, Card, Input, PageState } from '@embr/ui';

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
      nextErrors.general = copy.errors.notFound;
    }

    if (formData.newPassword.length < 8) {
      nextErrors.newPassword = copy.errors.passwordTooShort;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      nextErrors.confirmPassword = copy.errors.passwordMismatch;
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
      setErrors({ general: getApiErrorMessage(err, copy.errors.generic) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <Head>
        <title>{copy.brand.pageTitle(copy.onboarding.resetPassword)}</title>
      </Head>
      <AuthShell backHref="/auth/login">
        <Card padding="lg" style={{ width: 'min(460px, 100%)' }}>
          {success ? (
            <PageState
              title={copy.onboarding.passwordReset}
              description={copy.onboarding.passwordResetSuccess}
            />
          ) : (
            <>
              <h1 className="ui-page-title" style={{ marginBottom: '0.4rem' }}>
                {copy.onboarding.setNewPassword}
              </h1>
              <p className="ui-page-subtitle" style={{ marginBottom: '1rem' }}>
                {copy.onboarding.setNewPasswordSubtitle}
              </p>

              {!token && (
                <PageState
                  title={copy.onboarding.missingResetToken}
                  description={copy.onboarding.missingResetTokenDesc}
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
                      {loading ? copy.onboarding.resetting : copy.onboarding.resetPassword}
                    </Button>
                  </div>
                </form>
              ) : null}
            </>
          )}

          <p style={{ marginTop: '1rem' }}>
            <Link href="/auth/login" style={{ color: 'var(--embr-muted-text)', textDecoration: 'underline' }}>
              {copy.onboarding.backToSignIn}
            </Link>
          </p>
        </Card>
      </AuthShell>
    </ProtectedRoute>
  );
}

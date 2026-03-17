import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { authApi } from '@/lib/api/auth';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import AuthShell from '@/components/auth/AuthShell';
import { getApiErrorMessage } from '@/lib/api/error';
import { Button, Card, Input, PageState } from '@embr/ui';
import { copy } from '@/lib/copy';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(getApiErrorMessage(err, copy.errors.resetEmailFailed));
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
              title={copy.onboarding.checkEmail}
              description={copy.onboarding.checkEmailDescription(email)}
            />
          ) : (
            <>
              <h1 className="ui-page-title" style={{ marginBottom: '0.4rem' }}>
                {copy.onboarding.resetPassword}
              </h1>
              <p className="ui-page-subtitle" style={{ marginBottom: '1rem' }}>
                {copy.onboarding.resetPasswordSubtitle}
              </p>

              <form onSubmit={handleSubmit} noValidate>
                <Input
                  id="email"
                  label="Email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                {error ? <p className="ui-error-text">{error}</p> : null}
                <div style={{ marginTop: '0.8rem' }}>
                  <Button type="submit" fullWidth disabled={loading}>
                    {loading ? copy.onboarding.sending : copy.onboarding.sendResetLink}
                  </Button>
                </div>
              </form>
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

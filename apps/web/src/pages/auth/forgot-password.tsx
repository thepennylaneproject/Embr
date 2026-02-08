import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { getApiErrorMessage } from '@/lib/api/error';
import { Button, Card, Input, PageState } from '@/components/ui';

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
      setError(getApiErrorMessage(err, 'Failed to send reset email.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <main className="embr-page" style={{ display: 'grid', placeItems: 'center', padding: '1rem' }}>
        <Card padding="lg" style={{ width: 'min(460px, 100%)' }}>
          {success ? (
            <PageState
              title="Check your email"
              description={`If an account exists for ${email}, a reset link has been sent.`}
            />
          ) : (
            <>
              <h1 className="ui-page-title" style={{ marginBottom: '0.4rem' }}>
                Reset password
              </h1>
              <p className="ui-page-subtitle" style={{ marginBottom: '1rem' }}>
                Enter your email and we will send a secure reset link.
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
                    {loading ? 'Sending...' : 'Send reset link'}
                  </Button>
                </div>
              </form>
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

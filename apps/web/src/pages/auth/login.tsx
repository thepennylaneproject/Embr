import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { getApiErrorMessage } from '@/lib/api/error';
import { Button, Card, Input } from '@embr/ui';
import { copy } from '@/lib/copy';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      const nextPath = typeof router.query.next === 'string' ? router.query.next : '/feed';
      await router.push(nextPath);
    } catch (err: any) {
      setError(getApiErrorMessage(err, copy.errors.invalidCredentials));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requireAuth={false} redirectAuthenticated={false}>
      <Head>
        <title>{copy.brand.pageTitle(copy.onboarding.signInTitle)}</title>
      </Head>
      <main className="embr-page" style={{ display: 'grid', placeItems: 'center', padding: '1rem' }}>
        <Card padding="lg" style={{ width: 'min(460px, 100%)' }}>
          <h1 className="ui-page-title" style={{ marginBottom: '0.3rem' }}>
            {copy.onboarding.signInTitle}
          </h1>
          <p className="ui-page-subtitle" style={{ marginBottom: '1rem' }}>
            {copy.onboarding.signInSubtitle}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'grid', gap: '0.95rem' }}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                label="Email"
                value={formData.email}
                onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
              />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                label="Password"
                value={formData.password}
                onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
              />
              {error ? <p className="ui-error-text">{error}</p> : null}
              <Button type="submit" disabled={loading} fullWidth>
                {loading ? copy.onboarding.signingIn : copy.onboarding.signIn}
              </Button>
            </div>
          </form>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/auth/forgot-password" style={{ color: 'var(--embr-muted-text)', textDecoration: 'underline' }}>
              {copy.onboarding.forgotPassword}
            </Link>
            <Link href="/auth/signup" style={{ color: 'var(--embr-muted-text)', textDecoration: 'underline' }}>
              {copy.onboarding.needAccount}
            </Link>
          </div>
        </Card>
      </main>
    </ProtectedRoute>
  );
}

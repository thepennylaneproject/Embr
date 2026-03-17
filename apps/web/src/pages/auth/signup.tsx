import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import AuthShell from '@/components/auth/AuthShell';
import { getApiErrorMessage } from '@/lib/api/error';
import { Button, Card, Input } from '@embr/ui';
import { copy } from '@/lib/copy';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (formData.username.trim().length < 3) {
      nextErrors.username = copy.errors.usernameTooShort;
    }

    if (formData.password.length < 8) {
      nextErrors.password = copy.errors.passwordTooShort;
    }

    if (formData.password !== formData.confirmPassword) {
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
      await signup(formData.email, formData.username, formData.password, formData.fullName || undefined);
      await router.push('/feed');
    } catch (err: any) {
      setErrors({ general: getApiErrorMessage(err, copy.errors.signupFailed) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requireAuth={false} redirectAuthenticated={false}>
      <Head>
        <title>{copy.brand.pageTitle(copy.onboarding.createAccountTitle)}</title>
      </Head>
      <AuthShell backHref="/auth/login">
        <Card padding="lg" style={{ width: 'min(520px, 100%)' }}>
          <h1 className="ui-page-title" style={{ marginBottom: '0.3rem' }}>
            {copy.onboarding.createAccountTitle}
          </h1>
          <p className="ui-page-subtitle" style={{ marginBottom: '1rem' }}>
            {copy.onboarding.createAccountSubtitle}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'grid', gap: '0.95rem' }}>
              <Input
                id="email"
                label="Email"
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
              />
              <Input
                id="username"
                label="Username"
                type="text"
                required
                autoComplete="username"
                error={errors.username}
                value={formData.username}
                onChange={(event) => setFormData((prev) => ({ ...prev, username: event.target.value }))}
              />
              <Input
                id="fullName"
                label="Full name"
                type="text"
                autoComplete="name"
                value={formData.fullName}
                onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
              />
              <Input
                id="password"
                label="Password"
                type="password"
                required
                autoComplete="new-password"
                error={errors.password}
                value={formData.password}
                onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
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
                {loading ? copy.onboarding.creatingAccount : copy.onboarding.createAccount}
              </Button>
            </div>
          </form>

          <p style={{ marginTop: '1rem' }}>
            <Link href="/auth/login" style={{ color: 'var(--embr-muted-text)', textDecoration: 'underline' }}>
              {copy.onboarding.alreadyHaveAccount}
            </Link>
          </p>
        </Card>
      </AuthShell>
    </ProtectedRoute>
  );
}

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { getApiErrorMessage } from '@/lib/api/error';
import { Button, Card, Input } from '@/components/ui';

export default function SignupPage() {
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
      nextErrors.username = 'Username must be at least 3 characters.';
    }

    if (formData.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }

    if (formData.password !== formData.confirmPassword) {
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
      await signup(formData.email, formData.username, formData.password, formData.fullName || undefined);
    } catch (err: any) {
      setErrors({ general: getApiErrorMessage(err, 'Signup failed.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <main className="embr-page" style={{ display: 'grid', placeItems: 'center', padding: '1rem' }}>
        <Card padding="lg" style={{ width: 'min(520px, 100%)' }}>
          <h1 className="ui-page-title" style={{ marginBottom: '0.3rem' }}>
            Create account
          </h1>
          <p className="ui-page-subtitle" style={{ marginBottom: '1rem' }}>
            Build your creator space on Embr.
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
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </div>
          </form>

          <p style={{ marginTop: '1rem' }}>
            <Link href="/auth/login" style={{ color: 'var(--embr-muted-text)', textDecoration: 'underline' }}>
              Already have an account?
            </Link>
          </p>
        </Card>
      </main>
    </ProtectedRoute>
  );
}

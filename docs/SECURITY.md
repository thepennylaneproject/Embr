# Security: Secrets Management & Rotation

## Overview

This document outlines how to safely manage secrets in Embr and procedures for rotating compromised credentials.

## The Problem: Secrets Committed to Git

**Status (2026-03-10):** The `.env` file containing production credentials was committed to git history. This includes:
- Database connection strings with passwords
- JWT secret keys
- Redis authentication tokens
- AWS access keys
- Stripe live API keys
- Mux video processing tokens
- Google OAuth credentials
- Email SMTP credentials

**Action Taken:**
- `.env` added to `.gitignore`
- `.env` removed from git history using `git filter-repo`
- All production secrets MUST be rotated immediately

## Secrets Rotation Procedure

### ⚠️ IMMEDIATE (Today)

1. **Rotate ALL credentials** that were exposed in git history:

   ```bash
   # Database (RDS/Prisma): Create new password in AWS
   # Redis: Change password in ElastiCache
   # JWT secrets: Generate new random 32+ character strings
   # AWS keys: Deactivate old key, create new one in IAM
   # Stripe: Revoke old keys, generate new live keys
   # Mux: Revoke old tokens, create new ones
   # Google OAuth: Revoke tokens in Google Cloud Console
   # SMTP: Reset email app password
   ```

2. **Remove `.env` from git history:**

   ```bash
   # Install git-filter-repo if not already installed
   brew install git-filter-repo

   # Remove .env from entire git history
   cd /Users/sarahsahl/Desktop/embr
   git filter-repo --path .env

   # This rewrites ALL commits. After running:
   # - Force push to all remotes (requires admin privileges)
   # - All local clones must be re-cloned or rebased manually
   # - This is a destructive operation—communicate with team first
   ```

3. **Use new secrets in development:**
   - Copy `.env.example` to `.env`
   - Fill in with NEW rotated credentials (get from secure vault)
   - Never commit `.env`

4. **Document access to new secrets:**
   - Store in AWS Secrets Manager or HashiCorp Vault
   - Only expose to CI/CD and authorized team members

### ✅ Best Practice: Prevention Going Forward

#### 1. Pre-commit Hook (Recommended)

Install a pre-commit hook that prevents accidental secret commits:

```bash
# Install pre-commit framework
pip install pre-commit

# Create .pre-commit-config.yaml in repo root:
```

Create `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.2
    hooks:
      - id: gitleaks

  - repo: local
    hooks:
      - id: check-env-file
        name: Check .env not committed
        entry: bash -c 'if git diff --cached --name-only | grep -q "\.env$"; then echo ".env file cannot be committed"; exit 1; fi'
        language: system
        always_run: true
        stages: [commit]
```

Install hook:
```bash
pre-commit install
```

#### 2. Environment-Specific Configuration

**Development:** `.env` file with safe, non-production values (or empty placeholders)

**Staging/Production:** Inject secrets at deploy time via:
- GitHub Secrets → CI/CD environment variables
- AWS Secrets Manager → ECS/Lambda environment variables
- HashiCorp Vault → Kubernetes secrets

**Never store secrets in:**
- `.env` files committed to git
- Docker images
- Container registries
- Kubernetes YAML files

#### 3. Secrets in CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
          JWT_SECRET: ${{ secrets.PROD_JWT_SECRET }}
          STRIPE_SECRET_KEY: ${{ secrets.PROD_STRIPE_KEY }}
        run: |
          # Secrets are only available in the job environment
          # Never logged or exposed
```

#### 4. Rotating Credentials Safely

**For each environment (staging → production):**

```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -hex 32)

# 2. Update secrets vault (AWS Secrets Manager example)
aws secretsmanager update-secret \
  --secret-id embr/prod/jwt-secret \
  --secret-string "$NEW_SECRET"

# 3. Deploy updated services (they read from vault)
npm run deploy:prod

# 4. Monitor for errors for 30 minutes

# 5. After successful deployment, log old secret rotation in audit trail
# (keep old secrets accessible for 24h for debugging)
```

## Secrets Checklist

### Before Deployment to Production

- [ ] All `.env` files are in `.gitignore`
- [ ] Pre-commit hooks installed (`pre-commit install`)
- [ ] All secrets stored in AWS Secrets Manager or similar vault
- [ ] CI/CD pipeline injects secrets at runtime, not build time
- [ ] Secrets are unique per environment (never reuse dev secrets in prod)
- [ ] Database, Redis, API keys are strong (32+ random characters)
- [ ] Google OAuth credentials only allow production callback URLs
- [ ] Stripe uses live keys (not test keys) in production
- [ ] Email credentials use app-specific passwords (not account password)
- [ ] No hardcoded secrets in code comments or config files

### Quarterly Audit

- [ ] Run `git log --all --name-only | grep -E "\.env"` to verify no secrets committed
- [ ] Verify all team members have access to secrets vault
- [ ] Review IAM access logs for unusual secret access patterns
- [ ] Rotate SMTP, OAuth, and API keys (at least annually)

## Incident Response: Secret Leaked in Code

If a secret is discovered committed to git:

1. **Immediate:** Rotate the exposed credential (same day)
2. **Urgent:** Remove from git history using `git filter-repo`
3. **Communicate:** Notify all team members of rotation
4. **Audit:** Check if secret was accessed/used maliciously
5. **Document:** Log incident in security audit trail

## References

- [OWASP: Secrets Management](https://owasp.org/www-community/Secrets_Management)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [detect-secrets](https://github.com/Yelp/detect-secrets)
- [gitleaks](https://github.com/gitleaks/gitleaks)

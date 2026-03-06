import React, { useEffect, useState } from 'react';
import { useStripeConnect } from '@/hooks/useStripeConnect';

interface StripeConnectOnboardingProps {
  onComplete?: () => void;
}

export const StripeConnectOnboarding: React.FC<StripeConnectOnboardingProps> = ({
  onComplete,
}) => {
  const {
    status,
    details,
    isLoading,
    error,
    createAccount,
    getAccountLink,
    completeOnboarding,
    refetchStatus,
  } = useStripeConnect();
  const [emailInput, setEmailInput] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Check if returning from Stripe onboarding
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_onboarding') === 'complete') {
      handleOnboardingReturn();
    }
  }, []);

  const handleOnboardingReturn = async () => {
    try {
      await completeOnboarding();
      onComplete?.();
    } catch (err) {
      console.error('Error completing onboarding:', err);
    }
  };

  const handleStartOnboarding = async () => {
    setShowEmailForm(true);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    if (!emailInput.trim() || !emailInput.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    try {
      const onboardingUrl = await createAccount(emailInput.trim());
      if (onboardingUrl) {
        window.location.href = onboardingUrl;
      }
    } catch (err) {
      console.error('Error starting onboarding:', err);
    }
  };

  const handleContinueOnboarding = async () => {
    try {
      const returnUrl = `${window.location.origin}/settings/payouts?stripe_onboarding=complete`;
      const refreshUrl = `${window.location.origin}/settings/payouts`;
      const url = await getAccountLink(returnUrl, refreshUrl);
      window.location.href = url;
    } catch (err) {
      console.error('Error getting account link:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  // Account is fully set up
  if (status?.isOnboarded && status?.payoutsEnabled) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl">✓</div>
            <h3 className="text-xl font-semibold">Payment Account Active</h3>
          </div>
          <p className="text-sm opacity-90">
            Your payment account is set up and ready to receive payouts
          </p>
        </div>

        {details && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-1">Account ID</p>
                <p className="font-mono text-xs text-gray-900">
                  {details.accountId.substring(0, 20)}...
                </p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Currency</p>
                <p className="font-semibold text-gray-900">
                  {details.defaultCurrency?.toUpperCase() || 'USD'}
                </p>
              </div>
            </div>

            {details.externalAccounts && details.externalAccounts.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Connected Bank Account
                </p>
                {details.externalAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="text-2xl">🏦</div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {account.bankName || 'Bank Account'}
                      </p>
                      <p className="text-sm text-gray-600">
                        •••• {account.last4}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={refetchStatus}
              className="text-sm text-[#E8998D] hover:text-[#d88578] font-medium"
            >
              Refresh status
            </button>
          </div>
        )}
      </div>
    );
  }

  // Account needs setup or additional info
  if (status?.hasAccount && status?.requiresAction) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl">⚠️</div>
            <h3 className="text-xl font-semibold">Action Required</h3>
          </div>
          <p className="text-sm opacity-90">
            Please complete your payment account setup to receive payouts
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 mb-3">
              Your account setup is incomplete. Click below to continue where you left off.
            </p>
            <button
              onClick={handleContinueOnboarding}
              className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg font-medium
                       hover:bg-amber-700 transition-colors"
            >
              Continue Setup
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // No account yet - show onboarding start
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="bg-gradient-to-br from-[#E8998D] to-[#C9ADA7] p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-3xl">💳</div>
          <h3 className="text-xl font-semibold">Set Up Payouts</h3>
        </div>
        <p className="text-sm opacity-90">
          Connect your bank account to receive payments from tips and gigs
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#E8998D] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              1
            </div>
            <div>
              <p className="font-medium text-gray-900">Create Payment Account</p>
              <p className="text-sm text-gray-600">
                Securely connect with Stripe to handle your payments
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#E8998D] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              2
            </div>
            <div>
              <p className="font-medium text-gray-900">Verify Your Information</p>
              <p className="text-sm text-gray-600">
                Provide basic details and connect your bank account
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#E8998D] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              3
            </div>
            <div>
              <p className="font-medium text-gray-900">Start Receiving Payouts</p>
              <p className="text-sm text-gray-600">
                Request payouts anytime with a minimum of $10
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200">
          {!showEmailForm ? (
            <button
              onClick={handleStartOnboarding}
              className="w-full px-6 py-3 bg-[#E8998D] text-white rounded-lg font-semibold
                       hover:bg-[#d88578] transition-colors"
            >
              Get Started
            </button>
          ) : (
            <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label htmlFor="stripe-email" style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                Email for payment account
              </label>
              <input
                id="stripe-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@example.com"
                required
                style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
              {emailError && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#dc2626' }}>{emailError}</p>
              )}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowEmailForm(false); setEmailError(''); setEmailInput(''); }}
                  style={{ flex: 1, padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db', background: 'transparent', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-2 bg-[#E8998D] text-white rounded-lg font-semibold hover:bg-[#d88578] transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>Secured by Stripe • Your data is encrypted and protected</span>
          </div>
        </div>
      </div>
    </div>
  );
};

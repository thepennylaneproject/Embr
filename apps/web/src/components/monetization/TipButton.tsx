import React, { useState } from 'react';
import { useTips, TIP_PRESET_AMOUNTS } from '@/hooks/useTips';
import { TipAmountPreset } from '@shared/types/monetization.types';

interface TipButtonProps {
  recipientId: string;
  postId?: string;
  recipientName: string;
  onTipComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
}

export const TipButton: React.FC<TipButtonProps> = ({
  recipientId,
  postId,
  recipientName,
  onTipComplete,
  size = 'md',
  variant = 'icon',
}) => {
  const [showModal, setShowModal] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  const buttonSizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`${sizeClasses[size]} rounded-full bg-[#E8998D] text-white 
                     hover:bg-[#d88578] transition-colors flex items-center justify-center
                     shadow-sm hover:shadow-md`}
          title="Send a tip"
        >
          💸
        </button>
        {showModal && (
          <TipModal
            recipientId={recipientId}
            postId={postId}
            recipientName={recipientName}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              onTipComplete?.();
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`${buttonSizeClasses[size]} rounded-lg bg-[#E8998D] text-white 
                   hover:bg-[#d88578] transition-colors font-medium shadow-sm hover:shadow-md
                   flex items-center gap-2`}
      >
        <span>💸</span>
        <span>Send Tip</span>
      </button>
      {showModal && (
        <TipModal
          recipientId={recipientId}
          postId={postId}
          recipientName={recipientName}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            onTipComplete?.();
          }}
        />
      )}
    </>
  );
};

interface TipModalProps {
  recipientId: string;
  postId?: string;
  recipientName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const TipModal: React.FC<TipModalProps> = ({
  recipientId,
  postId,
  recipientName,
  onClose,
  onSuccess,
}) => {
  const { createTip, isCreating, error } = useTips();
  const [selectedPreset, setSelectedPreset] = useState<TipAmountPreset>(
    TipAmountPreset.MEDIUM,
  );
  const [customAmount, setCustomAmount] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount =
      selectedPreset === TipAmountPreset.CUSTOM
        ? parseFloat(customAmount)
        : TIP_PRESET_AMOUNTS[selectedPreset];

    if (amount < 0.5) {
      setValidationError('Minimum tip amount is $0.50.');
      return;
    }

    if (amount > 1000) {
      setValidationError('Maximum tip amount is $1,000.');
      return;
    }
    setValidationError('');

    try {
      await createTip({
        recipientId,
        contentId: postId,
        contentType: 'POST',
        amount,
        preset: selectedPreset,
        message: message.trim() || undefined,
      });

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      console.error('Failed to send tip:', err);
    }
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Tip Sent!</h3>
          <p className="text-gray-600">
            Your tip to {recipientName} has been sent successfully!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Send a Tip</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Recipient */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Tipping</p>
          <p className="font-semibold text-gray-900">{recipientName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose Amount
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { preset: TipAmountPreset.SMALL, label: '$1', amount: 1 },
                { preset: TipAmountPreset.MEDIUM, label: '$5', amount: 5 },
                { preset: TipAmountPreset.LARGE, label: '$10', amount: 10 },
                { preset: TipAmountPreset.CUSTOM, label: 'Custom', amount: 0 },
              ].map(({ preset, label }) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSelectedPreset(preset)}
                  className={`py-3 px-4 rounded-lg font-medium transition-all
                    ${
                      selectedPreset === preset
                        ? 'bg-[#E8998D] text-white shadow-md scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          {selectedPreset === TipAmountPreset.CUSTOM && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  step="0.50"
                  min="0.50"
                  max="1000"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Min: $0.50 | Max: $1,000
              </p>
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add a Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say something nice..."
              rows={3}
              maxLength={200}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none
                       focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {message.length}/200
            </p>
          </div>

          {/* Error Message */}
          {(validationError || error) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{validationError || error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isCreating}
            className="w-full py-3 bg-[#E8998D] text-white rounded-lg font-semibold
                     hover:bg-[#d88578] transition-colors disabled:opacity-50
                     disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>💸</span>
                <span>Send Tip</span>
              </>
            )}
          </button>
        </form>

        {/* Info */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800">
            Platform fee: 5% • Funds are available for payout immediately
          </p>
        </div>
      </div>
    </div>
  );
};

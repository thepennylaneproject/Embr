import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Lock, AlertTriangle } from 'lucide-react';
import { useLicensing, useRecordUsage } from '../hooks/useMusic';

interface MusicLicensingFlowProps {
  trackId: string;
  creatorId: string;
  contentType: 'post' | 'gig_video' | 'reel' | 'video';
  contentId: string;
  onSuccess?: (usageId: string) => void;
  onError?: (error: string) => void;
}

/**
 * Music Licensing Flow Component
 * Check licensing rights and record music usage
 */
export const MusicLicensingFlow: React.FC<MusicLicensingFlowProps> = ({
  trackId,
  creatorId,
  contentType,
  contentId,
  onSuccess,
  onError,
}) => {
  const [step, setStep] = useState<'check' | 'confirm' | 'success' | 'error'>('check');
  const [errorMessage, setErrorMessage] = useState('');
  const { licensing, loading: licensingLoading, error: licensingError } = useLicensing(trackId, creatorId);
  const { recordUsage, loading: recordingLoading, error: recordingError } = useRecordUsage();

  const handleConfirm = async () => {
    if (!licensing?.allowed) {
      setErrorMessage(licensing?.reason || 'Cannot use this track');
      setStep('error');
      onError?.(licensing?.reason || 'Unknown error');
      return;
    }

    try {
      const usage = await recordUsage(trackId, contentType, contentId, creatorId);
      onSuccess?.(usage.id);
      setStep('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to record usage';
      setErrorMessage(message);
      setStep('error');
      onError?.(message);
    }
  };

  if (licensingError) {
    return (
      <div className="bg-embr-primary-100/30 border border-embr-primary-300 rounded-lg p-6 text-embr-primary-700">
        <div className="flex items-start gap-3">
          <AlertCircle size={24} className="flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold mb-2">Error Loading Track</h3>
            <p>{licensingError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Check Licensing Step */}
      {step === 'check' && (
        <div className="bg-embr-neutral-100 border border-embr-neutral-200 rounded-lg p-6 space-y-6">
          <h2 className="text-2xl font-bold text-embr-accent-900">Check Licensing Rights</h2>

          {licensingLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin">
                <div className="w-8 h-8 border-4 border-embr-neutral-300 border-t-embr-primary-400 rounded-full" />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {/* Allowed Status */}
                {licensing?.allowed ? (
                  <div className="bg-embr-secondary-100 border border-embr-secondary-300 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle size={24} className="text-embr-secondary-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-embr-secondary-700 mb-1">You Can Use This Track!</h3>
                      <p className="text-embr-secondary-600 text-sm">
                        The artist has allowed this track to be used in {contentType} content.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-embr-primary-100/30 border border-embr-primary-300 rounded-lg p-4 flex items-start gap-3">
                    <Lock size={24} className="text-embr-primary-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-embr-primary-700 mb-1">Track Not Available</h3>
                      <p className="text-embr-primary-600 text-sm">{licensing?.reason || 'Unable to use this track'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Licensing Details */}
              <div className="bg-embr-neutral-200 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-embr-accent-900 mb-3">Licensing Terms</h3>

                <div className="flex justify-between items-center pb-3 border-b border-embr-neutral-300">
                  <span className="text-embr-accent-700">Licensing Model</span>
                  <span className="font-bold text-embr-primary-500 capitalize">
                    {licensing?.licensingModel}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-embr-neutral-300">
                  <span className="text-embr-accent-700">Can Remix?</span>
                  <span className={licensing?.allowRemix ? 'text-embr-secondary-600 font-bold' : 'text-embr-primary-600'}>
                    {licensing?.allowRemix ? '✓ Yes' : '✗ No'}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-embr-neutral-300">
                  <span className="text-embr-accent-700">Can Monetize?</span>
                  <span className={licensing?.allowMonetize ? 'text-embr-secondary-600 font-bold' : 'text-embr-primary-600'}>
                    {licensing?.allowMonetize ? '✓ Yes' : '⚠ No'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-embr-accent-700">Attribution Required?</span>
                  <span className="text-embr-accent-600 font-bold">
                    {licensing?.attributionRequired ? '✓ Yes' : '○ No'}
                  </span>
                </div>
              </div>

              {/* Revenue Share Info */}
              {licensing?.allowMonetize && (
                <div className="bg-embr-secondary-100 border border-embr-secondary-300 rounded-lg p-4">
                  <h3 className="font-bold text-embr-secondary-700 mb-3">Revenue Share</h3>
                  <div className="space-y-2 text-sm text-embr-secondary-600">
                    <div className="flex justify-between">
                      <span>Artist (Original)</span>
                      <span className="font-bold">50%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>You (Creator)</span>
                      <span className="font-bold">40%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform</span>
                      <span className="font-bold">10%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Attribution Notice */}
              {licensing?.attributionRequired && (
                <div className="bg-embr-primary-100/40 border border-embr-primary-300 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle size={20} className="text-embr-primary-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-embr-primary-700 mb-1">Attribution Required</h4>
                    <p className="text-embr-primary-600 text-sm">
                      You must credit the original artist in your {contentType}.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button className="flex-1 bg-embr-neutral-300 hover:bg-embr-neutral-400 text-embr-accent-900 px-4 py-2 rounded-lg font-semibold transition">
                  Cancel
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  disabled={!licensing?.allowed || recordingLoading}
                  className="flex-1 bg-embr-primary-400 hover:bg-embr-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition"
                >
                  {recordingLoading ? 'Processing...' : 'Continue'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Confirm Step */}
      {step === 'confirm' && (
        <div className="bg-embr-neutral-100 border border-embr-neutral-200 rounded-lg p-6 space-y-6">
          <h2 className="text-2xl font-bold text-embr-accent-900">Confirm Usage</h2>

          <div className="bg-embr-neutral-200 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-embr-accent-900 mb-3">Usage Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-embr-accent-600">Content Type:</span>
                <span className="ml-2 font-bold text-embr-accent-900 capitalize">{contentType}</span>
              </div>
              <div>
                <span className="text-embr-accent-600">Content ID:</span>
                <span className="ml-2 font-bold text-xs text-embr-accent-700">{contentId.slice(0, 12)}...</span>
              </div>
            </div>
          </div>

          <div className="bg-embr-primary-100/30 border border-embr-primary-300 rounded-lg p-4">
            <h3 className="font-bold text-embr-primary-700 mb-2">By clicking confirm, you agree to:</h3>
            <ul className="text-sm text-embr-primary-600 space-y-1 list-disc list-inside">
              <li>Use this music only for the specified content type</li>
              <li>Provide proper attribution if required</li>
              <li>Comply with all licensing terms</li>
              <li>Allow revenue sharing as specified</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setStep('check')}
              className="flex-1 bg-embr-neutral-300 hover:bg-embr-neutral-400 text-embr-accent-900 px-4 py-2 rounded-lg font-semibold transition"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={recordingLoading}
              className="flex-1 bg-embr-primary-400 hover:bg-embr-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              {recordingLoading ? 'Recording...' : 'Confirm & Use Music'}
            </button>
          </div>
        </div>
      )}

      {/* Success Step */}
      {step === 'success' && (
        <div className="bg-embr-neutral-100 border border-embr-neutral-200 rounded-lg p-6 space-y-6">
          <div className="flex justify-center mb-4">
            <div className="bg-embr-secondary-100 border border-embr-secondary-300 rounded-full p-4">
              <CheckCircle size={48} className="text-embr-secondary-600" />
            </div>
          </div>

          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold text-embr-accent-900">Music License Approved!</h2>
            <p className="text-embr-accent-600">
              You can now use this track in your {contentType}. The artist has been notified.
            </p>
          </div>

          <div className="bg-embr-secondary-100 border border-embr-secondary-300 rounded-lg p-4 space-y-2">
            <h3 className="font-bold text-embr-secondary-700">What Happens Next:</h3>
            <ul className="text-sm text-embr-secondary-600 space-y-1 list-disc list-inside">
              <li>The original artist sees your {contentType} in their analytics</li>
              <li>Revenue is calculated as your content gets views</li>
              <li>Both of you earn according to the revenue share</li>
              <li>Earnings appear in dashboards within 24 hours</li>
            </ul>
          </div>

          <button className="w-full bg-embr-primary-400 hover:bg-embr-primary-500 text-white px-4 py-2 rounded-lg font-semibold transition">
            Done
          </button>
        </div>
      )}

      {/* Error Step */}
      {step === 'error' && (
        <div className="bg-embr-neutral-100 border border-embr-neutral-200 rounded-lg p-6 space-y-6">
          <div className="flex justify-center mb-4">
            <div className="bg-embr-primary-100/30 border border-embr-primary-300 rounded-full p-4">
              <AlertCircle size={48} className="text-embr-primary-600" />
            </div>
          </div>

          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold text-embr-accent-900">Unable to Use Track</h2>
            <p className="text-embr-primary-600">{errorMessage}</p>
          </div>

          <div className="bg-embr-primary-100/30 border border-embr-primary-300 rounded-lg p-4">
            <h3 className="font-bold text-embr-primary-700 mb-2">What You Can Do:</h3>
            <ul className="text-sm text-embr-primary-600 space-y-1">
              <li>• Try a different track from this artist</li>
              <li>• Check the artist's profile for available tracks</li>
              <li>• Search for similar tracks from other artists</li>
              <li>• Contact the artist for special licensing</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('check')}
              className="flex-1 bg-embr-neutral-300 hover:bg-embr-neutral-400 text-embr-accent-900 px-4 py-2 rounded-lg font-semibold transition"
            >
              Try Again
            </button>
            <button className="flex-1 bg-embr-primary-400 hover:bg-embr-primary-500 text-white px-4 py-2 rounded-lg font-semibold transition">
              Browse Tracks
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicLicensingFlow;

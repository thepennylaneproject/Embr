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
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-red-100">
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
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-6">
          <h2 className="text-2xl font-bold">Check Licensing Rights</h2>

          {licensingLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin">
                <div className="w-8 h-8 border-4 border-slate-700 border-t-purple-600 rounded-full" />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {/* Allowed Status */}
                {licensing?.allowed ? (
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle size={24} className="text-green-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-green-100 mb-1">You Can Use This Track!</h3>
                      <p className="text-green-200 text-sm">
                        The artist has allowed this track to be used in {contentType} content.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-start gap-3">
                    <Lock size={24} className="text-red-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-red-100 mb-1">Track Not Available</h3>
                      <p className="text-red-200 text-sm">{licensing?.reason || 'Unable to use this track'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Licensing Details */}
              <div className="bg-slate-900 rounded-lg p-4 space-y-3">
                <h3 className="font-bold mb-3">Licensing Terms</h3>

                <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                  <span className="text-slate-300">Licensing Model</span>
                  <span className="font-bold text-purple-400 capitalize">
                    {licensing?.licensingModel}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                  <span className="text-slate-300">Can Remix?</span>
                  <span className={licensing?.allowRemix ? 'text-green-400 font-bold' : 'text-red-400'}>
                    {licensing?.allowRemix ? '✓ Yes' : '✗ No'}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                  <span className="text-slate-300">Can Monetize?</span>
                  <span className={licensing?.allowMonetize ? 'text-green-400 font-bold' : 'text-orange-400'}>
                    {licensing?.allowMonetize ? '✓ Yes' : '⚠ No'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Attribution Required?</span>
                  <span className="text-blue-400 font-bold">
                    {licensing?.attributionRequired ? '✓ Yes' : '○ No'}
                  </span>
                </div>
              </div>

              {/* Revenue Share Info */}
              {licensing?.allowMonetize && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <h3 className="font-bold text-blue-100 mb-3">Revenue Share</h3>
                  <div className="space-y-2 text-sm text-blue-200">
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
                <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-amber-100 mb-1">Attribution Required</h4>
                    <p className="text-amber-200 text-sm">
                      You must credit the original artist in your {contentType}.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold transition">
                  Cancel
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  disabled={!licensing?.allowed || recordingLoading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-semibold text-white transition"
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
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-6">
          <h2 className="text-2xl font-bold">Confirm Usage</h2>

          <div className="bg-slate-900 rounded-lg p-4 space-y-3">
            <h3 className="font-bold mb-3">Usage Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Content Type:</span>
                <span className="ml-2 font-bold capitalize">{contentType}</span>
              </div>
              <div>
                <span className="text-slate-400">Content ID:</span>
                <span className="ml-2 font-bold text-xs text-slate-300">{contentId.slice(0, 12)}...</span>
              </div>
            </div>
          </div>

          <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4">
            <h3 className="font-bold text-purple-100 mb-2">By clicking confirm, you agree to:</h3>
            <ul className="text-sm text-purple-200 space-y-1 list-disc list-inside">
              <li>Use this music only for the specified content type</li>
              <li>Provide proper attribution if required</li>
              <li>Comply with all licensing terms</li>
              <li>Allow revenue sharing as specified</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setStep('check')}
              className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold transition"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={recordingLoading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-semibold text-white transition"
            >
              {recordingLoading ? 'Recording...' : 'Confirm & Use Music'}
            </button>
          </div>
        </div>
      )}

      {/* Success Step */}
      {step === 'success' && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-6">
          <div className="flex justify-center mb-4">
            <div className="bg-green-900/20 border border-green-700 rounded-full p-4">
              <CheckCircle size={48} className="text-green-400" />
            </div>
          </div>

          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold">Music License Approved!</h2>
            <p className="text-slate-300">
              You can now use this track in your {contentType}. The artist has been notified.
            </p>
          </div>

          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 space-y-2">
            <h3 className="font-bold text-green-100">What Happens Next:</h3>
            <ul className="text-sm text-green-200 space-y-1 list-disc list-inside">
              <li>The original artist sees your {contentType} in their analytics</li>
              <li>Revenue is calculated as your content gets views</li>
              <li>Both of you earn according to the revenue share</li>
              <li>Earnings appear in dashboards within 24 hours</li>
            </ul>
          </div>

          <button className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold text-white transition">
            Done
          </button>
        </div>
      )}

      {/* Error Step */}
      {step === 'error' && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-6">
          <div className="flex justify-center mb-4">
            <div className="bg-red-900/20 border border-red-700 rounded-full p-4">
              <AlertCircle size={48} className="text-red-400" />
            </div>
          </div>

          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold">Unable to Use Track</h2>
            <p className="text-red-200">{errorMessage}</p>
          </div>

          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <h3 className="font-bold text-red-100 mb-2">What You Can Do:</h3>
            <ul className="text-sm text-red-200 space-y-1">
              <li>• Try a different track from this artist</li>
              <li>• Check the artist's profile for available tracks</li>
              <li>• Search for similar tracks from other artists</li>
              <li>• Contact the artist for special licensing</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('check')}
              className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-semibold transition"
            >
              Try Again
            </button>
            <button className="flex-1 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold text-white transition">
              Browse Tracks
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicLicensingFlow;

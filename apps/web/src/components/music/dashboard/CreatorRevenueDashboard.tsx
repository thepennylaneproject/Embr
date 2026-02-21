import React, { useState } from 'react';
import { TrendingUp, DollarSign, Music, Target, Download } from 'lucide-react';
import { useCreatorRevenue } from '../hooks/useMusic';

interface CreatorRevenueDashboardProps {
  creatorId: string;
}

/**
 * Creator Revenue Dashboard
 * Show earnings from using music in creator's content
 */
export const CreatorRevenueDashboard: React.FC<CreatorRevenueDashboardProps> = ({ creatorId }) => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const { revenue, loading, error } = useCreatorRevenue(creatorId, period);

  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-purple-600 rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-red-100">
        <p>Error loading revenue data: {error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        Music Licensing Revenue
      </h1>

      {/* Period Selector */}
      <div className="flex gap-2 mb-8">
        {(['daily', 'weekly', 'monthly'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              period === p
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Revenue Card */}
      <div className="bg-gradient-to-br from-purple-900 to-pink-900 border border-purple-700 rounded-lg p-8 mb-8 text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-purple-200 text-sm mb-2">Total Revenue</p>
            <h2 className="text-4xl font-bold">${(revenue?.totalRevenue || 0) / 100}</h2>
            <p className="text-purple-300 text-xs mt-2">from music usage</p>
          </div>

          <div>
            <p className="text-purple-200 text-sm mb-2">Content Using Music</p>
            <h2 className="text-4xl font-bold">{revenue?.usages || 0}</h2>
            <p className="text-purple-300 text-xs mt-2">pieces of content</p>
          </div>

          <div>
            <p className="text-purple-200 text-sm mb-2">Average Revenue</p>
            <h2 className="text-4xl font-bold">
              ${((revenue?.totalRevenue || 0) / Math.max(revenue?.usages || 1, 1)) / 100}
            </h2>
            <p className="text-purple-300 text-xs mt-2">per content piece</p>
          </div>

          <div>
            <p className="text-purple-200 text-sm mb-2">Top Earning</p>
            <h2 className="text-4xl font-bold">
              ${(revenue?.topUsages?.[0]?.creatorShare || 0) / 100}
            </h2>
            <p className="text-purple-300 text-xs mt-2">single piece</p>
          </div>
        </div>
      </div>

      {/* Top Earning Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Usages */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={24} className="text-purple-400" />
            Top Earning Content
          </h3>

          {revenue?.topUsages && revenue.topUsages.length > 0 ? (
            <div className="space-y-4">
              {revenue.topUsages.slice(0, 5).map((usage: any, idx: number) => (
                <div key={idx} className="border-b border-slate-700 pb-4 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-white">{idx + 1}. {usage.contentType}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        ID: {usage.contentId?.slice(0, 8)}...
                      </p>
                    </div>
                    <span className="font-bold text-purple-400 text-lg">
                      ${(usage.creatorShare || 0) / 100}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-300">
                    <div>
                      <p className="text-slate-400">Impressions</p>
                      <p className="font-bold">{usage.impressions?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Engagements</p>
                      <p className="font-bold">{usage.engagements?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Total</p>
                      <p className="font-bold">${(usage.totalRevenue || 0) / 100}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">No earnings yet</p>
          )}
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <DollarSign size={24} className="text-green-400" />
            Revenue Breakdown
          </h3>

          <div className="space-y-6">
            {/* Share from this period */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold">Your Share (40%)</span>
                <span className="text-2xl font-bold text-green-400">
                  ${((revenue?.totalRevenue || 0) * 0.4) / 100}
                </span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-full" style={{ width: '40%' }} />
              </div>
            </div>

            {/* Artist share */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold">Artist Share (50%)</span>
                <span className="text-2xl font-bold text-blue-400">
                  ${((revenue?.totalRevenue || 0) * 0.5) / 100}
                </span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full" style={{ width: '50%' }} />
              </div>
            </div>

            {/* Platform share */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold">Platform Fee (10%)</span>
                <span className="text-2xl font-bold text-slate-400">
                  ${((revenue?.totalRevenue || 0) * 0.1) / 100}
                </span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div className="bg-slate-500 h-full" style={{ width: '10%' }} />
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mt-6">
            <p className="text-blue-200 text-sm">
              <strong>Note:</strong> Revenue is calculated based on impressions and engagements of your content.
              Updates may take up to 24 hours to reflect.
            </p>
          </div>
        </div>
      </div>

      {/* Earnings by Track */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Music size={24} className="text-pink-400" />
          Popular Tracks Used
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {revenue?.topUsages?.slice(0, 6).map((usage: any, idx: number) => (
            <div key={idx} className="bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-purple-500 transition">
              <div className="mb-3">
                <p className="text-sm text-slate-400">Most used</p>
                <p className="font-bold text-white">{usage.contentType}</p>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Revenue</span>
                  <span className="font-bold text-purple-400">
                    ${(usage.totalRevenue || 0) / 100}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Your Share</span>
                  <span className="font-bold text-green-400">
                    ${(usage.creatorShare || 0) / 100}
                  </span>
                </div>
              </div>

              <button className="w-full bg-purple-600/20 hover:bg-purple-600/40 border border-purple-600 text-purple-300 py-2 rounded-lg text-sm font-semibold transition">
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payout Info */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mt-8">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Download size={24} />
          Payouts
        </h3>

        <div className="space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-slate-700">
            <div>
              <p className="font-semibold">Monthly Payout (Feb 2026)</p>
              <p className="text-sm text-slate-400">Next payout on March 1</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-400">
                ${((revenue?.totalRevenue || 0) * 0.4) / 100}
              </p>
              <p className="text-xs text-slate-400 mt-1">40% of total revenue</p>
            </div>
          </div>

          <div className="bg-green-900/10 border border-green-700/30 rounded-lg p-4">
            <p className="text-green-200 text-sm">
              💰 Automatic payouts are sent to your registered bank account every month. Processing takes 2-5 business days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorRevenueDashboard;

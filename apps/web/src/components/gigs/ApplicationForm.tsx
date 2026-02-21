import React, { useState } from 'react';
import { applicationsApi } from '@shared/api/gigs.api';
import {
  CreateApplicationData,
  MilestoneProposal,
  Gig,
  GigBudgetType,
} from '../../shared/types/gig.types';
interface ApplicationFormProps {
  gig: Gig;
  onSuccess?: (applicationId: string) => void;
  onCancel?: () => void;
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({ gig, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<Omit<CreateApplicationData, 'gigId'>>({
    coverLetter: '',
    proposedBudget: gig.budgetMin,
    proposedTimeline: gig.estimatedDuration,
    portfolioLinks: [],
    relevantExperience: '',
    milestones: gig.budgetType === GigBudgetType.MILESTONE ? [
      {
        title: '',
        description: '',
        amount: 0,
        estimatedDays: 0,
      },
    ] : [],
  });

  const [currentPortfolioLink, setCurrentPortfolioLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPortfolioLink = () => {
    if (currentPortfolioLink.trim()) {
      try {
        new URL(currentPortfolioLink);
        setFormData({
          ...formData,
          portfolioLinks: [...formData.portfolioLinks, currentPortfolioLink.trim()],
        });
        setCurrentPortfolioLink('');
        setError(null);
      } catch {
        setError('Please enter a valid URL');
      }
    }
  };

  const removePortfolioLink = (link: string) => {
    setFormData({
      ...formData,
      portfolioLinks: formData.portfolioLinks.filter(l => l !== link),
    });
  };

  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [
        ...formData.milestones!,
        {
          title: '',
          description: '',
          amount: 0,
          estimatedDays: 0,
        },
      ],
    });
  };

  const updateMilestone = (index: number, field: keyof MilestoneProposal, value: any) => {
    const updatedMilestones = [...formData.milestones!];
    updatedMilestones[index] = {
      ...updatedMilestones[index],
      [field]: value,
    };
    setFormData({ ...formData, milestones: updatedMilestones });
  };

  const removeMilestone = (index: number) => {
    setFormData({
      ...formData,
      milestones: formData.milestones!.filter((_, i) => i !== index),
    });
  };

  const validateMilestones = () => {
    if (gig.budgetType !== GigBudgetType.MILESTONE) return true;
    
    if (!formData.milestones || formData.milestones.length === 0) {
      setError('Please add at least one milestone');
      return false;
    }

    const totalAmount = formData.milestones.reduce((sum, m) => sum + m.amount, 0);
    if (Math.abs(totalAmount - formData.proposedBudget) > 0.01) {
      setError('Milestone amounts must sum to your proposed budget');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateMilestones()) return;

    if (formData.portfolioLinks.length === 0) {
      setError('Please add at least one portfolio link');
      return;
    }

    setIsSubmitting(true);

    try {
      const application = await applicationsApi.create({
        ...formData,
        gigId: gig.id,
      });

      onSuccess?.(application.id);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#9A8C98' }}>
        Apply to: {gig.title}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cover Letter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cover Letter *
          </label>
          <textarea
            value={formData.coverLetter}
            onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
            placeholder="Explain why you're the perfect fit for this gig. Highlight relevant experience and how you'll approach this project..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] focus:border-transparent h-48"
            minLength={100}
            maxLength={2000}
            required
          />
          <p className="text-xs text-gray-500 mt-1">{formData.coverLetter.length}/2000 characters (minimum 100)</p>
        </div>

        {/* Proposed Budget & Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Proposed Budget ($) *
            </label>
            <input
              type="number"
              value={formData.proposedBudget}
              onChange={(e) => setFormData({ ...formData, proposedBudget: parseFloat(e.target.value) })}
              min={gig.budgetMin}
              max={gig.budgetMax}
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Budget range: ${gig.budgetMin} - ${gig.budgetMax}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeline (days) *
            </label>
            <input
              type="number"
              value={formData.proposedTimeline}
              onChange={(e) => setFormData({ ...formData, proposedTimeline: parseInt(e.target.value) })}
              min={1}
              max={365}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Estimated: {gig.estimatedDuration} days
            </p>
          </div>
        </div>

        {/* Milestones (for milestone-based gigs) */}
        {gig.budgetType === GigBudgetType.MILESTONE && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Project Milestones *
              </label>
              <button
                type="button"
                onClick={addMilestone}
                className="text-sm text-[#E8998D] hover:text-[#d88a7e] font-medium"
              >
                + Add Milestone
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.milestones!.map((milestone, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Milestone {index + 1}</h4>
                    {formData.milestones!.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMilestone(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={milestone.title}
                      onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                      placeholder="Milestone title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D]"
                      required
                    />
                    
                    <textarea
                      value={milestone.description}
                      onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                      placeholder="Milestone description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] h-20"
                      required
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Amount ($)</label>
                        <input
                          type="number"
                          value={milestone.amount}
                          onChange={(e) => updateMilestone(index, 'amount', parseFloat(e.target.value))}
                          min={1}
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Duration (days)</label>
                        <input
                          type="number"
                          value={milestone.estimatedDays}
                          onChange={(e) => updateMilestone(index, 'estimatedDays', parseInt(e.target.value))}
                          min={1}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D]"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-600 mt-2">
              Total: ${formData.milestones!.reduce((sum, m) => sum + m.amount, 0).toFixed(2)} 
              {' | '}
              {formData.milestones!.reduce((sum, m) => sum + m.estimatedDays, 0)} days
            </p>
          </div>
        )}

        {/* Portfolio Links */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Portfolio Links *
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="url"
              value={currentPortfolioLink}
              onChange={(e) => setCurrentPortfolioLink(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPortfolioLink())}
              placeholder="https://example.com/your-work"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
            />
            <button
              type="button"
              onClick={addPortfolioLink}
              className="px-4 py-2 bg-[#E8998D] text-white rounded-lg hover:bg-[#d88a7e] transition-colors"
            >
              Add
            </button>
          </div>
          <div className="space-y-2">
            {formData.portfolioLinks.map((link, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-2 bg-[#F4F1F1] rounded-lg"
              >
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm text-[#E8998D] hover:underline truncate"
                >
                  {link}
                </a>
                <button
                  type="button"
                  onClick={() => removePortfolioLink(link)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Relevant Experience */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relevant Experience *
          </label>
          <textarea
            value={formData.relevantExperience}
            onChange={(e) => setFormData({ ...formData, relevantExperience: e.target.value })}
            placeholder="Describe your relevant experience and similar projects you've completed..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] focus:border-transparent h-32"
            minLength={50}
            maxLength={2000}
            required
          />
          <p className="text-xs text-gray-500 mt-1">{formData.relevantExperience.length}/2000 characters (minimum 50)</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-2 bg-[#E8998D] text-white rounded-lg hover:bg-[#d88a7e] transition-colors disabled:opacity-50 font-medium"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
};
export { applicationsApi };


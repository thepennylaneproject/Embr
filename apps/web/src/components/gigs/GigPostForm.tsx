import React, { useState } from 'react';
import { gigsApi } from '@shared/api/gigs.api';
import { 
  GigCategory, 
  GigBudgetType, 
  GigExperienceLevel,
  CreateGigData,
} from '@embr/types';

interface GigPostFormProps {
  onSuccess?: (gigId: string) => void;
  onCancel?: () => void;
}

const CATEGORIES = [
  { value: GigCategory.VIDEO_EDITING, label: 'Video Editing' },
  { value: GigCategory.GRAPHIC_DESIGN, label: 'Graphic Design' },
  { value: GigCategory.WRITING, label: 'Writing & Content' },
  { value: GigCategory.MUSIC_AUDIO, label: 'Music & Audio' },
  { value: GigCategory.ANIMATION, label: 'Animation' },
  { value: GigCategory.PHOTOGRAPHY, label: 'Photography' },
  { value: GigCategory.SOCIAL_MEDIA, label: 'Social Media Management' },
  { value: GigCategory.CONSULTING, label: 'Consulting' },
  { value: GigCategory.WEB_DEV, label: 'Web Development' },
  { value: GigCategory.VOICE_OVER, label: 'Voice Over' },
  { value: GigCategory.OTHER, label: 'Other' },
];

export const GigPostForm: React.FC<GigPostFormProps> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<CreateGigData>({
    title: '',
    description: '',
    category: GigCategory.VIDEO_EDITING,
    budgetType: GigBudgetType.FIXED,
    budgetMin: 100,
    budgetMax: 500,
    currency: 'USD',
    experienceLevel: GigExperienceLevel.INTERMEDIATE,
    estimatedDuration: 7,
    skills: [],
    deliverables: [],
    attachments: [],
  });

  const [currentSkill, setCurrentSkill] = useState('');
  const [currentDeliverable, setCurrentDeliverable] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validation
      if (formData.budgetMin > formData.budgetMax) {
        throw new Error('Minimum budget cannot exceed maximum budget');
      }

      if (formData.skills.length === 0) {
        throw new Error('Please add at least one required skill');
      }

      if (formData.deliverables.length === 0) {
        throw new Error('Please add at least one deliverable');
      }

      // Create the gig
      const gig = await gigsApi.create(formData);

      // Publish if requested
      if (publish) {
        await gigsApi.publish(gig.id);
      }

      onSuccess?.(gig.id);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create gig');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSkill = () => {
    if (currentSkill.trim() && !formData.skills.includes(currentSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, currentSkill.trim()],
      });
      setCurrentSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skill),
    });
  };

  const addDeliverable = () => {
    if (currentDeliverable.trim() && !formData.deliverables.includes(currentDeliverable.trim())) {
      setFormData({
        ...formData,
        deliverables: [...formData.deliverables, currentDeliverable.trim()],
      });
      setCurrentDeliverable('');
    }
  };

  const removeDeliverable = (deliverable: string) => {
    setFormData({
      ...formData,
      deliverables: formData.deliverables.filter(d => d !== deliverable),
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6" style={{ color: '#9A8C98' }}>
        Post a New Gig
      </h2>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gig Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Need a 30-second product promo video"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
            minLength={10}
            maxLength={200}
            required
          />
          <p className="text-xs text-gray-500 mt-1">{formData.title.length}/200 characters</p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as GigCategory })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
            required
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detailed Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe what you need in detail. Include any specific requirements, style preferences, or examples..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] focus:border-transparent h-32"
            minLength={50}
            maxLength={5000}
            required
          />
          <p className="text-xs text-gray-500 mt-1">{formData.description.length}/5000 characters</p>
        </div>

        {/* Budget */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget Type *
            </label>
            <select
              value={formData.budgetType}
              onChange={(e) => setFormData({ ...formData, budgetType: e.target.value as GigBudgetType })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
              required
            >
              <option value={GigBudgetType.FIXED}>Fixed Price</option>
              <option value={GigBudgetType.HOURLY}>Hourly Rate</option>
              <option value={GigBudgetType.MILESTONE}>Milestone-Based</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Budget ($) *
            </label>
            <input
              type="number"
              value={formData.budgetMin}
              onChange={(e) => setFormData({ ...formData, budgetMin: parseInt(e.target.value) })}
              min={1}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Budget ($) *
            </label>
            <input
              type="number"
              value={formData.budgetMax}
              onChange={(e) => setFormData({ ...formData, budgetMax: parseInt(e.target.value) })}
              min={formData.budgetMin}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Experience Level & Duration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Experience Level *
            </label>
            <select
              value={formData.experienceLevel}
              onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value as GigExperienceLevel })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
              required
            >
              <option value={GigExperienceLevel.BEGINNER}>Beginner</option>
              <option value={GigExperienceLevel.INTERMEDIATE}>Intermediate</option>
              <option value={GigExperienceLevel.EXPERT}>Expert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Duration (days) *
            </label>
            <input
              type="number"
              value={formData.estimatedDuration}
              onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) })}
              min={1}
              max={365}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Skills Required */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Required Skills *
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={currentSkill}
              onChange={(e) => setCurrentSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              placeholder="e.g., Adobe Premiere Pro"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
            />
            <button
              type="button"
              onClick={addSkill}
              className="px-4 py-2 bg-[#E8998D] text-white rounded-lg hover:bg-[#d88a7e] transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-3 py-1 bg-[#F4F1F1] text-[#9A8C98] rounded-full text-sm"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Deliverables */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deliverables *
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={currentDeliverable}
              onChange={(e) => setCurrentDeliverable(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDeliverable())}
              placeholder="e.g., 1080p video file in MP4 format"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E8998D] focus:border-transparent"
            />
            <button
              type="button"
              onClick={addDeliverable}
              className="px-4 py-2 bg-[#E8998D] text-white rounded-lg hover:bg-[#d88a7e] transition-colors"
            >
              Add
            </button>
          </div>
          <div className="space-y-2">
            {formData.deliverables.map((deliverable, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-2 bg-[#F4F1F1] rounded-lg"
              >
                <span className="flex-1 text-sm text-[#9A8C98]">{deliverable}</span>
                <button
                  type="button"
                  onClick={() => removeDeliverable(deliverable)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
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
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={isSubmitting}
            className="px-6 py-2 bg-[#E8998D] text-white rounded-lg hover:bg-[#d88a7e] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Publishing...' : 'Publish Gig'}
          </button>
        </div>
      </form>
    </div>
  );
};

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { toast } from '@/components/toast';

import { saveOnboarding, type OnboardingActionState } from '@/app/onboarding/actions';

type OnboardingStep = {
  title: string;
  description: string;
};

const STEPS: OnboardingStep[] = [
  {
    title: 'Welcome!',
    description: "Let's get to know you better",
  },
  {
    title: 'Connect Gmail',
    description: 'Connect your Gmail account to get started',
  },
  {
    title: 'Almost there!',
    description: 'Just a few more details',
  },
];

export function OnboardingForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    fullName: '',
    usageType: '',
    referralSource: '',
    gmailConnected: false,
  });

  const { execute, result } = useAction(saveOnboarding);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGmailConnect = async () => {
    // TODO: Implement OAuth flow
    setFormData((prev) => ({ ...prev, gmailConnected: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      return;
    }

    execute({
      fullName: formData.fullName,
      usageType: formData.usageType as 'personal' | 'business' | 'both',
      referralSource: formData.referralSource,
      gmailConnected: formData.gmailConnected,
    });
  };

  // Handle form submission state
  useEffect(() => {
    if (result?.validationErrors) {
      toast({ type: 'error', description: 'Please check your input and try again.' });
    } else if (result?.data?.status === 'failed') {
      toast({ type: 'error', description: 'Failed to save your information. Please try again.' });
    } else if (result?.data?.status === 'success') {
      toast({ type: 'success', description: 'Your information has been saved!' });
      router.push('/dashboard');
    }
  }, [result, router]);

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((step, idx) => (
            <div
              key={idx}
              className={`flex-1 h-2 rounded-full mx-1 ${
                idx <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold">{STEPS[currentStep].title}</h2>
          <p className="text-gray-600">{STEPS[currentStep].description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {currentStep === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-600"
                required
              />
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGmailConnect}
              className={`w-full py-2 px-4 rounded-md ${
                formData.gmailConnected
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              {formData.gmailConnected ? '✓ Gmail Connected' : 'Connect Gmail'}
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                How will you use this service?
              </label>
              <select
                name="usageType"
                value={formData.usageType}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-600"
                required
              >
                <option value="">Select an option</option>
                <option value="personal">Personal Use</option>
                <option value="business">Business Use</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                How did you hear about us?
              </label>
              <input
                type="text"
                name="referralSource"
                value={formData.referralSource}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:bg-gray-800 dark:border-gray-600"
                required
              />
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            className="ml-auto px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            {currentStep === STEPS.length - 1 ? 'Complete' : 'Next'}
          </button>
        </div>
      </form>
    </div>
  );
} 
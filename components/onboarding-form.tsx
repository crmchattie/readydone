'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { toast } from '@/components/toast';

import { saveOnboarding, type OnboardingActionState } from '@/app/onboarding/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

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
    description: 'Allow us to send emails on your behalf',
  },
  {
    title: 'Almost there!',
    description: 'Just a few more details to personalize your experience',
  },
];

export function OnboardingForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    usageType: '',
    referralSource: '',
  });

  const { execute, result } = useAction(saveOnboarding);

  // Check Gmail connection status and user data on mount
  useEffect(() => {
    const checkInitialData = async () => {
      try {
        // Handle Gmail connection status from URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const error = urlParams.get('error');
        
        let isConnected = false;
        
        if (success) {
          toast({ type: 'success', description: success.replace(/\+/g, ' ') });
          isConnected = true;
          setCurrentStep(1);
        }
        
        if (error) {
          toast({ type: 'error', description: error.replace(/\+/g, ' ') });
          setCurrentStep(1);
        }

        // Check Gmail connection using the OAuth credentials endpoint
        const response = await fetch('/api/gmail/status');
        if (response.ok) {
          const data = await response.json();
          isConnected = data.connected;
          setIsGmailConnected(data.connected);
        }

        // Check if user data exists
        const userResponse = await fetch('/api/user');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.firstName) {
            setFormData(prev => ({ 
              ...prev, 
              firstName: userData.firstName,
              lastName: userData.lastName || '',
              usageType: userData.usageType || '',
              referralSource: userData.referralSource || ''
            }));
          }
        }

        // Check for stored form data in localStorage
        const storedData = localStorage.getItem('onboardingFormData');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          setFormData(prev => ({ 
            ...prev, 
            ...parsedData
          }));
        }
      } catch (error) {
        console.error('Error checking initial data:', error);
        toast({ type: 'error', description: 'Failed to load your information.' });
      }
    };

    checkInitialData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);
    // Store form data in localStorage
    localStorage.setItem('onboardingFormData', JSON.stringify(updatedData));
  };

  const handleSelectChange = (value: string) => {
    const updatedData = { ...formData, usageType: value };
    setFormData(updatedData);
    // Store form data in localStorage
    localStorage.setItem('onboardingFormData', JSON.stringify(updatedData));
  };

  const handleGmailConnect = async () => {
    setIsConnecting(true);
    try {
      // Store current form data before redirecting
      localStorage.setItem('onboardingFormData', JSON.stringify(formData));
      window.location.href = '/api/gmail/connect';
    } catch (error) {
      console.error('Error initiating Gmail connection:', error);
      toast({ type: 'error', description: 'Failed to start Gmail connection process.' });
      setIsConnecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep < STEPS.length - 1) {
      // Validate required fields for the current step
      if (currentStep === 0 && (!formData.firstName || !formData.lastName)) {
        toast({ type: 'error', description: 'Please fill in all required fields.' });
        return;
      }
      
      setCurrentStep((prev) => prev + 1);
      return;
    }

    // Validate final step fields
    if (!formData.usageType) {
      toast({ type: 'error', description: 'Please select how you will use this service.' });
      return;
    }

    if (!formData.referralSource) {
      toast({ type: 'error', description: 'Please let us know how you found us.' });
      return;
    }

    // Clear stored form data on successful submission
    localStorage.removeItem('onboardingFormData');

    execute({
      firstName: formData.firstName,
      lastName: formData.lastName,
      usageType: formData.usageType as 'personal' | 'business' | 'both',
      referralSource: formData.referralSource,
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
      router.push('/');
    }
  }, [result, router]);

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-10">
      {/* Progress bar */}
      <div className="space-y-4">
        <div className="flex justify-between gap-2">
          {STEPS.map((step, idx) => (
            <div
              key={idx}
              className={cn(
                'flex-1 h-2 rounded-full transition-colors',
                idx <= currentStep ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>
        <div className="text-center space-y-1.5">
          <h2 className="text-2xl font-bold tracking-tight">{STEPS[currentStep].title}</h2>
          <p className="text-muted-foreground">{STEPS[currentStep].description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {currentStep === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  First Name
                </label>
                <Input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter your first name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Last Name
                </label>
                <Input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              We use your name to personalize your experience and make communication more natural.
            </p>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4 text-center">
              By connecting your Gmail account, you&apos;re allowing us to send emails on your behalf. This enables us to automate your email communications while maintaining your personal touch. We only send emails when you explicitly request it.
            </p>
            <Button
              type="button"
              onClick={handleGmailConnect}
              className="w-full"
              variant={isGmailConnected ? "secondary" : "default"}
              disabled={isConnecting || isGmailConnected}
            >
              {isConnecting ? 'Connecting...' : isGmailConnected ? '✓ Gmail Connected' : 'Connect Gmail'}
            </Button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                How will you use this service?
              </label>
              <Select value={formData.usageType} onValueChange={handleSelectChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal Use</SelectItem>
                  <SelectItem value="business">Business Use</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                How did you hear about us?
              </label>
              <Input
                type="text"
                name="referralSource"
                value={formData.referralSource}
                onChange={handleInputChange}
                placeholder="Let us know how you found us"
                required
              />
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4">
          {currentStep > 0 && (
            <Button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              variant="outline"
            >
              Back
            </Button>
          )}
          <Button
            type="submit"
            className={cn(currentStep === 0 && "w-full", "ml-auto")}
          >
            {currentStep === STEPS.length - 1 ? 'Complete' : 'Next'}
          </Button>
        </div>
      </form>
    </div>
  );
} 
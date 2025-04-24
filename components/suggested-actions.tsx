'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';
import { UseChatHelpers } from '@ai-sdk/react';
import { Car, Shield, Wrench, CalendarDays } from 'lucide-react';

interface SuggestedActionsProps {
  chatId: string;
  append: UseChatHelpers['append'];
}

function PureSuggestedActions({ chatId, append }: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: 'Purchase a Car',
      description: 'Find your ideal car by letting AI contact local dealerships for availability and pricing, saving you time and effort.',
      action: 'I need help finding and purchasing a car. Can you help me search local dealerships and get pricing information?',
      icon: Car,
    },
    {
      title: 'Plan an Event',
      description: 'Streamline your event planning as AI contacts venues and vendors, collecting pricing and availability in one place.',
      action: 'I need help planning an event. Can you help me find and compare venues, caterers, and other vendors?',
      icon: CalendarDays,
    },
    {
      title: 'Shop for Insurance',
      description: 'Compare insurance quotes effortlessly as AI reaches out to providers and organizes their responses for review.',
      action: 'I need help finding insurance coverage. Can you help me get and compare quotes from different providers?',
      icon: Shield,
    },
    {
      title: 'Get Project Estimates',
      description: 'Let AI find and contact local contractors for your home project, gathering estimates and organizing responses.',
      action: 'I need help finding contractors for a home project. Can you help me get and compare estimates?',
      icon: Wrench,
    }
  ];

  return (
    <div
      data-testid="suggested-actions"
      className="grid sm:grid-cols-2 gap-4 w-full"
    >
      {suggestedActions.map((suggestedAction, index) => {
        const Icon = suggestedAction.icon;
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.05 * index }}
            key={`suggested-action-${suggestedAction.title}-${index}`}
            className={index > 1 ? 'hidden sm:block' : 'block'}
          >
            <Button
              variant="ghost"
              onClick={async () => {
                append({
                  role: 'user',
                  content: suggestedAction.action,
                });
              }}
              className="text-left border rounded-xl p-4 text-sm flex flex-col w-full h-auto justify-start items-start gap-3 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 w-full">
                <Icon className="size-5 text-primary" />
                <h3 className="font-semibold text-base break-words leading-tight m-0">{suggestedAction.title}</h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-normal break-words">
                {suggestedAction.description}
              </p>
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);

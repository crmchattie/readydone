'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mail, Check, ArrowRight, Shield, Inbox, Calendar, X, Loader2 } from 'lucide-react';
import { toast } from '@/components/toast';

export default function GmailConnectPage() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Check if Gmail is already connected
  useEffect(() => {
    const checkGmailConnection = async () => {
      try {
        const response = await fetch('/api/gmail/status');
        if (response.ok) {
          const data = await response.json();
          setIsConnected(data.connected);
          
          if (data.connected) {
            toast({
              type: "success",
              description: "Your Gmail account is already connected.",
            });
          }
        }
      } catch (error) {
        console.error('Error checking Gmail connection:', error);
        toast({
          type: "error",
          description: "Failed to check Gmail connection status.",
        });
      }
    };
    
    // Check status on initial load and when URL parameters change
    const success = new URLSearchParams(window.location.search).get('success');
    const error = new URLSearchParams(window.location.search).get('error');
    
    if (success) {
      toast({
        type: "success",
        description: success.replace(/\+/g, ' '),
      });
    }
    
    if (error) {
      toast({
        type: "error",
        description: error.replace(/\+/g, ' '),
      });
    }
    
    checkGmailConnection();
  }, []);

  const connectGmail = async () => {
    setIsConnecting(true);
    try {
      // Redirect to Gmail OAuth flow
      window.location.href = '/api/gmail/connect';
    } catch (error) {
      console.error('Error initiating Gmail connection:', error);
      toast({
        type: "error",
        description: "Failed to start Gmail connection process.",
      });
      setIsConnecting(false);
    }
  };

  const skipConnection = () => {
    router.push('/');
  };

  const disconnectGmail = async () => {
    try {
      setIsDisconnecting(true);
      const response = await fetch('/api/gmail/disconnect', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect Gmail');
      }
      
      setIsConnected(false);
      toast({
        type: "success",
        description: "Your Gmail account has been disconnected successfully.",
      });
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      toast({
        type: "error",
        description: "Failed to disconnect Gmail. Please try again.",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mx-auto max-w-2xl w-full space-y-8">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center justify-center size-16 rounded-full bg-primary/10 mb-2">
            <Mail className="size-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Connect Your Gmail Account</h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Connect your Gmail to enhance your productivity and email management experience
          </p>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Benefits of Connecting Gmail</h2>
          
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Inbox className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Smart Inbox Management</h3>
                <p className="text-sm text-muted-foreground">
                  Organize and prioritize your emails efficiently with our intelligent inbox features.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Calendar Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Seamlessly sync your emails with calendar events and reminders.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Shield className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Your Privacy is Protected</h3>
                <p className="text-sm text-muted-foreground">
                  We use industry-standard security measures to protect your data.
                  <Link href="/privacy" className="underline font-medium ml-1">
                    Learn more
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          {isConnected ? (
            <>
              <div className="flex items-center justify-center gap-2 bg-primary/10 text-primary rounded-lg py-3 px-4">
                <Check className="size-5 shrink-0" />
                <span>Gmail account connected successfully</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => router.push('/')} 
                  className="w-full"
                  variant="default"
                >
                  Go to Dashboard <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button
                  onClick={disconnectGmail}
                  variant="outline"
                  className="w-full"
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <X className="mr-2 size-4" />
                      Disconnect Gmail
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button 
                onClick={connectGmail} 
                disabled={isConnecting}
                size="lg"
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect Gmail <Mail className="ml-2 size-4" />
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={skipConnection}
                className="w-full"
              >
                Skip for Now
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                You can always connect Gmail later in your account settings
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 
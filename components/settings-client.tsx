'use client';

import { useState, useEffect, useCallback } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { User } from "@/lib/db/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from './toast';
import { AlertCircle, CreditCard, Mail, AlertTriangle, Check, Trash, Car } from "lucide-react"
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

const profileFormSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface SettingsClientProps {
  user: User;
}

export function SettingsClient({ user }: SettingsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get tab from URL or default to 'profile'
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(tabParam && ['profile', 'accounts', 'billing'].includes(tabParam) 
    ? tabParam 
    : 'profile');
    
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL with new tab value
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);
    router.push(`?${params.toString()}`);
  };
    
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  
  // Check for success/error messages from redirect
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success) {
      if (success.includes('Gmail+connected')) {
        setIsGmailConnected(true);
        toast({
          type: "success",
          description: "Gmail connected successfully.",
        });
      }
    }
    
    if (error) {
      toast({
        type: "error",
        description: error.replace(/\+/g, ' '),
      });
    }
    
    // Check if we should switch to the accounts tab (prompt=connect_gmail)
    const prompt = searchParams.get('prompt');
    if (prompt === 'connect_gmail' && activeTab !== 'accounts') {
      setActiveTab('accounts');
    }
    
    // Check if Gmail is connected
    checkGmailConnection();

  }, [searchParams, activeTab]);
  
  // Function to check if Gmail is connected
  const checkGmailConnection = async () => {
    try {
      const response = await fetch('/api/gmail/status');
      if (response.ok) {
        const data = await response.json();
        setIsGmailConnected(data.connected);
      }
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
    }
  };
  
  // Format date string
  const formatDate = (dateString: Date | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
    },
  });

  async function onSubmit(data: ProfileFormValues) {
    setIsUpdating(true);
    
    try {
      const response = await fetch('/api/users/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      toast({
        type: "success",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        type: "error",
        description: "Failed to update profile. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  }

  const connectGmail = async () => {
    // Redirect to Gmail OAuth flow with return URL that includes the accounts tab
    window.location.href = '/api/gmail/connect?returnTo=' + encodeURIComponent('/settings?tab=accounts');
  };

  const disconnectGmail = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/gmail/disconnect', {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          type: "success",
          description: 'Your Gmail account has been disconnected successfully.',
        });
        setIsGmailConnected(false);
        // Stay on the accounts tab
        handleTabChange('accounts');
      } else {
        toast({
          type: "error",
          description: result.error || 'Failed to disconnect Gmail account.',
        });
      }
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      toast({
        type: "error",
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="lg"
          onClick={() => router.push('/')}
          className="rounded-md font-semibold hover:bg-muted/80"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-6"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          <span className="sr-only">Go back</span>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences.
          </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
          <TabsTrigger value="billing">Billing & Payments</TabsTrigger>
        </TabsList>
        
        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Manage your personal information and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }: { field: any }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }: { field: any }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="mt-4">
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          value={user.email} 
                          disabled 
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormDescription>
                        This is your login email. Contact support if you need to change it.
                      </FormDescription>
                    </FormItem>
                  </div>
                  
                  <Button type="submit" className="mt-6" disabled={isUpdating}>
                    {isUpdating ? "Updating..." : "Update profile"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Connected Accounts Tab */}
        <TabsContent value="accounts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>
                Manage third-party accounts connected to your profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Mail className="size-6" />
                  <div>
                    <div className="font-medium">Gmail</div>
                    <div className="text-sm text-muted-foreground">
                      Allow us to send emails on your behalf
                    </div>
                  </div>
                </div>
                
                {isGmailConnected ? (
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="flex items-center justify-center gap-2 px-3 py-1">
                      <span className="inline-block">Connected</span>
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={disconnectGmail}>
                      <Trash className="size-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={connectGmail}>
                    Connect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Billing Tab */}
        <TabsContent value="billing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Payments</CardTitle>
              <CardDescription>
                View your payment history and manage billing information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {user.stripeCustomerId ? (
                <>
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-5 text-muted-foreground" />
                    <h3 className="font-medium">Payment Methods</h3>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Link href="/api/stripe/portal" className="w-full">
                      <Button className="w-full">
                        Manage payment methods
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-5 text-muted-foreground" />
                    <h3 className="font-medium">Payment History</h3>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Link href="/api/stripe/portal?returnPath=billing/history" className="w-full">
                      <Button variant="outline" className="w-full">
                        View payment history
                      </Button>
                    </Link>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Car className="size-5 text-muted-foreground" />
                      <h3 className="font-medium">Your Car Searches</h3>
                    </div>
                    
                  </div>
                </>
              ) : (
                <div className="p-6 text-center border rounded-lg">
                  <AlertTriangle className="size-10 mx-auto mb-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No payment information</h3>
                  <p className="mb-4 text-muted-foreground">
                    You haven&apos;t made any payments yet. Start a car search to make your first purchase.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
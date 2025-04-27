import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function PaymentCanceledPage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[70vh] py-8 space-y-6 text-center">
      <div className="flex flex-col items-center space-y-4">
        <XCircle className="size-24 text-red-500" />
        <h1 className="text-4xl font-bold">Payment Canceled</h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Your payment was canceled. No charges were made to your account.
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Button asChild variant="default" size="lg">
          <Link href="/">
            Return to Home
          </Link>
        </Button>
        
        <Button asChild variant="outline" size="lg">
          <Link href="/contact">
            Contact Support
          </Link>
        </Button>
      </div>
    </div>
  );
} 
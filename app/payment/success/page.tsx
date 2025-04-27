import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccessPage() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[70vh] py-8 space-y-6 text-center">
      <div className="flex flex-col items-center space-y-4">
        <CheckCircle className="size-24 text-green-500" />
        <h1 className="text-4xl font-bold">Payment Successful!</h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Thank you for your purchase. Your payment has been processed successfully.
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Button asChild variant="default" size="lg">
          <Link href="/">
            Go to Dashboard
          </Link>
        </Button>
        
        <Button asChild variant="outline" size="lg">
          <Link href="/">
            Return to Home
          </Link>
        </Button>
      </div>
    </div>
  );
} 
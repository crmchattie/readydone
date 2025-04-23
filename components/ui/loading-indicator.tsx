import { cn } from '@/lib/utils';

interface LoadingIndicatorProps {
  loading: boolean;
  className?: string;
}

export function LoadingIndicator({ loading, className }: LoadingIndicatorProps) {
  if (!loading) return null;
  
  return (
    <div className={cn(
      "absolute top-0 left-0 w-full h-1 overflow-hidden",
      className
    )}>
      <div 
        className="h-full bg-primary/50 animate-progress"
        style={{
          animation: 'progress 1s infinite linear',
        }}
      />
      <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
} 
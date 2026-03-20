import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceStepperProps {
  steps: string[];
  currentStep: number;
}

export default function ServiceStepper({ steps, currentStep }: ServiceStepperProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = currentStep === stepNum;
        const isDone = currentStep > stepNum;
        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div className={cn(
                'w-8 sm:w-16 h-0.5 mx-1',
                isDone || isActive ? 'bg-primary' : 'bg-muted',
              )} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : isDone
                    ? 'bg-primary/20 text-primary border-primary'
                    : 'bg-muted text-muted-foreground border-muted',
              )}>
                {isDone ? <CheckCircle className="h-4 w-4" /> : stepNum}
              </div>
              <span className={cn(
                'text-[10px] sm:text-xs font-medium whitespace-nowrap',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

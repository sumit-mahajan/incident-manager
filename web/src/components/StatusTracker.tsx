import { Check } from 'lucide-react';
import { cn } from '../lib/cn';
import type { Status } from '../types';

const STEPS: Status[] = ['Open', 'InProgress', 'Resolved', 'Closed'];

const STEP_LABELS: Record<Status, string> = {
  Open: 'Open',
  InProgress: 'In Progress',
  Resolved: 'Resolved',
  Closed: 'Closed',
};

interface StatusTrackerProps {
  current: Status;
  className?: string;
}

export function StatusTracker({ current, className }: StatusTrackerProps) {
  const currentIndex = STEPS.indexOf(current);

  return (
    <ol className={cn('space-y-0', className)}>
      {STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isLast = i === STEPS.length - 1;

        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                data-testid={`status-step-${step}`}
                data-state={isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'}
                className={cn(
                  'flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0',
                  isCompleted && 'bg-accent border-accent',
                  isCurrent && 'border-accent bg-background',
                  !isCompleted && !isCurrent && 'border-surface-border bg-background'
                )}
              >
                {isCompleted && <Check size={12} className="text-accent-foreground" />}
                {isCurrent && <div className="w-2 h-2 rounded-full bg-accent" />}
              </div>
              {!isLast && (
                <div className={cn('w-0.5 flex-1 min-h-[18px]', isCompleted ? 'bg-accent' : 'bg-surface-border')} />
              )}
            </div>
            <div className={cn('pb-4 text-sm', isCurrent ? 'text-foreground font-medium' : isCompleted ? 'text-foreground' : 'text-muted')}>
              {STEP_LABELS[step]}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

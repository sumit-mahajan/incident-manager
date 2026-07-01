import { cn } from '../lib/cn';
import type { Severity, Status } from '../types';

const severityStyles: Record<Severity, string> = {
  Critical: 'bg-[hsl(var(--severity-critical)/0.15)] text-[hsl(var(--severity-critical))] border-[hsl(var(--severity-critical)/0.3)]',
  High: 'bg-[hsl(var(--severity-high)/0.15)] text-[hsl(var(--severity-high))] border-[hsl(var(--severity-high)/0.3)]',
  Medium: 'bg-[hsl(var(--severity-medium)/0.15)] text-[hsl(var(--severity-medium))] border-[hsl(var(--severity-medium)/0.3)]',
  Low: 'bg-[hsl(var(--severity-low)/0.15)] text-[hsl(var(--severity-low))] border-[hsl(var(--severity-low)/0.3)]',
};

const statusStyles: Record<Status, string> = {
  Open: 'bg-[hsl(var(--status-open)/0.15)] text-[hsl(var(--status-open))] border-[hsl(var(--status-open)/0.3)]',
  InProgress: 'bg-[hsl(var(--status-inprogress)/0.15)] text-[hsl(var(--status-inprogress))] border-[hsl(var(--status-inprogress)/0.3)]',
  Resolved: 'bg-[hsl(var(--status-resolved)/0.15)] text-[hsl(var(--status-resolved))] border-[hsl(var(--status-resolved)/0.3)]',
  Closed: 'bg-[hsl(var(--status-closed)/0.15)] text-[hsl(var(--status-closed))] border-[hsl(var(--status-closed)/0.3)]',
};

const statusLabels: Record<Status, string> = {
  Open: 'Open',
  InProgress: 'In Progress',
  Resolved: 'Resolved',
  Closed: 'Closed',
};

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border';

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span className={cn(base, severityStyles[severity], className)}>
      {severity}
    </span>
  );
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(base, statusStyles[status], className)}>
      {statusLabels[status]}
    </span>
  );
}

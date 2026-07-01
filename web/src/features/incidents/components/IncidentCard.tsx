import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { SeverityBadge, StatusBadge } from '../../../components/Badge';
import type { Incident } from '../../../types';

interface Props {
  incident: Incident;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function IncidentCard({ incident }: Props) {
  return (
    <Link
      to={`/incidents/${incident.incidentId}`}
      className="block bg-surface border border-surface-border rounded-lg p-4 hover:border-accent/40 hover:shadow-sm transition-all animate-fade-in"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted">{incident.key}</span>
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
          <p className="text-sm font-medium text-foreground break-words">{incident.title}</p>
          <p className="text-xs text-muted mt-1 line-clamp-2">{incident.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3 text-xs text-muted">
        <Clock size={12} />
        <span>{timeAgo(incident.createdAt)}</span>
        {incident.assigneeId && (
          <span className="ml-2 px-1.5 py-0.5 bg-background rounded text-muted border border-surface-border">
            Assigned
          </span>
        )}
      </div>
    </Link>
  );
}

import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { SeverityBadge, StatusBadge } from '../components/Badge';
import { useIncident, useUpdateStatus, useUpdateAssignee, useUsers, useUserGroups, useGroups } from '../features/incidents/hooks';
import { useUserStore } from '../features/auth/UserStoreProvider';
import type { Status } from '../types';

const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  Open: ['InProgress'],
  InProgress: ['Resolved'],
  Resolved: ['InProgress', 'Closed'],
  Closed: [],
};

const STATUS_LABELS: Record<Status, string> = {
  Open: 'Open',
  InProgress: 'In Progress',
  Resolved: 'Resolved',
  Closed: 'Closed',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { activeUserId } = useUserStore();

  const { data: incident, isLoading, isError } = useIncident(id!);
  const { data: users = [] } = useUsers();
  const { data: groups = [] } = useGroups();
  const { data: activeUserGroups = [] } = useUserGroups(activeUserId);
  const updateStatus = useUpdateStatus(id!);
  const updateAssignee = useUpdateAssignee(id!);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="h-8 w-32 bg-surface rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !incident) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-destructive text-lg">Incident not found.</p>
        <Link to="/incidents" className="text-accent text-sm mt-2 inline-block hover:underline">
          ← Back to incidents
        </Link>
      </div>
    );
  }

  const isTargetGroupMember = activeUserGroups.some((g) => g.groupId === incident.targetGroupId);
  const isAssignee = activeUserId === incident.assigneeId;
  const isReporter = activeUserId === incident.reporterId;

  const canUpdateStatus = isAssignee || isTargetGroupMember;
  const isAlreadyAssignedToMe = activeUserId === incident.assigneeId;

  const transitions = ALLOWED_TRANSITIONS[incident.status];

  const reporter = users.find((u) => u.userId === incident.reporterId);
  const assignee = users.find((u) => u.userId === incident.assigneeId);
  const targetGroup = groups.find((g) => g.groupId === incident.targetGroupId);

  function handleStatusUpdate(newStatus: Status) {
    if (!activeUserId) {
      toast.error('Select a user first');
      return;
    }
    updateStatus.mutate(newStatus);
  }

  function handleSelfAssign() {
    if (!activeUserId) {
      toast.error('Select a user first');
      return;
    }
    updateAssignee.mutate(activeUserId);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Back */}
      <Link
        to="/incidents"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to incidents
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-surface border border-surface-border rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-mono text-muted">{incident.key}</span>
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-3">{incident.title}</h1>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{incident.description}</p>
          </div>

          {/* Timestamps */}
          <div className="bg-surface border border-surface-border rounded-lg p-4 text-sm text-muted space-y-1.5">
            <div className="flex items-center gap-2">
              <Calendar size={13} />
              <span>Created {formatDate(incident.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={13} />
              <span>Updated {formatDate(incident.updatedAt)}</span>
            </div>
            {incident.resolvedAt && (
              <div className="flex items-center gap-2">
                <Calendar size={13} />
                <span>Resolved {formatDate(incident.resolvedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status machine */}
          <div className="bg-surface border border-surface-border rounded-lg p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Status</p>
            <StatusBadge status={incident.status} className="mb-3" />

            {transitions.length > 0 && (
              <div className="space-y-2">
                {canUpdateStatus ? (
                  transitions.map((next) => (
                    <button
                      key={next}
                      onClick={() => handleStatusUpdate(next)}
                      disabled={updateStatus.isPending}
                      className="w-full px-3 py-2 text-sm bg-accent text-accent-foreground rounded-md hover:bg-accent-hover transition-colors disabled:opacity-60"
                    >
                      {next === 'Resolved'
                        ? 'Resolve'
                        : next === 'Closed'
                        ? 'Close'
                        : next === 'InProgress'
                        ? incident.status === 'Open'
                          ? 'Start Work'
                          : 'Reopen'
                        : STATUS_LABELS[next]}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-muted italic">
                    Only the assignee or group members can update status.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Assignment */}
          <div className="bg-surface border border-surface-border rounded-lg p-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Assignment</p>

            <div className="flex items-center gap-2 mb-3">
              <User size={14} className="text-muted" />
              <span className="text-sm text-foreground">
                {assignee ? assignee.name : <span className="text-muted italic">Unassigned</span>}
              </span>
            </div>

            {!isAlreadyAssignedToMe && isTargetGroupMember && activeUserId && (
              <button
                onClick={handleSelfAssign}
                disabled={updateAssignee.isPending}
                className="w-full px-3 py-2 text-sm border border-accent text-accent rounded-md hover:bg-accent/10 transition-colors disabled:opacity-60"
              >
                Self-assign
              </button>
            )}
            {isAlreadyAssignedToMe && (
              <span className="text-xs text-accent font-medium">You are the assignee</span>
            )}
            {!isTargetGroupMember && !isAssignee && (
              <p className="text-xs text-muted italic">
                Only target group members can self-assign.
              </p>
            )}
          </div>

          {/* Meta */}
          <div className="bg-surface border border-surface-border rounded-lg p-4 space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-1">Reporter</p>
              <div className="flex items-center gap-1.5">
                <User size={13} className="text-muted" />
                <span className="text-foreground">{reporter ? reporter.name : '—'}</span>
                {isReporter && <span className="text-xs text-accent">(you)</span>}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wide mb-1">Target group</p>
              <div className="flex items-center gap-1.5">
                <Tag size={13} className="text-muted" />
                <span className="text-foreground">{targetGroup ? targetGroup.name : '—'}</span>
                {isTargetGroupMember && (
                  <span className="text-xs text-accent">(member)</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

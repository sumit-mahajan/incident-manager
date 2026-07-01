import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter } from 'lucide-react';
import { useIncidents, useGroups } from '../features/incidents/hooks';
import { IncidentCard } from '../features/incidents/components/IncidentCard';
import type { Severity, Status } from '../types';

const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES: Status[] = ['Open', 'InProgress', 'Resolved', 'Closed'];
const STATUS_LABELS: Record<Status, string> = {
  Open: 'Open',
  InProgress: 'In Progress',
  Resolved: 'Resolved',
  Closed: 'Closed',
};

export function IncidentListPage() {
  const [q, setQ] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [group, setGroup] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useIncidents({
    q: q || undefined,
    severity: severity || undefined,
    status: status || undefined,
    group: group || undefined,
    page,
    limit: 20,
  });

  const { data: groups = [] } = useGroups();

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  function resetFilters() {
    setQ('');
    setSeverity('');
    setStatus('');
    setGroup('');
    setPage(1);
  }

  const hasFilters = q || severity || status || group;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Incidents</h1>
          {data && (
            <p className="text-sm text-muted mt-0.5">{data.total} total</p>
          )}
        </div>
        <Link
          to="/incidents/new"
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent-hover transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          New Incident
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-surface-border rounded-lg p-4 mb-6 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted mb-2">
          <Filter size={14} />
          Filters
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search title or description…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-surface-border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Severity */}
          <select
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm bg-background border border-surface-border rounded-md text-foreground focus:outline-none focus:border-accent"
          >
            <option value="">All severities</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm bg-background border border-surface-border rounded-md text-foreground focus:outline-none focus:border-accent"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          {/* Group */}
          <select
            value={group}
            onChange={(e) => { setGroup(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm bg-background border border-surface-border rounded-md text-foreground focus:outline-none focus:border-accent"
          >
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g.groupId} value={g.groupId}>{g.name}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-surface border border-surface-border rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="text-center py-16 text-destructive">Failed to load incidents.</div>
      )}

      {!isLoading && !isError && data?.data.length === 0 && (
        <div className="text-center py-16 text-muted">
          <p className="text-lg font-medium mb-1">No incidents found</p>
          <p className="text-sm">Try adjusting your filters or create a new incident.</p>
        </div>
      )}

      {!isLoading && !isError && data && data.data.length > 0 && (
        <div className="space-y-3">
          {data.data.map((incident) => (
            <IncidentCard key={incident.incidentId} incident={incident} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-surface-border rounded-md disabled:opacity-40 hover:bg-surface transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-surface-border rounded-md disabled:opacity-40 hover:bg-surface transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

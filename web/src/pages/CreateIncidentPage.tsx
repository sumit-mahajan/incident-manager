import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateIncident, useGroups } from '../features/incidents/hooks';
import { useUserStore } from '../features/auth/UserStoreProvider';
import type { Severity } from '../types';

const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low'];

export function CreateIncidentPage() {
  const navigate = useNavigate();
  const { activeUserId } = useUserStore();
  const { data: groups = [] } = useGroups();
  const create = useCreateIncident();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('Medium');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (title.trim().length < 5) e.title = 'Title must be at least 5 characters';
    if (description.trim().length < 10) e.description = 'Description must be at least 10 characters';
    if (!targetGroupId) e.targetGroupId = 'Please select a target group';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeUserId) {
      toast.error('Select an acting user from the navbar first');
      return;
    }
    if (!validate()) return;

    try {
      const incident = await create.mutateAsync({ title, description, severity, targetGroupId });
      toast.success(`Incident ${incident.key} created`);
      navigate(`/incidents/${incident.incidentId}`);
    } catch {
      // error toast handled by mutation's onError
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <Link
        to="/incidents"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to incidents
      </Link>

      <h1 className="text-2xl font-semibold text-foreground mb-6">New Incident</h1>

      {!activeUserId && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md">
          Select an acting user in the navbar to report an incident.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief summary of the incident"
            className={`w-full px-3 py-2 text-sm bg-surface border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors ${
              errors.title ? 'border-destructive' : 'border-surface-border'
            }`}
          />
          {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Description <span className="text-destructive">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description: what happened, impact, steps to reproduce…"
            rows={5}
            className={`w-full px-3 py-2 text-sm bg-surface border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-y ${
              errors.description ? 'border-destructive' : 'border-surface-border'
            }`}
          />
          {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
        </div>

        {/* Severity + Group */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Severity <span className="text-destructive">*</span>
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
              className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-md text-foreground focus:outline-none focus:border-accent"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Target group <span className="text-destructive">*</span>
            </label>
            <select
              value={targetGroupId}
              onChange={(e) => setTargetGroupId(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-surface border rounded-md text-foreground focus:outline-none focus:border-accent transition-colors ${
                errors.targetGroupId ? 'border-destructive' : 'border-surface-border'
              }`}
            >
              <option value="">Select a group…</option>
              {groups.map((g) => (
                <option key={g.groupId} value={g.groupId}>
                  {g.name}
                </option>
              ))}
            </select>
            {errors.targetGroupId && (
              <p className="mt-1 text-xs text-destructive">{errors.targetGroupId}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={create.isPending || !activeUserId}
            className="px-5 py-2 bg-accent text-accent-foreground text-sm font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {create.isPending ? 'Creating…' : 'Create Incident'}
          </button>
          <Link
            to="/incidents"
            className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

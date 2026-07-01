import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateIncident,
  useGroups,
  useSuggestIncident,
  useIntakeIncident,
} from '../features/incidents/hooks';
import { useUserStore } from '../features/auth/UserStoreProvider';
import { ApiError } from '../lib/apiClient';
import type { Severity } from '../types';

const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low'];
const MIN_DESCRIPTION_FOR_SUGGEST = 20;
const MIN_INTAKE_TEXT = 20;

export function CreateIncidentPage() {
  const navigate = useNavigate();
  const { activeUserId } = useUserStore();
  const { data: groups = [] } = useGroups();
  const create = useCreateIncident();
  const suggest = useSuggestIncident();
  const intake = useIntakeIncident();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('Medium');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aiSuggested, setAiSuggested] = useState(false);
  const [intakeText, setIntakeText] = useState('');
  const [intakeParsed, setIntakeParsed] = useState(false);

  async function handleSuggest() {
    try {
      const suggestion = await suggest.mutateAsync(description);
      setSeverity(suggestion.severity);
      setTargetGroupId(suggestion.targetGroupId);
      setAiSuggested(true);
    } catch {
      // error state rendered from suggest.isError below
    }
  }

  async function handleIntake() {
    try {
      const { parsed } = await intake.mutateAsync(intakeText);
      setTitle(parsed.title);
      setDescription(parsed.description);
      setSeverity(parsed.severity);
      setTargetGroupId(parsed.targetGroupId);
      setAiSuggested(true);
      setIntakeParsed(true);
    } catch {
      // error state rendered from intake.isError below
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (title.trim().length < 5) e.title = 'Title must be at least 5 characters';
    if (description.trim().length < 10)
      e.description = 'Description must be at least 10 characters';
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
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR' && err.details) {
        const fieldErrors = err.details as Record<string, string[] | undefined>;
        setErrors((prev) => {
          const next = { ...prev };
          for (const [field, messages] of Object.entries(fieldErrors)) {
            if (messages?.length) next[field] = messages[0];
          }
          return next;
        });
      }
      // toast handled by mutation's onError
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

      {/* Natural-language intake */}
      <div className="mb-6 p-4 bg-surface border border-surface-border rounded-lg">
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
          <Wand2 size={14} className="text-accent" />
          Describe it in plain English
        </label>
        <textarea
          value={intakeText}
          onChange={(e) => setIntakeText(e.target.value)}
          placeholder="e.g. nightly DB refresh failed in prod, customers can't see balances"
          rows={2}
          className="w-full px-3 py-2 text-sm bg-background border border-surface-border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-y"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleIntake}
            disabled={intakeText.trim().length < MIN_INTAKE_TEXT || intake.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-accent-foreground rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={13} />
            {intake.isPending ? 'Parsing…' : 'Parse with AI'}
          </button>
          {intake.isError && (
            <span className="text-xs text-destructive">
              Could not parse that. Please fill the form manually below.
            </span>
          )}
        </div>
        {intakeParsed && (
          <p className="mt-2 text-xs text-accent">
            Parsed into the form below — review the fields and confirm by clicking Create
            Incident.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIntakeParsed(false);
            }}
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
            onChange={(e) => {
              setDescription(e.target.value);
              setIntakeParsed(false);
            }}
            placeholder="Detailed description: what happened, impact, steps to reproduce…"
            rows={5}
            className={`w-full px-3 py-2 text-sm bg-surface border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-y ${
              errors.description ? 'border-destructive' : 'border-surface-border'
            }`}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-destructive">{errors.description}</p>
          )}

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSuggest}
              disabled={
                description.trim().length < MIN_DESCRIPTION_FOR_SUGGEST || suggest.isPending
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface border border-surface-border rounded-md text-foreground hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles size={13} />
              {suggest.isPending ? 'Suggesting…' : 'Suggest with AI'}
            </button>
            {suggest.isError && (
              <span className="text-xs text-destructive">
                AI suggestion failed. You can fill severity and group manually.
              </span>
            )}
          </div>
        </div>

        {/* Severity + Group */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
              Severity <span className="text-destructive">*</span>
              {aiSuggested && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded bg-accent/15 text-accent">
                  AI-suggested
                </span>
              )}
            </label>
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value as Severity);
                setAiSuggested(false);
              }}
              className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-md text-foreground focus:outline-none focus:border-accent"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
              Target group <span className="text-destructive">*</span>
              {aiSuggested && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded bg-accent/15 text-accent">
                  AI-suggested
                </span>
              )}
            </label>
            <select
              value={targetGroupId}
              onChange={(e) => {
                setTargetGroupId(e.target.value);
                setAiSuggested(false);
              }}
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

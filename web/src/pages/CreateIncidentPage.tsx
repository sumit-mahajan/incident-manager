import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
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

const createIncidentSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
  targetGroupId: z.string().min(1, 'Please select a target group'),
});

function fieldErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return String(error);
}

export function CreateIncidentPage() {
  const navigate = useNavigate();
  const { activeUserId } = useUserStore();
  const { data: groups = [] } = useGroups();
  const create = useCreateIncident();
  const suggest = useSuggestIncident();
  const intake = useIntakeIncident();

  const [aiSuggested, setAiSuggested] = useState(false);
  const [intakeText, setIntakeText] = useState('');
  const [intakeParsed, setIntakeParsed] = useState(false);

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      severity: 'Medium' as Severity,
      targetGroupId: '',
    },
    validators: { onChange: createIncidentSchema },
    onSubmit: async ({ value }) => {
      if (!activeUserId) {
        toast.error('Select an acting user from the navbar first');
        return;
      }
      try {
        const incident = await create.mutateAsync(value);
        toast.success(`Incident ${incident.key} created`);
        navigate(`/incidents/${incident.incidentId}`);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'VALIDATION_ERROR' && err.details) {
          const fieldErrors = err.details as Record<string, string[] | undefined>;
          const fields: Record<string, string> = {};
          for (const [field, messages] of Object.entries(fieldErrors)) {
            if (messages?.length) fields[field] = messages[0];
          }
          form.setErrorMap({ onSubmit: { fields } });
        }
        // toast handled by mutation's onError
      }
    },
  });

  async function handleSuggest() {
    try {
      const suggestion = await suggest.mutateAsync(form.getFieldValue('description'));
      form.setFieldValue('severity', suggestion.severity);
      form.setFieldValue('targetGroupId', suggestion.targetGroupId);
      setAiSuggested(true);
    } catch {
      // error state rendered from suggest.isError below
    }
  }

  async function handleIntake() {
    try {
      const { parsed } = await intake.mutateAsync(intakeText);
      form.setFieldValue('title', parsed.title);
      form.setFieldValue('description', parsed.description);
      form.setFieldValue('severity', parsed.severity);
      form.setFieldValue('targetGroupId', parsed.targetGroupId);
      setAiSuggested(true);
      setIntakeParsed(true);
    } catch {
      // error state rendered from intake.isError below
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className="space-y-5"
      >
        {/* Title */}
        <form.Field name="title">
          {(field) => (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  setIntakeParsed(false);
                }}
                onBlur={field.handleBlur}
                placeholder="Brief summary of the incident"
                className={`w-full px-3 py-2 text-sm bg-surface border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors ${
                  field.state.meta.errors.length ? 'border-destructive' : 'border-surface-border'
                }`}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="mt-1 text-xs text-destructive">
                  {fieldErrorMessage(field.state.meta.errors[0])}
                </p>
              )}
            </div>
          )}
        </form.Field>

        {/* Description */}
        <form.Field name="description">
          {(field) => (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Description <span className="text-destructive">*</span>
              </label>
              <textarea
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value);
                  setIntakeParsed(false);
                }}
                onBlur={field.handleBlur}
                placeholder="Detailed description: what happened, impact, steps to reproduce…"
                rows={5}
                className={`w-full px-3 py-2 text-sm bg-surface border rounded-md text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors resize-y ${
                  field.state.meta.errors.length ? 'border-destructive' : 'border-surface-border'
                }`}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="mt-1 text-xs text-destructive">
                  {fieldErrorMessage(field.state.meta.errors[0])}
                </p>
              )}

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSuggest}
                  disabled={
                    field.state.value.trim().length < MIN_DESCRIPTION_FOR_SUGGEST ||
                    suggest.isPending
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
          )}
        </form.Field>

        {/* Severity + Group */}
        <div className="grid grid-cols-2 gap-4">
          <form.Field name="severity">
            {(field) => (
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
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value as Severity);
                    setAiSuggested(false);
                  }}
                  onBlur={field.handleBlur}
                  className="w-full px-3 py-2 text-sm bg-surface border border-surface-border rounded-md text-foreground focus:outline-none focus:border-accent"
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form.Field>

          <form.Field name="targetGroupId">
            {(field) => (
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
                  value={field.state.value}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                    setAiSuggested(false);
                  }}
                  onBlur={field.handleBlur}
                  className={`w-full px-3 py-2 text-sm bg-surface border rounded-md text-foreground focus:outline-none focus:border-accent transition-colors ${
                    field.state.meta.errors.length ? 'border-destructive' : 'border-surface-border'
                  }`}
                >
                  <option value="">Select a group…</option>
                  {groups.map((g) => (
                    <option key={g.groupId} value={g.groupId}>
                      {g.name}
                    </option>
                  ))}
                </select>
                {field.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-xs text-destructive">
                    {fieldErrorMessage(field.state.meta.errors[0])}
                  </p>
                )}
              </div>
            )}
          </form.Field>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <button
                type="submit"
                disabled={create.isPending || isSubmitting || !activeUserId}
                className="px-5 py-2 bg-accent text-accent-foreground text-sm font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-60"
              >
                {create.isPending ? 'Creating…' : 'Create Incident'}
              </button>
            )}
          </form.Subscribe>
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

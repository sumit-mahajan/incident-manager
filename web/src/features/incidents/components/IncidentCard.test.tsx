import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IncidentCard } from './IncidentCard';
import type { Incident } from '../../../types';

function makeIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    incidentId: 'inc-1',
    key: 'INC-1042',
    title: 'Nightly DB refresh failed',
    description: 'Customers cannot see balances after the refresh job failed.',
    severity: 'Critical',
    status: 'Open',
    reporterId: 'user-1',
    assigneeId: null,
    targetGroupId: 'group-1',
    resolvedAt: null,
    aiSummary: null,
    aiSummaryGeneratedAt: null,
    aiRootCause: null,
    aiRootCauseGeneratedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderCard(incident: Incident) {
  return render(
    <MemoryRouter>
      <IncidentCard incident={incident} />
    </MemoryRouter>
  );
}

describe('IncidentCard', () => {
  afterEach(() => vi.useRealTimers());

  it('renders key, title, severity and status', () => {
    renderCard(makeIncident());
    expect(screen.getByText('INC-1042')).toBeInTheDocument();
    expect(screen.getByText('Nightly DB refresh failed')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('links to the incident detail page', () => {
    renderCard(makeIncident());
    expect(screen.getByRole('link')).toHaveAttribute('href', '/incidents/inc-1');
  });

  it('shows an "Assigned" indicator only when an assignee is set', () => {
    renderCard(makeIncident({ assigneeId: null }));
    expect(screen.queryByText('Assigned')).not.toBeInTheDocument();

    renderCard(makeIncident({ assigneeId: 'user-2' }));
    expect(screen.getByText('Assigned')).toBeInTheDocument();
  });

  it('formats recency in minutes, hours, or days as appropriate', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T12:00:00Z'));

    renderCard(makeIncident({ createdAt: new Date('2026-07-01T11:30:00Z').toISOString() }));
    expect(screen.getByText('30m ago')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/utils';
import { IncidentListPage } from './IncidentListPage';
import * as hooks from '../features/incidents/hooks';
import type { Incident } from '../types';

vi.mock('../features/incidents/hooks', async () => {
  const actual = await vi.importActual<typeof import('../features/incidents/hooks')>(
    '../features/incidents/hooks'
  );
  return { ...actual, useIncidents: vi.fn(), useGroups: vi.fn() };
});

const groups = [{ groupId: 'group-1', name: 'DBA', description: '', createdAt: '2026-01-01' }];

function makeIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    incidentId: 'inc-1',
    key: 'INC-1',
    title: 'Nightly DB refresh failed',
    description: 'Balances not visible',
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

describe('IncidentListPage', () => {
  beforeEach(() => {
    vi.mocked(hooks.useGroups).mockReturnValue({ data: groups } as never);
  });

  it('shows a loading state while fetching', () => {
    vi.mocked(hooks.useIncidents).mockReturnValue({ isLoading: true, isError: false, data: undefined } as never);
    renderWithProviders(<IncidentListPage />);
    expect(screen.queryByText(/No incidents found/i)).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no results', () => {
    vi.mocked(hooks.useIncidents).mockReturnValue({
      isLoading: false,
      isError: false,
      data: { data: [], total: 0, page: 1, limit: 20 },
    } as never);
    renderWithProviders(<IncidentListPage />);
    expect(screen.getByText('No incidents found')).toBeInTheDocument();
  });

  it('shows an error state when the fetch fails', () => {
    vi.mocked(hooks.useIncidents).mockReturnValue({ isLoading: false, isError: true, data: undefined } as never);
    renderWithProviders(<IncidentListPage />);
    expect(screen.getByText(/Failed to load incidents/i)).toBeInTheDocument();
  });

  it('renders incident cards and the total count when data is present', () => {
    vi.mocked(hooks.useIncidents).mockReturnValue({
      isLoading: false,
      isError: false,
      data: { data: [makeIncident()], total: 1, page: 1, limit: 20 },
    } as never);
    renderWithProviders(<IncidentListPage />);
    expect(screen.getByText('1 total')).toBeInTheDocument();
    expect(screen.getByText('Nightly DB refresh failed')).toBeInTheDocument();
  });

  it('shows a Clear button once a filter is applied', () => {
    vi.mocked(hooks.useIncidents).mockReturnValue({
      isLoading: false,
      isError: false,
      data: { data: [], total: 0, page: 1, limit: 20 },
    } as never);
    renderWithProviders(<IncidentListPage />);

    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Search title or description/i), {
      target: { value: 'db' },
    });
    fireEvent.click(screen.getByText('Search'));
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });
});

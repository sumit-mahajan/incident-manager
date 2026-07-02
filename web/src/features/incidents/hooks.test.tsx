import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useUpdateStatus } from './hooks';
import { incidentService } from './services';
import type { Incident } from '../../types';

vi.mock('./services', async () => {
  const actual = await vi.importActual<typeof import('./services')>('./services');
  return {
    ...actual,
    incidentService: { ...actual.incidentService, updateStatus: vi.fn() },
  };
});

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function makeIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    incidentId: 'inc-1',
    key: 'INC-1',
    title: 'Nightly DB refresh failed',
    description: 'Balances not visible',
    severity: 'Critical',
    status: 'Open',
    reporterId: 'user-1',
    assigneeId: 'user-1',
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

describe('useUpdateStatus optimistic update', () => {
  beforeEach(() => vi.clearAllMocks());

  function setup(incident: Incident) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(['incident', incident.incidentId], incident);
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }
    const { result } = renderHook(() => useUpdateStatus(incident.incidentId), { wrapper });
    return { queryClient, result };
  }

  it('applies the new status immediately, before the request resolves', async () => {
    const incident = makeIncident({ status: 'Open' });
    let resolveRequest!: (value: Incident) => void;
    vi.mocked(incidentService.updateStatus).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const { queryClient, result } = setup(incident);

    act(() => {
      result.current.mutate('InProgress');
    });

    await waitFor(() => {
      expect(queryClient.getQueryData<Incident>(['incident', incident.incidentId])?.status).toBe('InProgress');
    });

    resolveRequest({ ...incident, status: 'InProgress' });
  });

  it('rolls back to the previous status when the request fails', async () => {
    const incident = makeIncident({ status: 'Open' });
    vi.mocked(incidentService.updateStatus).mockRejectedValue(new Error('network error'));
    const { queryClient, result } = setup(incident);

    act(() => {
      result.current.mutate('InProgress');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<Incident>(['incident', incident.incidentId])?.status).toBe('Open');
  });
});

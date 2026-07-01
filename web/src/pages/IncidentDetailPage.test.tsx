import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../test/utils';
import { IncidentDetailPage } from './IncidentDetailPage';
import * as hooks from '../features/incidents/hooks';
import type { Incident } from '../types';

vi.mock('../features/incidents/hooks', async () => {
  const actual = await vi.importActual<typeof import('../features/incidents/hooks')>(
    '../features/incidents/hooks'
  );
  return {
    ...actual,
    useIncident: vi.fn(),
    useUsers: vi.fn(),
    useGroups: vi.fn(),
    useUserGroups: vi.fn(),
    useUpdateStatus: vi.fn(),
    useUpdateAssignee: vi.fn(),
  };
});

const users = [{ userId: 'user-1', name: 'Alice', email: 'a@x.com', createdAt: '' }];
const groups = [{ groupId: 'group-1', name: 'DBA', description: '', createdAt: '' }];

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

function renderDetail(incident: Incident, activeUserId: string | null) {
  if (activeUserId) localStorage.setItem('incidenthub-user-id', activeUserId);

  vi.mocked(hooks.useIncident).mockReturnValue({ data: incident, isLoading: false, isError: false } as never);
  vi.mocked(hooks.useUsers).mockReturnValue({ data: users } as never);
  vi.mocked(hooks.useGroups).mockReturnValue({ data: groups } as never);
  vi.mocked(hooks.useUserGroups).mockReturnValue({
    data: activeUserId === 'user-1' ? groups : [],
  } as never);
  const updateStatus = { mutate: vi.fn(), isPending: false };
  const updateAssignee = { mutate: vi.fn(), isPending: false };
  vi.mocked(hooks.useUpdateStatus).mockReturnValue(updateStatus as never);
  vi.mocked(hooks.useUpdateAssignee).mockReturnValue(updateAssignee as never);

  renderWithProviders(
    <Routes>
      <Route path="/incidents/:id" element={<IncidentDetailPage />} />
    </Routes>,
    { route: '/incidents/inc-1' }
  );

  return { updateStatus, updateAssignee };
}

describe('IncidentDetailPage RBAC-driven UI', () => {
  beforeEach(() => localStorage.clear());

  it('allows a target-group member to update status and shows the next transition', () => {
    renderDetail(makeIncident({ status: 'Open' }), 'user-1');
    expect(screen.getByRole('button', { name: 'Start Work' })).toBeInTheDocument();
  });

  it('blocks status updates for a user outside the target group and assignee', () => {
    renderDetail(makeIncident({ status: 'Open' }), 'user-2');
    expect(screen.queryByRole('button', { name: 'Start Work' })).not.toBeInTheDocument();
    expect(screen.getByText(/Only the assignee or group members can update status/i)).toBeInTheDocument();
  });

  it('calls updateStatus.mutate with the target status when a transition button is clicked', () => {
    const { updateStatus } = renderDetail(makeIncident({ status: 'Open' }), 'user-1');
    fireEvent.click(screen.getByRole('button', { name: 'Start Work' }));
    expect(updateStatus.mutate).toHaveBeenCalledWith('InProgress');
  });

  it('shows a self-assign button for target-group members who are not yet the assignee', () => {
    renderDetail(makeIncident({ assigneeId: null }), 'user-1');
    expect(screen.getByRole('button', { name: 'Self-assign' })).toBeInTheDocument();
  });

  it('hides self-assign for non-members and shows a hint instead', () => {
    renderDetail(makeIncident({ assigneeId: null }), 'user-2');
    expect(screen.queryByRole('button', { name: 'Self-assign' })).not.toBeInTheDocument();
    expect(screen.getByText(/Only target group members can self-assign/i)).toBeInTheDocument();
  });

  it('shows no transition buttons for a Closed incident', () => {
    renderDetail(makeIncident({ status: 'Closed' }), 'user-1');
    expect(screen.queryByRole('button', { name: /Start Work|Resolve|Close|Reopen/ })).not.toBeInTheDocument();
  });
});

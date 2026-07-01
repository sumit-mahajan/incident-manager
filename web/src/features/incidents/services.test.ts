import { describe, it, expect, vi } from 'vitest';
import { api } from '../../lib/apiClient';
import { incidentService, userService, groupService } from './services';

vi.mock('../../lib/apiClient', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

describe('incidentService.list', () => {
  it('builds a query string only from provided filters', () => {
    incidentService.list({ severity: 'Critical', page: 2, limit: 20 });
    expect(api.get).toHaveBeenCalledWith('/incidents?severity=Critical&page=2&limit=20');
  });

  it('requests the bare endpoint when no filters are set', () => {
    incidentService.list({});
    expect(api.get).toHaveBeenCalledWith('/incidents');
  });

  it('includes the search query and group/status filters when present', () => {
    incidentService.list({ q: 'db refresh', status: 'Open', group: 'group-1' });
    expect(api.get).toHaveBeenCalledWith('/incidents?status=Open&group=group-1&q=db+refresh');
  });
});

describe('incidentService mutations', () => {
  it('creates an incident via POST /incidents', () => {
    const body = { title: 't', description: 'd', severity: 'Low', targetGroupId: 'g1' };
    incidentService.create(body);
    expect(api.post).toHaveBeenCalledWith('/incidents', body);
  });

  it('updates status via PATCH /incidents/:id/status', () => {
    incidentService.updateStatus('inc-1', 'InProgress');
    expect(api.patch).toHaveBeenCalledWith('/incidents/inc-1/status', { status: 'InProgress' });
  });

  it('updates assignee via PATCH /incidents/:id/assignee', () => {
    incidentService.updateAssignee('inc-1', 'user-1');
    expect(api.patch).toHaveBeenCalledWith('/incidents/inc-1/assignee', { assigneeId: 'user-1' });
  });
});

describe('userService and groupService', () => {
  it('lists users', () => {
    userService.list();
    expect(api.get).toHaveBeenCalledWith('/users');
  });

  it('gets a user’s groups', () => {
    userService.getGroups('user-1');
    expect(api.get).toHaveBeenCalledWith('/users/user-1/groups');
  });

  it('lists groups', () => {
    groupService.list();
    expect(api.get).toHaveBeenCalledWith('/groups');
  });
});

import { describe, it, expect } from 'vitest';
import { canSelfAssign, canUpdateStatus, canEditFields } from './permissions';
import type { CurrentUser, Incident } from './types';

const makeUser = (id: string): CurrentUser => ({ userId: id, name: 'Test User', email: 'test@example.com' });

const makeIncident = (overrides: Partial<Incident> = {}): Incident => ({
  incidentId: 'inc-1',
  key: 'INC-1',
  title: 'DB refresh failed',
  description: 'Nightly refresh did not complete',
  severity: 'High',
  status: 'Open',
  reporterId: 'reporter-id',
  assigneeId: null,
  targetGroupId: 'group-dba',
  resolvedAt: null,
  aiSummary: null,
  aiSummaryGeneratedAt: null,
  aiRootCause: null,
  aiRootCauseGeneratedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('canSelfAssign', () => {
  it('returns true for a target-group member', () => {
    expect(canSelfAssign(makeUser('u1'), makeIncident(), true)).toBe(true);
  });

  it('returns false for a non-member', () => {
    expect(canSelfAssign(makeUser('u1'), makeIncident(), false)).toBe(false);
  });
});

describe('canUpdateStatus', () => {
  it('returns true for the current assignee', () => {
    const user = makeUser('assignee-id');
    const incident = makeIncident({ assigneeId: 'assignee-id' });
    expect(canUpdateStatus(user, incident, false)).toBe(true);
  });

  it('returns true for a target-group member who is not the assignee', () => {
    const user = makeUser('member-id');
    const incident = makeIncident({ assigneeId: 'someone-else' });
    expect(canUpdateStatus(user, incident, true)).toBe(true);
  });

  it('returns false for non-assignee non-member', () => {
    const user = makeUser('stranger');
    const incident = makeIncident({ assigneeId: 'someone-else' });
    expect(canUpdateStatus(user, incident, false)).toBe(false);
  });
});

describe('canEditFields', () => {
  it('returns true for the reporter', () => {
    const user = makeUser('reporter-id');
    expect(canEditFields(user, makeIncident(), false)).toBe(true);
  });

  it('returns true for a target-group member who is not the reporter', () => {
    const user = makeUser('member-id');
    expect(canEditFields(user, makeIncident(), true)).toBe(true);
  });

  it('returns false for non-reporter non-member', () => {
    const user = makeUser('stranger');
    expect(canEditFields(user, makeIncident(), false)).toBe(false);
  });
});

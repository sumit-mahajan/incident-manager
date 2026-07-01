import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IncidentService } from './incidentService';
import type { IncidentRepository, GroupRepository, LlmClient } from '../../domain/ports';
import type { Incident, Group, CurrentUser } from '../../domain/types';
import { NotFoundError, ForbiddenError, IllegalTransitionError, ValidationError, AiUnavailableError, ParseFailedError } from '../../domain/errors';

const GROUP_ID = '00000000-0000-0000-0000-000000000001';
const INC_ID = '00000000-0000-0000-0000-000000000010';
const USER_1 = '00000000-0000-0000-0000-000000000100';

const currentUser: CurrentUser = { userId: USER_1, name: 'Alice', email: 'alice@example.com' };

const mockGroup = (): Group => ({
  groupId: GROUP_ID,
  name: 'DBA',
  description: 'Database administrators',
  createdAt: new Date(),
});

const mockIncident = (overrides: Partial<Incident> = {}): Incident => ({
  incidentId: INC_ID,
  key: 'INC-1',
  title: 'DB refresh failed',
  description: 'Nightly refresh did not complete',
  severity: 'High',
  status: 'Open',
  reporterId: USER_1,
  assigneeId: null,
  targetGroupId: GROUP_ID,
  resolvedAt: null,
  aiSummary: null,
  aiSummaryGeneratedAt: null,
  aiRootCause: null,
  aiRootCauseGeneratedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

function makeRepos(
  incidentOverrides: Partial<IncidentRepository> = {},
  groupOverrides: Partial<GroupRepository> = {},
  llmOverrides: Partial<LlmClient> = {},
): { incidentRepo: IncidentRepository; groupRepo: GroupRepository; llmClient: LlmClient } {
  const incidentRepo: IncidentRepository = {
    nextKey: vi.fn().mockResolvedValue('INC-1'),
    create: vi.fn().mockResolvedValue(mockIncident()),
    findById: vi.fn().mockResolvedValue(mockIncident()),
    findMany: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
    update: vi.fn().mockImplementation(async (_id, patch) => ({ ...mockIncident(), ...patch })),
    updateAiCache: vi.fn().mockResolvedValue(undefined),
    ...incidentOverrides,
  };
  const groupRepo: GroupRepository = {
    findAll: vi.fn().mockResolvedValue([mockGroup()]),
    findById: vi.fn().mockResolvedValue(mockGroup()),
    isMember: vi.fn().mockResolvedValue(true),
    ...groupOverrides,
  };
  const llmClient: LlmClient = {
    suggestSeverityAndRouting: vi.fn().mockResolvedValue({ severity: 'High', targetGroupId: GROUP_ID }),
    summarize: vi.fn().mockResolvedValue('A concise incident summary.'),
    suggestRootCause: vi.fn().mockResolvedValue(['Cause A', 'Cause B']),
    parseIntake: vi.fn().mockResolvedValue({
      title: 'DB refresh failed overnight',
      description: 'The nightly refresh job failed, balances are stale',
      severity: 'High',
      targetGroupId: GROUP_ID,
    }),
    ...llmOverrides,
  };
  return { incidentRepo, groupRepo, llmClient };
}

describe('IncidentService.create', () => {
  it('creates an incident with reporterId from currentUser', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos();
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await svc.create(currentUser, {
      title: 'DB refresh failed',
      description: 'Nightly refresh did not complete',
      severity: 'High',
      targetGroupId: GROUP_ID,
    });
    expect(incidentRepo.create).toHaveBeenCalledWith(expect.objectContaining({ reporterId: USER_1 }));
  });

  it('throws ValidationError for a non-existent group', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos({}, { findById: vi.fn().mockResolvedValue(null) });
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await expect(
      svc.create(currentUser, {
        title: 'Test title here',
        description: 'Something broke in production today',
        severity: 'Low',
        targetGroupId: GROUP_ID,
      }),
    ).rejects.toThrow(ValidationError);
  });
});

describe('IncidentService.findById', () => {
  it('returns the incident', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos();
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    const result = await svc.findById(INC_ID);
    expect(result.incidentId).toBe(INC_ID);
  });

  it('throws NotFoundError when incident does not exist', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos({ findById: vi.fn().mockResolvedValue(null) });
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await expect(svc.findById('missing-id')).rejects.toThrow(NotFoundError);
  });
});

describe('IncidentService.updateStatus', () => {
  it('applies a legal transition', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos();
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await svc.updateStatus(currentUser, INC_ID, 'InProgress');
    expect(incidentRepo.update).toHaveBeenCalledWith(INC_ID, expect.objectContaining({ status: 'InProgress' }));
  });

  it('sets resolvedAt on first resolution', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos({
      findById: vi.fn().mockResolvedValue(mockIncident({ status: 'InProgress', resolvedAt: null })),
    });
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await svc.updateStatus(currentUser, INC_ID, 'Resolved');
    expect(incidentRepo.update).toHaveBeenCalledWith(
      INC_ID,
      expect.objectContaining({ resolvedAt: expect.any(Date) }),
    );
  });

  it('does not overwrite existing resolvedAt on reopen → re-resolve', async () => {
    const existing = new Date('2025-01-01');
    const { incidentRepo, groupRepo, llmClient } = makeRepos({
      findById: vi.fn().mockResolvedValue(mockIncident({ status: 'InProgress', resolvedAt: existing })),
    });
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await svc.updateStatus(currentUser, INC_ID, 'Resolved');
    const patch = (incidentRepo.update as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(patch.resolvedAt).toBeUndefined();
  });

  it('throws IllegalTransitionError for Open → Closed', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos();
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await expect(svc.updateStatus(currentUser, INC_ID, 'Closed')).rejects.toThrow(IllegalTransitionError);
  });

  it('throws ForbiddenError when user is neither assignee nor group member', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos(
      { findById: vi.fn().mockResolvedValue(mockIncident({ assigneeId: 'someone-else' })) },
      { isMember: vi.fn().mockResolvedValue(false) },
    );
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await expect(svc.updateStatus(currentUser, INC_ID, 'InProgress')).rejects.toThrow(ForbiddenError);
  });
});

describe('IncidentService.updateAssignee', () => {
  it('allows a group member to self-assign', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos();
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await svc.updateAssignee(currentUser, INC_ID, USER_1);
    expect(incidentRepo.update).toHaveBeenCalledWith(INC_ID, expect.objectContaining({ assigneeId: USER_1 }));
  });

  it('throws ForbiddenError when trying to assign another user', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos();
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await expect(svc.updateAssignee(currentUser, INC_ID, 'other-user-id')).rejects.toThrow(ForbiddenError);
  });

  it('throws ForbiddenError for non-group-member self-assign', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos({}, { isMember: vi.fn().mockResolvedValue(false) });
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await expect(svc.updateAssignee(currentUser, INC_ID, USER_1)).rejects.toThrow(ForbiddenError);
  });

  it('allows clearing the assignee (null)', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos();
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await svc.updateAssignee(currentUser, INC_ID, null);
    expect(incidentRepo.update).toHaveBeenCalledWith(INC_ID, expect.objectContaining({ assigneeId: null }));
  });
});

describe('IncidentService.updateFields', () => {
  it('allows the reporter to edit fields', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos({}, { isMember: vi.fn().mockResolvedValue(false) });
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await svc.updateFields(currentUser, INC_ID, { title: 'Updated title here' });
    expect(incidentRepo.update).toHaveBeenCalledWith(INC_ID, expect.objectContaining({ title: 'Updated title here' }));
  });

  it('throws ForbiddenError for non-reporter non-member', async () => {
    const stranger: CurrentUser = { userId: 'stranger', name: 'Bob', email: 'bob@example.com' };
    const { incidentRepo, groupRepo, llmClient } = makeRepos({}, { isMember: vi.fn().mockResolvedValue(false) });
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await expect(svc.updateFields(stranger, INC_ID, { title: 'Sneaky edit' })).rejects.toThrow(ForbiddenError);
  });
});

describe('IncidentService.suggestSeverityAndRouting', () => {
  it('returns the suggestion with the resolved group name', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos();
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    const result = await svc.suggestSeverityAndRouting('Nightly DB refresh failed, customers cannot see balances');
    expect(result).toEqual({ severity: 'High', targetGroupId: GROUP_ID, targetGroupName: 'DBA' });
    expect(llmClient.suggestSeverityAndRouting).toHaveBeenCalledWith(expect.any(String), [expect.objectContaining({ groupId: GROUP_ID })]);
  });

  it('propagates AiUnavailableError when the LLM call fails', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos({}, {}, {
      suggestSeverityAndRouting: vi.fn().mockRejectedValue(new AiUnavailableError()),
    });
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await expect(svc.suggestSeverityAndRouting('Nightly DB refresh failed in production today')).rejects.toThrow(
      AiUnavailableError,
    );
  });
});

describe('IncidentService.generateSummary', () => {
  it('persists the summary via updateAiCache and returns it', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos();
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    const result = await svc.generateSummary(INC_ID);
    expect(result.aiSummary).toBe('A concise incident summary.');
    expect(incidentRepo.updateAiCache).toHaveBeenCalledWith(
      INC_ID,
      expect.objectContaining({ aiSummary: 'A concise incident summary.', aiSummaryGeneratedAt: expect.any(Date) }),
    );
  });

  it('throws NotFoundError for a missing incident', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos({ findById: vi.fn().mockResolvedValue(null) });
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await expect(svc.generateSummary('missing-id')).rejects.toThrow(NotFoundError);
  });

  it('does not touch the cache when the LLM call fails', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos({}, {}, {
      summarize: vi.fn().mockRejectedValue(new AiUnavailableError()),
    });
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await expect(svc.generateSummary(INC_ID)).rejects.toThrow(AiUnavailableError);
    expect(incidentRepo.updateAiCache).not.toHaveBeenCalled();
  });
});

describe('IncidentService.generateRootCause', () => {
  it('persists root-cause hypotheses via updateAiCache and returns them', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos();
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    const result = await svc.generateRootCause(INC_ID);
    expect(result.aiRootCause).toEqual(['Cause A', 'Cause B']);
    expect(incidentRepo.updateAiCache).toHaveBeenCalledWith(
      INC_ID,
      expect.objectContaining({ aiRootCause: ['Cause A', 'Cause B'], aiRootCauseGeneratedAt: expect.any(Date) }),
    );
  });

  it('throws NotFoundError for a missing incident', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos({ findById: vi.fn().mockResolvedValue(null) });
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await expect(svc.generateRootCause('missing-id')).rejects.toThrow(NotFoundError);
  });

  it('does not touch the cache when the LLM call fails', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos({}, {}, {
      suggestRootCause: vi.fn().mockRejectedValue(new AiUnavailableError()),
    });
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await expect(svc.generateRootCause(INC_ID)).rejects.toThrow(AiUnavailableError);
    expect(incidentRepo.updateAiCache).not.toHaveBeenCalled();
  });
});

describe('IncidentService.parseIntake', () => {
  it('returns the parsed draft with the resolved group name', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos();
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    const result = await svc.parseIntake('The nightly DB refresh job failed, customers cannot see balances');
    expect(result).toEqual({
      title: 'DB refresh failed overnight',
      description: 'The nightly refresh job failed, balances are stale',
      severity: 'High',
      targetGroupId: GROUP_ID,
      targetGroupName: 'DBA',
    });
  });

  it('propagates ParseFailedError when the LLM output fails validation', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos({}, {}, {
      parseIntake: vi.fn().mockRejectedValue(new ParseFailedError()),
    });
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await expect(svc.parseIntake('Some free text about an incident that happened overnight')).rejects.toThrow(
      ParseFailedError,
    );
  });

  it('propagates AiUnavailableError when the LLM call fails', async () => {
    const { incidentRepo, groupRepo, llmClient } = makeRepos({}, {}, {
      parseIntake: vi.fn().mockRejectedValue(new AiUnavailableError()),
    });
    const svc = new IncidentService(incidentRepo, groupRepo, llmClient);
    await expect(svc.parseIntake('Some free text about an incident that happened overnight')).rejects.toThrow(
      AiUnavailableError,
    );
  });
});

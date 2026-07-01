import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { incidentRoutes } from './incidentRoutes';
import { userRoutes } from '../users/userRoutes';
import { groupRoutes } from '../groups/groupRoutes';
import { resolveCurrentUser } from '../../middleware/auth';
import { IncidentService } from './incidentService';
import type { UserRepository, GroupRepository, IncidentRepository } from '../../domain/ports';
import type { Incident, User, Group } from '../../domain/types';

const GROUP_ID = '00000000-0000-0000-0000-000000000001';
const INC_ID = '00000000-0000-0000-0000-000000000010';
const USER_ID = '00000000-0000-0000-0000-000000000100';

const seedUser: User = {
  userId: USER_ID,
  name: 'Alice',
  email: 'alice@example.com',
  createdAt: new Date(),
};

const seedGroup: Group = {
  groupId: GROUP_ID,
  name: 'DBA',
  description: 'Database admins',
  createdAt: new Date(),
};

const seedIncident: Incident = {
  incidentId: INC_ID,
  key: 'INC-1',
  title: 'DB refresh failed',
  description: 'Nightly refresh did not complete successfully',
  severity: 'High',
  status: 'Open',
  reporterId: USER_ID,
  assigneeId: null,
  targetGroupId: GROUP_ID,
  resolvedAt: null,
  aiSummary: null,
  aiSummaryGeneratedAt: null,
  aiRootCause: null,
  aiRootCauseGeneratedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildApp(incidentOverrides: Partial<IncidentRepository> = {}, groupOverrides: Partial<GroupRepository> = {}) {
  const userRepo: UserRepository = {
    findById: vi.fn().mockResolvedValue(seedUser),
    findAll: vi.fn().mockResolvedValue([seedUser]),
    findGroupsByUserId: vi.fn().mockResolvedValue([seedGroup]),
  };

  const groupRepo: GroupRepository = {
    findAll: vi.fn().mockResolvedValue([seedGroup]),
    findById: vi.fn().mockResolvedValue(seedGroup),
    isMember: vi.fn().mockResolvedValue(true),
    ...groupOverrides,
  };

  const incidentRepo: IncidentRepository = {
    nextKey: vi.fn().mockResolvedValue('INC-2'),
    create: vi.fn().mockResolvedValue({ ...seedIncident, key: 'INC-2', incidentId: 'new-inc-id' }),
    findById: vi.fn().mockResolvedValue(seedIncident),
    findMany: vi.fn().mockResolvedValue({ data: [seedIncident], total: 1, page: 1, limit: 20 }),
    update: vi.fn().mockImplementation(async (_id, patch) => ({ ...seedIncident, ...patch })),
    updateAiCache: vi.fn().mockResolvedValue(undefined),
    ...incidentOverrides,
  };

  const auth = resolveCurrentUser(userRepo);
  const svc = new IncidentService(incidentRepo, groupRepo);

  return createApp({
    incidents: incidentRoutes(svc, auth),
    users: userRoutes(userRepo),
    groups: groupRoutes(groupRepo),
  });
}

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = buildApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('Auth middleware', () => {
  it('returns 401 when X-User-Id header is missing', async () => {
    const app = buildApp();
    const res = await request(app).post('/incidents').send({ title: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 401 when X-User-Id references an unknown user', async () => {
    const userRepo: UserRepository = {
      findById: vi.fn().mockResolvedValue(null),
      findAll: vi.fn().mockResolvedValue([]),
      findGroupsByUserId: vi.fn().mockResolvedValue([]),
    };
    const groupRepo: GroupRepository = {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
      isMember: vi.fn().mockResolvedValue(false),
    };
    const incidentRepo: IncidentRepository = {
      nextKey: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateAiCache: vi.fn(),
    };
    const auth = resolveCurrentUser(userRepo);
    const svc = new IncidentService(incidentRepo, groupRepo);
    const app = createApp({
      incidents: incidentRoutes(svc, auth),
      users: userRoutes(userRepo),
      groups: groupRoutes(groupRepo),
    });
    const res = await request(app).post('/incidents').set('X-User-Id', 'nonexistent').send({});
    expect(res.status).toBe(401);
  });
});

describe('POST /incidents', () => {
  it('creates an incident and returns 201', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/incidents')
      .set('X-User-Id', USER_ID)
      .send({
        title: 'DB refresh failed again',
        description: 'The nightly refresh job timed out at 02:00 UTC',
        severity: 'High',
        targetGroupId: GROUP_ID,
      });
    expect(res.status).toBe(201);
    expect(res.body.key).toBeDefined();
  });

  it('returns 400 for missing required fields', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/incidents')
      .set('X-User-Id', USER_ID)
      .send({ title: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when title is too short', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/incidents')
      .set('X-User-Id', USER_ID)
      .send({
        title: 'Hi',
        description: 'This is long enough description text',
        severity: 'Low',
        targetGroupId: GROUP_ID,
      });
    expect(res.status).toBe(400);
  });
});

describe('GET /incidents', () => {
  it('returns paginated results', async () => {
    const app = buildApp();
    const res = await request(app).get('/incidents');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
  });
});

describe('GET /incidents/:id', () => {
  it('returns the incident', async () => {
    const app = buildApp();
    const res = await request(app).get(`/incidents/${INC_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.incidentId).toBe(INC_ID);
  });

  it('returns 404 for a missing incident', async () => {
    const app = buildApp({ findById: vi.fn().mockResolvedValue(null) });
    const res = await request(app).get('/incidents/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /incidents/:id/status', () => {
  it('transitions status and returns updated incident', async () => {
    const app = buildApp();
    const res = await request(app)
      .patch(`/incidents/${INC_ID}/status`)
      .set('X-User-Id', USER_ID)
      .send({ status: 'InProgress' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('InProgress');
  });

  it('returns 409 for an illegal transition (Open → Closed)', async () => {
    const app = buildApp();
    const res = await request(app)
      .patch(`/incidents/${INC_ID}/status`)
      .set('X-User-Id', USER_ID)
      .send({ status: 'Closed' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ILLEGAL_TRANSITION');
  });

  it('returns 403 when user is neither assignee nor group member', async () => {
    const app = buildApp(
      { findById: vi.fn().mockResolvedValue({ ...seedIncident, assigneeId: 'someone-else' }) },
      { isMember: vi.fn().mockResolvedValue(false) },
    );
    const res = await request(app)
      .patch(`/incidents/${INC_ID}/status`)
      .set('X-User-Id', USER_ID)
      .send({ status: 'InProgress' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('PATCH /incidents/:id/assignee', () => {
  it('allows a group member to self-assign', async () => {
    const app = buildApp();
    const res = await request(app)
      .patch(`/incidents/${INC_ID}/assignee`)
      .set('X-User-Id', USER_ID)
      .send({ assigneeId: USER_ID });
    expect(res.status).toBe(200);
    expect(res.body.assigneeId).toBe(USER_ID);
  });

  it('returns 403 for a non-group member', async () => {
    const app = buildApp({}, { isMember: vi.fn().mockResolvedValue(false) });
    const res = await request(app)
      .patch(`/incidents/${INC_ID}/assignee`)
      .set('X-User-Id', USER_ID)
      .send({ assigneeId: USER_ID });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

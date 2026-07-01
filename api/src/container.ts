import type { Router } from 'express';
import type { RequestHandler } from 'express';
import { createDbClient } from './db/client';
import { DrizzleUserRepository } from './infrastructure/DrizzleUserRepository';
import { DrizzleGroupRepository } from './infrastructure/DrizzleGroupRepository';
import { DrizzleIncidentRepository } from './infrastructure/DrizzleIncidentRepository';
import { GeminiLlmClient } from './infrastructure/GeminiLlmClient';
import { IncidentService } from './features/incidents/incidentService';
import { incidentRoutes } from './features/incidents/incidentRoutes';
import { userRoutes } from './features/users/userRoutes';
import { groupRoutes } from './features/groups/groupRoutes';
import { resolveCurrentUser } from './middleware/auth';

export interface Container {
  auth: RequestHandler;
  incidents: Router;
  users: Router;
  groups: Router;
}

export function buildContainer(): Container {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required');

  const db = createDbClient(process.env.DATABASE_URL);

  const userRepo = new DrizzleUserRepository(db);
  const groupRepo = new DrizzleGroupRepository(db);
  const incidentRepo = new DrizzleIncidentRepository(db);
  const llmClient = new GeminiLlmClient(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL);

  const incidentService = new IncidentService(incidentRepo, groupRepo, llmClient);
  const auth = resolveCurrentUser(userRepo);

  return {
    auth,
    incidents: incidentRoutes(incidentService, auth),
    users: userRoutes(userRepo),
    groups: groupRoutes(groupRepo),
  };
}

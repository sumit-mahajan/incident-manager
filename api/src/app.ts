import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { Router } from 'express';
import { errorHandler } from './middleware/errorHandler';

export interface AppRouters {
  incidents: Router;
  users: Router;
  groups: Router;
}

export function createApp(routers: AppRouters): express.Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/incidents', routers.incidents);
  app.use('/users', routers.users);
  app.use('/groups', routers.groups);

  app.use(errorHandler);

  return app;
}

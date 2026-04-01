import express, { Application } from 'express';
import bcrypt from 'bcrypt';
import { requireAuth } from './auth/auth.middleware';
import { createAuthRouter } from './auth/auth.router';
import { sessionRouter } from './sessions/session.router';

const REQUIRED_ENV = ['PASSWORD', 'JWT_SECRET'] as const;
const BCRYPT_ROUNDS = 12;

export async function createApp(): Promise<Application> {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  // Pre-hash the password once per app creation (cost factor 12)
  const passwordHash = await bcrypt.hash(process.env.PASSWORD!, BCRYPT_ROUNDS);

  const app = express();
  app.use(express.json());

  // Auth route — exempt from JWT middleware (must come BEFORE requireAuth)
  app.use('/auth', createAuthRouter(passwordHash));

  // All routes below require valid JWT
  app.use(requireAuth);

  // Protected session routes
  app.use('/sessions', sessionRouter);

  return app;
}

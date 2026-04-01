import express, { Application } from 'express';
import bcrypt from 'bcrypt';
import { requireAuth } from './auth/auth.middleware';
import { createAuthRouter } from './auth/auth.router';

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

  // Auth route — exempt from JWT middleware
  app.use('/auth', createAuthRouter(passwordHash));

  // JWT middleware applied to all routes AFTER /auth
  app.use(requireAuth);

  // Session routes — placeholder until Plan 03 wires in the real router
  app.get('/sessions', (_req, res) => {
    res.json([]);
  });

  return app;
}

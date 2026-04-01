import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export function createAuthRouter(passwordHash: string): Router {
  const router = Router();

  router.post('/login', async (req, res) => {
    const { password } = req.body as { password?: string };
    if (!password) {
      res.status(400).json({ error: 'password field is required' });
      return;
    }
    const valid = await bcrypt.compare(password, passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }
    const token = jwt.sign({}, process.env.JWT_SECRET!, {
      expiresIn: '7d',
      algorithm: 'HS256',
    });
    res.json({ token });
  });

  return router;
}

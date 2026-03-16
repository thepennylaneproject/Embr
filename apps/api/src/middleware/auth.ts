import { PrismaClient } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { extractBearerToken } from '../shared/auth-header.util';

const prisma = new PrismaClient();

interface AuthTokenPayload {
  sub: string;
  email?: string;
  username?: string;
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bearerToken = extractBearerToken(req.headers as Record<string, string | string[] | undefined>) ?? null;
    const cookieToken = (req as any).cookies?.accessToken ?? null;
    const token = bearerToken || cookieToken;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Authentication is not configured' });
    }

    const payload = jwt.verify(token, secret) as AuthTokenPayload;
    const userId = payload?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || user.deletedAt) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    (req as any).user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

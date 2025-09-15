import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    role?: string;
  };
}

export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: AuthenticatedRequest) => {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      req.user = {
        id: decoded.id,
        role: decoded.role
      };
      return handler(req);
    } catch (error) {
      return NextResponse.json({
        error: 'Unauthorized - Invalid token',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 401 });
    }
  };
}

// Rate limiting middleware (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: { windowMs: number; max: number } = { windowMs: 15 * 60 * 1000, max: 100 }
) {
  return async (req: NextRequest) => {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();
    const windowStart = now - options.windowMs;

    // Clean up old entries
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < windowStart) {
        rateLimitMap.delete(key);
      }
    }

    const current = rateLimitMap.get(ip);
    
    if (!current) {
      rateLimitMap.set(ip, { count: 1, resetTime: now });
    } else if (current.resetTime < windowStart) {
      rateLimitMap.set(ip, { count: 1, resetTime: now });
    } else if (current.count >= options.max) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((current.resetTime + options.windowMs - now) / 1000).toString()
          }
        }
      );
    } else {
      current.count++;
    }

    return handler(req);
  };
}

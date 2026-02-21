import type { Request, Response, NextFunction } from 'express';

/** Parse numeric string from Drizzle (PostgreSQL numeric columns return strings) */
export const n = (v: string | null | undefined): number => Number(v) || 0;

/** Determine stock status label */
export const stockStatus = (stock: number): string =>
  stock > 10 ? 'En Stock' : stock > 0 ? 'Stock Bajo' : 'Sin Stock';

/** Middleware to check X-User-Role header */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.headers['x-user-role'] as string | undefined;
    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }
    next();
  };
}

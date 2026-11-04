import { Request, Response, NextFunction } from 'express';

export interface RequestWithCookies extends Request {
  cookies: Record<string, string>;
}

/**
 * Lightweight, zero-dependency cookie parser middleware
 * Populates req.cookies with parsed cookie key-value pairs
 */
export const cookieParser = (req: Request, _res: Response, next: NextFunction): void => {
  const reqWithCookies = req as RequestWithCookies;
  reqWithCookies.cookies = {};

  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const idx = pair.indexOf('=');
      if (idx !== -1) {
        const key = pair.substring(0, idx).trim();
        const rawVal = pair.substring(idx + 1).trim();
        try {
          reqWithCookies.cookies[key] = decodeURIComponent(rawVal);
        } catch {
          reqWithCookies.cookies[key] = rawVal;
        }
      }
    }
  }

  next();
};


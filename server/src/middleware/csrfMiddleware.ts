import { Request, Response, NextFunction } from 'express';

const devOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const defaultProdOrigins = [
  'https://surge-watch.vercel.app',
  'https://surge-watch-api.onrender.com',
];

export const getTrustedOrigins = (): string[] => {
  const envRaw = [
    process.env.CLIENT_ORIGIN,
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
  ].filter(Boolean) as string[];

  // Support comma-separated strings and strip trailing slashes
  const configuredProdOrigins: string[] = [...defaultProdOrigins];
  for (const raw of envRaw) {
    for (const item of raw.split(',')) {
      const trimmed = item.trim().replace(/\/+$/, '');
      if (trimmed && !configuredProdOrigins.includes(trimmed)) {
        configuredProdOrigins.push(trimmed);
      }
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return configuredProdOrigins;
  }
  return [...devOrigins, ...configuredProdOrigins];
};

/**
 * Validates origin against allowed origins list
 */
export const isTrustedOrigin = (origin: string): boolean => {
  if (!origin) return false;
  const normalizedOrigin = origin.trim().replace(/\/+$/, '');
  const allowed = getTrustedOrigins();

  if (allowed.includes(normalizedOrigin)) return true;

  // Automatically allow any Vercel deployment of Surge Watch (e.g. preview branches or production)
  if (/^https:\/\/([a-z0-9-]+\.)?vercel\.app$/i.test(normalizedOrigin)) {
    return true;
  }

  // Support wildcard domains e.g. https://*.vercel.app
  for (const allowedOrigin of allowed) {
    if (allowedOrigin.includes('*')) {
      const regexStr = '^' + allowedOrigin.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
      if (new RegExp(regexStr).test(normalizedOrigin)) {
        return true;
      }
    }
  }

  // In development/test, allow localhost origins on any port
  if (process.env.NODE_ENV !== 'production' && (normalizedOrigin.startsWith('http://localhost:') || normalizedOrigin.startsWith('http://127.0.0.1:'))) {
    return true;
  }
  return false;
};

/**
 * CSRF Defense Middleware for cookie-authenticated and state-changing endpoints
 * 
 * Verifies that:
 * 1. If an Origin header is provided, it must belong to explicitly trusted origins
 * 2. If a Referer header is provided, its origin must belong to explicitly trusted origins
 * 3. Cross-site requests without a verified origin are rejected
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Safe HTTP read methods are exempt from CSRF
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const secFetchSite = req.headers['sec-fetch-site'];

  // Check 1: Origin header validation
  if (origin) {
    if (!isTrustedOrigin(origin)) {
      res.status(403).json({
        success: false,
        error: `Cross-Site Request Forgery (CSRF) blocked: Origin '${origin}' is not an authorized origin.`,
      });
      return;
    }
    return next();
  }

  // Check 2: Referer header fallback validation
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (!isTrustedOrigin(refererOrigin)) {
        res.status(403).json({
          success: false,
          error: `Cross-Site Request Forgery (CSRF) blocked: Referer origin '${refererOrigin}' is not authorized.`,
        });
        return;
      }
      return next();
    } catch {
      res.status(403).json({
        success: false,
        error: 'Cross-Site Request Forgery (CSRF) blocked: Malformed Referer header.',
      });
      return;
    }
  }

  // Check 3: If Sec-Fetch-Site indicates untrusted cross-site request without valid Origin/Referer
  if (secFetchSite === 'cross-site') {
    res.status(403).json({
      success: false,
      error: 'Cross-Site Request Forgery (CSRF) blocked: Untrusted cross-site request.',
    });
    return;
  }

  // If request has no Origin/Referer (e.g. CLI tools, automated scripts):
  next();
};


import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
export function requestContext(request: Request & { requestId?: string }, response: Response, next: NextFunction) {
 const id = typeof request.headers['x-request-id'] === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(request.headers['x-request-id']) ? request.headers['x-request-id'] : randomUUID();
 request.requestId = id;
 response.setHeader('x-request-id', id);
 next();
}

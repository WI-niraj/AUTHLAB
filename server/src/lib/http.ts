
import type { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config/index.js';

const COOKIE_NAME = 'authlab_session';

export class HttpError extends Error {
    constructor(
        public status: number,
        public code: string,
        message: string
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

export function failure(
    status: number,
    code: string,
    message: string
): never {
    throw new HttpError(status, code, message);
}

// Validate request origin
export function rejectUnsafeOrigin(req: FastifyRequest): void {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

    if (safeMethods.includes(req.method)) return;

    const origin = req.headers.origin;

    if (origin && origin !== config.origin) {
        failure(403, 'FORBIDDEN_ORIGIN', 'Origin not allowed');
    }
}

// Read authentication cookie
export function readCookie(
    req: FastifyRequest
): string | undefined {
    const cookieHeader = req.headers.cookie;

    if (!cookieHeader) return undefined;

    const session = cookieHeader
        .split(';')
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));

    if (!session) return undefined;

    return session.slice(COOKIE_NAME.length + 1);
}

// Set authentication cookie
export function setSessionCookie(
    reply: FastifyReply,
    token: string
): void {
    reply.header(
        'Set-Cookie',
        [
            `${COOKIE_NAME}=${encodeURIComponent(token)}`,
            'HttpOnly',
            'Path=/',
            'SameSite=Lax',
            ...(config.isProduction ? ['Secure'] : []),
        ].join('; ')
    );
}

// Clear authentication cookie
export function clearSessionCookie(reply: FastifyReply): void {
    reply.header(
        'Set-Cookie',
        [
            `${COOKIE_NAME}=`,
            'HttpOnly',
            'Path=/',
            'Max-Age=0',
            'SameSite=Lax',
            ...(config.isProduction ? ['Secure'] : []),
        ].join('; ')
    );
}


import { failure } from './http.js';

type RateLimitEntry = {
    count: number;
    expiresAt: number;
};

const requests = new Map<string, RateLimitEntry>();

export async function limit(
    action: string,
    identifier: string,
    maxRequests: number,
    windowSeconds: number
): Promise<void> {
    const key = `${action}:${identifier}`;
    const now = Date.now();

    // Remove expired entries
    for (const [storedKey, entry] of requests) {
        if (entry.expiresAt <= now) {
            requests.delete(storedKey);
        }
    }

    const entry = requests.get(key);

    // First request or expired limit
    if (!entry) {
        requests.set(key, {
            count: 1,
            expiresAt: now + windowSeconds * 1000,
        });

        return;
    }

    // Rate limit exceeded
    if (entry.count >= maxRequests) {
        failure(
            429,
            'RATE_LIMIT_EXCEEDED',
            'Too many requests. Please try again later.'
        );
    }

    // Count request
    entry.count += 1;
}

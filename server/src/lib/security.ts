
import {
    randomBytes,
    createHash,
    scrypt,
    timingSafeEqual,
} from 'node:crypto';

// Password hashing settings
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
};

// Validate mobile number (international format)
export function validMobile(mobile: string): boolean {
    return /^\+[1-9][0-9]{7,14}$/.test(mobile);
}

// Validate password strength
export function validPassword(password: string): boolean {
    return (
        typeof password === 'string' &&
        password.length >= 12 &&
        password.length <= 128 &&
        /[A-Za-z]/.test(password) &&
        /[0-9]/.test(password)
    );
}

// Internal function to derive a password hash
function deriveKey(
    password: string,
    salt: string
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        scrypt(
            password,
            salt,
            KEY_LENGTH,
            SCRYPT_OPTIONS,
            (error, derivedKey) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(derivedKey);
            }
        );
    });
}

// Hash a password before storing it
export async function hashPassword(
    password: string
): Promise<string> {
    const salt = randomBytes(16).toString('hex');

    const hash = await deriveKey(password, salt);

    return `scrypt$${salt}$${hash.toString('hex')}`;
}

// Verify a password against its stored hash
export async function verifyPassword(
    storedHash: string,
    password: string
): Promise<boolean> {
    try {
        const [algorithm, salt, hashHex] = storedHash.split('$');

        if (
            algorithm !== 'scrypt' ||
            !salt ||
            !hashHex ||
            !/^[a-f0-9]{32}$/.test(salt) ||
            !/^[a-f0-9]{128}$/.test(hashHex)
        ) {
            return false;
        }

        const originalHash = Buffer.from(hashHex, 'hex');

        const suppliedHash = await deriveKey(password, salt);

        return timingSafeEqual(originalHash, suppliedHash);
    } catch {
        return false;
    }
}

// Generate a secure random token
export function randomToken(): string {
    return randomBytes(32).toString('base64url');
}

// Generate SHA-256 digest
export function sha256(value: string): string {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

// Dummy hash used when a user does not exist.
// Helps reduce timing differences during login.
export const dummyPasswordHash = hashPassword(
    'DummyPassword123456'
);

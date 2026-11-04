
import {
    createPrivateKey,
    createPublicKey,
    privateDecrypt,
    constants,
    type KeyObject,
} from 'node:crypto';

import type { FastifyInstance } from 'fastify';

const PREFIX = 'enc:v1:';

const ENCRYPTED_FIELDS: Record<string, string[]> = {
    'POST /api/auth/register': ['password'],

    'POST /api/auth/login': ['password'],

    'POST /api/auth/verify-mobile': ['code'],

    'POST /api/auth/verify-reset-otp': ['code'],

    'POST /api/auth/reset-password': ['newPassword'],

    'POST /api/account/change-password': [
        'currentPassword',
        'newPassword',
    ],

    'POST /api/account/mobile-change/request': [
        'currentPassword',
    ],

    'POST /api/account/mobile-change/confirm': [
        'code',
    ],
};

type JsonBody = Record<string, unknown>;

let privateKey: KeyObject | null = null;

function loadPrivateKey(): KeyObject {
    if (privateKey) {
        return privateKey;
    }

    const encoded =
        process.env.PAYLOAD_RSA_PRIVATE_KEY_BASE64;

    if (!encoded) {
        throw new Error(
            'PAYLOAD_RSA_PRIVATE_KEY_BASE64 is missing'
        );
    }

    const pem = Buffer.from(encoded, 'base64').toString(
        'utf8'
    );

    privateKey = createPrivateKey(pem);

    if (privateKey.asymmetricKeyType !== 'rsa') {
        throw new Error('RSA private key is required');
    }

    return privateKey;
}

function getPublicKeyBase64(): string {
    const publicKey = createPublicKey(loadPrivateKey());

    const der = publicKey.export({
        type: 'spki',
        format: 'der',
    });

    return Buffer.from(der).toString('base64');
}

function decryptSensitive(value: unknown): string {
    if (
        typeof value !== 'string' ||
        !value.startsWith(PREFIX)
    ) {
        throw new Error('Encrypted value is required');
    }

    const encoded = value.slice(PREFIX.length);

    if (
        !encoded ||
        encoded.length > 1024 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
    ) {
        throw new Error('Invalid encrypted value');
    }

    const ciphertext = Buffer.from(encoded, 'base64');

    const key = loadPrivateKey();

    const expectedLength =
        (key.asymmetricKeyDetails?.modulusLength ?? 0) / 8;

    if (
        !expectedLength ||
        ciphertext.length !== expectedLength
    ) {
        throw new Error('Invalid ciphertext length');
    }

    const plaintext = privateDecrypt(
        {
            key,
            padding: constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        },
        ciphertext
    );

    return new TextDecoder('utf-8', {
        fatal: true,
    }).decode(plaintext);
}

export function setupPayloadEncryption(
    app: FastifyInstance
): void {
    // Fail startup if the private key is missing or invalid.
    loadPrivateKey();

    const publicKey = getPublicKeyBase64();

    // Frontend fetches this key before encrypting.
    app.get('/api/crypto/public-key', async (_request, reply) => {
        return reply
            .header('Cache-Control', 'no-store')
            .send({
                algorithm: 'RSA-OAEP-256',
                publicKey,
            });
    });

    // Runs after JSON parsing and before schema validation.
    app.addHook('preValidation', async (request, reply) => {
        const pathname = request.url.split('?')[0];

        const routeKey =
            `${request.method.toUpperCase()} ${pathname}`;

        const fields = ENCRYPTED_FIELDS[routeKey];

        if (!fields) {
            return;
        }

        const body = request.body;

        if (
            !body ||
            typeof body !== 'object' ||
            Array.isArray(body)
        ) {
            return reply.code(400).send({
                error: {
                    code: 'INVALID_BODY',
                    message: 'A JSON object is required.',
                },
            });
        }

        const data = body as JsonBody;

        try {
            // Decrypt all required fields before passing
            // the request to the existing route handlers.
            const decrypted: JsonBody = {};

            for (const field of fields) {
                decrypted[field] = decryptSensitive(
                    data[field]
                );
            }

            Object.assign(data, decrypted);
        } catch {
            return reply.code(400).send({
                error: {
                    code: 'INVALID_ENCRYPTED_PAYLOAD',
                    message:
                        'Unable to process encrypted credentials.',
                },
            });
        }
    });
}


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

    const raw =
        process.env.PAYLOAD_RSA_PRIVATE_KEY_BASE64;

    if (!raw) {
        throw new Error(
            'RSA_CONFIG_MISSING: Private key environment variable is missing.'
        );
    }

    console.log('RSA configuration check:', {
        present: true,
        valueLength: raw.length,
        hasWhitespace: /\s/.test(raw),
    });

    // Remove accidental whitespace or line breaks
    const encoded = raw.replace(/\s/g, '');

    // Validate Base64
    if (
        !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) ||
        encoded.length % 4 !== 0
    ) {
        throw new Error(
            'RSA_INVALID_BASE64: Environment variable is not valid Base64.'
        );
    }

    // Decode Base64
    const pem = Buffer.from(
        encoded,
        'base64'
    ).toString('utf8');

    // Check PEM format without printing private key
    const validPem =
        pem.startsWith('-----BEGIN PRIVATE KEY-----') &&
        pem.trimEnd().endsWith('-----END PRIVATE KEY-----');

    if (!validPem) {
        throw new Error(
            'RSA_INVALID_PEM: Decoded value is not a PKCS8 private key.'
        );
    }

    // Load RSA private key
    try {
        const key = createPrivateKey({
            key: pem,
            format: 'pem',
        });

        if (key.asymmetricKeyType !== 'rsa') {
            throw new Error('Expected RSA private key');
        }

        privateKey = key;

        console.log('RSA private key loaded successfully');

        return key;
    } catch (error) {
        // Do not log private key or PEM contents.
        console.error(
            'RSA key parsing failed:',
            error instanceof Error ? error.message : 'Unknown error'
        );

        throw new Error(
            'RSA_PARSE_FAILED: Unable to parse RSA private key.'
        );
    }
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
    loadPrivateKey();

    const publicKey = getPublicKeyBase64();

    app.get('/api/crypto/public-key', async (_request, reply) => {
        return reply
            .header('Cache-Control', 'no-store')
            .send({
                algorithm: 'RSA-OAEP-256',
                publicKey,
            });
    });

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

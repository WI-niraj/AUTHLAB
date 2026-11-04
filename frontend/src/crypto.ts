
const PUBLIC_KEY_URL = '/api/crypto/public-key';
const ENCRYPTION_PREFIX = 'enc:v1:';

let cachedKeyPromise: Promise<CryptoKey> | null = null;

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
}

async function getPublicKey(): Promise<CryptoKey> {
    if (!cachedKeyPromise) {
        cachedKeyPromise = (async () => {
            const response = await fetch(PUBLIC_KEY_URL, {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store',
            });

            if (!response.ok) {
                throw new Error('Unable to load encryption public key.');
            }

            const data: { publicKey: string } = await response.json();

            if (!data.publicKey) {
                throw new Error('Encryption public key is missing.');
            }

            const keyBytes = base64ToBytes(data.publicKey);

            return crypto.subtle.importKey(
                'spki',
                keyBytes,
                {
                    name: 'RSA-OAEP',
                    hash: 'SHA-256',
                },
                false,
                ['encrypt']
            );
        })().catch((error) => {
            cachedKeyPromise = null;
            throw error;
        });
    }

    return cachedKeyPromise;
}

export async function encryptSensitive(
    value: string
): Promise<string> {
    if (!globalThis.crypto?.subtle) {
        throw new Error(
            'Secure encryption requires HTTPS or localhost.'
        );
    }

    const publicKey = await getPublicKey();

    const encoded = new TextEncoder().encode(value);

    const encrypted = await crypto.subtle.encrypt(
        {
            name: 'RSA-OAEP',
        },
        publicKey,
        encoded
    );

    return (
        ENCRYPTION_PREFIX +
        bytesToBase64(new Uint8Array(encrypted))
    );
}

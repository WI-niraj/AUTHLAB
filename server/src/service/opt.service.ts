
import {
    randomInt,
    randomUUID,
    timingSafeEqual,
} from 'node:crypto';

import { sql } from '../db/client.js';
import { sha256 } from '../lib/security.js';

export type OtpPurpose =
    | 'register'
    | 'reset_password'
    | 'change_mobile';

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;

// Generate a secure six-digit OTP
function generateOtp(): string {
    return randomInt(0, 1_000_000)
        .toString()
        .padStart(6, '0');
}

// Compare hashed OTP values
function verifyHash(
    storedHash: string,
    providedHash: string
): boolean {
    if (
        !/^[a-f0-9]{64}$/i.test(storedHash) ||
        !/^[a-f0-9]{64}$/i.test(providedHash)
    ) {
        return false;
    }

    return timingSafeEqual(
        Buffer.from(storedHash, 'hex'),
        Buffer.from(providedHash, 'hex')
    );
}

// Create a new OTP challenge
export async function createOtp(
    userId: string,
    mobile: string,
    purpose: OtpPurpose
): Promise<void> {
    const otp = generateOtp();
    const hash = sha256(otp);

    await sql.begin(async (tx) => {
        // Invalidate previous unconsumed challenges
        await tx`
      UPDATE otp_challenges
      SET consumed_at = NOW()
      WHERE user_id = ${userId}
        AND purpose = ${purpose}
        AND consumed_at IS NULL
    `;

        // Store the new OTP hash
        await tx`
      INSERT INTO otp_challenges (
        id,
        user_id,
        target_mobile,
        purpose,
        code_hash,
        attempts,
        expires_at
      )
      VALUES (
        ${randomUUID()},
        ${userId},
        ${mobile},
        ${purpose},
        ${hash},
        0,
        NOW() + ${OTP_EXPIRY_MINUTES} * INTERVAL '1 minute'
      )
    `;
    });

    // Local development only
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV OTP] ${purpose}: ${otp}`);
    } else {
        // A real SMS provider must be implemented before production.
        throw new Error('OTP SMS delivery is not configured');
    }
}

// Verify OTP and mark it as consumed
export async function consumeOtp(
    userId: string,
    mobile: string,
    purpose: OtpPurpose,
    code: string
): Promise<boolean> {
    if (!/^[0-9]{6}$/.test(code)) {
        return false;
    }

    return sql.begin(async (tx) => {
        const rows = await tx`
      SELECT id, code_hash, attempts
      FROM otp_challenges
      WHERE user_id = ${userId}
        AND target_mobile = ${mobile}
        AND purpose = ${purpose}
        AND consumed_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
    `;

        const challenge = rows[0];

        if (!challenge || challenge.attempts >= MAX_ATTEMPTS) {
            return false;
        }

        const valid = verifyHash(
            challenge.code_hash,
            sha256(code)
        );

        if (!valid) {
            await tx`
        UPDATE otp_challenges
        SET attempts = attempts + 1
        WHERE id = ${challenge.id}
      `;

            return false;
        }

        await tx`
      UPDATE otp_challenges
      SET consumed_at = NOW()
      WHERE id = ${challenge.id}
    `;

        return true;
    });
}

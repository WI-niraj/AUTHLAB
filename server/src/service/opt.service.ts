
import {
    randomInt,
    randomUUID,
    timingSafeEqual,
} from "node:crypto";

import { sql } from "../db/client.js";
import { sha256 } from "../lib/security.js";
import { sendSmsOtp, verifySmsOtp } from "./smsotp.js";

export type OtpPurpose =
    | "register"
    | "reset_password"
    | "change_mobile";

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;

const TWILIO_HASH = sha256("AUTHLAB_TWILIO_VERIFY_V1");

function generateOtp(): string {
    return randomInt(0, 1_000_000)
        .toString()
        .padStart(6, "0");
}

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
        Buffer.from(storedHash, "hex"),
        Buffer.from(providedHash, "hex")
    );
}

function isProduction(): boolean {
    return process.env.NODE_ENV === "production";
}

function isTwilioEnabled(): boolean {
    const provider = process.env.OTP_PROVIDER?.trim().toLowerCase();

    console.log("[OTP DEBUG] Provider:", provider ?? "not configured");
    console.log("[OTP DEBUG] Twilio configured:", {
        accountSid: Boolean(process.env.TWILIO_ACCOUNT_SID),
        authToken: Boolean(process.env.TWILIO_AUTH_TOKEN),
        serviceSid: Boolean(process.env.TWILIO_VERIFY_SERVICE_SID),
    });

    return provider === "twilio";
}

export async function createOtp(
    userId: string,
    mobile: string,
    purpose: OtpPurpose
): Promise<void> {
    let hash: string;
    let localOtp: string | null = null;

    // STEP 1: Try Twilio first when enabled.
    if (isTwilioEnabled()) {
        try {
            const sent = await sendSmsOtp(mobile);

            if (!sent) {
                throw new Error("Twilio did not accept OTP request");
            }

            hash = TWILIO_HASH;

            console.log(
                `[OTP] Twilio SMS requested for ${purpose}`
            );
        } catch (error: unknown) {
            const err = error as {
                code?: number;
                status?: number;
                message?: string;
            };

            console.error("[TWILIO ERROR]", {
                code: err.code,
                status: err.status,
                message: err.message,
            });

            if (isProduction()) {
                throw new Error("Unable to deliver OTP via SMS");
            }

            console.warn(
                "[OTP] Falling back to terminal OTP"
            );

            localOtp = generateOtp();
            hash = sha256(localOtp);
        }
    } else {
        if (isProduction()) {
            throw new Error(
                "Local OTP provider is disabled in production"
            );
        }

        localOtp = generateOtp();
        hash = sha256(localOtp);
    }

    await sql.begin(async (tx) => {
        await tx`
      UPDATE otp_challenges
      SET consumed_at = NOW()
      WHERE user_id = ${userId}
        AND purpose = ${purpose}
        AND consumed_at IS NULL
    `;

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

    if (localOtp !== null) {
        console.log(
            `[DEV OTP] ${purpose}: ${localOtp}`
        );
    }
}

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

        if (
            !challenge ||
            challenge.attempts >= MAX_ATTEMPTS
        ) {
            return false;
        }

        let valid = false;

        if (challenge.code_hash === TWILIO_HASH) {
            try {
                valid = await verifySmsOtp(mobile, code);
            } catch (error) {
                console.error(
                    "[OTP] Twilio verification unavailable:",
                    error
                );

                throw new Error(
                    "SMS verification temporarily unavailable"
                );
            }
        } else {
            valid = verifyHash(
                challenge.code_hash,
                sha256(code)
            );
        }

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

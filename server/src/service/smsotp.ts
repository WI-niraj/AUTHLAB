
import twilio from "twilio";

function getTwilioClient() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !serviceSid) {
        throw new Error("Missing Twilio configuration");
    }

    return {
        client: twilio(accountSid, authToken),
        serviceSid,
    };
}

function getOtpDestination(phone: string): string {
    const testMode = process.env.OTP_TEST_MODE === "true";

    if (!testMode) {
        return phone;
    }

    if (process.env.NODE_ENV === "production") {
        throw new Error(
            "OTP_TEST_MODE must not be enabled in production"
        );
    }

    if (process.env.APP_ENV !== "staging") {
        throw new Error(
            "OTP_TEST_MODE requires APP_ENV=staging"
        );
    }

    const allowedNumbers = (
        process.env.OTP_TEST_ALLOWED_NUMBERS ?? ""
    )
        .split(",")
        .map((number) => number.trim())
        .filter(Boolean);

    if (!allowedNumbers.includes(phone)) {
        return phone;
    }

    const destination = process.env.OTP_TEST_PHONE?.trim();

    if (!destination || !/^\+[1-9]\d{7,14}$/.test(destination)) {
        throw new Error("Invalid OTP_TEST_PHONE configuration");
    }

    return destination;
}

export async function sendSmsOtp(
    phone: string
): Promise<boolean> {
    const { client, serviceSid } = getTwilioClient();

    const destination = getOtpDestination(phone);

    const result = await client.verify.v2
        .services(serviceSid)
        .verifications.create({
            to: destination,
            channel: "sms",
        });

    return result.status === "pending";
}

export async function verifySmsOtp(
    phone: string,
    code: string
): Promise<boolean> {
    const { client, serviceSid } = getTwilioClient();

    const destination = getOtpDestination(phone);

    const result = await client.verify.v2
        .services(serviceSid)
        .verificationChecks.create({
            to: destination,
            code,
        });

    return result.status === "approved";
}
